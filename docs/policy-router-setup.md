# PolicyRouter Setup Guide

The PolicyRouter provides intelligent request routing based on semantic analysis of prompts. This guide explains how to set up and use pre-computed anchor embeddings for optimal performance.

## Overview

The PolicyRouter classifies incoming prompts into three tiers:
- **FAST**: Simple queries (e.g., "What is 2+2?")
- **BALANCED**: Medium complexity (e.g., "Explain machine learning")
- **QUALITY**: Complex analysis (e.g., research questions)

It uses two classification methods:
1. **Semantic (preferred)**: Compares prompt embeddings to pre-computed anchor embeddings
2. **Heuristic (fallback)**: Analyzes prompt length and complexity

## Why Pre-compute Embeddings?

✅ **Zero runtime latency** - No API calls during request handling  
✅ **Cost effective** - Generate embeddings once, use forever  
✅ **Reliable** - No dependency on external API availability  
✅ **Consistent** - Same behavior across all deployments  

## Setup Instructions

### Step 1: Generate Pre-computed Anchors

```bash
# Set your API key (must be valid and have access to embeddings API)
export COPILOT_API_KEY="your-copilot-api-key"

# Or add to .dev.vars file
echo "COPILOT_API_KEY=your-key-here" >> .dev.vars

# Run the precompute script
npm run precompute-anchors
```

**Expected output:**
```
🔄 Pre-computing anchor embeddings...

Computing embedding for: fast_simple_query
  ✓ 1536 dimensions

Computing embedding for: balanced_query
  ✓ 1536 dimensions

Computing embedding for: complex_quality_query
  ✓ 1536 dimensions

✅ Pre-computed anchors saved to:
   /path/to/src/services/policyRouter/precomputedAnchors.ts

📊 Summary:
   Anchors computed: 3
   Embedding dimensions: 1536
   Model: text-embedding-3-small

💡 Next steps:
   1. Review the generated file
   2. Commit it to your repository
   3. The worker will now use these pre-computed embeddings
```

### Step 2: Verify the Generated File

Check that `src/services/policyRouter/precomputedAnchors.ts` contains valid embeddings:

```typescript
export const PRECOMPUTED_ANCHORS: AnchorEmbedding[] = [
  {
    label: 'fast_simple_query',
    modelClass: ModelClass.FAST,
    embedding: [0.123, -0.456, ...] // Array of ~1536 numbers
  },
  // ... more anchors
];
```

### Step 3: Commit to Repository

```bash
git add src/services/policyRouter/precomputedAnchors.ts
git commit -m "Add pre-computed PolicyRouter anchor embeddings"
```

### Step 4: Deploy

The worker will automatically use the pre-computed embeddings on startup.

```bash
npm run deploy
```

## Customizing Anchor Texts

To customize what the router considers "fast", "balanced", or "quality":

1. Edit `scripts/precompute-anchors.ts`
2. Modify the `defaultAnchorTexts` array:
   ```typescript
   const defaultAnchorTexts: AnchorText[] = [
     {
       label: 'fast_simple_query',
       text: 'Your custom fast query example',
       modelClass: 'fast',
     },
     // ... customize other anchors
   ];
   ```
3. Re-run `npm run precompute-anchors`
4. Commit the updated file

## Troubleshooting

### Embedding API Errors

If you get errors like "internal error; reference = ..." or timeouts:

1. **Check your API key**: Ensure `COPILOT_API_KEY` is valid
2. **Verify API access**: Test the embeddings endpoint manually:
   ```bash
   curl -X POST https://copilot.s-x.workers.dev/v1/embeddings \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "text-embedding-3-small", "input": "test"}'
   ```
3. **Check API availability**: The copilot proxy might be overloaded or down

### Fallback Behavior

If embeddings can't be generated, the system will automatically use heuristic classification. You'll see this log message:

```
PolicyRouter: No pre-computed anchors available, using heuristic classification only
```

This is perfectly fine for basic routing! The heuristic method analyzes:
- Prompt length
- Word count
- Token estimate

### Regenerating Embeddings

Re-run the precompute script when:
- You change anchor texts
- You want to use a different embedding model
- The embedding API behavior changes
- You're optimizing for different query patterns

## Architecture Notes

**Why not compute at runtime?**
- Cold starts would require 3+ embedding API calls (slow)
- Costs accumulate with every worker instance
- External API dependency creates failure points

**Why not use KV storage?**
- KV reads add latency to every request
- Pre-computed = compiled into worker bundle = fastest possible

**Storage cost?**
- 3 anchors × 1536 dimensions × 8 bytes = ~36KB
- Negligible compared to typical worker bundle size
