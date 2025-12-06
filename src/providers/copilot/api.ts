import { ProviderAPIConfig } from '../types';

const CopilotAPIConfig: ProviderAPIConfig = {
  getBaseURL: () => 'https://copilot.s-x.workers.dev/v1',
  headers: ({ providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.apiKey}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ fn }) => {
    switch (fn) {
      case 'chatComplete':
        return '/chat/completions';
      case 'complete':
        return '/completions';
      case 'embed':
        return '/embeddings';
      default:
        return '';
export const COPILOT_PROXY_URL = process.env.COPILOT_PROXY_URL || 'https://copilot.s-x.workers.dev/v1';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const COPILOT_API_KEY = process.env.COPILOT_API_KEY;

const CopilotAPIConfig: ProviderAPIConfig = {
  getBaseURL: (opts = {}) => opts.providerOptions?.baseURL || process.env.COPILOT_PROXY_URL || 'https://copilot.s-x.workers.dev/v1',
  headers: ({ providerOptions }) => {
    const apiKey = providerOptions.apiKey || process.env.COPILOT_API_KEY;
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    // Add any Copilot-specific headers here if needed
    return headersObj;
  },
  getEndpoint: ({ fn, gatewayRequestURL }) => {
    const basePath = gatewayRequestURL.split('/v1')?.[1];
    switch (fn) {
      case 'complete':
        return '/completions';
      case 'chatComplete':
        return '/chat/completions';
      case 'embed':
        return '/embeddings'; // Copilot expects POST /v1/embeddings with {input: [string], model: 'text-embedding-3-small'}
      default:
        return basePath || '';
    }
  },
};

export default CopilotAPIConfig;
