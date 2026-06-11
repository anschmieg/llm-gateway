// jest setup: ensure tests don't attempt real network calls by clearing provider env vars
// jest setup: ensure tests don't attempt real network calls by clearing provider env vars
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
const providerKeys = Object.keys(process.env).filter(
  (k) => /_API_KEY$/.test(k) || /_KEY$/.test(k)
);
providerKeys.forEach((k) => delete process.env[k]);
// Provide a local base URL used by tests
process.env.TEST_GATEWAY_BASE = 'http://localhost';
// ensure COPILOT envs are cleared for unit tests
process.env.COPILOT_API_KEY = '';
process.env.COPILOT_PROXY_URL = '';
process.env.OPENAI_API_KEY = '';
