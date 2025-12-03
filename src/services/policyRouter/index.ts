/**
 * PolicyRouter - Native Portkey LLM router for Cloudflare Workers
 * Implements the "0x Strategy" with semantic classification routing
 */

import { Context } from 'hono';

// Supported model IDs
export const SUPPORTED_MODELS = [
  'gpt-4.1',
  'gpt-4o-mini',
  'gpt-5-mini',
  'text-embedding-3-small',
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

// Model classes for fast-path routing
export enum ModelClass {
  FAST = 'fast',
  BALANCED = 'balanced',
  QUALITY = 'quality',
}

// Copilot proxy configuration
export const COPILOT_PROXY_URL = 'https://copilot.s-x.workers.dev/v1';
export const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Anchor embeddings for semantic classification
 * These represent different types of requests
 */
export interface AnchorEmbedding {
  label: string;
  modelClass: ModelClass;
  embedding: number[];
}

/**
 * Default anchor embeddings (to be pre-computed at deploy time)
 * These are placeholder values - in production, these would be computed
 * from representative prompts for each category
 */
export const DEFAULT_ANCHORS: AnchorEmbedding[] = [
  {
    label: 'fast_simple_query',
    modelClass: ModelClass.FAST,
    embedding: [], // Will be populated at runtime
  },
  {
    label: 'balanced_query',
    modelClass: ModelClass.BALANCED,
    embedding: [], // Will be populated at runtime
  },
  {
    label: 'complex_quality_query',
    modelClass: ModelClass.QUALITY,
    embedding: [], // Will be populated at runtime
  },
];

/**
 * Model class to model ID mapping
 */
export const MODEL_CLASS_MAPPING: Record<ModelClass, SupportedModel> = {
  [ModelClass.FAST]: 'gpt-5-mini',
  [ModelClass.BALANCED]: 'gpt-4o-mini',
  [ModelClass.QUALITY]: 'gpt-4.1',
};

/**
 * PolicyRouter class - handles intelligent routing to Copilot proxy
 */
export class PolicyRouter {
  private copilotApiKey: string;
  private anchors: AnchorEmbedding[];

  constructor(copilotApiKey: string, anchors?: AnchorEmbedding[]) {
    this.copilotApiKey = copilotApiKey;
    this.anchors = anchors || DEFAULT_ANCHORS;
  }

  /**
   * Route a request based on the 0x Strategy
   * Fast path: explicit model or model class
   * Semantic path: use embeddings for classification
   */
  async route(
    request: any,
    requestHeaders: Record<string, string>
  ): Promise<{ model: SupportedModel; provider: string; apiKey: string }> {
    // Fast path: explicit model ID
    if (request.model && this.isValidModel(request.model)) {
      return {
        model: request.model as SupportedModel,
        provider: 'copilot',
        apiKey: this.copilotApiKey,
      };
    }

    // Fast path: explicit model class
    const modelClass = requestHeaders['x-model-class'] as ModelClass;
    if (modelClass && modelClass in MODEL_CLASS_MAPPING) {
      return {
        model: MODEL_CLASS_MAPPING[modelClass],
        provider: 'copilot',
        apiKey: this.copilotApiKey,
      };
    }

    // Semantic path: use embeddings for classification
    const prompt = this.extractPrompt(request);
    if (prompt) {
      const classifiedModelClass = await this.classifyPrompt(prompt);
      return {
        model: MODEL_CLASS_MAPPING[classifiedModelClass],
        provider: 'copilot',
        apiKey: this.copilotApiKey,
      };
    }

    // Default to balanced model
    return {
      model: MODEL_CLASS_MAPPING[ModelClass.BALANCED],
      provider: 'copilot',
      apiKey: this.copilotApiKey,
    };
  }

  /**
   * Check if a model ID is valid
   */
  private isValidModel(model: string): boolean {
    return SUPPORTED_MODELS.includes(model as SupportedModel);
  }

  /**
   * Extract prompt from request for semantic classification
   */
  private extractPrompt(request: any): string | null {
    // For chat completions
    if (request.messages && Array.isArray(request.messages)) {
      const lastMessage = request.messages[request.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        if (typeof lastMessage.content === 'string') {
          return lastMessage.content;
        } else if (
          Array.isArray(lastMessage.content) &&
          lastMessage.content.length > 0
        ) {
          // Handle content array (multimodal)
          const textContent = lastMessage.content.find(
            (c: any) => c.type === 'text'
          );
          return textContent?.text || null;
        }
      }
    }

    // For completions
    if (request.prompt) {
      if (typeof request.prompt === 'string') {
        return request.prompt;
      } else if (Array.isArray(request.prompt) && request.prompt.length > 0) {
        return request.prompt[0];
      }
    }

    // For embeddings
    if (request.input) {
      if (typeof request.input === 'string') {
        return request.input;
      } else if (Array.isArray(request.input) && request.input.length > 0) {
        return request.input[0];
      }
    }

    return null;
  }

  /**
   * Classify prompt using semantic embeddings
   */
  private async classifyPrompt(prompt: string): Promise<ModelClass> {
    try {
      // Get embedding for the prompt
      const promptEmbedding = await this.getEmbedding(prompt);

      // If anchors are not initialized, use heuristics
      if (
        !this.anchors.length ||
        this.anchors.every((a) => a.embedding.length === 0)
      ) {
        return this.heuristicClassification(prompt);
      }

      // Find closest anchor using cosine similarity
      let maxSimilarity = -1;
      let bestModelClass = ModelClass.BALANCED;

      for (const anchor of this.anchors) {
        if (anchor.embedding.length === 0) continue;

        const similarity = this.cosineSimilarity(
          promptEmbedding,
          anchor.embedding
        );
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestModelClass = anchor.modelClass;
        }
      }

      return bestModelClass;
    } catch (error) {
      console.error('Error in semantic classification:', error);
      // Fallback to heuristic classification
      return this.heuristicClassification(prompt);
    }
  }

  /**
   * Heuristic classification based on prompt characteristics
   * Used as fallback when embeddings are not available
   */
  private heuristicClassification(prompt: string): ModelClass {
    const length = prompt.length;
    const wordCount = prompt.split(/\s+/).length;

    // Simple heuristics - tuned thresholds
    if (length < 50 || wordCount < 10) {
      return ModelClass.FAST;
    } else if (length < 300 || wordCount < 50) {
      return ModelClass.BALANCED;
    } else {
      return ModelClass.QUALITY;
    }
  }

  /**
   * Get embedding for a text using Copilot proxy
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${COPILOT_PROXY_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.copilotApiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Embedding API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return (data as any).data[0].embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Initialize anchor embeddings at startup
   */
  async initializeAnchors(
    anchorTexts: Array<{ label: string; text: string; modelClass: ModelClass }>
  ): Promise<void> {
    const anchors: AnchorEmbedding[] = [];

    for (const { label, text, modelClass } of anchorTexts) {
      try {
        const embedding = await this.getEmbedding(text);
        anchors.push({ label, modelClass, embedding });
      } catch (error) {
        console.error(`Failed to initialize anchor ${label}:`, error);
      }
    }

    this.anchors = anchors;
  }

  /**
   * Get current anchors
   */
  getAnchors(): AnchorEmbedding[] {
    return this.anchors;
  }

  /**
   * Update anchors
   */
  setAnchors(anchors: AnchorEmbedding[]): void {
    this.anchors = anchors;
  }
}

/**
 * Create a PolicyRouter instance from environment
 */
export function createPolicyRouter(c: Context): PolicyRouter | null {
  // Get COPILOT_API_KEY from environment
  const copilotApiKey = c.env?.COPILOT_API_KEY || process.env.COPILOT_API_KEY;

  if (!copilotApiKey) {
    console.warn(
      'COPILOT_API_KEY not found in environment. PolicyRouter disabled.'
    );
    return null;
  }

  return new PolicyRouter(copilotApiKey);
}
