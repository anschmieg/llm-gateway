# PolicyRouter - Native LLM Router for Cloudflare Workers

The PolicyRouter is a native intelligent routing system for the Portkey AI Gateway that implements the "0x Strategy" - a fast, semantic classification-based routing approach designed specifically for Cloudflare Workers.

## Overview

PolicyRouter automatically routes requests to the appropriate LLM model based on:
1. **Explicit model selection** (fastest path)
2. **Model class specification** (fast path)
3. **Semantic classification** (intelligent path using embeddings)

All requests are routed to the Copilot proxy (`https://copilot.s-x.workers.dev/v1`), ensuring OpenAI API compatibility while providing intelligent model selection.

## Supported Models

PolicyRouter supports the following model IDs:
- `gpt-4.1` - High quality model for complex tasks
- `gpt-4o-mini` - Balanced model for general use
- `gpt-5-mini` - Fast model for simple queries
- `text-embedding-3-small` - Embedding model

## Configuration

### Environment Variables

Set the following environment variable or Cloudflare Workers secret:

```bash
COPILOT_API_KEY=your-copilot-api-key-here
```

For Cloudflare Workers deployment:
```bash
wrangler secret put COPILOT_API_KEY
```

### Optional KV Storage

To persist anchor embeddings across deployments, configure a KV namespace:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "POLICY_ROUTER_KV"
id = "your-kv-namespace-id"
```

## Usage

### Enabling PolicyRouter

Enable PolicyRouter by adding one of these headers to your requests:

- `x-use-policy-router: true`
- `x-portkey-policy-router: true`

### Routing Strategies

#### 1. Explicit Model Selection (Fastest)

Specify the exact model you want to use:

```bash
curl https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-use-policy-router: true" \
  -d '{
    "model": "gpt-4.1",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### 2. Model Class Selection (Fast)

Use the `x-model-class` header to specify a model class:

```bash
curl https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-use-policy-router: true" \
  -H "x-model-class: fast" \
  -d '{
    "messages": [{"role": "user", "content": "What is 2+2?"}]
  }'
```

Available model classes:
- `fast` - Routes to `gpt-5-mini` for simple, quick responses
- `balanced` - Routes to `gpt-4o-mini` for general-purpose tasks
- `quality` - Routes to `gpt-4.1` for complex, high-quality responses

#### 3. Semantic Classification (Intelligent)

When neither model nor model class is specified, PolicyRouter uses semantic classification:

```bash
curl https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-use-policy-router: true" \
  -d '{
    "messages": [{"role": "user", "content": "Explain quantum mechanics"}]
  }'
```

The router will:
1. Extract the prompt from the request
2. Analyze prompt characteristics (length, complexity)
3. Select the appropriate model based on cost/quality/speed trade-offs

## Architecture

### Routing Logic

```
Request
  ↓
Is explicit model specified?
  ├─ Yes → Use specified model (fast path)
  └─ No → Is model class specified?
      ├─ Yes → Use model class mapping (fast path)
      └─ No → Semantic classification
          ├─ Get prompt embedding (if available)
          ├─ Compare with anchor embeddings
          └─ Select best matching model class
```

### Semantic Classification

When embeddings are available, PolicyRouter:
1. Calls the Copilot proxy to get an embedding for the prompt
2. Compares the embedding with pre-computed anchor embeddings
3. Selects the model class with the highest cosine similarity

When embeddings are unavailable (fallback), it uses heuristics based on:
- Prompt length
- Word count
- Complexity indicators

### Anchor Embeddings

Anchor embeddings are pre-computed representative prompts for each model class:

- **Fast anchors**: Simple, direct questions
- **Balanced anchors**: Moderate complexity queries
- **Quality anchors**: Complex analytical requests

Anchors are initialized at startup and can be stored in KV storage for persistence.

## Integration with OpenAI API

PolicyRouter is fully compatible with the OpenAI API standard and supports:

- `/v1/chat/completions` - Chat completion requests
- `/v1/completions` - Text completion requests  
- `/v1/embeddings` - Embedding generation requests

All responses follow the OpenAI API format, including:
- Standard response structures
- Error formats
- Streaming support
- Token counting

## Examples

### Python with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-gateway.com/v1",
    api_key="your-api-key"
)

# Automatic routing based on prompt complexity
response = client.chat.completions.create(
    model="gpt-4o-mini",  # Will be overridden by PolicyRouter
    messages=[
        {"role": "user", "content": "Explain quantum computing in detail"}
    ],
    extra_headers={
        "x-use-policy-router": "true"
    }
)
```

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://your-gateway.com/v1',
  apiKey: 'your-api-key'
});

// Use explicit model class
const response = await client.chat.completions.create({
  messages: [
    { role: 'user', content: 'Quick question: what time is it?' }
  ],
  extra_headers: {
    'x-use-policy-router': 'true',
    'x-model-class': 'fast'
  }
});
```

### cURL

```bash
# Automatic semantic routing
curl https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -H "x-use-policy-router: true" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Provide a comprehensive analysis of climate change impacts"
      }
    ]
  }'
```

## Performance

- **Fast path (explicit model)**: < 1ms routing overhead
- **Fast path (model class)**: < 1ms routing overhead
- **Semantic path (with embeddings)**: ~50-100ms (includes embedding API call)
- **Semantic path (heuristics)**: < 1ms

## Error Handling

PolicyRouter gracefully handles errors:

- If initialization fails, requests pass through normally
- If semantic classification fails, falls back to heuristic classification
- If heuristic classification fails, defaults to balanced model
- All errors are logged but don't block request processing

## Testing

Run PolicyRouter tests:

```bash
npm run test:gateway tests/policyRouter/
```

Test coverage includes:
- Explicit model routing
- Model class routing
- Semantic classification
- Heuristic fallback
- Edge cases and error handling
- Integration with middleware
- Storage operations

## Limitations

1. **Model Support**: Only the four specified Copilot models are supported
2. **Proxy**: Only routes to the Copilot proxy endpoint
3. **Embedding Model**: Uses `text-embedding-3-small` for semantic classification
4. **Network Dependency**: Semantic classification requires external API call

## Security

- API keys are stored securely in Cloudflare Workers secrets
- No sensitive data is logged
- All requests use HTTPS
- Compatible with existing gateway security features

## Future Enhancements

Potential improvements:
- Custom anchor embeddings via API
- Dynamic anchor updates based on usage patterns
- Cost tracking per model class
- Advanced classification models
- Multi-provider support
- A/B testing capabilities

## Troubleshooting

### PolicyRouter not activating

Ensure you're including the required header:
```bash
-H "x-use-policy-router: true"
```

### API key not found

Set the COPILOT_API_KEY environment variable or Cloudflare Workers secret.

### Semantic classification falling back to heuristics

This is normal when:
- Embeddings haven't been initialized yet
- Network issues prevent embedding API call
- API key is invalid

The router will still function using heuristic classification.

## Contributing

To add new features to PolicyRouter:

1. Update code in `src/services/policyRouter/`
2. Add middleware changes in `src/middlewares/policyRouter.ts`
3. Write comprehensive tests in `tests/policyRouter/`
4. Update this documentation
5. Submit a pull request

## License

PolicyRouter is part of the Portkey AI Gateway and follows the same MIT license.
