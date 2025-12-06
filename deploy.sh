#!/bin/bash
set -e # Exit immediately if a command fails

# --- CONFIG ---
ENV_FILE=".dev.vars"
TEMP_JSON="prod_secrets_temp.json"

echo "🚀 Starting Smart Deployment..."

# 1. Check for the env file
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

echo "🔍 Parsing secrets from $ENV_FILE..."

# 2. Convert .dev.vars to JSON using jq
# This logic:
# - Skips comments (#) and empty lines
# - Splits on the first '=' to separate Key and Value
# - Removes surrounding quotes (" or ') from values if present
# - Outputs a single JSON object
jq -R -s '
  split("\n") 
  | map(select(length > 0 and (test("^\\s*#") | not) and test("="))) 
  | map(
      split("=") 
      | { 
          (.[0] | sub("^\\s+";"") | sub("\\s+$";"")): 
          (.[1:] | join("=") | sub("^[\"\\047]";"") | sub("[\"\\047]$";"")) 
        }
    ) 
  | add
' "$ENV_FILE" > "$TEMP_JSON"

# 3. Bulk Upload to Cloudflare
echo "📤 Pushing secrets to Cloudflare Production..."
npx wrangler secret:bulk "$TEMP_JSON"

# 4. Cleanup
rm "$TEMP_JSON"
echo "✅ Secrets synced!"

# 5. Deploy Worker
echo "🚀 Deploying Worker Code..."
npx wrangler deploy

echo "🎉 Done! Production is live and synced."
