/**
 * PolicyRouter middleware
 * Intercepts requests and applies intelligent routing via PolicyRouter
 */

import { Context, Next } from 'hono';
import {
  PolicyRouter,
  createPolicyRouter,
  COPILOT_PROXY_URL,
  ModelClass,
} from '../services/policyRouter';
import { createAnchorStorage } from '../services/policyRouter/storage';

// Global PolicyRouter instance
let globalPolicyRouter: PolicyRouter | null = null;

/**
 * Initialize PolicyRouter with anchor embeddings
 */
export async function initializePolicyRouter(c: Context): Promise<void> {
  const router = createPolicyRouter(c);
  if (!router) {
    console.warn('PolicyRouter initialization skipped - no API key');
    return;
  }

  // Load anchors from storage if available
  const storage = createAnchorStorage(c.env?.POLICY_ROUTER_KV);
  const storedAnchors = await storage.get();

  if (storedAnchors && storedAnchors.length > 0) {
    router.setAnchors(storedAnchors);
    console.log(
      `PolicyRouter initialized with ${storedAnchors.length} stored anchors`
    );
  } else {
    // Initialize with default anchor texts
    const defaultAnchorTexts: Array<{
      label: string;
      text: string;
      modelClass: ModelClass;
    }> = [
      {
        label: 'fast_simple_query',
        text: 'What is 2+2?',
        modelClass: ModelClass.FAST,
      },
      {
        label: 'balanced_query',
        text: 'Explain the difference between machine learning and deep learning in a few sentences.',
        modelClass: ModelClass.BALANCED,
      },
      {
        label: 'complex_quality_query',
        text: 'Provide a comprehensive analysis of the economic impacts of climate change on developing nations, including specific case studies and policy recommendations.',
        modelClass: ModelClass.QUALITY,
      },
    ];

    await router.initializeAnchors(defaultAnchorTexts);
    console.log('PolicyRouter initialized with default anchors');

    // Store anchors for future use
    try {
      await storage.set(router.getAnchors());
    } catch (error) {
      console.error('Failed to store anchors:', error);
    }
  }

  globalPolicyRouter = router;
}

/**
 * PolicyRouter middleware function
 * Always active - validates authentication and routes intelligently
 */
export async function policyRouter(c: Context, next: Next): Promise<void> {
  // Get the request path to determine if this is an endpoint we should handle
  const path = c.req.path;
  const shouldHandleEndpoint =
    path === '/v1/chat/completions' ||
    path === '/v1/completions' ||
    path === '/v1/embeddings';

  if (!shouldHandleEndpoint) {
    return next();
  }

  // Verify authentication - check bearer token against GATEWAY_SECRET
  const authHeader = c.req.header('Authorization');
  const gatewaySecret = c.env?.GATEWAY_SECRET || process.env.GATEWAY_SECRET;

  if (!gatewaySecret) {
    // No secret configured - allow through (for backwards compatibility)
    console.warn('GATEWAY_SECRET not configured - skipping authentication');
  } else {
    // Verify bearer token
    if (!authHeader) {
      return c.json(
        {
          error: {
            message:
              'Authentication required. Please provide a valid bearer token.',
            type: 'invalid_request_error',
            param: null,
            code: 'authentication_required',
          },
        },
        401
      );
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== gatewaySecret) {
      return c.json(
        {
          error: {
            message: 'Invalid authentication credentials.',
            type: 'invalid_request_error',
            param: null,
            code: 'invalid_api_key',
          },
        },
        401
      );
    }
  }

  // Initialize router if not already done
  if (!globalPolicyRouter) {
    await initializePolicyRouter(c);
  }

  if (!globalPolicyRouter) {
    // PolicyRouter not available, continue normally
    return next();
  }

  try {
    // Parse request body
    const rawBody = await c.req.text();
    let requestBody: any;
    try {
      requestBody = JSON.parse(rawBody);
    } catch (e) {
      // If body is not JSON, continue normally
      return next();
    }

    // Check if model is "specific enough" - if it's one of our supported models, use it directly
    const requestedModel = requestBody.model;
    const isSupportedModel =
      requestedModel &&
      (requestedModel === 'gpt-4.1' ||
        requestedModel === 'gpt-4o-mini' ||
        requestedModel === 'gpt-5-mini' ||
        requestedModel === 'text-embedding-3-small');

    if (isSupportedModel) {
      // Model is specific enough - use it directly without routing logic
      console.log(
        `PolicyRouter: Using explicitly requested model ${requestedModel}`
      );
      // Continue to handler with the model as-is
      return next();
    }

    // Model is not specific enough or not provided - apply PolicyRouter logic
    // Get request headers
    const requestHeaders = Object.fromEntries(c.req.raw.headers);

    // Route the request
    const routingDecision = await globalPolicyRouter.route(
      requestBody,
      requestHeaders
    );

    // Override provider configuration in request
    c.set('policyRouterEnabled', true);
    c.set('policyRouterDecision', routingDecision);

    // Store routing decision in context so handlers can pick it up without mutating immutable headers
    c.set('policyRouterEnabled', true);
    c.set('policyRouterDecision', {
      provider: routingDecision.provider,
      apiKey: routingDecision.apiKey,
      customHost: COPILOT_PROXY_URL,
      model: routingDecision.model,
    });

    // Update model in request body
    requestBody.model = routingDecision.model;

    // Store modified request body for handler
    c.set('policyRouterRequestBody', requestBody);

    console.log(`PolicyRouter: Routed to model ${routingDecision.model}`);
  } catch (error) {
    console.error('PolicyRouter error:', error);
    // On error, continue with normal flow
  }

  await next();
}

/**
 * Get the global PolicyRouter instance
 */
export function getPolicyRouter(): PolicyRouter | null {
  return globalPolicyRouter;
}

/**
 * Set the global PolicyRouter instance (for testing)
 */
export function setPolicyRouter(router: PolicyRouter | null): void {
  globalPolicyRouter = router;
}
