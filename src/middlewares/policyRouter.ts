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
 * Applies when x-use-policy-router header is present
 */
export async function policyRouter(c: Context, next: Next): Promise<void> {
  // Check if PolicyRouter should be used
  const usePolicyRouter =
    c.req.header('x-use-policy-router') === 'true' ||
    c.req.header('x-portkey-policy-router') === 'true';

  if (!usePolicyRouter) {
    return next();
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

    // Set provider config headers
    c.req.raw.headers.set('x-portkey-provider', routingDecision.provider);
    c.req.raw.headers.set('x-portkey-api-key', routingDecision.apiKey);
    c.req.raw.headers.set('x-portkey-custom-host', COPILOT_PROXY_URL);

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
