import { COPILOT_PROXY_URL, EMBEDDING_MODEL, COPILOT_API_KEY } from './api';

export async function getCopilotEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${COPILOT_PROXY_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${COPILOT_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text],
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.data[0].embedding;
}
