# PolicyRouter - Native LLM Router for Cloudflare Workers

The PolicyRouter is a native intelligent routing system for the Portkey AI Gateway that implements the "0x Strategy" - a fast, semantic classification-based routing approach designed specifically for Cloudflare Workers.

## Overview

PolicyRouter **automatically routes all requests** to the appropriate LLM model based on:
1. **Bypass for specific models** - Requests with supported model IDs pass through directly
2. **Model class specification** (fast path) - Use `x-model-class` header
3. **Semantic classification** (intelligent path using embeddings) - Auto-select based on prompt

All requests are routed to the Copilot proxy (`https://copilot.s-x.workers.dev/v1`), ensuring OpenAI API compatibility while providing intelligent model selection.

## Key Changes

- **Always Active**: PolicyRouter is now always active for LLM endpoints (no header required to enable)
- **Authentication Required**: Requests must include `Authorization: Bearer <GATEWAY_SECRET>` header
- **Smart Bypass**: Automatically bypasses routing for the 4 supported model IDs

## Supported Models

PolicyRouter supports the following model IDs:
- `gpt-4.1` - High quality model for complex tasks
- `gpt-4o-mini` - Balanced model for general use
- `gpt-5-mini` - Fast model for simple queries
- `text-embedding-3-small` - Embedding model

## Configuration

### Environment Variables

Set the following environment variables or Cloudflare Workers secrets:

```bash
COPILOT_API_KEY=your-copilot-api-key-here
GATEWAY_SECRET=your-authentication-secret-here
```

For Cloudflare Workers deployment:
```bash
wrangler secret put COPILOT_API_KEY
wrangler secret put GATEWAY_SECRET
```

## Authentication

**PolicyRouter enforces authentication** when `GATEWAY_SECRET` is configured. All requests must include a valid bearer token:

```bash
curl https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_SECRET" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

Returns 401 if:
- Authorization header is missing
- Bearer token doesn't match GATEWAY_SECRET

**Note:** If `GATEWAY_SECRET` is not configured, authentication is skipped.

## Usage

### Always Active

PolicyRouter is **always active** for:
- `/v1/chat/completions`
- `/v1/completions`  
- `/v1/embeddings`

### Routing Behavior

**1. Bypass for Supported Models**
If you specify a supported model, it's used directly (no routing):

```bash
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4.1", "messages": [{"role": "user", "content": "Hello"}]}'
```

**2. Model Class (Fast Path)**
Use `x-model-class` header:

```bash
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_SECRET" \
  -H "x-model-class: fast" \
  -d '{"messages": [{"role": "user", "content": "Quick question"}]}'
```

**3. Semantic Classification**
No model specified → automatic routing:

```bash
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_SECRET" \
  -d '{"messages": [{"role": "user", "content": "Complex analysis..."}]}'
```

## Testing

Run tests:
```bash
npm run test:gateway tests/policyRouter/
```

## Security

- Bearer token authentication required (when `GATEWAY_SECRET` configured)
- Returns OpenAI-compatible 401 errors
- All requests use HTTPS
- Secrets stored in Cloudflare Workers

For more details, see the full PolicyRouter implementation.
