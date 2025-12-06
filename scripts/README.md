# Scripts

Utility scripts for the LLM Gateway.

## precompute-anchors.ts

Pre-computes anchor embeddings for the PolicyRouter semantic classification system.

### What it does

This script generates embeddings for predefined "anchor" texts that represent different query complexities (fast, balanced, quality). These embeddings are used at runtime to classify incoming prompts and route them to the appropriate model tier.

### Why pre-compute?

- **Zero runtime latency**: No embedding API calls during request handling
- **Reliability**: No dependency on embedding API availability at runtime
- **Cost**: Only pay for embeddings once, not on every worker cold start
- **Reproducibility**: Committed embeddings ensure consistent behavior across deployments

### Usage

```bash
# Set your API key
export COPILOT_API_KEY="your-key-here"

# Or add to .dev.vars
echo "COPILOT_API_KEY=your-key-here" >> .dev.vars

# Run the script
npm run precompute-anchors
```

### Output

The script generates `src/services/policyRouter/precomputedAnchors.ts` containing the embedding vectors. This file should be committed to your repository.

### When to regenerate

- When you change anchor texts
- When you want to use a different embedding model
- When the embedding API behavior changes significantly

### Customization

To customize the anchor texts, edit the `defaultAnchorTexts` array in the script:

```typescript
const defaultAnchorTexts: AnchorText[] = [
  {
    label: 'fast_simple_query',
    text: 'Your custom anchor text here',
    modelClass: 'fast',
  },
  // ...
];
```
