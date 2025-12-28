# RBIG Development Plan

**Project:** Resilient Batch Image Generator  
**Version:** 2.1.0  
**Architect:** The Resilient Architect  
**Methodology:** Iterative Milestone-Driven Development  
**Estimated Duration:** 5-7 Days (Full-time) | 2-3 Weeks (Part-time)

---

## 📋 Executive Summary

This document outlines the complete development roadmap for RBIG, structured into **5 Milestones** with **15 discrete phases**. Each phase delivers incremental, testable value while building toward the complete system.

### Guiding Principles

1. **Vertical Slices:** Each milestone delivers end-to-end functionality, not horizontal layers.
2. **Fail Fast:** Infrastructure and contracts are validated before business logic.
3. **Test at Boundaries:** Validate each layer independently before integration.
4. **Zero-Config Goal:** Every commit should leave the system in a runnable state.

### Architecture Layers (Reference)

```
┌─────────────────────────────────────────────────────────────┐
│                    📊 OBSERVER (Dashboard)                   │
│              Fastify + SSE + Single-File HTML               │
├─────────────────────────────────────────────────────────────┤
│                    🎯 ORCHESTRATOR (Core)                    │
│           Batch Loop + Concurrency + Error Handler          │
├──────────────────────────┬──────────────────────────────────┤
│  💾 STATE MANAGER        │       🤖 STRATEGY LAYER          │
│  JobRepository (JSON)    │       ImageGenerator Interface   │
│  Atomic Writes           │       VertexImagen3Strategy      │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 🏁 Milestone 0: Project Bootstrap & Contracts

**Goal:** Establish the foundation — tooling, types, and architectural contracts.  
**Duration:** 0.5 days  
**Risk Level:** 🟢 Low

### Phase 0.1: Development Environment Setup

**Objective:** Configure TypeScript with strict mode and essential tooling.

#### Deliverables

| Artifact        | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `package.json`  | Dependencies: typescript, tsx, zod, pino, fastify, @google-cloud/aiplatform |
| `tsconfig.json` | Strict mode enabled with all safety flags                                   |
| `.env.example`  | Template for required environment variables                                 |
| `.gitignore`    | Node modules, output, logs, .env                                            |
| `src/index.ts`  | Empty entry point (compiles successfully)                                   |

#### Tasks

- [ ] Initialize project with `type: "module"` (yarn init)
- [ ] Install production dependencies
- [ ] Install dev dependencies (typescript, @types/node, tsx)
- [ ] Configure `tsconfig.json` with strict settings
- [ ] Add yarn scripts: `dev`, `build`, `start`, `typecheck`
- [ ] Create `.env.example` with documented variables
- [ ] Verify `yarn build` succeeds

#### Acceptance Criteria

```bash
yarn build      # ✅ Compiles without errors
yarn typecheck  # ✅ No type errors
```

---

### Phase 0.2: Domain Types & Zod Schemas

**Objective:** Define all data contracts before any implementation.

#### Deliverables

| Artifact                    | Description                                |
| --------------------------- | ------------------------------------------ |
| `src/types/job.types.ts`    | Job interface, JobStatus enum, Zod schemas |
| `src/types/events.types.ts` | SSE event types (discriminated union)      |
| `src/types/config.types.ts` | Environment schema, constants types        |
| `src/types/index.ts`        | Barrel export                              |

#### Type Definitions

```typescript
// src/types/job.types.ts
import { z } from "zod";

export const JobStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "DONE",
  "FAILED",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobSchema = z.object({
  id: z.number().int().positive(),
  prompt: z.string().min(1).max(2000),
  status: JobStatusSchema,
  outputPath: z.string().optional(),
  retries: z.number().int().min(0).default(0),
  errorLog: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Job = z.infer<typeof JobSchema>;

export const JobsFileSchema = z.object({
  version: z.string(),
  jobs: z.array(JobSchema),
});

export type JobsFile = z.infer<typeof JobsFileSchema>;
```

#### Tasks

- [ ] Define `JobStatus` as Zod enum
- [ ] Define `Job` schema with all fields
- [ ] Define `JobsFile` wrapper schema (for file structure)
- [ ] Define SSE event types as discriminated union
- [ ] Define environment config schema
- [ ] Create barrel export (`index.ts`)

#### Acceptance Criteria

- All types compile with zero `any`
- Zod schemas match SRD specification exactly
- Types are importable from `@/types`

---

### Phase 0.3: Strategy Interface Contract

**Objective:** Define the ImageGenerator interface (Strategy Pattern contract).

#### Deliverables

| Artifact                              | Description              |
| ------------------------------------- | ------------------------ |
| `src/adapters/generator.interface.ts` | ImageGenerator interface |
| `src/adapters/index.ts`               | Barrel export            |

#### Interface Definition

```typescript
// src/adapters/generator.interface.ts
export interface GenerationOptions {
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  safetyFilterLevel?: "block_none" | "block_few" | "block_some" | "block_most";
}

export interface GenerationResult {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  generatedAt: Date;
}

export interface ImageGenerator {
  readonly providerName: string;
  readonly modelId: string;

  generate(
    prompt: string,
    options?: GenerationOptions
  ): Promise<GenerationResult>;

  healthCheck(): Promise<boolean>;
}
```

#### Tasks

- [ ] Define `GenerationOptions` type
- [ ] Define `GenerationResult` type
- [ ] Define `ImageGenerator` interface with JSDoc
- [ ] Add `healthCheck()` method for infrastructure validation
- [ ] Export from barrel

#### Acceptance Criteria

- Interface is framework-agnostic (no Vertex-specific types)
- Contract supports future adapters (SDXL, DALL-E)
- All methods have explicit return types

---

## 🏁 Milestone 1: State Management Layer

**Goal:** Implement persistent, atomic state management with the Repository pattern.  
**Duration:** 1 day  
**Risk Level:** 🟡 Medium (file system operations)

### Phase 1.1: File System Utilities

**Objective:** Create atomic file operation primitives.

#### Deliverables

| Artifact                | Description               |
| ----------------------- | ------------------------- |
| `src/utils/fs.utils.ts` | Atomic read/write helpers |
| `src/utils/index.ts`    | Barrel export             |

#### Implementation Notes

```typescript
// Atomic write pattern using rename
export async function atomicWriteJSON<T>(
  filePath: string,
  data: T
): Promise<void> {
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempPath, filePath); // Atomic on POSIX
}
```

#### Tasks

- [ ] Implement `atomicWriteJSON()` with temp file + rename
- [ ] Implement `safeReadJSON()` with Zod validation
- [ ] Implement `ensureDirectory()` for scaffolding
- [ ] Add error wrapping with custom `FileSystemError`
- [ ] Add file locking mechanism (optional, for concurrency)

#### Acceptance Criteria

- Write operations are atomic (no partial writes)
- Read operations validate against Zod schema
- Errors are wrapped with context

---

### Phase 1.2: Job Repository Implementation

**Objective:** Implement the JobRepository with all CRUD operations.

#### Deliverables

| Artifact                           | Description         |
| ---------------------------------- | ------------------- |
| `src/core/state/job.repository.ts` | JobRepository class |
| `src/core/state/index.ts`          | Barrel export       |

#### Repository Interface

```typescript
export interface IJobRepository {
  // Queries
  findAll(): Promise<Job[]>;
  findById(id: number): Promise<Job | null>;
  findByStatus(status: JobStatus): Promise<Job[]>;
  findNextPending(): Promise<Job | null>;

  // Commands
  save(job: Job): Promise<void>;
  updateStatus(
    id: number,
    status: JobStatus,
    metadata?: Partial<Job>
  ): Promise<void>;

  // Batch
  initializeFromPrompts(prompts: string[]): Promise<void>;

  // Stats
  getStats(): Promise<{
    pending: number;
    processing: number;
    done: number;
    failed: number;
  }>;
}
```

#### Tasks

- [ ] Define `IJobRepository` interface
- [ ] Implement `JsonJobRepository` class
- [ ] Implement `findAll()` with schema validation
- [ ] Implement `findById()` with null safety
- [ ] Implement `findByStatus()` filter
- [ ] Implement `findNextPending()` for orchestrator
- [ ] Implement `save()` with atomic write
- [ ] Implement `updateStatus()` with timestamp update
- [ ] Implement `initializeFromPrompts()` for fresh start
- [ ] Implement `getStats()` for dashboard

#### Acceptance Criteria

```typescript
// Test scenario
const repo = new JsonJobRepository("./jobs.json");
await repo.initializeFromPrompts(["prompt 1", "prompt 2"]);
const pending = await repo.findNextPending();
assert(pending?.id === 1);
await repo.updateStatus(1, "PROCESSING");
const updated = await repo.findById(1);
assert(updated?.status === "PROCESSING");
```

- File survives process restart
- Concurrent writes don't corrupt state
- Schema violations throw `StateCorruptionError`

---

### Phase 1.3: State Manager Facade

**Objective:** Create a high-level facade that combines repository with business logic.

#### Deliverables

| Artifact                          | Description        |
| --------------------------------- | ------------------ |
| `src/core/state/state-manager.ts` | StateManager class |

#### Responsibilities

```typescript
export class StateManager {
  constructor(private readonly repository: IJobRepository) {}

  // High-level operations
  async claimNextJob(): Promise<Job | null>; // Find + mark PROCESSING atomically
  async markComplete(jobId: number, outputPath: string): Promise<void>;
  async markFailed(jobId: number, error: Error): Promise<void>;
  async shouldRetry(job: Job): Promise<boolean>;
  async resetForRetry(jobId: number): Promise<void>;
}
```

#### Tasks

- [ ] Implement `claimNextJob()` with atomic transition
- [ ] Implement `markComplete()` with output path
- [ ] Implement `markFailed()` with error logging
- [ ] Implement retry logic (`shouldRetry`, `resetForRetry`)
- [ ] Add event hooks for SSE integration

#### Acceptance Criteria

- `claimNextJob()` prevents double-processing
- Failed jobs with retries < MAX are retryable
- State transitions are logged

---

## 🏁 Milestone 2: AI Strategy Layer

**Goal:** Implement the Vertex AI Imagen 3 adapter with proper error handling.  
**Duration:** 1 day  
**Risk Level:** 🔴 High (external API dependency)

### Phase 2.1: Vertex AI Client Setup

**Objective:** Configure and validate Google Cloud credentials and API access.

#### Deliverables

| Artifact                        | Description              |
| ------------------------------- | ------------------------ |
| `src/adapters/vertex/client.ts` | Vertex AI client factory |
| `src/config/env.ts`             | Environment validation   |

#### Environment Schema

```typescript
const EnvSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1, "GCP project ID is required"),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  MAX_RETRIES: z.coerce.number().default(3),
  RATE_LIMIT_MS: z.coerce.number().default(2000),
});
// Note: Master aesthetic is loaded from config/aesthetic.txt via ConfigService
```

#### Tasks

- [ ] Create environment validation module
- [ ] Implement Vertex AI client factory
- [ ] Add credential detection (ADC vs service account)
- [ ] Implement connection test method
- [ ] Add graceful error messages for auth failures

#### Acceptance Criteria

- Missing credentials fail fast with clear message
- Invalid project ID detected before first API call
- Client is singleton (resource efficiency)

---

### Phase 2.2: Imagen 3 Strategy Implementation

**Objective:** Implement the VertexImagen3Strategy adapter.

#### Deliverables

| Artifact                                  | Description             |
| ----------------------------------------- | ----------------------- |
| `src/adapters/vertex/imagen3.strategy.ts` | Strategy implementation |
| `src/adapters/vertex/index.ts`            | Barrel export           |

#### Implementation Reference (from SRD)

```typescript
export class VertexImagen3Strategy implements ImageGenerator {
  readonly providerName = "google-vertex";
  readonly modelId = "imagen-3.0-generate-001";

  private readonly client: PredictionServiceClient;
  private readonly endpoint: string;

  constructor(private readonly config: VertexConfig) {
    this.client = new PredictionServiceClient();
    this.endpoint = `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${this.modelId}`;
  }

  async generate(
    prompt: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    const fullPrompt = this.config.masterAesthetic
      ? `${this.config.masterAesthetic}. ${prompt}`
      : prompt;

    const instance = helpers.toValue({ prompt: fullPrompt });
    const parameters = helpers.toValue({
      sampleCount: 1,
      aspectRatio: options?.aspectRatio ?? "1:1",
      safetyFilterLevel: options?.safetyFilterLevel ?? "block_some",
    });

    const [response] = await this.client.predict({
      endpoint: this.endpoint,
      instances: [instance],
      parameters,
    });

    // Extract and validate response
    const prediction = response.predictions?.[0];
    if (!prediction) {
      throw new VertexApiError("No prediction returned", 500, true);
    }

    const b64 = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;
    if (!b64) {
      throw new VertexApiError("Invalid response structure", 500, false);
    }

    return {
      buffer: Buffer.from(b64, "base64"),
      mimeType: "image/png",
      generatedAt: new Date(),
    };
  }

  async healthCheck(): Promise<boolean> {
    // Lightweight check - just validate endpoint exists
    // Could also do a minimal generation test
    return true;
  }
}
```

#### Tasks

- [ ] Implement `VertexImagen3Strategy` class
- [ ] Add master aesthetic prompt injection
- [ ] Implement proper Base64 extraction
- [ ] Create `VertexApiError` custom error class
- [ ] Add response validation
- [ ] Implement `healthCheck()` method
- [ ] Add request/response logging (debug level)

#### Acceptance Criteria

- Generates valid PNG buffer
- Master aesthetic is prepended correctly
- API errors are wrapped with retry hints
- Rate limiting is respected

---

### Phase 2.3: Generator Factory

**Objective:** Create factory for instantiating generators (future-proofing).

#### Deliverables

| Artifact                            | Description            |
| ----------------------------------- | ---------------------- |
| `src/adapters/generator.factory.ts` | Factory implementation |

#### Implementation

```typescript
export type GeneratorProvider = "vertex-imagen3" | "mock";

export class GeneratorFactory {
  static create(
    provider: GeneratorProvider,
    config: EnvConfig
  ): ImageGenerator {
    switch (provider) {
      case "vertex-imagen3":
        return new VertexImagen3Strategy({
          projectId: config.GOOGLE_CLOUD_PROJECT,
          location: config.GOOGLE_CLOUD_LOCATION,
          masterAesthetic: options.masterAesthetic, // From ConfigService
        });

      case "mock":
        return new MockImageGenerator(); // For testing

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

#### Tasks

- [ ] Define `GeneratorProvider` type
- [ ] Implement `GeneratorFactory.create()`
- [ ] Add `MockImageGenerator` for testing
- [ ] Add provider validation

#### Acceptance Criteria

- Factory decouples instantiation from usage
- Mock generator enables offline testing
- Invalid providers throw descriptive errors

---

## 🏁 Milestone 3: Orchestrator Core

**Goal:** Implement the main processing loop with event emission.  
**Duration:** 1 day  
**Risk Level:** 🟡 Medium

### Phase 3.1: Event Bus Implementation

**Objective:** Create the internal event system for SSE broadcasting.

#### Deliverables

| Artifact                       | Description             |
| ------------------------------ | ----------------------- |
| `src/core/events/event-bus.ts` | EventBus implementation |
| `src/core/events/index.ts`     | Barrel export           |

#### Implementation

```typescript
import { EventEmitter } from "events";

export type SystemEvent =
  | { type: "INIT"; payload: { jobs: Job[] } }
  | {
      type: "STATUS_UPDATE";
      payload: { jobId: number; status: JobStatus; error?: string };
    }
  | { type: "IMAGE_READY"; payload: { jobId: number; imageUrl: string } }
  | { type: "BATCH_COMPLETE"; payload: { stats: JobStats } };

export class EventBus {
  private readonly emitter = new EventEmitter();

  emit(event: SystemEvent): void {
    this.emitter.emit("system", event);
  }

  subscribe(handler: (event: SystemEvent) => void): () => void {
    this.emitter.on("system", handler);
    return () => this.emitter.off("system", handler);
  }

  // For SSE - returns async iterator
  [Symbol.asyncIterator](): AsyncIterator<SystemEvent> {
    // Implementation for streaming
  }
}
```

#### Tasks

- [ ] Define all `SystemEvent` types
- [ ] Implement `EventBus` with Node.js EventEmitter
- [ ] Add `subscribe()` with unsubscribe function
- [ ] Add async iterator for SSE streaming
- [ ] Add event logging (debug level)

#### Acceptance Criteria

- Events are type-safe (discriminated union)
- Multiple subscribers supported
- Memory leaks prevented (proper cleanup)

---

### Phase 3.2: Image Persistence Service

**Objective:** Handle saving generated images to disk.

#### Deliverables

| Artifact                                         | Description        |
| ------------------------------------------------ | ------------------ |
| `src/core/services/image-persistence.service.ts` | Image saving logic |

#### Implementation

```typescript
export class ImagePersistenceService {
  constructor(private readonly outputDir: string) {}

  async save(jobId: number, buffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType === "image/png" ? "png" : "jpg";
    const filename = `img_${String(jobId).padStart(4, "0")}.${extension}`;
    const outputPath = path.join(this.outputDir, filename);

    await fs.writeFile(outputPath, buffer);

    return outputPath;
  }

  getPublicUrl(outputPath: string): string {
    // Convert file path to URL for dashboard
    return `/output/${path.basename(outputPath)}`;
  }
}
```

#### Tasks

- [ ] Implement `ImagePersistenceService`
- [ ] Add filename generation with padding
- [ ] Add public URL generation for dashboard
- [ ] Ensure output directory exists
- [ ] Add error handling for disk full scenarios

#### Acceptance Criteria

- Images saved with consistent naming: `img_0001.png`
- Public URLs are valid for static serving
- Disk errors are caught and logged

---

### Phase 3.3: Orchestrator Implementation

**Objective:** Implement the main batch processing loop.

#### Deliverables

| Artifact                   | Description        |
| -------------------------- | ------------------ |
| `src/core/orchestrator.ts` | Orchestrator class |

#### Implementation

```typescript
export class Orchestrator {
  private isRunning = false;
  private shouldStop = false;

  constructor(
    private readonly stateManager: StateManager,
    private readonly generator: ImageGenerator,
    private readonly imagePersistence: ImagePersistenceService,
    private readonly eventBus: EventBus,
    private readonly config: OrchestratorConfig
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.shouldStop = false;

    // Emit initial state
    const allJobs = await this.stateManager.repository.findAll();
    this.eventBus.emit({ type: "INIT", payload: { jobs: allJobs } });

    // Main loop
    while (!this.shouldStop) {
      const job = await this.stateManager.claimNextJob();

      if (!job) {
        // No more pending jobs
        const stats = await this.stateManager.repository.getStats();
        this.eventBus.emit({ type: "BATCH_COMPLETE", payload: { stats } });
        break;
      }

      await this.processJob(job);

      // Rate limiting
      await this.sleep(this.config.rateLimitMs);
    }

    this.isRunning = false;
  }

  async stop(): Promise<void> {
    this.shouldStop = true;
  }

  private async processJob(job: Job): Promise<void> {
    this.eventBus.emit({
      type: "STATUS_UPDATE",
      payload: { jobId: job.id, status: "PROCESSING" },
    });

    try {
      const result = await this.generator.generate(job.prompt);
      const outputPath = await this.imagePersistence.save(
        job.id,
        result.buffer,
        result.mimeType
      );

      await this.stateManager.markComplete(job.id, outputPath);

      this.eventBus.emit({
        type: "IMAGE_READY",
        payload: {
          jobId: job.id,
          imageUrl: this.imagePersistence.getPublicUrl(outputPath),
        },
      });
    } catch (error) {
      await this.handleJobError(job, error as Error);
    }
  }

  private async handleJobError(job: Job, error: Error): Promise<void> {
    await this.stateManager.markFailed(job.id, error);

    this.eventBus.emit({
      type: "STATUS_UPDATE",
      payload: { jobId: job.id, status: "FAILED", error: error.message },
    });

    // Check if should retry
    if (await this.stateManager.shouldRetry(job)) {
      await this.stateManager.resetForRetry(job.id);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

#### Tasks

- [ ] Implement `Orchestrator` class with DI
- [ ] Implement `start()` with main loop
- [ ] Implement `stop()` for graceful shutdown
- [ ] Implement `processJob()` with full flow
- [ ] Implement `handleJobError()` with retry logic
- [ ] Add rate limiting between jobs
- [ ] Emit all SSE events at correct points
- [ ] Add structured logging throughout

#### Acceptance Criteria

- Process resumes from last pending job on restart
- Failed jobs are retried up to MAX_RETRIES
- SSE events fire at every state transition
- Graceful shutdown completes current job

---

## 🏁 Milestone 4: Observability Layer

**Goal:** Implement the Fastify server with SSE and dashboard.  
**Duration:** 1 day  
**Risk Level:** 🟢 Low

### Phase 4.1: Fastify Server Setup

**Objective:** Configure Fastify with static file serving.

#### Deliverables

| Artifact              | Description                 |
| --------------------- | --------------------------- |
| `src/server/app.ts`   | Fastify application factory |
| `src/server/index.ts` | Server entry point          |

#### Implementation

```typescript
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

export async function createApp(config: ServerConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // Serve generated images
  await app.register(fastifyStatic, {
    root: config.outputDir,
    prefix: "/output/",
  });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
```

#### Tasks

- [ ] Create Fastify app factory
- [ ] Configure Pino logger
- [ ] Register static file plugin for `/output`
- [ ] Add health check endpoint
- [ ] Add CORS if needed

#### Acceptance Criteria

- Server starts on configured port
- Static files served from `/output`
- Health check returns 200

---

### Phase 4.2: SSE Endpoint Implementation

**Objective:** Implement Server-Sent Events for real-time updates.

#### Deliverables

| Artifact                            | Description       |
| ----------------------------------- | ----------------- |
| `src/server/routes/events.route.ts` | SSE route handler |

#### Implementation

```typescript
export function eventsRoute(app: FastifyInstance, eventBus: EventBus) {
  app.get("/events", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial state
    const jobs = await stateManager.repository.findAll();
    reply.raw.write(`event: INIT\n`);
    reply.raw.write(`data: ${JSON.stringify({ jobs })}\n\n`);

    // Subscribe to events
    const unsubscribe = eventBus.subscribe((event) => {
      reply.raw.write(`event: ${event.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(event.payload)}\n\n`);
    });

    // Cleanup on disconnect
    request.raw.on("close", () => {
      unsubscribe();
    });
  });
}
```

#### Tasks

- [ ] Implement SSE route handler
- [ ] Send `INIT` event on connection
- [ ] Forward all `EventBus` events
- [ ] Handle client disconnection
- [ ] Add connection keepalive (ping)

#### Acceptance Criteria

- Clients receive initial state on connect
- Real-time updates pushed to all clients
- No memory leaks on disconnect

---

### Phase 4.3: Dashboard HTML

**Objective:** Create the single-file HTML dashboard.

#### Deliverables

| Artifact                               | Description     |
| -------------------------------------- | --------------- |
| `src/server/views/dashboard.html`      | Dashboard HTML  |
| `src/server/routes/dashboard.route.ts` | Dashboard route |

#### HTML Template (Key Features)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RBIG Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto p-8">
      <!-- Header with Stats -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold">Resilient Batch Image Generator</h1>
        <div id="stats" class="mt-4 flex gap-4">
          <!-- Dynamic stats -->
        </div>
      </header>

      <!-- Progress Bar -->
      <div id="progress" class="mb-8">
        <div class="bg-gray-700 rounded-full h-4">
          <div
            id="progress-bar"
            class="bg-green-500 h-4 rounded-full transition-all"
          ></div>
        </div>
        <p id="progress-text" class="mt-2 text-sm text-gray-400"></p>
      </div>

      <!-- Image Gallery Grid -->
      <div
        id="gallery"
        class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <!-- Dynamic images -->
      </div>
    </div>

    <script>
      const eventSource = new EventSource("/events");
      const gallery = document.getElementById("gallery");
      const progressBar = document.getElementById("progress-bar");

      eventSource.addEventListener("INIT", (e) => {
        const { jobs } = JSON.parse(e.data);
        updateStats(jobs);
        renderGallery(jobs);
      });

      eventSource.addEventListener("STATUS_UPDATE", (e) => {
        const { jobId, status, error } = JSON.parse(e.data);
        updateJobCard(jobId, status, error);
      });

      eventSource.addEventListener("IMAGE_READY", (e) => {
        const { jobId, imageUrl } = JSON.parse(e.data);
        addImageToGallery(jobId, imageUrl);
      });

      // ... rendering functions
    </script>
  </body>
</html>
```

#### Tasks

- [ ] Create responsive HTML structure
- [ ] Add Tailwind CSS via CDN
- [ ] Implement SSE connection in JavaScript
- [ ] Render initial job grid (pending/done/failed)
- [ ] Update cards on `STATUS_UPDATE`
- [ ] Add images on `IMAGE_READY`
- [ ] Show progress bar with completion %
- [ ] Add error state visualization
- [ ] Implement auto-reconnect on SSE failure

#### Acceptance Criteria

- Dashboard loads with current state
- Images appear in real-time as generated
- Progress bar reflects completion percentage
- Failed jobs show error message
- Works on mobile (responsive)

---

## 🏁 Milestone 5: Infrastructure & Polish

**Goal:** Auto-provisioning, graceful shutdown, and production hardening.  
**Duration:** 1 day  
**Risk Level:** 🟢 Low

### Phase 5.1: Auto-Provisioning Setup

**Objective:** Implement first-run infrastructure automation.

#### Deliverables

| Artifact                   | Description                 |
| -------------------------- | --------------------------- |
| `src/setup/provisioner.ts` | Infrastructure provisioning |
| `src/setup/api-checker.ts` | GCP API validation          |

#### Implementation

```typescript
export class Provisioner {
  async provision(): Promise<void> {
    // 1. Create directories
    await this.ensureDirectories(["./output", "./logs", "./config"]);

    // 2. Validate credentials
    await this.validateCredentials();

    // 3. Check/enable GCP APIs
    await this.ensureApisEnabled(["aiplatform.googleapis.com"]);

    // 4. Initialize jobs.json if needed
    await this.initializeJobsFile();
  }

  private async ensureApisEnabled(apis: string[]): Promise<void> {
    const client = new ServiceUsageClient();
    for (const api of apis) {
      const [operation] = await client.enableService({
        name: `projects/${this.projectId}/services/${api}`,
      });
      await operation.promise();
    }
  }
}
```

#### Tasks

- [ ] Implement directory scaffolding
- [ ] Add credential validation (ADC + service account)
- [ ] Implement GCP API enablement
- [ ] Initialize `jobs.json` from prompts if not exists
- [ ] Add detailed progress logging
- [ ] Handle partial failures gracefully

#### Acceptance Criteria

- `yarn start` on fresh clone succeeds
- Missing directories created automatically
- Clear error messages for missing credentials
- API enablement is idempotent

---

### Phase 5.2: Graceful Shutdown

**Objective:** Handle SIGTERM/SIGINT properly.

#### Deliverables

| Artifact                | Description          |
| ----------------------- | -------------------- |
| `src/core/lifecycle.ts` | Lifecycle management |

#### Implementation

```typescript
export function setupGracefulShutdown(
  orchestrator: Orchestrator,
  server: FastifyInstance,
  logger: Logger
) {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");

    // 1. Stop accepting new SSE connections
    await server.close();

    // 2. Stop orchestrator (finishes current job)
    await orchestrator.stop();

    // 3. Final state save
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
```

#### Tasks

- [ ] Implement shutdown handler
- [ ] Stop server gracefully
- [ ] Allow current job to complete
- [ ] Ensure final state save
- [ ] Add shutdown timeout (30s max)

#### Acceptance Criteria

- Ctrl+C allows current job to finish
- State is saved before exit
- No orphaned processes

---

### Phase 5.3: Main Entry Point

**Objective:** Wire everything together in `index.ts`.

#### Deliverables

| Artifact       | Description             |
| -------------- | ----------------------- |
| `src/index.ts` | Application entry point |

#### Implementation

```typescript
import { Provisioner } from "./setup/provisioner";
import { StateManager, JsonJobRepository } from "./core/state";
import { GeneratorFactory } from "./adapters/generator.factory";
import { Orchestrator } from "./core/orchestrator";
import { EventBus } from "./core/events";
import { createApp } from "./server/app";
import { setupGracefulShutdown } from "./core/lifecycle";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  // 1. Provision infrastructure
  const provisioner = new Provisioner(env);
  await provisioner.provision();

  // 2. Initialize dependencies
  const eventBus = new EventBus();
  const repository = new JsonJobRepository("./jobs.json");
  const stateManager = new StateManager(repository);
  const generator = GeneratorFactory.create("vertex-imagen3", env);
  const imagePersistence = new ImagePersistenceService("./output");

  // 3. Create orchestrator
  const orchestrator = new Orchestrator(
    stateManager,
    generator,
    imagePersistence,
    eventBus,
    { rateLimitMs: env.RATE_LIMIT_MS, maxRetries: env.MAX_RETRIES }
  );

  // 4. Create and start server
  const app = await createApp({
    outputDir: "./output",
    eventBus,
    stateManager,
  });
  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  // 5. Setup graceful shutdown
  setupGracefulShutdown(orchestrator, app, logger);

  // 6. Start processing
  logger.info("Starting batch processing...");
  await orchestrator.start();

  logger.info("All jobs complete!");
}

main().catch((error) => {
  logger.fatal(error, "Fatal error during startup");
  process.exit(1);
});
```

#### Tasks

- [ ] Wire all dependencies
- [ ] Implement proper boot sequence
- [ ] Add startup logging
- [ ] Handle fatal errors
- [ ] Ensure clean exit on completion

#### Acceptance Criteria

- `yarn start` runs the complete flow
- Dashboard accessible during processing
- Clean exit when all jobs done
- Fatal errors logged and exit with code 1

---

### Phase 5.4: Configuration & Prompts

**Objective:** Configure master aesthetic and job prompts.

#### Deliverables

| Artifact                  | Description                        |
| ------------------------- | ---------------------------------- |
| `src/config/constants.ts` | Master aesthetic and defaults      |
| `config/prompts.json`     | Initial 32 prompts (user-provided) |

#### Implementation

```typescript
// src/config/constants.ts
export const DEFAULTS = {
  ASPECT_RATIO: "1:1" as const,
  SAFETY_FILTER: "block_some" as const,
  RATE_LIMIT_MS: 2000,
  MAX_RETRIES: 3,
  TOTAL_IMAGES: 32,
} as const;

// Master aesthetic is now loaded from config/aesthetic.txt
// and editable via the dashboard at runtime
// Example content of config/aesthetic.txt:
// "High-quality, photorealistic image with cinematic lighting.
//  Sharp focus, professional photography, 8K resolution."
```

#### Tasks

- [ ] Define all default constants
- [ ] Create sample prompts file
- [ ] Document prompt format
- [ ] Add prompt loading logic

#### Acceptance Criteria

- Defaults are centralized
- Prompts are easily editable
- Master aesthetic is prepended to all prompts

---

## 📊 Risk Matrix

| Risk                    | Impact   | Probability | Mitigation                                       |
| ----------------------- | -------- | ----------- | ------------------------------------------------ |
| Vertex AI quota limits  | High     | Medium      | Implement exponential backoff, queue persistence |
| File system corruption  | Critical | Low         | Atomic writes, backup before write               |
| API credentials invalid | High     | Medium      | Validate on startup, clear error messages        |
| Network interruption    | Medium   | Medium      | Retry logic, checkpoint after each image         |
| Memory leaks (SSE)      | Medium   | Low         | Proper event unsubscription                      |

---

## 🧪 Testing Strategy

### Manual Testing Checkpoints

After each milestone, verify:

| Milestone | Test Scenario                                      |
| --------- | -------------------------------------------------- |
| M0        | `yarn build` succeeds                              |
| M1        | Create jobs, restart process, verify resume        |
| M2        | Generate single image via mock, then real API      |
| M3        | Process 5 jobs, verify events and state            |
| M4        | Open dashboard, watch real-time updates            |
| M5        | Kill process mid-batch, restart, verify completion |

### Integration Test (Final)

```bash
# Clean start
rm -rf ./output ./jobs.json
yarn start

# Expected:
# 1. Directories created
# 2. jobs.json initialized with 32 jobs
# 3. Dashboard opens at localhost:3000
# 4. Images appear one by one
# 5. Process exits cleanly at 32/32
```

---

## 📁 Final Directory Structure

```
/root
├── /src
│   ├── /adapters
│   │   ├── generator.interface.ts
│   │   ├── generator.factory.ts
│   │   └── /vertex
│   │       ├── client.ts
│   │       ├── imagen3.strategy.ts
│   │       └── index.ts
│   ├── /config
│   │   ├── constants.ts
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── /core
│   │   ├── /events
│   │   │   ├── event-bus.ts
│   │   │   └── index.ts
│   │   ├── /services
│   │   │   └── image-persistence.service.ts
│   │   ├── /state
│   │   │   ├── job.repository.ts
│   │   │   ├── state-manager.ts
│   │   │   └── index.ts
│   │   ├── lifecycle.ts
│   │   └── orchestrator.ts
│   ├── /server
│   │   ├── /routes
│   │   │   ├── dashboard.route.ts
│   │   │   └── events.route.ts
│   │   ├── /views
│   │   │   └── dashboard.html
│   │   ├── app.ts
│   │   └── index.ts
│   ├── /setup
│   │   ├── api-checker.ts
│   │   └── provisioner.ts
│   ├── /types
│   │   ├── config.types.ts
│   │   ├── events.types.ts
│   │   ├── job.types.ts
│   │   └── index.ts
│   ├── /utils
│   │   ├── fs.utils.ts
│   │   └── index.ts
│   └── index.ts
├── /config
│   └── prompts.json
├── /output (generated)
├── /logs (generated)
├── jobs.json (generated)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## ✅ Definition of Done (Project Level)

The project is complete when:

1. **Functional Requirements**

   - [ ] 32 images generated successfully
   - [ ] Dashboard shows real-time progress
   - [ ] Process resumes after interruption
   - [ ] `yarn start` is the only command needed

2. **Code Quality**

   - [ ] Zero `any` types
   - [ ] All external data validated with Zod
   - [ ] Structured logging throughout
   - [ ] Clean separation of concerns

3. **Resilience**

   - [ ] Atomic state writes
   - [ ] Retry logic with backoff
   - [ ] Graceful shutdown
   - [ ] Error recovery without data loss

4. **Documentation**
   - [ ] README with setup instructions
   - [ ] `.env.example` with all variables
   - [ ] JSDoc on public interfaces

---

_"The best architectures are those that evolve; the worst are those that are perfect from day one."_

— **The Resilient Architect**
