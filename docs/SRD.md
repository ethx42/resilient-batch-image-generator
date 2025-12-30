# Software Requirements Document (SRD)

**Project Name:** Resilient Batch Image Generator (RBIG)
**Version:** 2.1.0 (Production Ready)
**Architecture Style:** Event-Driven Batch Processor with Sidecar Observability
**Target Runtime:** Node.js v20+ (LTS) / TypeScript 5.x

---

## 1. Executive Summary

The objective is to engineer a fault-tolerant, automated batch processing system capable of generating high-fidelity images using Google Vertex AI (specifically the **Imagen 3** model). The system must feature a "Resume-on-Failure" capability, ensuring that exactly 32 images are produced regardless of network interruptions or API limits.

Crucially, the system includes a **Real-Time Observability Dashboard** (Sidecar) that visualizes the generation process and serves a gallery of results without requiring a heavy frontend framework.

## 2. System Architecture

The system follows a **Modular Monolith** pattern with four distinct layers:

1. **The Orchestrator (Core):** Manages the batch loop, concurrency control, and global error handling.
2. **The State Manager (Persistence):** Maintains a local JSON ACID-like transaction log (`jobs.json`) acting as the Single Source of Truth.
3. **The Strategy Layer (Polymorphic Adapters):** Encapsulates API logic.

   - _Primary Strategy:_ Vertex AI Imagen 3 (`imagen-3.0-generate-001`).
   - _Interface:_ Allows future plug-and-play of other models (SDXL, Imagen 2).

4. **The Observer (Dashboard):** A lightweight Fastify server using Server-Sent Events (SSE) to push status updates to a local browser interface.

## 3. Technology Stack

- **Runtime:** Node.js (Latest LTS).
- **Language:** TypeScript (Strict Mode).
- **Core Libraries:**
  - `@google-cloud/aiplatform`: For Vertex AI interaction.
  - `@google-cloud/service-usage`: For programmatic API enablement.
  - `fastify` & `@fastify/static`: For the dashboard and static file serving.
  - `zod`: For strict environment variable and JSON schema validation.
  - `pino`: For structured CLI logging.

## 4. Functional Requirements

### 4.1. Infrastructure as Code (Auto-Provisioning)

**Requirement:** The application must self-configure on the first run.

- **API Check:** Programmatically verify if `aiplatform.googleapis.com` is enabled in the GCP project. If not, enable it using `ServiceUsageClient`.
- **Directory Scaffolding:** Automatically create `./output`, `./logs`, and `./config` if they do not exist.
- **Credential Validation:** Validate existence of `GOOGLE_APPLICATION_CREDENTIALS` or ADC.

### 4.2. State Management & Resilience

**Requirement:** The system must be idempotent. Re-running the script must only process pending items.

- **Data Store:** `jobs.json`.
- **Schema:**

```typescript
type JobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

interface Job {
  id: number;
  prompt: string; // The specific prompt
  status: JobStatus;
  outputPath?: string; // Local path to generated image
  retries: number;
  errorLog?: string;
  createdAt: string;
  updatedAt: string;
}
```

- **Atomic Writes:** State updates must be synchronous or locked to prevent corruption during file writes.

### 4.3. Image Generation Strategy (Imagen 3)

**Requirement:** Use the Strategy Pattern to decouple the "What" (Generate Image) from the "How" (Vertex AI).

- **Model ID:** `imagen-3.0-generate-001`.
- **Aesthetic Injection:** The system must prepend the master aesthetic prompt (loaded from `config/aesthetic.txt` and editable via dashboard) to every user prompt to guarantee visual consistency.
- **Parameters:**
  - `aspectRatio`: "1:1" (Configurable).
  - `sampleCount`: 1.
  - `safetyFilterLevel`: "block_some" (Default).

### 4.4. Real-Time Observability (The Dashboard)

**Requirement:** A web interface accessible at `http://localhost:3000` to monitor progress.

- **Protocol:** Server-Sent Events (SSE) at endpoint `/events`.
- **Event Types:**

  - `INIT`: Sends the full list of existing jobs (history) upon connection.
  - `STATUS_UPDATE`: Updates the state of a specific job ID (e.g., PENDING -> PROCESSING).
  - `IMAGE_READY`: Sent when an image is successfully written to disk. Payload includes the image URL.

- **Frontend:** A single-file HTML injected by Fastify. No build step (React/Vue) allowed. Use Tailwind via CDN for styling.
- **Gallery:** The dashboard must display a grid of all completed images (historical and new).

## 5. Implementation Specifications

### 5.1. Directory Structure

```text
/root
 ├── /src
 │    ├── /adapters
 │    │    ├── generator.interface.ts  <-- Strategy Contract
 │    │    └── vertex-imagen3.ts       <-- Implementation
 │    ├── /core
 │    │    ├── state.ts                <-- JSON Read/Write Logic
 │    │    └── orchestrator.ts         <-- Main Loop & Event Emitter
 │    ├── /server
 │    │    └── dashboard.ts            <-- Fastify & SSE Logic
 │    ├── /config
 │    │    └── constants.ts            <-- Aesthetic Prompts
 │    ├── setup.ts                     <-- Infra Automation
 │    └── index.ts                     <-- Entry Point
 ├── jobs.json                         <-- Data Persistence
 └── package.json
```

### 5.2. Core Logic Flow (Pseudocode)

1. **Boot:** Run `setup.ts`. Start `dashboard.ts` (Fastify).
2. **Load:** Read `jobs.json`.
3. **Loop:**

   - Find next `PENDING` job.
   - Emit SSE: `STATUS_UPDATE` (Processing).
   - Update `jobs.json` -> `PROCESSING`.
   - **Try:**

     - Combine master aesthetic (from `config/aesthetic.txt`) + `Job.prompt`.
     - Call Vertex AI Adapter.
     - Save Buffer to `./output/img_{id}.png`.
     - Update `jobs.json` -> `DONE`.
     - Emit SSE: `IMAGE_READY` (image url).

   - **Catch:**

     - Update `jobs.json` -> `FAILED` (or retry logic).
     - Emit SSE: `STATUS_UPDATE` (Error).

   - **Wait:** `sleep(2000)` (Rate Limit Protection).

### 5.3. Vertex AI Implementation Detail

_Note for Developer: The request payload for Imagen 3 differs from legacy models._

```typescript
// src/adapters/vertex-imagen3.ts
async generate(prompt: string): Promise<Buffer> {
    const instance = helpers.toValue({ prompt });
    const parameters = helpers.toValue({ sampleCount: 1, aspectRatio: "1:1" });

    // Endpoint construction is critical
    const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001`;

    const [response] = await this.client.predict({ endpoint, instances: [instance], parameters });

    // Extract Base64
    const b64 = response.predictions[0].structValue.fields.bytesBase64Encoded.stringValue;
    return Buffer.from(b64, 'base64');
}
```

## 6. Definition of Done (DoD)

1. **Zero-Config Start:** `yarn start` is the only command needed.
2. **Visual Confirmation:** The user can open `localhost:3000` and watch images appear one by one in the gallery grid.
3. **Resilience:** Killing the process at Image #10 and restarting it resumes immediately at Image #11.
4. **Assets:** 32 `.png` files exist in the `./output` folder upon completion.
5. **Code Quality:** Strictly Typed, Linted, and Modular.
