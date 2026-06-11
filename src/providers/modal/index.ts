import { MODAL } from '../../globals';
import {
  chatCompleteParams,
  completeParams,
  responseTransformers,
} from '../open-ai-base';
import { ProviderConfigs } from '../types';
import { ModalAPIConfig } from './api';

const validRoles = [
  'user',
  'assistant',
  'system',
  'developer',
  'function',
  'tool',
];

function transformMessagesForModal(messages: any[]): any[] {
  return messages
    .filter((msg) => msg && msg.role && validRoles.includes(msg.role))
    .map((msg) => {
      if (msg.role === 'developer') {
        return { ...msg, role: 'system' };
      }
      return msg;
    });
}

export const ModalConfig: ProviderConfigs = {
  chatComplete: {
    ...chatCompleteParams([]),
    messages: {
      param: 'messages',
      default: '',
      transform: (params: any) => {
        return {
          ...params,
          messages: transformMessagesForModal(params.messages || []),
        };
      },
    },
  },
  complete: completeParams([]),
  api: ModalAPIConfig,
  responseTransforms: responseTransformers(MODAL, {
    chatComplete: true,
    complete: true,
  }),
};

export default ModalConfig;
