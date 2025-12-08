import { ProviderAPIConfig } from '../types';

export const COPILOT_PROXY_URL =
  process.env.COPILOT_PROXY_URL || 'https://copilot.s-x.workers.dev/v1';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const COPILOT_API_KEY = process.env.COPILOT_API_KEY;

const CopilotAPIConfig: ProviderAPIConfig = {
  getBaseURL: (opts = {}) =>
    opts.providerOptions?.baseURL ||
    process.env.COPILOT_PROXY_URL ||
    COPILOT_PROXY_URL,
  headers: ({ providerOptions }) => {
    const apiKey =
      providerOptions.apiKey || process.env.COPILOT_API_KEY || COPILOT_API_KEY;
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    return headersObj;
  },
  getEndpoint: ({ fn, gatewayRequestURL }) => {
    const basePath = gatewayRequestURL?.split('/v1')?.[1] || '';
    switch (fn) {
      case 'complete':
        return '/completions';
      case 'chatComplete':
        return '/chat/completions';
      case 'embed':
        return '/embeddings';
      default:
        return basePath || '';
    }
  },
};

export default CopilotAPIConfig;
