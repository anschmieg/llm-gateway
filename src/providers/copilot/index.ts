import { ProviderConfigs } from '../types';
import CopilotAPIConfig from './api';
import {
  OpenAIChatCompleteConfig,
  OpenAIChatCompleteResponseTransform,
} from '../openai/chatComplete';
import {
  OpenAICompleteConfig,
  OpenAICompleteResponseTransform,
} from '../openai/complete';
import {
  OpenAIEmbedConfig,
  OpenAIEmbedResponseTransform,
} from '../openai/embed';

const CopilotConfig: ProviderConfigs = {
  chatComplete: OpenAIChatCompleteConfig,
  complete: OpenAICompleteConfig,
  embed: OpenAIEmbedConfig,
  api: CopilotAPIConfig,
  responseTransforms: {
    chatComplete: OpenAIChatCompleteResponseTransform,
    complete: OpenAICompleteResponseTransform,
    embed: OpenAIEmbedResponseTransform,
  },
};

export default CopilotConfig;
