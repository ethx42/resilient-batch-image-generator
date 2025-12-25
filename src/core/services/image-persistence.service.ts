/**
 * Image Persistence Service
 *
 * Handles saving generated images to the file system.
 * Provides consistent naming and URL generation for the dashboard.
 *
 * @module core/services/image-persistence
 */

import { basename, join } from 'node:path';
import { atomicWriteBuffer, ensureDirectory } from '../../utils/index.js';
import type { ImageMimeType } from '../../adapters/index.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * Service for persisting generated images to disk.
 *
 * Features:
 * - Atomic writes to prevent partial files
 * - Consistent zero-padded naming (img_0001.png)
 * - URL generation for dashboard serving
 * - Automatic directory creation
 *
 * @example
 * ```typescript
 * const persistence = new ImagePersistenceService('./output');
 *
 * const outputPath = await persistence.save(1, imageBuffer, 'image/png');
 * // → './output/img_0001.png'
 *
 * const url = persistence.getPublicUrl(outputPath);
 * // → '/output/img_0001.png'
 * ```
 */
export class ImagePersistenceService {
  private readonly logger: pino.Logger;
  private initialized = false;

  constructor(private readonly outputDir: string) {
    this.logger = createChildLogger(defaultLogger, {
      component: 'ImagePersistence',
      outputDir,
    });
  }

  /**
   * Save an image to disk.
   *
   * @param jobId - Job ID for filename generation
   * @param buffer - Image data
   * @param mimeType - Image MIME type for extension
   * @returns Absolute path to saved file
   */
  async save(jobId: number, buffer: Buffer, mimeType: ImageMimeType): Promise<string> {
    // Ensure output directory exists (lazy initialization)
    if (!this.initialized) {
      await this.ensureOutputDirectory();
      this.initialized = true;
    }

    const filename = this.generateFilename(jobId, mimeType);
    const outputPath = join(this.outputDir, filename);

    this.logger.debug(
      {
        jobId,
        filename,
        bufferSize: buffer.length,
      },
      'Saving image',
    );

    try {
      await atomicWriteBuffer(outputPath, buffer);

      this.logger.info(
        {
          jobId,
          outputPath,
          sizeKB: Math.round(buffer.length / 1024),
        },
        'Image saved successfully',
      );

      return outputPath;
    } catch (error) {
      this.logger.error(
        {
          jobId,
          outputPath,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to save image',
      );

      throw error;
    }
  }

  /**
   * Generate the public URL for a saved image.
   *
   * Used by the dashboard to display images via static serving.
   *
   * @param outputPath - Absolute path to the saved image
   * @returns URL path for dashboard access
   */
  getPublicUrl(outputPath: string): string {
    const filename = basename(outputPath);
    return `/output/${filename}`;
  }

  /**
   * Get the output directory path.
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a consistent filename for the image.
   *
   * Format: img_{id padded to 4 digits}.{extension}
   * Examples: img_0001.png, img_0032.png
   */
  private generateFilename(jobId: number, mimeType: ImageMimeType): string {
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const paddedId = String(jobId).padStart(4, '0');
    return `img_${paddedId}.${extension}`;
  }

  /**
   * Ensure the output directory exists.
   */
  private async ensureOutputDirectory(): Promise<void> {
    this.logger.debug('Ensuring output directory exists');
    await ensureDirectory(this.outputDir);
  }
}

