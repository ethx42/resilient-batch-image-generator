/**
 * Image Persistence Service
 *
 * Handles saving generated images to the file system.
 * Provides consistent naming and URL generation for the dashboard.
 * Embeds generation metadata (prompt, model) into image EXIF.
 *
 * @module core/services/image-persistence
 */

import { basename, join } from 'node:path';
import sharp from 'sharp';
import { atomicWriteBuffer, ensureDirectory } from '../../utils/index.js';
import type { ImageMimeType } from '../../adapters/index.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Types
// =============================================================================

/**
 * Metadata to embed in the generated image.
 */
export interface ImageMetadata {
  /** The prompt used to generate the image */
  readonly prompt: string;
  /** The AI model identifier */
  readonly model: string;
  /** Provider name (e.g., 'google-vertex') */
  readonly provider: string;
  /** Generation timestamp */
  readonly generatedAt: Date;
}

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
   * Save an image to disk with embedded metadata.
   *
   * @param jobId - Job ID for filename generation
   * @param buffer - Image data
   * @param mimeType - Image MIME type for extension
   * @param metadata - Generation metadata to embed in the image
   * @returns Absolute path to saved file
   */
  async save(
    jobId: number,
    buffer: Buffer,
    mimeType: ImageMimeType,
    metadata: ImageMetadata,
  ): Promise<string> {
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
        model: metadata.model,
      },
      'Saving image with metadata',
    );

    try {
      // Embed metadata into the image
      const bufferWithMetadata = await this.embedMetadata(buffer, mimeType, metadata);

      await atomicWriteBuffer(outputPath, bufferWithMetadata);

      this.logger.info(
        {
          jobId,
          outputPath,
          sizeKB: Math.round(bufferWithMetadata.length / 1024),
          model: metadata.model,
        },
        'Image saved successfully with metadata',
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

  /**
   * Embed generation metadata into the image.
   *
   * For PNG: Uses EXIF and XMP metadata
   * For JPEG: Uses EXIF metadata
   *
   * Metadata stored:
   * - ImageDescription: The generation prompt
   * - Software: Provider and model info
   * - Artist: "RBIG (Resilient Batch Image Generator)"
   * - Copyright: Generation timestamp
   */
  private async embedMetadata(
    buffer: Buffer,
    mimeType: ImageMimeType,
    metadata: ImageMetadata,
  ): Promise<Buffer> {
    try {
      // Build EXIF-compatible metadata
      // Note: EXIF fields have length limits, so we truncate if needed
      const description = metadata.prompt.slice(0, 2000); // EXIF limit
      const software = `RBIG/${metadata.provider}/${metadata.model}`;
      const timestamp = metadata.generatedAt.toISOString();

      // Create sharp instance and process
      let processor = sharp(buffer);

      if (mimeType === 'image/png') {
        // For PNG, use withMetadata with EXIF
        processor = processor
          .withMetadata({
            exif: {
              IFD0: {
                ImageDescription: description,
                Software: software,
                Artist: 'RBIG (Resilient Batch Image Generator)',
                Copyright: `Generated: ${timestamp}`,
              },
            },
          })
          .png();
      } else {
        // For JPEG
        processor = processor
          .withMetadata({
            exif: {
              IFD0: {
                ImageDescription: description,
                Software: software,
                Artist: 'RBIG (Resilient Batch Image Generator)',
                Copyright: `Generated: ${timestamp}`,
              },
            },
          })
          .jpeg({ quality: 95 });
      }

      return await processor.toBuffer();
    } catch (error) {
      // If metadata embedding fails, log warning and return original buffer
      this.logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to embed metadata, saving without metadata',
      );
      return buffer;
    }
  }
}

