import { ProviderConfig } from './providers';

export interface ModelInfo {
  id: string;
  providerId: string;
  isCode: boolean;
}

export async function discoverModels(
  registry: ProviderConfig[],
  env: Record<string, string>
): Promise<ModelInfo[]> {
  const allModels: ModelInfo[] = [];

  const promises = registry.map(async (entry) => {
    const apiKey = env[entry.secretVar];
    if (!apiKey) return;

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${entry.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = (await res.json()) as { data: { id: string }[] };

      // --- FILTERING LOGIC ---
      data.data.forEach((m) => {
        const id = m.id.toLowerCase();

        // 1. WHITELIST CHECK (Strict Gate)
        // If a whitelist exists, the ID *must* match at least one pattern.
        if (entry.whitelist && entry.whitelist.length > 0) {
          const inWhitelist = entry.whitelist.some((pattern) =>
            id.includes(pattern.toLowerCase())
          );
          if (!inWhitelist) return; // SKIP this model
        }

        // 2. BLACKLIST CHECK (Safety Filter)
        // Even if it passed the whitelist, if it matches a blacklist pattern, it dies.
        if (entry.blacklist && entry.blacklist.length > 0) {
          const inBlacklist = entry.blacklist.some((pattern) =>
            id.includes(pattern.toLowerCase())
          );
          if (inBlacklist) return; // SKIP this model
        }

        // 3. Heuristic Learning (Same as before)
        const isCode =
          id.includes('code') ||
          id.includes('deepseek') ||
          id.includes('copilot');

        allModels.push({
          id: m.id,
          providerId: entry.id,
          isCode,
        });
      });
      console.log(`✅ Discovered ${data.data.length} models from ${entry.id}`);
    } catch (e) {
      console.warn(`❌ Failed to discover ${entry.id}`);
    }
  });

  await Promise.all(promises);
  return allModels;
}
