/**
 * Tests for PolicyRouter storage
 */

import {
  InMemoryAnchorStorage,
  KVAnchorStorage,
  createAnchorStorage,
} from '../../src/services/policyRouter/storage';
import { ModelClass } from '../../src/services/policyRouter';

describe('PolicyRouter Storage', () => {
  const mockAnchors = [
    {
      label: 'test1',
      modelClass: ModelClass.FAST,
      embedding: [0.1, 0.2, 0.3],
    },
    {
      label: 'test2',
      modelClass: ModelClass.BALANCED,
      embedding: [0.4, 0.5, 0.6],
    },
  ];

  describe('InMemoryAnchorStorage', () => {
    let storage: InMemoryAnchorStorage;

    beforeEach(() => {
      storage = new InMemoryAnchorStorage();
    });

    test('should initially return null', async () => {
      const result = await storage.get();
      expect(result).toBeNull();
    });

    test('should store and retrieve anchors', async () => {
      await storage.set(mockAnchors);
      const result = await storage.get();

      expect(result).toEqual(mockAnchors);
      expect(result?.length).toBe(2);
    });

    test('should overwrite previous anchors', async () => {
      await storage.set(mockAnchors);

      const newAnchors = [
        {
          label: 'new',
          modelClass: ModelClass.QUALITY,
          embedding: [0.7, 0.8, 0.9],
        },
      ];
      await storage.set(newAnchors);

      const result = await storage.get();
      expect(result).toEqual(newAnchors);
      expect(result?.length).toBe(1);
    });

    test('should handle empty array', async () => {
      await storage.set([]);
      const result = await storage.get();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('KVAnchorStorage', () => {
    let storage: KVAnchorStorage;
    let mockKV: any;

    beforeEach(() => {
      mockKV = {
        get: jest.fn(),
        put: jest.fn(),
      };
      storage = new KVAnchorStorage(mockKV);
    });

    test('should get anchors from KV', async () => {
      mockKV.get.mockResolvedValue(mockAnchors);

      const result = await storage.get();

      expect(mockKV.get).toHaveBeenCalledWith('policy_router_anchors', 'json');
      expect(result).toEqual(mockAnchors);
    });

    test('should return null on KV error', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'));

      const result = await storage.get();

      expect(result).toBeNull();
    });

    test('should store anchors in KV', async () => {
      mockKV.put.mockResolvedValue(undefined);

      await storage.set(mockAnchors);

      expect(mockKV.put).toHaveBeenCalledWith(
        'policy_router_anchors',
        JSON.stringify(mockAnchors)
      );
    });

    test('should throw error on KV put failure', async () => {
      mockKV.put.mockRejectedValue(new Error('KV put error'));

      await expect(storage.set(mockAnchors)).rejects.toThrow('KV put error');
    });

    test('should use custom key if provided', async () => {
      const customStorage = new KVAnchorStorage(mockKV, 'custom_key');
      mockKV.get.mockResolvedValue(mockAnchors);

      await customStorage.get();

      expect(mockKV.get).toHaveBeenCalledWith('custom_key', 'json');
    });
  });

  describe('createAnchorStorage factory', () => {
    test('should create InMemoryAnchorStorage when no KV provided', () => {
      const storage = createAnchorStorage();

      expect(storage).toBeInstanceOf(InMemoryAnchorStorage);
    });

    test('should create KVAnchorStorage when KV provided', () => {
      const mockKV = { get: jest.fn(), put: jest.fn() };
      const storage = createAnchorStorage(mockKV);

      expect(storage).toBeInstanceOf(KVAnchorStorage);
    });

    test('should create InMemoryAnchorStorage when undefined KV provided', () => {
      const storage = createAnchorStorage(undefined);

      expect(storage).toBeInstanceOf(InMemoryAnchorStorage);
    });
  });

  describe('Storage Integration', () => {
    test('InMemoryAnchorStorage should persist across multiple operations', async () => {
      const storage = new InMemoryAnchorStorage();

      await storage.set(mockAnchors);
      const result1 = await storage.get();
      const result2 = await storage.get();

      expect(result1).toEqual(result2);
      expect(result1).toEqual(mockAnchors);
    });

    test('should handle complex anchor structures', async () => {
      const storage = new InMemoryAnchorStorage();
      const complexAnchors = [
        {
          label: 'complex',
          modelClass: ModelClass.QUALITY,
          embedding: new Array(1536).fill(0).map((_, i) => i * 0.001),
        },
      ];

      await storage.set(complexAnchors);
      const result = await storage.get();

      expect(result).toEqual(complexAnchors);
      expect(result?.[0].embedding.length).toBe(1536);
    });
  });
});
