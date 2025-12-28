/**
 * Configuration Service
 *
 * Manages editable configuration (prompts and master aesthetic).
 * Persists changes to disk for persistence across restarts.
 *
 * Supports two prompt formats:
 * 1. Simple: Array of strings (backward compatible)
 * 2. Extended: Array of objects with text + reference image
 *
 * @module core/services/config
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DEFAULTS,
  type PromptInput,
  type ExtendedPrompt,
  isExtendedPrompt,
  getPromptText,
  PromptsConfigSchema,
} from "../../types/index.js";
import { createChildLogger, defaultLogger } from "../../config/logger.js";

// =============================================================================
// Constants
// =============================================================================

const AESTHETIC_FILE = "./config/aesthetic.txt";

const logger = createChildLogger(defaultLogger, { component: "ConfigService" });

// =============================================================================
// Types
// =============================================================================

export interface EditableConfig {
  masterAesthetic: string;
  prompts: string[];
  /** Extended prompts with reference information */
  promptsExtended: PromptInput[];
  /** Count of prompts that have references attached */
  promptsWithReferences: number;
}

// =============================================================================
// Config Service
// =============================================================================

export class ConfigService {
  private masterAesthetic: string = '';
  /** Raw prompts in extended format (may include simple strings) */
  private promptsRaw: PromptInput[] = [];
  private initialized = false;

  constructor() {
    // Master aesthetic is loaded from config/aesthetic.txt during initialize()
  }

  /**
   * Initialize by loading from files.
   * Falls back to constructor values if files don't exist.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load master aesthetic
    try {
      const aesthetic = await readFile(AESTHETIC_FILE, "utf-8");
      this.masterAesthetic = aesthetic.trim();
      logger.info("Loaded master aesthetic from file");
    } catch {
      // File doesn't exist, save initial value
      await this.saveMasterAesthetic(this.masterAesthetic);
      logger.info("Created aesthetic file with initial value");
    }

    // Load prompts (supports both simple and extended formats)
    try {
      const content = await readFile(DEFAULTS.PROMPTS_FILE, "utf-8");
      const data = JSON.parse(content) as unknown;

      // Validate against schema (accepts mixed simple/extended)
      const parseResult = PromptsConfigSchema.safeParse(data);

      if (parseResult.success) {
        this.promptsRaw = parseResult.data;
        const withRefs = this.promptsRaw.filter(isExtendedPrompt).length;
        logger.info(
          {
            count: this.promptsRaw.length,
            withReferences: withRefs,
          },
          "Loaded prompts from file"
        );
      } else {
        // Fallback for old format: { prompts: string[] }
        const legacy = data as { prompts?: string[] };
        if (legacy.prompts && Array.isArray(legacy.prompts)) {
          this.promptsRaw = legacy.prompts;
          logger.info(
            { count: this.promptsRaw.length },
            "Loaded prompts from legacy format"
          );
        } else {
          this.promptsRaw = [];
          logger.warn("Invalid prompts file format");
        }
      }
    } catch {
      this.promptsRaw = [];
      logger.warn("No prompts file found");
    }

    this.initialized = true;
  }

  /**
   * Get current configuration.
   */
  getConfig(): EditableConfig {
    const withRefs = this.promptsRaw.filter(isExtendedPrompt).length;
    return {
      masterAesthetic: this.masterAesthetic,
      prompts: this.promptsRaw.map(getPromptText),
      promptsExtended: [...this.promptsRaw],
      promptsWithReferences: withRefs,
    };
  }

  /**
   * Get master aesthetic.
   */
  getMasterAesthetic(): string {
    return this.masterAesthetic;
  }

  /**
   * Get prompts as plain text strings (for backward compatibility).
   */
  getPrompts(): string[] {
    return this.promptsRaw.map(getPromptText);
  }

  /**
   * Get prompts in their full format (may include references).
   */
  getPromptsExtended(): PromptInput[] {
    return [...this.promptsRaw];
  }

  /**
   * Get only the extended prompts that have references.
   */
  getPromptsWithReferences(): ExtendedPrompt[] {
    return this.promptsRaw.filter(isExtendedPrompt);
  }

  /**
   * Check if any prompts have references attached.
   */
  hasReferences(): boolean {
    return this.promptsRaw.some(isExtendedPrompt);
  }

  /**
   * Update master aesthetic.
   */
  async setMasterAesthetic(aesthetic: string): Promise<void> {
    this.masterAesthetic = aesthetic.trim();
    await this.saveMasterAesthetic(this.masterAesthetic);
    logger.info("Master aesthetic updated");
  }

  /**
   * Update prompts (accepts both simple strings and extended format).
   */
  async setPrompts(prompts: PromptInput[]): Promise<void> {
    this.promptsRaw = prompts.filter((p) => {
      const text = getPromptText(p);
      return text.trim().length > 0;
    });
    await this.savePrompts(this.promptsRaw);
    const withRefs = this.promptsRaw.filter(isExtendedPrompt).length;
    logger.info(
      { count: this.promptsRaw.length, withReferences: withRefs },
      "Prompts updated"
    );
  }

  /**
   * Add a single prompt.
   */
  async addPrompt(prompt: PromptInput): Promise<void> {
    const text = getPromptText(prompt);
    if (text.trim()) {
      this.promptsRaw.push(prompt);
      await this.savePrompts(this.promptsRaw);
    }
  }

  /**
   * Remove a prompt by index.
   */
  async removePrompt(index: number): Promise<void> {
    if (index >= 0 && index < this.promptsRaw.length) {
      this.promptsRaw.splice(index, 1);
      await this.savePrompts(this.promptsRaw);
    }
  }

  /**
   * Update a prompt by index.
   */
  async updatePrompt(index: number, prompt: PromptInput): Promise<void> {
    if (index >= 0 && index < this.promptsRaw.length) {
      this.promptsRaw[index] = prompt;
      await this.savePrompts(this.promptsRaw);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async saveMasterAesthetic(aesthetic: string): Promise<void> {
    await mkdir(dirname(AESTHETIC_FILE), { recursive: true });
    await writeFile(AESTHETIC_FILE, aesthetic, "utf-8");
  }

  private async savePrompts(prompts: PromptInput[]): Promise<void> {
    await mkdir(dirname(DEFAULTS.PROMPTS_FILE), { recursive: true });
    await writeFile(
      DEFAULTS.PROMPTS_FILE,
      JSON.stringify(prompts, null, 2),
      "utf-8"
    );
  }
}

