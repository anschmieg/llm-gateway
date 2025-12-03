/**
 * Tests for PolicyRouter
 * Tests explicit model routing, model class routing, semantic routing, and error handling
 */

import {
  PolicyRouter,
  SUPPORTED_MODELS,
  ModelClass,
  MODEL_CLASS_MAPPING,
  COPILOT_PROXY_URL,
  EMBEDDING_MODEL,
} from '../../src/services/policyRouter';

describe('PolicyRouter', () => {
  let router: PolicyRouter;
  const mockApiKey = 'test-api-key-123';

  beforeEach(() => {
    router = new PolicyRouter(mockApiKey);
  });

  describe('Explicit Model Routing (Fast Path)', () => {
    test('should route to explicit valid model ID - gpt-4.1', async () => {
      const request = {
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe('gpt-4.1');
      expect(result.provider).toBe('copilot');
      expect(result.apiKey).toBe(mockApiKey);
    });

    test('should route to explicit valid model ID - gpt-4o-mini', async () => {
      const request = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe('gpt-4o-mini');
      expect(result.provider).toBe('copilot');
      expect(result.apiKey).toBe(mockApiKey);
    });

    test('should route to explicit valid model ID - gpt-5-mini', async () => {
      const request = {
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe('gpt-5-mini');
      expect(result.provider).toBe('copilot');
      expect(result.apiKey).toBe(mockApiKey);
    });

    test('should route to embedding model', async () => {
      const request = {
        model: 'text-embedding-3-small',
        input: 'test input',
      };

      const result = await router.route(request, {});

      expect(result.model).toBe('text-embedding-3-small');
      expect(result.provider).toBe('copilot');
      expect(result.apiKey).toBe(mockApiKey);
    });

    test('should not use fast path for invalid model', async () => {
      const request = {
        model: 'invalid-model',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await router.route(request, {});

      // Should fall back to heuristic routing
      expect(SUPPORTED_MODELS).toContain(result.model);
      expect(result.model).not.toBe('invalid-model');
    });
  });

  describe('Model Class Routing (Fast Path)', () => {
    test('should route to fast model when model class is fast', async () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const headers = {
        'x-model-class': ModelClass.FAST,
      };

      const result = await router.route(request, headers);

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.FAST]);
      expect(result.model).toBe('gpt-5-mini');
    });

    test('should route to balanced model when model class is balanced', async () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const headers = {
        'x-model-class': ModelClass.BALANCED,
      };

      const result = await router.route(request, headers);

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
      expect(result.model).toBe('gpt-4o-mini');
    });

    test('should route to quality model when model class is quality', async () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const headers = {
        'x-model-class': ModelClass.QUALITY,
      };

      const result = await router.route(request, headers);

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.QUALITY]);
      expect(result.model).toBe('gpt-4.1');
    });
  });

  describe('Heuristic Classification (Fallback)', () => {
    test('should classify short prompt as fast', async () => {
      const request = {
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.FAST]);
    });

    test('should classify medium prompt as balanced', async () => {
      const request = {
        messages: [
          {
            role: 'user',
            content:
              'Can you explain what quantum computing is and how it differs from classical computing?',
          },
        ],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });

    test('should classify long complex prompt as quality', async () => {
      const request = {
        messages: [
          {
            role: 'user',
            content:
              'Please provide a comprehensive analysis of the economic, social, and environmental impacts of artificial intelligence on global workforce dynamics over the next two decades, including specific case studies from various industries, policy recommendations for governments, and potential mitigation strategies for displaced workers. Additionally, discuss the ethical implications of AI deployment in critical infrastructure sectors and provide a detailed comparison of regulatory approaches across different regions.',
          },
        ],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.QUALITY]);
    });
  });

  describe('Prompt Extraction', () => {
    test('should extract prompt from chat completion messages', async () => {
      const request = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello, how are you?' },
        ],
      };

      const result = await router.route(request, {});

      expect(result.model).toBeDefined();
      expect(SUPPORTED_MODELS).toContain(result.model as any);
    });

    test('should extract prompt from completion', async () => {
      const request = {
        prompt: 'Complete this sentence:',
      };

      const result = await router.route(request, {});

      expect(result.model).toBeDefined();
      expect(SUPPORTED_MODELS).toContain(result.model as any);
    });

    test('should extract prompt from embedding input', async () => {
      const request = {
        input: 'text to embed',
      };

      const result = await router.route(request, {});

      expect(result.model).toBeDefined();
      expect(SUPPORTED_MODELS).toContain(result.model as any);
    });

    test('should handle multimodal content', async () => {
      const request = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this image?' },
              { type: 'image_url', image_url: { url: 'https://...' } },
            ],
          },
        ],
      };

      const result = await router.route(request, {});

      expect(result.model).toBeDefined();
      expect(SUPPORTED_MODELS).toContain(result.model as any);
    });

    test('should handle array prompts', async () => {
      const request = {
        prompt: ['First prompt', 'Second prompt'],
      };

      const result = await router.route(request, {});

      expect(result.model).toBeDefined();
      expect(SUPPORTED_MODELS).toContain(result.model as any);
    });
  });

  describe('Default Behavior', () => {
    test('should default to balanced model when no prompt available', async () => {
      const request = {};

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });

    test('should always return copilot provider', async () => {
      const request = {
        messages: [{ role: 'user', content: 'test' }],
      };

      const result = await router.route(request, {});

      expect(result.provider).toBe('copilot');
    });

    test('should always return correct API key', async () => {
      const request = {
        messages: [{ role: 'user', content: 'test' }],
      };

      const result = await router.route(request, {});

      expect(result.apiKey).toBe(mockApiKey);
    });
  });

  describe('Anchor Management', () => {
    test('should initialize with default empty anchors', () => {
      const anchors = router.getAnchors();
      expect(Array.isArray(anchors)).toBe(true);
    });

    test('should set and get anchors', () => {
      const newAnchors = [
        {
          label: 'test',
          modelClass: ModelClass.FAST,
          embedding: [0.1, 0.2, 0.3],
        },
      ];

      router.setAnchors(newAnchors);
      const retrievedAnchors = router.getAnchors();

      expect(retrievedAnchors).toEqual(newAnchors);
      expect(retrievedAnchors[0].label).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty messages array', async () => {
      const request = {
        messages: [],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });

    test('should handle null content', async () => {
      const request = {
        messages: [{ role: 'user', content: null }],
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });

    test('should handle undefined prompt', async () => {
      const request = {
        prompt: undefined,
      };

      const result = await router.route(request, {});

      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });

    test('should handle empty string prompt', async () => {
      const request = {
        messages: [{ role: 'user', content: '' }],
      };

      const result = await router.route(request, {});

      // Empty string has length 0, should be classified as balanced (default)
      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.BALANCED]);
    });
  });

  describe('Priority of Routing Strategies', () => {
    test('explicit model should override model class header', async () => {
      const request = {
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const headers = {
        'x-model-class': ModelClass.FAST,
      };

      const result = await router.route(request, headers);

      // Explicit model takes priority
      expect(result.model).toBe('gpt-4.1');
      expect(result.model).not.toBe(MODEL_CLASS_MAPPING[ModelClass.FAST]);
    });

    test('model class header should override semantic classification', async () => {
      const request = {
        messages: [
          {
            role: 'user',
            content:
              'This is a very long and complex prompt that would normally be classified as requiring quality model',
          },
        ],
      };
      const headers = {
        'x-model-class': ModelClass.FAST,
      };

      const result = await router.route(request, headers);

      // Model class header takes priority over semantic classification
      expect(result.model).toBe(MODEL_CLASS_MAPPING[ModelClass.FAST]);
    });
  });

  describe('Constants', () => {
    test('should export correct supported models', () => {
      expect(SUPPORTED_MODELS).toEqual([
        'gpt-4.1',
        'gpt-4o-mini',
        'gpt-5-mini',
        'text-embedding-3-small',
      ]);
    });

    test('should export correct Copilot proxy URL', () => {
      expect(COPILOT_PROXY_URL).toBe('https://copilot.s-x.workers.dev/v1');
    });

    test('should export correct embedding model', () => {
      expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
    });

    test('should have correct model class mappings', () => {
      expect(MODEL_CLASS_MAPPING[ModelClass.FAST]).toBe('gpt-5-mini');
      expect(MODEL_CLASS_MAPPING[ModelClass.BALANCED]).toBe('gpt-4o-mini');
      expect(MODEL_CLASS_MAPPING[ModelClass.QUALITY]).toBe('gpt-4.1');
    });
  });
});
