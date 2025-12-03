/**
 * Integration tests for PolicyRouter with middleware
 * Updated to reflect always-on behavior with authentication
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
  const mockGatewaySecret = 'test-gateway-secret';

  beforeEach(() => {
    app = new Hono();
    // Create a mock PolicyRouter
    const router = new PolicyRouter(mockApiKey);
    setPolicyRouter(router);
  });

  afterEach(() => {
    setPolicyRouter(null);
  });

  describe('Authentication', () => {
    test('should return 401 when Authorization header is missing', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        return c.json({ success: true });
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

      expect(response.status).toBe(401);
      const data = (await response.json()) as any;
      expect(data.error.type).toBe('invalid_request_error');
      expect(data.error.code).toBe('authentication_required');
    });

    test('should return 401 when bearer token does not match', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-token',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      expect(response.status).toBe(401);
      const data = (await response.json()) as any;
      expect(data.error.type).toBe('invalid_request_error');
      expect(data.error.code).toBe('invalid_api_key');
    });

    test('should allow request when bearer token matches', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    test('should allow request when GATEWAY_SECRET is not configured', async () => {
      app.use('*', policyRouter);
      app.post('/v1/chat/completions', async (c: Context) => {
        return c.json({ success: true });
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

      expect(response.status).toBe(200);
    });
  });

  describe('Smart Routing Bypass', () => {
    test('should bypass routing for specific supported model (gpt-4.1)', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        return c.json({ enabled: isPolicyRouterEnabled });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBeUndefined(); // Should NOT route
    });

    test('should bypass routing for all supported models', async () => {
      const supportedModels = [
        'gpt-4.1',
        'gpt-4o-mini',
        'gpt-5-mini',
        'text-embedding-3-small',
      ];

      for (const model of supportedModels) {
        app = new Hono();
        const router = new PolicyRouter(mockApiKey);
        setPolicyRouter(router);

        app.use('*', (c, next) => {
          c.env = { GATEWAY_SECRET: mockGatewaySecret };
          return policyRouter(c, next);
        });
        app.post('/v1/chat/completions', async (c: Context) => {
          const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
          return c.json({ enabled: isPolicyRouterEnabled });
        });

        const response = await app.request('/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockGatewaySecret}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        });

        const data = (await response.json()) as any;
        expect(data.enabled).toBeUndefined(); // Should NOT route
      }
    });

    test('should apply routing for non-specific model', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ enabled: isPolicyRouterEnabled, decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBe(true); // Should route
      expect(data.decision).toBeDefined();
    });

    test('should apply routing when no model specified', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ enabled: isPolicyRouterEnabled, decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const data = (await response.json()) as any;
      expect(data.enabled).toBe(true);
      expect(data.decision).toBeDefined();
    });
  });

  describe('Model Class Header Integration', () => {
    test('should route based on model class header', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        const decision = (c as any).get('policyRouterDecision');
        return c.json({ decision });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
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
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
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

      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        const isPolicyRouterEnabled = (c as any).get('policyRouterEnabled');
        return c.json({ enabled: isPolicyRouterEnabled });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      // Should continue to handler even if router errors
      expect(response.status).toBe(200);
    });
  });

  describe('Endpoint Filtering', () => {
    test('should not apply to non-LLM endpoints', async () => {
      app.use('*', policyRouter);
      app.get('/v1/models', async (c: Context) => {
        return c.json({ models: [] });
      });

      const response = await app.request('/v1/models', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
    });

    test('should apply to /v1/chat/completions', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/chat/completions', async (c: Context) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      expect(response.status).toBe(200);
    });

    test('should apply to /v1/completions', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/completions', async (c: Context) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          prompt: 'Hello',
        }),
      });

      expect(response.status).toBe(200);
    });

    test('should apply to /v1/embeddings', async () => {
      app.use('*', (c, next) => {
        c.env = { GATEWAY_SECRET: mockGatewaySecret };
        return policyRouter(c, next);
      });
      app.post('/v1/embeddings', async (c: Context) => {
        return c.json({ success: true });
      });

      const response = await app.request('/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockGatewaySecret}`,
        },
        body: JSON.stringify({
          input: 'test text',
        }),
      });

      expect(response.status).toBe(200);
    });
  });
});
