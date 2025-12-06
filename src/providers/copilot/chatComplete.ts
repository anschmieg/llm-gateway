import { ProviderConfig } from '../types';

export const CopilotChatCompleteConfig: ProviderConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'gpt-4o',
  },
  messages: {
    param: 'messages',
    default: '',
  },
  // Add other parameters as needed, mirroring OpenAIChatCompleteConfig
};
