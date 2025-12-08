/**
 * Centralized API key loading utility
 * Reads API keys from environment variables first, falls back to conf.json
 */

import { Context } from 'hono';
import { env } from 'hono/adapter';

/**
 * Get API key for a provider from environment variables or conf.json
 * Environment variable pattern: PROVIDERNAME_API_KEY
 * Examples: COPILOT_API_KEY, CEREBRAS_API_KEY, AZURE_OPENAI_API_KEY
 *
 * @param c - Hono context
 * @param provider - Provider name (e.g., 'copilot', 'azure-openai', 'openai')
 * @param confApiKey - API key from conf.json (fallback)
 * @returns API key from env var or conf.json
 */
export function getProviderApiKey(
  c: Context,
  provider: string,
  confApiKey?: string
): string | undefined {
  if (!provider) {
    return confApiKey;
  }

  // Normalize provider name to environment variable format
  // Examples: 'azure-openai' -> 'AZURE_OPENAI', 'copilot' -> 'COPILOT'
  const envVarName = `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;

  try {
    const environment = env(c);
    const envApiKey = environment[envVarName] || process.env[envVarName];

    // If env var is set, use it; otherwise fall back to conf.json
    if (envApiKey) {
      return envApiKey;
    }
  } catch (error) {
    // If env() fails (e.g., in some contexts), continue to fallback
    console.warn(`Failed to read environment for provider ${provider}:`, error);
  }

  // Fall back to conf.json API key
  return confApiKey;
}

/**
 * Inject API key from environment if not already present
 * Modifies the config object in place
 *
 * @param c - Hono context
 * @param config - Provider configuration object
 */
export function injectEnvApiKey(c: Context, config: any): void {
  if (!config || !config.provider) {
    return;
  }

  // Get API key from env if not already set
  const envApiKey = getProviderApiKey(c, config.provider, config.apiKey);

  if (envApiKey) {
    config.apiKey = envApiKey;
  }
}
