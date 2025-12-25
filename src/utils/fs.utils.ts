/**
 * File System Utilities
 *
 * Provides atomic file operations to prevent data corruption.
 * All file writes use the temp-file-then-rename pattern for atomicity.
 *
 * @module utils/fs
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { z } from 'zod';

// =============================================================================
// Custom Error Types
// =============================================================================

/**
 * Base error for file system operations.
 * Wraps Node.js errors with additional context.
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'mkdir',
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'FileSystemError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileSystemError);
    }
  }
}

/**
 * Thrown when file content fails Zod schema validation.
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly zodError: z.ZodError,
  ) {
    super(message);
    this.name = 'SchemaValidationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaValidationError);
    }
  }
}

/**
 * Thrown when state file is corrupted beyond recovery.
 */
export class StateCorruptionError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string,
  ) {
    super(`State file corrupted: ${filePath} - ${reason}`);
    this.name = 'StateCorruptionError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StateCorruptionError);
    }
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for Node.js file system errors.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

// =============================================================================
// Directory Operations
// =============================================================================

/**
 * Ensures a directory exists, creating it if necessary.
 * Uses recursive mkdir for nested paths.
 *
 * @param dirPath - Absolute or relative path to directory
 * @throws {FileSystemError} If directory creation fails
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'EEXIST') {
      // Directory already exists - this is fine
      return;
    }

    throw new FileSystemError(
      `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      dirPath,
      'mkdir',
      error instanceof Error ? error : undefined,
    );
  }
}

// =============================================================================
// Atomic Write Operations
// =============================================================================

/**
 * Atomically write JSON data to a file.
 *
 * Uses the temp-file-then-rename pattern:
 * 1. Write to a temporary file in the same directory
 * 2. Rename temp file to target (atomic on POSIX)
 *
 * This ensures the file is never in a partial state.
 *
 * @param filePath - Target file path
 * @param data - Data to serialize as JSON
 * @throws {FileSystemError} If write operation fails
 */
export async function atomicWriteJSON<T>(filePath: string, data: T): Promise<void> {
  // Ensure parent directory exists
  const dir = dirname(filePath);
  await ensureDirectory(dir);

  // Generate unique temp file name
  const tempPath = join(dir, `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);

  try {
    // Write to temp file with pretty formatting
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, content, 'utf-8');

    // Atomic rename (POSIX guarantees atomicity)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    throw new FileSystemError(
      `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      'write',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Atomically write a binary buffer to a file.
 *
 * Same atomic pattern as atomicWriteJSON but for binary data.
 *
 * @param filePath - Target file path
 * @param buffer - Binary data to write
 * @throws {FileSystemError} If write operation fails
 */
export async function atomicWriteBuffer(filePath: string, buffer: Buffer): Promise<void> {
  const dir = dirname(filePath);
  await ensureDirectory(dir);

  const tempPath = join(dir, `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);

  try {
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    throw new FileSystemError(
      `Failed to write buffer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      'write',
      error instanceof Error ? error : undefined,
    );
  }
}

// =============================================================================
// Safe Read Operations
// =============================================================================

/**
 * Safely read and validate a JSON file against a Zod schema.
 *
 * @param filePath - Path to JSON file
 * @param schema - Zod schema for validation
 * @returns Parsed and validated data, or null if file doesn't exist
 * @throws {StateCorruptionError} If JSON is malformed
 * @throws {SchemaValidationError} If content fails schema validation
 * @throws {FileSystemError} For other read errors
 */
export async function safeReadJSON<T>(
  filePath: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let content: string;

  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    // File doesn't exist - this is expected for first run
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }

    throw new FileSystemError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      'read',
      error instanceof Error ? error : undefined,
    );
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new StateCorruptionError(
      filePath,
      `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parse error'}`,
    );
  }

  // Validate against schema
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new SchemaValidationError(
      `File content does not match expected schema`,
      filePath,
      result.error,
    );
  }

  return result.data;
}

// =============================================================================
// File Existence Checks
// =============================================================================

/**
 * Check if a file exists.
 *
 * @param filePath - Path to check
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists.
 *
 * @param dirPath - Path to check
 * @returns true if directory exists, false otherwise
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

