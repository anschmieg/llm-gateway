# PolicyRouter Configuration

The PolicyRouter provides intelligent semantic routing for your AI Gateway. For optimal performance, pre-compute anchor embeddings.

## Quick Setup

```bash
# 1. Set your API key
export COPILOT_API_KEY="your-key-here"

# 2. Generate embeddings
npm run precompute-anchors

# 3. Commit the generated file
git add src/services/policyRouter/precomputedAnchors.ts
```

**📖 Full documentation:** [docs/policy-router-setup.md](./docs/policy-router-setup.md)

## What happens if I skip this?

The system will work fine using heuristic-based routing (prompt length analysis). Pre-computing embeddings enables more accurate semantic classification.

## When to regenerate

- When customizing anchor texts
- When changing routing behavior
- After significant changes to your query patterns

Run `npm run precompute-anchors` again to regenerate.
