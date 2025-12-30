/**
 * Mock Image Generator
 *
 * Test implementation of ImageGenerator for offline development.
 * Generates placeholder images without calling external APIs.
 *
 * @module adapters/mock.generator
 */

import type {
  ImageGenerator,
  GenerationOptions,
  GenerationResult,
} from './generator.interface.js';

// =============================================================================
// Mock Implementation
// =============================================================================

/**
 * Configuration for the mock generator.
 */
export interface MockGeneratorConfig {
  /** Simulated generation delay in milliseconds */
  readonly delayMs?: number;

  /** If true, randomly fail some generations */
  readonly simulateFailures?: boolean;

  /** Failure rate (0-1) when simulateFailures is true */
  readonly failureRate?: number;
}

/**
 * Mock image generator for testing and development.
 *
 * Features:
 * - Generates valid PNG data (1x1 pixel)
 * - Configurable delay to simulate API latency
 * - Optional failure simulation for testing error handling
 *
 * @example
 * ```typescript
 * // Fast mock for unit tests
 * const generator = new MockImageGenerator();
 *
 * // Slow mock for integration tests
 * const slowGenerator = new MockImageGenerator({ delayMs: 500 });
 *
 * // Flaky mock for chaos testing
 * const flakyGenerator = new MockImageGenerator({
 *   simulateFailures: true,
 *   failureRate: 0.3,
 * });
 * ```
 */
export class MockImageGenerator implements ImageGenerator {
  readonly providerName = 'mock';
  readonly modelId = 'mock-v1';

  private readonly delayMs: number;
  private readonly simulateFailures: boolean;
  private readonly failureRate: number;

  /** Counter for tracking generations (useful in tests) */
  public generationCount = 0;

  constructor(config: MockGeneratorConfig = {}) {
    this.delayMs = config.delayMs ?? 10;
    this.simulateFailures = config.simulateFailures ?? false;
    this.failureRate = config.failureRate ?? 0.1;
  }

  /**
   * Generate a mock image.
   *
   * Returns a valid 1x1 red PNG (67 bytes).
   */
  async generate(
    prompt: string,
    _options?: GenerationOptions,
  ): Promise<GenerationResult> {
    // Simulate API latency
    if (this.delayMs > 0) {
      await this.sleep(this.delayMs);
    }

    // Simulate random failures
    if (this.simulateFailures && Math.random() < this.failureRate) {
      throw new Error(`Mock generation failed (simulated failure) for prompt: ${prompt.slice(0, 50)}`);
    }

    this.generationCount++;

    return {
      buffer: this.createPlaceholderPng(),
      mimeType: 'image/png',
      generatedAt: new Date(),
    };
  }

  /**
   * Mock health check - always passes.
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Reset the generation counter (for tests).
   */
  reset(): void {
    this.generationCount = 0;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a minimal valid PNG image.
   *
   * This is a 1x1 red pixel PNG file.
   * Useful because it's a real, decodable image.
   */
  private createPlaceholderPng(): Buffer {
    // Minimal 1x1 red PNG (67 bytes)
    // Created with: convert -size 1x1 xc:red png:- | xxd -i
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe,
      0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
      0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }
}




