# Software Requirements Document (SRD) v3.0

**Product Name:** Ursa  
**Domain:** ursa.ai  
**Tagline:** "Create with constellation-grade precision"  
**Version:** 3.0.0 (Enterprise Cloud-Native SaaS)  
**Architecture Style:** GCP-Native Multi-Tenant Platform with Double-Entry Credit Ledger  
**Status:** APPROVED — Ready for Greenfield Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Vision](#2-system-vision)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Domain Model](#5-domain-model)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [AI Provider Integration (Vertex AI Studio)](#8-ai-provider-integration-vertex-ai-studio)
9. [Credit Ledger System (Double-Entry Accounting)](#9-credit-ledger-system-double-entry-accounting)
10. [Security Architecture](#10-security-architecture)
11. [Observability & Operations](#11-observability--operations)
12. [API Specification](#12-api-specification)
13. [User Interface Requirements](#13-user-interface-requirements)
14. [Definition of Done](#15-definition-of-done)

---

## 1. Executive Summary

### 1.1 Purpose

**Ursa** is a cloud-native SaaS platform born in Google Cloud Platform (GCP) for enterprise-grade AI image generation at scale. Built from the ground up as a Greenfield project, Ursa leverages the full power of GCP's managed services combined with Cloudflare's edge infrastructure to deliver:

- **Precision-grade image generation** using Google's Vertex AI Studio
- **Project-based organization** with distinct aesthetic configurations
- **Reference Image Intelligence** for consistent character/style/product generation
- **Transparent credit-based monetization** with immutable transaction ledger
- **Real-time batch processing** with webhook notifications
- **Zero-egress architecture** using Cloudflare R2 for cost optimization

### 1.2 Core Value Propositions

| Value                          | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| **Cloud-Native by Design**     | Built entirely on GCP managed services—no legacy constraints      |
| **Enterprise-Grade Precision** | Vertex AI Studio integration for consistent, high-quality outputs |
| **Transparent Economics**      | Double-entry accounting ensures 100% credit accuracy              |
| **Zero Egress Costs**          | Cloudflare R2 eliminates GCP storage egress fees                  |
| **Real-time Collaboration**    | Firebase-powered notifications even when browser is closed        |
| **Hexagonal Architecture**     | Fully decoupled core logic—provider agnostic at every layer       |

### 1.3 Success Criteria

| Criterion                    | Target                       | Measurement                        |
| ---------------------------- | ---------------------------- | ---------------------------------- |
| **Zero-Downtime Operations** | 99.9% uptime                 | GCP SLA + custom health checks     |
| **Sub-30s Generation**       | p95 < 30 seconds             | Cloud Monitoring metrics           |
| **100% Credit Accuracy**     | Zero leakage                 | Ledger reconciliation audits       |
| **Enterprise Security**      | SOC 2 Type II aligned        | GCP compliance + internal controls |
| **Horizontal Scalability**   | 1000+ concurrent generations | Cloud Run auto-scaling             |

---

## 2. System Vision

### 2.1 User Personas

#### 2.1.1 Creator (Primary)

- **Profile**: Freelance designer, content creator, small business owner
- **Goals**: Generate consistent product/brand imagery at scale
- **Pain Points**: Inconsistent AI outputs, expensive per-image pricing, no batch capabilities

#### 2.1.2 Agency (Secondary)

- **Profile**: Design agency managing multiple client brands
- **Goals**: Separate projects per client, team collaboration, bulk generation
- **Pain Points**: Context switching, brand consistency, client billing

#### 2.1.3 Enterprise (Future)

- **Profile**: Large organization with compliance requirements
- **Goals**: API access, SSO, audit logs, dedicated resources
- **Pain Points**: Security, SLAs, integration with existing tools

### 2.2 Design Philosophy

> **"The user doesn't interact with models—they interact with Creative Capabilities."**

Ursa abstracts technical complexity behind intuitive creative concepts:

| User Thinks                    | System Provides                 |
| ------------------------------ | ------------------------------- |
| "I want this style"            | Style Reference capability      |
| "Keep this exact product"      | Subject Preservation capability |
| "Follow this layout"           | Structural Control capability   |
| "Make it look like this brand" | Brand Consistency capability    |

### 2.3 The Golden Action

> **"Create Project → Upload References → Generate Batch"**

This complete workflow is achievable in **≤3 clicks** from any screen in the application.

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE LAYER (Cloudflare)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Cloudflare CDN + WAF                            │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────┐  │  │
│  │  │   Static    │ │   Edge      │ │           R2 Storage             │  │  │
│  │  │   Assets    │ │   Caching   │ │     (Generated Images)           │  │  │
│  │  │             │ │             │ │     Zero Egress Costs            │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                          BRAIN LAYER (GCP)                                   │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                         Cloud Run (Compute)                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Next.js 15/16 Application                     │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │  │
│  │  │  │  Auth   │ │Dashboard│ │Projects │ │ Studio  │ │ Credits │   │  │  │
│  │  │  │  Pages  │ │  Pages  │ │  Pages  │ │  Pages  │ │  Pages  │   │  │  │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │  │  │
│  │  │       └───────────┴───────────┴───────────┴───────────┘         │  │  │
│  │  │                              │                                   │  │  │
│  │  │  ┌───────────────────────────▼───────────────────────────────┐  │  │  │
│  │  │  │                 RBIG Core Engine                           │  │  │
│  │  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │  │  │
│  │  │  │  │   Credit    │ │    Job      │ │  Provider   │          │  │  │
│  │  │  │  │   Ledger    │ │  Processor  │ │  Adapters   │          │  │  │
│  │  │  │  │             │ │             │ │             │          │  │  │
│  │  │  │  │ Double-Entry│ │ Orchestrator│ │ Vertex AI   │          │  │  │
│  │  │  │  │ Accounting  │ │ + Retry     │ │ Studio API  │          │  │  │
│  │  │  │  └─────────────┘ └─────────────┘ └─────────────┘          │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Cloud Tasks (Async Queue)                           │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │  │
│  │  │  generation/    │ │  credits/       │ │  notifications/ │          │  │
│  │  │  process-batch  │ │  expire-packs   │ │  send-webhook   │          │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Cloud Scheduler (Cron)                            │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │  │
│  │  │  Daily Credit   │ │  Weekly Usage   │ │  Health Check   │          │  │
│  │  │  Expiration     │ │  Reports        │ │  Heartbeat      │          │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    CLOUD SQL        │ │  VERTEX AI STUDIO   │ │      FIREBASE       │
│    (PostgreSQL)     │ │                     │ │                     │
│                     │ │ ┌─────────────────┐ │ │ ┌─────────────────┐ │
│ ┌─────────────────┐ │ │ │   Imagen 3.0    │ │ │ │     Realtime    │ │
│ │  Credit Ledger  │ │ │ │   Generation    │ │ │ │   Notifications │ │
│ │  (Double-Entry) │ │ │ ├─────────────────┤ │ │ ├─────────────────┤ │
│ ├─────────────────┤ │ │ │ Prompt Templates│ │ │ │   Webhooks      │ │
│ │    Projects     │ │ │ │   (Managed)     │ │ │ │   Dispatch      │ │
│ ├─────────────────┤ │ │ ├─────────────────┤ │ │ ├─────────────────┤ │
│ │      Jobs       │ │ │ │  Model Garden   │ │ │ │   User Presence │ │
│ ├─────────────────┤ │ │ │   (Future)      │ │ │ │                 │ │
│ │     Users       │ │ │ └─────────────────┘ │ │ └─────────────────┘ │
│ └─────────────────┘ │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### 3.2 Architectural Principles

#### 3.2.1 Hexagonal Architecture (Ports & Adapters)

The core business logic is completely decoupled from infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION CORE                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Domain Services                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │  │
│  │  │   Credit    │ │ Generation  │ │   Project   │          │  │
│  │  │   Service   │ │   Service   │ │   Service   │          │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘          │  │
│  └─────────┼───────────────┼───────────────┼─────────────────┘  │
│            │               │               │                     │
│  ┌─────────▼───────────────▼───────────────▼─────────────────┐  │
│  │                         PORTS                              │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │  │
│  │  │ ICreditLedger │ │ IImageGenerator │ │IStorageProvider│    │  │
│  │  └───────────────┘ └───────────────┘ └───────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                          ADAPTERS                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │  PostgreSQL   │ │   Vertex AI   │ │  Cloudflare   │          │
│  │    Ledger     │ │    Studio     │ │      R2       │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │  Cloud Tasks  │ │   Firebase    │ │  Cloud SQL    │          │
│  │    Queue      │ │   Realtime    │ │   Postgres    │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

> **Architect's Mandate:** "The credit logic must NEVER know that Google Cloud exists. It calls interfaces that the GCP adapter implements. This allows us to own our technology."

#### 3.2.2 Event-Driven Architecture

All state changes emit events. UI reacts to events via Firebase Realtime.

#### 3.2.3 Cloud-Native First

All compute is managed by Cloud Run. Scale to zero when idle. Automatic scaling under load.

#### 3.2.4 Zero Egress Design

Generated images are stored in Cloudflare R2, eliminating GCP egress costs completely.

#### 3.2.5 Credit-Centric Operations

Every generation operation is tied to an immutable ledger transaction. No orphaned operations.

---

## 4. Technology Stack

### 4.1 Core Stack

| Layer             | Technology                 | Justification                                 |
| ----------------- | -------------------------- | --------------------------------------------- |
| **Runtime**       | Node.js 20 LTS             | Stability, ecosystem, TypeScript support      |
| **Language**      | TypeScript 5.x (Strict)    | Type safety, maintainability                  |
| **Framework**     | Next.js 15/16 (App Router) | Full-stack, RSC, production-ready LTS         |
| **UI Components** | shadcn/ui + Radix          | Accessible, customizable, Ursa-branded        |
| **Styling**       | Tailwind CSS v4            | Utility-first, design system integration      |
| **Compute**       | Cloud Run (GCP)            | Managed containers, auto-scaling, pay-per-use |
| **Queue**         | Cloud Tasks (GCP)          | Serverless async processing, retries built-in |
| **Database**      | Cloud SQL PostgreSQL       | Managed, HA, automatic backups                |
| **Auth**          | GCP Identity Platform      | Enterprise SSO, MFA, OAuth providers          |
| **Storage**       | Cloudflare R2              | S3-compatible, zero egress, global CDN        |
| **Realtime**      | Firebase Realtime Database | Push notifications, presence, low latency     |
| **AI Engine**     | Vertex AI Studio           | Imagen 3, managed prompts, enterprise SLA     |
| **Observability** | Cloud Monitoring + Logging | Native GCP integration                        |

### 4.2 Infrastructure as Code

| Tool                  | Purpose                         |
| --------------------- | ------------------------------- |
| **Terraform**         | GCP infrastructure provisioning |
| **Cloud Build**       | CI/CD pipelines                 |
| **Artifact Registry** | Container image storage         |
| **Secret Manager**    | Secrets and API keys            |

### 4.3 Development & Quality

| Tool                  | Purpose            |
| --------------------- | ------------------ |
| **pnpm**              | Package management |
| **Vitest**            | Unit testing       |
| **Playwright**        | E2E testing        |
| **ESLint + Prettier** | Code quality       |
| **Zod**               | Runtime validation |

### 4.4 Monorepo Structure (Turborepo)

The codebase is organized as a **Turborepo monorepo** with clear separation between applications, domain packages, and infrastructure:

```
/ursa                           # Turborepo root
├── turbo.json                  # Pipeline configuration
├── pnpm-workspace.yaml         # Workspace definition
│
├── apps/
│   └── web/                    # Next.js 15 LTS application
│       ├── app/                # App Router pages
│       ├── components/         # UI components
│       └── lib/                # Client utilities
│
├── packages/
│   ├── ai-core/                # RBIG Engine (domain logic)
│   │   ├── ports/              # Interfaces (contracts)
│   │   │   ├── IImageGenerator.ts
│   │   │   ├── IStorageProvider.ts
│   │   │   ├── INotificationService.ts
│   │   │   └── IQueueService.ts
│   │   ├── services/           # Domain services
│   │   │   ├── GenerationService.ts
│   │   │   └── ProjectService.ts
│   │   ├── entities/           # Domain entities
│   │   ├── adapters/           # Infrastructure implementations
│   │   │   ├── vertex-ai/      # Vertex AI Studio adapter
│   │   │   ├── cloudflare-r2/  # R2 storage adapter
│   │   │   ├── cloud-tasks/    # Queue adapter
│   │   │   └── firebase/       # Realtime adapter
│   │   └── errors/             # Domain errors
│   │
│   ├── database/               # Cloud SQL PostgreSQL layer
│   │   ├── schema/             # Drizzle schema definitions
│   │   ├── migrations/         # Database migrations
│   │   ├── repositories/       # Data access layer
│   │   └── client.ts           # Database connection
│   │
│   ├── ledger/                 # Double-entry credit system
│   │   ├── accounts/           # Account management
│   │   ├── transactions/       # Transaction processing
│   │   ├── reconciliation/     # Audit & verification
│   │   └── ports/              # ICreditLedger interface
│   │
│   ├── shared-types/           # Shared TypeScript types
│   │   ├── entities/           # User, Project, Job, etc.
│   │   ├── events/             # Event type definitions
│   │   ├── api/                # API request/response types
│   │   └── index.ts            # Public exports
│   │
│   └── ui/                     # Ursa Design System (shadcn/ui)
│       ├── components/         # Shared UI components
│       ├── hooks/              # Shared React hooks
│       └── styles/             # Theme & tokens
│
├── infrastructure/
│   ├── terraform/              # IaC definitions (GCP + Cloudflare)
│   └── cloudbuild/             # CI/CD pipelines
│
└── docs/                       # Documentation
```

> **Architect's Note:** The `ledger` package is intentionally separate from `database` to enforce the principle that credit logic must be decoupled from storage implementation. The ledger defines its own port (`ICreditLedger`) and the database package provides the adapter.

---

## 5. Domain Model

### 5.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│   Project   │───────│ Reference   │
│             │  1:N  │             │  1:N  │   Image     │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │
      │                     │ 1:N
      │ 1:1           ┌─────┴─────┐
      │               │           │
┌─────▼─────┐   ┌─────▼─────┐   ┌─▼───────────┐
│  Credit   │   │    Job    │───│  Generation │
│  Account  │   │           │1:N│   Output    │
└───────────┘   └───────────┘   └─────────────┘
      │
      │ 1:N
┌─────▼───────────┐
│     Ledger      │
│   Transaction   │
│  (Double-Entry) │
└─────────────────┘
```

### 5.2 Core Entities

#### 5.2.1 User

```typescript
interface User {
  id: string; // UUID from Identity Platform
  email: string;
  displayName: string | null;
  avatarUrl: string | null;

  // Settings
  defaultAspectRatio: AspectRatio;
  preferredCapabilities: CreativeCapability[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}
```

#### 5.2.2 Project

```typescript
interface Project {
  id: string; // UUID
  userId: string; // FK → User

  // Core
  name: string; // e.g., "Cocadas Product Line"
  description: string | null;
  slug: string; // URL-friendly

  // Aesthetic Configuration (Prompt Template)
  masterAestheticPromptId: string | null; // FK → Vertex AI Prompt Template
  masterAestheticText: string; // Fallback/display text
  negativePrompt: string | null;

  // Generation Defaults
  defaultAspectRatio: AspectRatio;
  defaultCapabilities: CreativeCapability[];
  defaultSafetyLevel: SafetyLevel;

  // Statistics (denormalized)
  totalGenerations: number;
  totalCreditsSpent: number;

  // Metadata
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
type SafetyLevel = "strict" | "moderate" | "permissive";
type CreativeCapability =
  | "style"
  | "control"
  | "subject"
  | "character"
  | "brand";
```

#### 5.2.3 Reference Image

```typescript
interface ReferenceImage {
  id: string; // UUID
  projectId: string; // FK → Project

  // Classification (Creative Capability)
  capability: CreativeCapability;
  label: string; // User-defined
  description: string | null; // For AI context

  // Storage (Cloudflare R2)
  storagePath: string; // R2 object key
  publicUrl: string; // CDN URL via Cloudflare
  thumbnailUrl: string | null; // Resized version

  // Technical
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;

  // Usage tracking
  usageCount: number;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.2.4 Job

```typescript
interface Job {
  id: string; // UUID
  projectId: string; // FK → Project
  userId: string; // FK → User (denormalized for RLS)

  // Request
  prompt: string; // User's prompt
  combinedPrompt: string; // With aesthetic + references

  // References Used
  referenceIds: string[]; // Array of ReferenceImage IDs

  // Provider Configuration (via Vertex AI Studio)
  modelId: string; // e.g., "imagen-3.0-generate-001"
  promptTemplateId: string | null; // Vertex AI managed template

  // Parameters
  aspectRatio: AspectRatio;
  safetyLevel: SafetyLevel;
  seed: number | null;

  // Status
  status: JobStatus;
  progress: number; // 0-100

  // Credit Tracking (Ledger References)
  reservationTransactionId: string; // FK → LedgerTransaction
  commitTransactionId: string | null; // FK → LedgerTransaction
  estimatedCredits: number;
  actualCredits: number | null;

  // Results
  outputs: GenerationOutput[];

  // Error Handling
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  failedAt: Date | null;

  // Timing
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;

  // Cloud Tasks Reference
  taskId: string | null; // Cloud Tasks ID for tracking

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

type JobStatus =
  | "pending" // Waiting in queue
  | "reserved" // Credits reserved, Cloud Task created
  | "processing" // Vertex AI working
  | "uploading" // Saving to R2
  | "completed" // Success
  | "failed" // All retries exhausted
  | "cancelled"; // User cancelled
```

#### 5.2.5 Generation Output

```typescript
interface GenerationOutput {
  id: string; // UUID
  jobId: string; // FK → Job

  // Storage (Cloudflare R2)
  storagePath: string; // R2 object key
  publicUrl: string; // CDN URL
  thumbnailUrl: string; // Resized version

  // Technical
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;

  // Provider Response
  vertexMetadata: Record<string, unknown>; // Raw Vertex AI response
  generationTimeMs: number;

  // Metadata
  createdAt: Date;
}
```

---

## 6. Functional Requirements

### 6.1 Authentication & Authorization

#### FR-AUTH-001: User Registration

- **Priority**: P0 (Critical)
- **Description**: Users can register via GCP Identity Platform (Google, GitHub OAuth, Email/Password)
- **Acceptance Criteria**:
  - OAuth flow completes in < 3 seconds
  - Email verification sent within 5 seconds
  - New users receive **10 welcome credits** (expire in 15 days)
  - Credit Account created automatically
  - User profile created with sensible defaults

#### FR-AUTH-002: Session Management

- **Priority**: P0 (Critical)
- **Description**: Secure session handling via Identity Platform
- **Acceptance Criteria**:
  - Sessions expire after 7 days of inactivity
  - Active sessions auto-refresh
  - MFA supported (optional)
  - Session invalidation propagates within 1 minute

#### FR-AUTH-003: Database-Level Security

- **Priority**: P0 (Critical)
- **Description**: All data access enforced at PostgreSQL level
- **Acceptance Criteria**:
  - Row-Level Security policies on all tables
  - Users can ONLY access their own data
  - Service accounts have explicit role-based access

### 6.2 Project Management

#### FR-PROJ-001: Create Project

- **Priority**: P0 (Critical)
- **Description**: Users create projects with configuration
- **Acceptance Criteria**:
  - Project name required, 3-100 characters
  - Master aesthetic prompt optional, max 2000 chars
  - Default capabilities inherited from user preferences
  - Project created within 500ms

#### FR-PROJ-002: Project Gallery

- **Priority**: P1 (High)
- **Description**: View all generations within a project
- **Acceptance Criteria**:
  - Infinite scroll with virtualization
  - Filter by status, date range, capability used
  - Bulk actions (delete, download)
  - Image preview with zoom

### 6.3 Reference Images (Creative Capabilities)

#### FR-REF-001: Upload Reference Images

- **Priority**: P0 (Critical)
- **Description**: Upload images to use as creative references
- **Acceptance Criteria**:
  - Drag-and-drop or file picker
  - Support PNG, JPEG, WebP up to 10MB
  - Classify by capability (Style, Control, Subject, Character, Brand)
  - Upload directly to Cloudflare R2
  - Maximum 20 active references per project

### 6.4 Image Generation

#### FR-GEN-001: Single Generation

- **Priority**: P0 (Critical)
- **Description**: Generate a single image from a prompt
- **Acceptance Criteria**:
  - Input prompt (required, 1-2000 chars)
  - Select references/capabilities (optional, max 4)
  - Display credit cost before generation
  - Generation queued via Cloud Tasks within 1 second

#### FR-GEN-002: Batch Generation

- **Priority**: P1 (High)
- **Description**: Generate multiple images from a list of prompts
- **Acceptance Criteria**:
  - Upload CSV or paste multiple prompts
  - Apply same references to all
  - Display total credit cost before confirmation
  - Cloud Tasks handles parallel processing
  - Individual job progress tracking

#### FR-GEN-003: Realtime Progress

- **Priority**: P0 (Critical)
- **Description**: Show generation progress in real-time
- **Acceptance Criteria**:
  - Status updates via Firebase Realtime
  - Progress percentage when available
  - Immediate image display on completion
  - Works even if browser tab is closed (Firebase push)

### 6.5 Credit System

#### FR-CRED-001: View Balance

- **Priority**: P0 (Critical)
- **Description**: Display current credit balance
- **Acceptance Criteria**:
  - Available credits prominently displayed
  - Reserved credits shown separately
  - Low balance warning (< 10 credits)
  - Pending credits from expiring packs shown

#### FR-CRED-002: Purchase Credits

- **Priority**: P0 (Critical)
- **Description**: Buy credits via Stripe Checkout
- **Acceptance Criteria**:
  - Multiple credit packs available
  - Stripe Checkout redirect
  - Credits added via Ledger transaction immediately
  - Email receipt sent
  - Transaction recorded as immutable ledger entry

#### FR-CRED-003: Transaction History

- **Priority**: P1 (High)
- **Description**: View all credit transactions
- **Acceptance Criteria**:
  - Complete ledger view with double-entry format
  - Filter by transaction type, date range
  - Export to CSV
  - Link to related job for generation transactions

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric                  | Target  | Measurement      |
| ----------------------- | ------- | ---------------- |
| **Page Load (LCP)**     | < 2.5s  | Lighthouse       |
| **Time to Interactive** | < 3.5s  | Lighthouse       |
| **API Response (p95)**  | < 200ms | Cloud Monitoring |
| **Generation Queue**    | < 2s    | Custom metric    |
| **Realtime Latency**    | < 500ms | Firebase metrics |
| **Image Upload (10MB)** | < 5s    | Custom metric    |

### 7.2 Reliability

| Metric                 | Target        | Measurement           |
| ---------------------- | ------------- | --------------------- |
| **Uptime**             | 99.9%         | Cloud Run SLA         |
| **Error Rate**         | < 0.1%        | Cloud Monitoring      |
| **Job Success Rate**   | > 98%         | Custom metric         |
| **Data Durability**    | 99.999999999% | Cloud SQL (11 nines)  |
| **Ledger Consistency** | 100%          | Reconciliation audits |

### 7.3 Scalability

| Metric                     | Target | Notes                    |
| -------------------------- | ------ | ------------------------ |
| **Concurrent Users**       | 10,000 | Cloud Run auto-scaling   |
| **Concurrent Generations** | 1,000+ | Cloud Tasks distribution |
| **Storage per User**       | 10GB   | Cloudflare R2            |
| **Projects per User**      | 100    | Soft limit               |
| **References per Project** | 20     | Hard limit               |

### 7.4 Security

| Requirement                   | Implementation                         |
| ----------------------------- | -------------------------------------- |
| **Authentication**            | GCP Identity Platform (OAuth 2.0, MFA) |
| **Authorization**             | Row-Level Security (PostgreSQL)        |
| **Data Encryption (rest)**    | AES-256 (Cloud SQL default)            |
| **Data Encryption (transit)** | TLS 1.3                                |
| **Secrets Management**        | GCP Secret Manager                     |
| **API Rate Limiting**         | Cloud Armor + Cloud Run concurrency    |
| **Input Validation**          | Zod schemas on all endpoints           |

---

## 8. AI Provider Integration (Vertex AI Studio)

### 8.1 Deep Vertex AI Studio Integration

Ursa leverages Vertex AI Studio as its native AI engine, treating prompts as managed resources:

```typescript
interface VertexAIStudioConfig {
  projectId: string; // GCP Project
  location: string; // e.g., "us-central1"

  // Model Configuration
  models: {
    primary: "imagen-3.0-generate-001";
    fast: "imagen-3.0-fast-generate-001";
    capability: "imagen-3.0-capability-001";
  };

  // Prompt Template Management
  promptTemplates: {
    enabled: true;
    namespace: "ursa-prompts"; // Template grouping
  };
}
```

### 8.2 Prompt Template Management

Ursa treats prompts as **Prompt Templates** managed via Vertex AI API:

```typescript
interface PromptTemplate {
  id: string; // Vertex AI template ID
  name: string; // Display name
  version: number; // Template version

  // Template Content
  systemInstruction: string; // Master aesthetic
  promptTemplate: string; // With {{variables}}

  // Variables
  variables: PromptVariable[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface PromptVariable {
  name: string; // e.g., "subject_description"
  type: "string" | "image";
  required: boolean;
  defaultValue?: string;
}
```

### 8.3 Creative Capabilities Mapping

Users interact with **Creative Capabilities**, not technical model features:

| User Capability          | Technical Implementation                                 |
| ------------------------ | -------------------------------------------------------- |
| **Style Transfer**       | `imagen-3.0-capability-001` + `referenceType: 'style'`   |
| **Structural Control**   | `imagen-3.0-capability-001` + `referenceType: 'control'` |
| **Subject Preservation** | `imagen-3.0-capability-001` + `referenceType: 'subject'` |
| **Fast Generation**      | `imagen-3.0-fast-generate-001`                           |
| **High Quality**         | `imagen-3.0-generate-001`                                |

### 8.4 Model Configuration

```typescript
const URSA_MODELS = {
  "imagen-3-controlled": {
    id: "imagen-3.0-capability-001",
    name: "Precision Mode",
    description: "Full creative control with all capabilities",
    capabilities: ["style", "control", "subject", "character", "brand"],
    maxReferences: 4,
    baseCreditCost: 8,
    perReferenceCost: 2,
    qualityTier: "ultra",
  },
  "imagen-3": {
    id: "imagen-3.0-generate-001",
    name: "Standard Mode",
    description: "High-quality text-to-image generation",
    capabilities: [],
    baseCreditCost: 6,
    qualityTier: "high",
  },
  "imagen-3-fast": {
    id: "imagen-3.0-fast-generate-001",
    name: "Fast Mode",
    description: "Quick iterations, good quality",
    capabilities: [],
    baseCreditCost: 3,
    qualityTier: "standard",
  },
} as const;
```

---

## 9. Credit Ledger System (Double-Entry Accounting)

### 9.1 Overview

Ursa implements a **Double-Entry Accounting System** for credit management. Every transaction affects at least two accounts, ensuring perfect balance and full auditability.

> **Principle:** Credits can never appear or disappear. Every credit movement has a source and destination.

### 9.2 Account Structure

```typescript
// Every user has a Credit Account
interface CreditAccount {
  id: string; // UUID
  userId: string; // FK → User (unique)
  accountType: "USER_CREDITS";

  // Balance is ALWAYS calculated from ledger, never stored directly
  // availableBalance = SUM(credits) - SUM(debits) WHERE status = 'posted'
  // reservedBalance = SUM(debits) WHERE status = 'pending'

  createdAt: Date;
  updatedAt: Date;
}

// System accounts for tracking flow
type SystemAccount =
  | "REVENUE" // Credits purchased (income)
  | "EXPENSE" // Credits consumed (cost of generation)
  | "WELCOME_BONUS" // Free credits source
  | "EXPIRATION" // Expired credits destination
  | "REFUND" // Refund transactions
  | "SUSPENSE"; // Pending/reserved credits
```

### 9.3 Ledger Transaction (Double-Entry)

```typescript
interface LedgerTransaction {
  id: string; // UUID

  // Double-Entry: Every transaction has two entries
  entries: LedgerEntry[]; // Always 2+ entries that sum to zero

  // Transaction Metadata
  type: TransactionType;
  status: TransactionStatus;

  // References
  userId: string; // FK → User
  jobId: string | null; // FK → Job (for generation transactions)
  stripePaymentId: string | null; // For purchase transactions
  relatedTransactionId: string | null; // For refunds/rollbacks

  // Description
  description: string;
  metadata: Record<string, unknown>;

  // Immutability
  postedAt: Date | null; // NULL until posted, then immutable
  createdAt: Date;
}

interface LedgerEntry {
  id: string; // UUID
  transactionId: string; // FK → LedgerTransaction

  accountId: string; // FK → Account (user or system)
  accountType: "USER" | "SYSTEM";

  // Amount: Positive = Credit (increase), Negative = Debit (decrease)
  amount: number;

  // Running balance at time of entry (for quick lookups)
  balanceAfter: number;
}

type TransactionType =
  | "PURCHASE" // User bought credits
  | "WELCOME" // New user bonus
  | "BONUS" // Promotional credits
  | "RESERVATION" // Credits held for pending job
  | "CONFIRMATION" // Generation completed, credits consumed
  | "RELEASE" // Cancelled/failed job, credits returned
  | "EXPIRATION" // Credits expired after 15 days
  | "REFUND"; // Admin refund

type TransactionStatus =
  | "pending" // Not yet posted (reservations)
  | "posted" // Finalized, immutable
  | "cancelled"; // Voided (before posting only)
```

### 9.4 Transaction Flows

#### 9.4.1 Credit Purchase Flow

```
User purchases 100 credits for $10
═══════════════════════════════════════════════════════════════

Transaction: PURCHASE
Status: posted
Description: "Purchased 100 credits"

┌────────────────────────────────────────────────────────────┐
│ Entry 1: DEBIT  REVENUE account         -100 credits       │
│ Entry 2: CREDIT User account            +100 credits       │
├────────────────────────────────────────────────────────────┤
│ SUM OF ENTRIES = 0 ✓ (Double-Entry Balanced)              │
└────────────────────────────────────────────────────────────┘
```

#### 9.4.2 Generation Flow (Reserve → Confirm/Release)

```
Generation Request: Estimated 8 credits
═══════════════════════════════════════════════════════════════

STEP 1: RESERVATION (pending)
─────────────────────────────
Transaction: RESERVATION
Status: pending
Job ID: job_abc123

┌────────────────────────────────────────────────────────────┐
│ Entry 1: DEBIT  User account            -8 credits         │
│ Entry 2: CREDIT SUSPENSE account        +8 credits         │
├────────────────────────────────────────────────────────────┤
│ User's available balance decreases by 8                    │
│ But total balance unchanged (credits in suspense)          │
└────────────────────────────────────────────────────────────┘


STEP 2a: CONFIRMATION (on success)
─────────────────────────────────
Transaction: CONFIRMATION
Status: posted
Related: reservation_id

┌────────────────────────────────────────────────────────────┐
│ Entry 1: DEBIT  SUSPENSE account        -8 credits         │
│ Entry 2: CREDIT EXPENSE account         +8 credits         │
├────────────────────────────────────────────────────────────┤
│ Credits moved from suspense to expense (consumed)          │
│ Original RESERVATION marked as 'posted'                    │
└────────────────────────────────────────────────────────────┘


STEP 2b: RELEASE (on failure/cancel)
───────────────────────────────────
Transaction: RELEASE
Status: posted
Related: reservation_id

┌────────────────────────────────────────────────────────────┐
│ Entry 1: DEBIT  SUSPENSE account        -8 credits         │
│ Entry 2: CREDIT User account            +8 credits         │
├────────────────────────────────────────────────────────────┤
│ Credits returned to user's available balance               │
│ Original RESERVATION marked as 'cancelled'                 │
└────────────────────────────────────────────────────────────┘
```

### 9.5 Balance Calculation

Balances are ALWAYS calculated from the ledger, never stored:

```typescript
interface BalanceCalculation {
  // Available = All posted credits to user account
  available: number;

  // Reserved = All pending debits from user account
  reserved: number;

  // Total = available + reserved (what user "owns")
  total: number;

  // Lifetime = All credits ever credited to account
  lifetime: number;
}

async function calculateBalance(userId: string): Promise<BalanceCalculation> {
  const result = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE 
        WHEN status = 'posted' AND amount > 0 THEN amount 
        ELSE 0 
      END), 0) as total_credits,
      
      COALESCE(SUM(CASE 
        WHEN status = 'posted' AND amount < 0 THEN ABS(amount) 
        ELSE 0 
      END), 0) as total_debits,
      
      COALESCE(SUM(CASE 
        WHEN status = 'pending' AND amount < 0 THEN ABS(amount) 
        ELSE 0 
      END), 0) as pending_debits
      
    FROM ledger_entries
    WHERE account_id = (
      SELECT id FROM credit_accounts WHERE user_id = $1
    )
  `,
    [userId]
  );

  const available = result.total_credits - result.total_debits;
  const reserved = result.pending_debits;

  return {
    available,
    reserved,
    total: available + reserved,
    lifetime: result.total_credits,
  };
}
```

### 9.6 Credit Pack Expiration

```typescript
interface CreditPack {
  id: string;
  userId: string;

  // Pack Info
  originalCredits: number;
  remainingCredits: number;

  // Source
  source: "purchase" | "welcome" | "bonus" | "refund";
  stripePaymentId: string | null;
  ledgerTransactionId: string; // FK → original purchase transaction

  // Expiration
  expiresAt: Date; // 15 days from creation
  isExpired: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// FIFO Consumption: Oldest packs consumed first
// Expiration: Daily Cloud Scheduler job checks and expires packs
// Warning: Firebase notification 3 days before expiration
```

### 9.7 Ledger Reconciliation

Daily automated reconciliation ensures integrity:

```typescript
interface ReconciliationReport {
  date: Date;

  // All entries must sum to zero
  totalDebits: number;
  totalCredits: number;
  difference: number; // MUST be 0

  // User balances must match calculated
  userBalancesMismatch: number; // MUST be 0

  // Pending transactions audit
  staleReservations: number; // Reservations > 1 hour old

  status: "PASSED" | "FAILED";
  alerts: string[];
}
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GCP IDENTITY PLATFORM FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  OAuth  │  │  Email  │  │   SSO   │
        │ (Google │  │  Pass   │  │(Future) │
        │ GitHub) │  │ + MFA   │  │         │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Identity   │
                   │  Platform   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   JWT       │
                   │ (Firebase   │
                   │   Auth)     │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Cloud Run  │
                   │  Validates  │
                   │    Token    │
                   └─────────────┘
```

### 10.2 Row-Level Security (PostgreSQL)

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Credit accounts are strictly private
CREATE POLICY "Users can view own credit account"
ON credit_accounts FOR SELECT
USING (auth.uid() = user_id);

-- Ledger entries visible only for own transactions
CREATE POLICY "Users can view own ledger entries"
ON ledger_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ledger_transactions lt
    WHERE lt.id = ledger_entries.transaction_id
    AND lt.user_id = auth.uid()
  )
);

-- Jobs accessible only to owner
CREATE POLICY "Users can view own jobs"
ON jobs FOR SELECT
USING (auth.uid() = user_id);
```

### 10.3 Secrets Management

| Secret               | Storage        | Rotation                      |
| -------------------- | -------------- | ----------------------------- |
| Database credentials | Secret Manager | Automatic (Cloud SQL)         |
| Stripe keys          | Secret Manager | On demand                     |
| R2 credentials       | Secret Manager | Quarterly                     |
| Service account keys | IAM            | Never (use workload identity) |

---

## 11. Observability & Operations

### 11.1 Logging Strategy

All logs flow to Cloud Logging with structured format:

```typescript
const LOG_EVENTS = {
  // Job lifecycle
  JOB_CREATED: "job.created",
  JOB_QUEUED: "job.queued", // Cloud Task created
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",

  // Ledger events
  CREDITS_RESERVED: "ledger.reserved",
  CREDITS_CONFIRMED: "ledger.confirmed",
  CREDITS_RELEASED: "ledger.released",
  CREDITS_PURCHASED: "ledger.purchased",
  CREDITS_EXPIRED: "ledger.expired",

  // Vertex AI events
  VERTEX_REQUEST: "vertex.request",
  VERTEX_SUCCESS: "vertex.success",
  VERTEX_ERROR: "vertex.error",

  // Firebase events
  NOTIFICATION_SENT: "firebase.notification",
  WEBHOOK_DISPATCHED: "firebase.webhook",
} as const;
```

### 11.2 Metrics (Cloud Monitoring)

| Metric                         | Type      | Description                 |
| ------------------------------ | --------- | --------------------------- |
| `ursa/job/created`             | Counter   | Jobs created                |
| `ursa/job/completed`           | Counter   | Jobs completed              |
| `ursa/job/failed`              | Counter   | Jobs failed                 |
| `ursa/job/duration_ms`         | Histogram | End-to-end job duration     |
| `ursa/vertex/latency_ms`       | Histogram | Vertex AI response time     |
| `ursa/ledger/transactions`     | Counter   | Ledger transactions by type |
| `ursa/ledger/balance_mismatch` | Gauge     | Reconciliation mismatches   |
| `ursa/r2/upload_bytes`         | Counter   | Bytes uploaded to R2        |

### 11.3 Alerting (Cloud Monitoring)

| Alert              | Condition                   | Severity |
| ------------------ | --------------------------- | -------- |
| High Error Rate    | > 5% for 5 min              | Critical |
| Vertex AI Down     | > 50% errors for 2 min      | Critical |
| Ledger Mismatch    | Any mismatch detected       | Critical |
| Queue Backup       | > 1000 pending for 10 min   | High     |
| Stale Reservations | > 100 reservations > 1 hour | High     |

---

## 12. API Specification

### 12.1 Server Actions (Next.js)

```typescript
// Generation Actions
"use server";

export async function createGeneration(
  input: CreateGenerationInput
): Promise<GenerationResult> {
  // 1. Validate input
  // 2. Calculate credit cost
  // 3. Create ledger reservation
  // 4. Create job record
  // 5. Queue Cloud Task
  // 6. Return job ID for tracking
}

export async function cancelGeneration(jobId: string): Promise<void> {
  // 1. Cancel Cloud Task
  // 2. Release ledger reservation
  // 3. Update job status
  // 4. Notify via Firebase
}
```

### 12.2 API Routes (Edge)

```typescript
// Cloud Tasks webhook receiver
POST /api/tasks/generation
  - Receives Cloud Task callback
  - Calls Vertex AI
  - Uploads to R2
  - Confirms ledger transaction
  - Notifies via Firebase

// Firebase webhook dispatcher
POST /api/webhooks/dispatch
  - Sends user-configured webhooks
  - Includes generation results
```

---

## 13. User Interface Requirements

### 13.1 Design System (Ursa Brand)

- **Component Library**: shadcn/ui (Radix primitives + Tailwind)
- **Icons**: Lucide React
- **Typography**: Custom Ursa typeface (fallback: Inter)
- **Theme**: Dark mode primary, light mode secondary
- **Brand Colors**: Constellation-inspired palette

### 13.2 Key Screens

#### Dashboard (`/dashboard`)

- Credit balance (prominent, with expiring credits warning)
- Recent generations (grid)
- Quick actions (new generation, new project)
- Active batch progress (if any)

#### Project Studio (`/projects/[id]/studio`)

- Full-screen generation interface
- Left: References & Capabilities
- Center: Prompt input + Preview
- Right: Cost visualization (credits) + Generate button

#### Credits (`/credits`)

- Current balance with breakdown
- Credit pack purchase options
- Full ledger transaction history
- Expiring credits timeline

### 13.3 Cost Visualization (Cognitive Ergonomics)

Before any generation, users see:

```
┌─────────────────────────────────────────────────┐
│  GENERATION COST PREVIEW                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Base Generation (Precision Mode)    8 credits  │
│  + Style Reference                   2 credits  │
│  + Subject Reference (2 images)      4 credits  │
│  ─────────────────────────────────────────────  │
│  TOTAL                              14 credits  │
│                                                 │
│  Your Balance: 47 credits                       │
│  After Generation: 33 credits                   │
│                                                 │
│  [Cancel]                    [Generate ✓]       │
└─────────────────────────────────────────────────┘
```

---

## 14. Definition of Done

### 14.1 Feature Complete Checklist

#### Authentication & Authorization

- [ ] GCP Identity Platform configured
- [ ] OAuth (Google, GitHub) working
- [ ] Email/Password with verification
- [ ] MFA optional support
- [ ] Row-Level Security on all tables

#### Credit Ledger System

- [ ] Double-entry accounting implemented
- [ ] All transaction types working
- [ ] Balance calculation from ledger
- [ ] Credit pack expiration (15 days)
- [ ] Daily reconciliation job
- [ ] FIFO consumption verified

#### Image Generation

- [ ] Cloud Tasks queue integration
- [ ] Vertex AI Studio adapter
- [ ] All Imagen 3 models working
- [ ] Prompt Template management
- [ ] Reference image processing
- [ ] R2 upload and CDN serving

#### Real-time Features

- [ ] Firebase Realtime integration
- [ ] Job status push notifications
- [ ] Webhook dispatch system
- [ ] Works with browser closed

### 14.2 Infrastructure Checklist

- [ ] Terraform modules complete
- [ ] Cloud Run deployed
- [ ] Cloud SQL provisioned (HA)
- [ ] Cloud Tasks queues created
- [ ] Cloudflare R2 bucket configured
- [ ] Firebase project linked
- [ ] Secret Manager secrets populated
- [ ] Cloud Monitoring dashboards
- [ ] Alerting policies active

---

## Appendix A: Environment Variables

```env
# GCP Configuration
GCP_PROJECT_ID=ursa-production
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT=ursa-app@ursa-production.iam.gserviceaccount.com

# Cloud SQL
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=ursa-outputs
R2_PUBLIC_URL=https://cdn.ursa.ai

# Firebase
FIREBASE_PROJECT_ID=ursa-production
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Vertex AI
VERTEX_AI_LOCATION=us-central1

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://ursa.ai
```

---

## Appendix B: Credit Cost Matrix

| Mode           | Base | +1 Ref | +2 Refs | +3 Refs | +4 Refs |
| -------------- | ---- | ------ | ------- | ------- | ------- |
| Precision Mode | 8    | 10     | 12      | 14      | 16      |
| Standard Mode  | 6    | —      | —       | —       | —       |
| Fast Mode      | 3    | —      | —       | —       | —       |

---

## Appendix C: Glossary

| Term                    | Definition                                 |
| ----------------------- | ------------------------------------------ |
| **Ursa**                | The platform brand name                    |
| **RBIG Engine**         | The core generation engine (internal name) |
| **Credit**              | Virtual currency for generations           |
| **Ledger**              | Double-entry accounting system for credits |
| **Creative Capability** | User-facing term for reference types       |
| **Prompt Template**     | Vertex AI managed prompt configuration     |
| **R2**                  | Cloudflare's S3-compatible object storage  |

---

**Document Status**: APPROVED  
**Architecture Style**: Greenfield GCP-Native  
**Last Updated**: 2025-01-XX  
**Author**: The Resilient Architect  
**Review Required By**: Project Stakeholder
