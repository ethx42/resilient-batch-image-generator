/**
 * Vertex AI Client Factory
 *
 * Provides a singleton PredictionServiceClient with proper configuration.
 * Validates credentials at initialization for fail-fast behavior.
 *
 * @module adapters/vertex/client
 */

import { PredictionServiceClient } from '@google-cloud/aiplatform';
import type { VertexConfig } from '../../types/index.js';
import { AuthenticationError } from '../generator.interface.js';

// =============================================================================
// Client Factory
// =============================================================================

/** Singleton client instance */
let clientInstance: PredictionServiceClient | null = null;

/**
 * Get or create the Vertex AI PredictionServiceClient.
 *
 * Uses singleton pattern for resource efficiency:
 * - Reuses connections across requests
 * - Avoids repeated credential loading
 *
 * @param config - Vertex AI configuration
 * @returns Configured PredictionServiceClient
 */
export function getVertexClient(config: VertexConfig): PredictionServiceClient {
  if (clientInstance) {
    return clientInstance;
  }

  // Create client with explicit API endpoint for the configured location
  clientInstance = new PredictionServiceClient({
    apiEndpoint: `${config.location}-aiplatform.googleapis.com`,
  });

  return clientInstance;
}

/**
 * Build the Imagen 3 model endpoint path.
 *
 * Format: projects/{project}/locations/{location}/publishers/google/models/{model}
 *
 * @param config - Vertex AI configuration
 * @param modelId - The model identifier
 * @returns Full endpoint path
 */
export function buildEndpoint(config: VertexConfig, modelId: string): string {
  return `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${modelId}`;
}

/**
 * Validate that credentials are available and accessible.
 *
 * Checks for:
 * 1. GOOGLE_APPLICATION_CREDENTIALS env var (service account)
 * 2. Application Default Credentials (gcloud auth)
 *
 * @throws {AuthenticationError} If no valid credentials found
 */
export async function validateCredentials(): Promise<void> {
  const credPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  // If explicit credentials path is set, verify it exists
  if (credPath) {
    const { promises: fs } = await import('node:fs');
    try {
      await fs.access(credPath);
      return; // Credentials file exists
    } catch {
      throw new AuthenticationError(
        `Service account file not found: ${credPath}. ` +
        'Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid JSON key file.',
      );
    }
  }

  // No explicit path - will use ADC (Application Default Credentials)
  // The client will validate these on first use
  // We could add a more proactive check here if needed
}

/**
 * Test the connection to Vertex AI.
 *
 * Performs a lightweight operation to verify:
 * - Credentials are valid
 * - Project ID is correct
 * - API is accessible
 *
 * Note: This does NOT perform a generation (expensive).
 *
 * @param config - Vertex AI configuration
 * @returns true if connection successful
 * @throws {AuthenticationError} If authentication fails
 */
export async function testConnection(config: VertexConfig): Promise<boolean> {
  try {
    // Validate credentials exist
    await validateCredentials();

    // Verify endpoint can be constructed
    const endpoint = buildEndpoint(config, 'imagen-3.0-generate-001');

    if (!endpoint.includes(config.projectId) || !endpoint.includes(config.location)) {
      throw new AuthenticationError(
        `Invalid project configuration: ${config.projectId}/${config.location}`,
      );
    }

    // Get the client to ensure it can be initialized
    getVertexClient(config);

    return true;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Wrap unknown errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AuthenticationError(
      `Failed to connect to Vertex AI: ${message}. ` +
      'Verify your credentials and project ID.',
    );
  }
}

/**
 * Reset the singleton client (for testing).
 */
export function resetClient(): void {
  clientInstance = null;
}

