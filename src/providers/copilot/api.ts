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
    }
  },
};

export default CopilotAPIConfig;
