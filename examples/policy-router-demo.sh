#!/bin/bash

# PolicyRouter Example Usage
# This script demonstrates how to use the PolicyRouter feature

# Set your gateway URL
GATEWAY_URL="http://localhost:8787"

echo "=== PolicyRouter Examples ==="
echo ""

# Example 1: Explicit Model Selection
echo "1. Explicit Model Selection (Fast Path)"
echo "   Using model: gpt-4.1"
curl -X POST "${GATEWAY_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-use-policy-router: true" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
echo ""
echo ""

# Example 2: Model Class Selection
echo "2. Model Class Selection (Fast Path)"
echo "   Using model class: fast"
curl -X POST "${GATEWAY_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-use-policy-router: true" \
  -H "x-model-class: fast" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is 2+2?"}
    ]
  }'
echo ""
echo ""

echo "=== Examples Complete ==="
