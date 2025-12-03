/**
 * Storage interface for PolicyRouter anchor embeddings
 * Supports both KV storage (Cloudflare Workers) and in-memory storage
 */

import { AnchorEmbedding } from './index';

export interface AnchorStorage {
  get(): Promise<AnchorEmbedding[] | null>;
  set(anchors: AnchorEmbedding[]): Promise<void>;
}

/**
 * In-memory storage implementation
 */
export class InMemoryAnchorStorage implements AnchorStorage {
  private anchors: AnchorEmbedding[] | null = null;

  async get(): Promise<AnchorEmbedding[] | null> {
    return this.anchors;
  }

  async set(anchors: AnchorEmbedding[]): Promise<void> {
    this.anchors = anchors;
  }
}

/**
 * Cloudflare KV storage implementation
 */
export class KVAnchorStorage implements AnchorStorage {
  private namespace: any; // KVNamespace type from Cloudflare Workers
  private key: string;

  constructor(namespace: any, key: string = 'policy_router_anchors') {
    this.namespace = namespace;
    this.key = key;
  }

  async get(): Promise<AnchorEmbedding[] | null> {
    try {
      const data = await this.namespace.get(this.key, 'json');
      return data;
    } catch (error) {
      console.error('Error reading from KV storage:', error);
      return null;
    }
  }

  async set(anchors: AnchorEmbedding[]): Promise<void> {
    try {
      await this.namespace.put(this.key, JSON.stringify(anchors));
    } catch (error) {
      console.error('Error writing to KV storage:', error);
      throw error;
    }
  }
}

/**
 * Create appropriate storage based on environment
 */
export function createAnchorStorage(kvNamespace?: any): AnchorStorage {
  if (kvNamespace) {
    return new KVAnchorStorage(kvNamespace);
  }
  return new InMemoryAnchorStorage();
}
