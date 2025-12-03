/**
 * Integration tests for PolicyRouter with middleware
 */

import { Hono, Context } from 'hono';
import {
  policyRouter,
  initializePolicyRouter,
  setPolicyRouter,
} from '../../src/middlewares/policyRouter';
import { PolicyRouter, ModelClass } from '../../src/services/policyRouter';

describe('PolicyRouter Integration Tests', () => {
  let app: Hono;
  const mockApiKey = 'test-api-key-123';

  beforeEach(() => {
    app = new Hono();
    // Create a mock PolicyRouter
    const router = new PolicyRouter(mockApiKey);
    setPolicyRouter(router);
  });

  afterEach(() => {
    setPolicyRouter(null);
  });

  describe('Middleware Integration', () => {
    test('should not activate without header', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        return c.json({ enabled: isPolicyRouterEnabled });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBeUndefined();
    });

    test('should activate with x-use-policy-router header', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ enabled: isPolicyRouterEnabled, decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBe(true);
      expect(data.decision).toBeDefined();
      expect(data.decision.model).toBe('gpt-4.1');
    });

    test('should activate with x-portkey-policy-router header', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        return c.json({ enabled: isPolicyRouterEnabled });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portkey-policy-router': 'true',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBe(true);
    });

    test('should modify request body with selected model', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const modifiedBody = (c as any).get('policyRouterRequestBody');
        return c.json({ body: modifiedBody });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.body).toBeDefined();
      expect(data.body.model).toBe('gpt-4o-mini');
    });
  });

  describe('Model Class Header Integration', () => {
    test('should route based on model class header', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
          'x-model-class': 'fast',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.decision.model).toBe('gpt-5-mini');
    });
  });

  describe('Error Handling', () => {
    test('should continue normally on invalid JSON', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: 'invalid json',
      });

      // Should not crash, should continue to handler
      expect(response.status).toBe(200);
    });

    test('should continue normally when router throws error', async () => {
      // Set a router that will throw an error
      const errorRouter = new PolicyRouter(mockApiKey);
      errorRouter.route = jest.fn().mockRejectedValue(new Error('Test error'));
      setPolicyRouter(errorRouter);

      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        return c.json({ enabled: isPolicyRouterEnabled });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      // Should continue to handler even if router errors
      expect(response.status).toBe(200);
    });
  });

  describe('Different Request Types', () => {
    test('should work with chat completions', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.decision.model).toBe('gpt-4.1');
    });

    test('should work with completions', async () => {
      app.use('*', policyRouter);
      app.post('/v1/completions', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ decision });
      });

      const response = await app.request('/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          prompt: 'Complete this:',
        }),
      });

      const data = (await response.json()) as any;
      expect(data.decision.model).toBe('gpt-4o-mini');
    });

    test('should work with embeddings', async () => {
      app.use('*', policyRouter);
      app.post('/v1/embeddings', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ decision });
      });

      const response = await app.request('/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'embed this text',
        }),
      });

      const data = (await response.json()) as any;
      expect(data.decision.model).toBe('text-embedding-3-small');
    });
  });

  describe('Provider Configuration', () => {
    test('should set correct provider headers', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({
          decision,
          provider: decision?.provider,
          apiKey: decision?.apiKey,
        });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-use-policy-router': 'true',
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.provider).toBe('copilot');
      expect(data.apiKey).toBe(mockApiKey);
    });
  });
});
