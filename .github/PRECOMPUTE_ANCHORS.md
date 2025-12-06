# Pre-computing PolicyRouter Anchor Embeddings

## Overview

The PolicyRouter uses semantic similarity to classify prompts and route them to appropriate model tiers. To achieve this with zero runtime latency, anchor embeddings are pre-computed and bundled with the worker code.

## Files Created

1. **`scripts/precompute-anchors.ts`** - Script to generate embeddings
2. **`scripts/README.md`** - Documentation for the script
3. **`src/services/policyRouter/precomputedAnchors.ts`** - Generated embeddings (commit this!)
4. **`docs/policy-router-setup.md`** - Complete setup guide
5. **`POLICY_ROUTER.md`** - Quick reference in repo root

## NPM Script Added

```json
"precompute-anchors": "tsx scripts/precompute-anchors.ts"
```

## Usage

```bash
npm run precompute-anchors
```

This command:
1. Reads anchor texts from the script
2. Calls the embedding API for each text
3. Generates TypeScript file with embeddings
4. Displays summary and next steps

## Architecture Benefits

### Traditional Approach (❌ Problems)
- Embed anchors on every cold start → 3+ API calls → slow
- Store in KV → extra read latency on every request
- Depend on external API at runtime → reliability risk

### Pre-compute Approach (✅ Solutions)  
- Zero API calls at runtime
- Embeddings compiled into worker bundle
- No external dependencies after deployment
- Predictable, fast performance

## Maintenance

### When to Regenerate

- Anchor texts are modified
- Switching to different embedding model
- Optimizing for new query patterns
- API behavior changes significantly

### Version Control

**Always commit** the generated `precomputedAnchors.ts` file. It's part of your worker code, like any other TypeScript file.

```bash
git add src/services/policyRouter/precomputedAnchors.ts
git commit -m "Update PolicyRouter anchor embeddings"
```

## Fallback Behavior

If `precomputedAnchors.ts` is empty or missing, the system automatically falls back to heuristic classification based on:
- Prompt length
- Word count  
- Estimated complexity

This works well for basic routing but is less accurate than semantic classification.

## Customization

Edit `scripts/precompute-anchors.ts` to customize:

```typescript
const defaultAnchorTexts: AnchorText[] = [
  {
    label: 'my_custom_fast',
    text: 'Example of a fast query',
    modelClass: 'fast',
  },
  // Add more anchors as needed
];
```

Then regenerate with `npm run precompute-anchors`.
