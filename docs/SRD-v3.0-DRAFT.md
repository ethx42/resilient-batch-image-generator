# Software Requirements Document (SRD) v3.0

**Product Name:** Ursa  
**Domain:** ursa.ai  
**Tagline:** "Create with constellation-grade precision"  
**Version:** 3.0.0 (Enterprise Multi-Tenant)  
**Architecture Style:** Serverless Multi-Tenant SaaS with Credit-Based Monetization  
**Status:** APPROVED — Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Vision](#2-system-vision)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Domain Model](#5-domain-model)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [AI Provider Integration](#8-ai-provider-integration)
9. [Credit System & Billing](#9-credit-system--billing)
10. [Security Architecture](#10-security-architecture)
11. [Observability & Operations](#11-observability--operations)
12. [API Specification](#12-api-specification)
13. [User Interface Requirements](#13-user-interface-requirements)
14. [Data Migration Strategy](#14-data-migration-strategy)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Executive Summary

### 1.1 Purpose

RBIG v3.0 ("Orinoco") is a complete reimagining of the Resilient Batch Image Generator as an **enterprise-grade, multi-tenant SaaS platform** for AI-powered image generation. The system enables users to:

- Create and manage multiple **Projects** with distinct aesthetic configurations
- Upload and utilize **Reference Images** for consistent character/style generation
- Generate images using **multiple AI providers** (fal.ai, Vertex AI, OpenAI, Replicate)
- Pay via a **prepaid credit system** with transparent per-generation costs
- Monitor generation progress in **real-time** with resilient job recovery

### 1.2 Key Differentiators from v2.x

| Aspect | v2.x (Current) | v3.0 (Orinoco) |
|--------|----------------|----------------|
| **Tenancy** | Single-user | Multi-tenant with isolation |
| **Deployment** | Local/Docker | Serverless (Vercel + Supabase) |
| **Persistence** | Local JSON file | PostgreSQL with RLS |
| **AI Providers** | Vertex AI only | Multi-provider (fal.ai primary) |
| **Monetization** | None | Prepaid credit system |
| **Auth** | None | Supabase Auth (OAuth + Magic Link) |
| **Storage** | Local filesystem | Cloud object storage |
| **Realtime** | SSE (single server) | Supabase Realtime (distributed) |

### 1.3 Success Criteria

1. **Zero-Downtime Operations**: System must handle provider failures gracefully
2. **Sub-30s Generation**: 95th percentile generation time under 30 seconds
3. **100% Credit Accuracy**: No credit leakage or double-charging
4. **Enterprise Security**: SOC 2 Type II alignment, GDPR compliant
5. **Horizontal Scalability**: Handle 1000+ concurrent generations

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

### 2.2 Core Value Propositions

1. **Project-Based Organization**: Group prompts, references, and outputs by project
2. **Reference Image Intelligence**: Maintain character/style/product consistency
3. **Provider Flexibility**: Choose the best AI model for each use case
4. **Transparent Pricing**: Know exactly what each generation costs before executing
5. **Resilient by Design**: Never lose work due to failures or interruptions

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              EDGE LAYER                                 │
│                    Vercel Edge Network (CDN + Functions)                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 15 Application                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  Auth   │ │Dashboard│ │Projects │ │ Studio  │ │ Billing │   │   │
│  │  │  Pages  │ │  Pages  │ │  Pages  │ │  Pages  │ │  Pages  │   │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │   │
│  │       └───────────┴───────────┴───────────┴───────────┘         │   │
│  │                              │                                   │   │
│  │  ┌───────────────────────────▼───────────────────────────────┐  │   │
│  │  │                      tRPC Router                           │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │   │
│  │  │  │  auth   │ │ project │ │  job    │ │ credit  │          │  │   │
│  │  │  │ router  │ │ router  │ │ router  │ │ router  │          │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │  │   │
│  │  └───────────────────────────┬───────────────────────────────┘  │   │
│  └──────────────────────────────┼──────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────┐
│                          SERVICES LAYER                                 │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │                     Vercel Serverless Functions                  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │   │
│  │  │   Credit    │ │    Job      │ │  Provider   │                │   │
│  │  │  Service    │ │  Processor  │ │  Registry   │                │   │
│  │  │             │ │             │ │             │                │   │
│  │  │ - Reserve   │ │ - Enqueue   │ │ - fal.ai    │                │   │
│  │  │ - Commit    │ │ - Process   │ │ - Vertex    │                │   │
│  │  │ - Rollback  │ │ - Retry     │ │ - OpenAI    │                │   │
│  │  │ - Refund    │ │ - Notify    │ │ - Replicate │                │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Inngest (Background Jobs)                     │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │   │
│  │  │  generation/    │ │  credits/       │ │  cleanup/       │    │   │
│  │  │  process        │ │  expire         │ │  orphaned       │    │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│      SUPABASE       │ │    AI PROVIDERS     │ │      PAYMENTS       │
│                     │ │                     │ │                     │
│ ┌─────────────────┐ │ │ ┌─────────────────┐ │ │ ┌─────────────────┐ │
│ │   PostgreSQL    │ │ │ │     fal.ai     │ │ │ │     Stripe      │ │
│ │   (with RLS)    │ │ │ │   (Primary)     │ │ │ │   (Checkout)    │ │
│ ├─────────────────┤ │ │ ├─────────────────┤ │ │ ├─────────────────┤ │
│ │    Realtime     │ │ │ │   Vertex AI     │ │ │ │    Webhooks     │ │
│ │  (Broadcasts)   │ │ │ │  (Secondary)    │ │ │ │   (Fulfillment) │ │
│ ├─────────────────┤ │ │ ├─────────────────┤ │ │ └─────────────────┘ │
│ │    Storage      │ │ │ │    OpenAI       │ │ │                     │
│ │  (References +  │ │ │ │   (DALL-E 3)    │ │ │                     │
│ │    Outputs)     │ │ │ ├─────────────────┤ │ │                     │
│ ├─────────────────┤ │ │ │   Replicate     │ │ │                     │
│ │      Auth       │ │ │ │   (Fallback)    │ │ │                     │
│ │  (OAuth + MFA)  │ │ │ └─────────────────┘ │ │                     │
│ └─────────────────┘ │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### 3.2 Architectural Principles

#### 3.2.1 Serverless-First
All compute is ephemeral. No persistent servers. Scale to zero when idle.

#### 3.2.2 Event-Driven
All state changes emit events. UI reacts to events, not polling.

#### 3.2.3 Provider-Agnostic
AI providers are interchangeable. No vendor lock-in at the application layer.

#### 3.2.4 Credit-Centric
Every generation operation is tied to a credit transaction. No orphaned operations.

#### 3.2.5 Tenant-Isolated
Row-Level Security (RLS) ensures data isolation at the database level.

---

## 4. Technology Stack

### 4.1 Core Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Node.js 20 LTS | Stability, ecosystem, TypeScript support |
| **Language** | TypeScript 5.x (Strict) | Type safety, maintainability |
| **Framework** | Next.js 15 (App Router) | Full-stack, RSC, Edge runtime |
| **API** | tRPC v11 | End-to-end type safety, zero codegen |
| **Database** | Supabase PostgreSQL | Managed, RLS, Realtime, Auth included |
| **ORM** | Drizzle ORM | Type-safe, SQL-first, excellent DX |
| **Auth** | Supabase Auth | OAuth, Magic Link, MFA, Session management |
| **Storage** | Supabase Storage | S3-compatible, CDN, transformations |
| **Realtime** | Supabase Realtime | Postgres Changes, Broadcast, Presence |
| **Queue** | Inngest | Serverless queues, retries, observability |
| **Payments** | Stripe | Industry standard, webhooks, checkout |
| **Hosting** | Vercel | Zero-config, edge network, previews |

### 4.2 AI Provider SDKs

| Provider | SDK | Primary Models |
|----------|-----|----------------|
| **fal.ai** | `@fal-ai/client` | FLUX Pro 1.1, FLUX Kontext, Recraft V3 |
| **Vertex AI** | `@google-cloud/aiplatform` | Imagen 3, Nano Banana Pro |
| **OpenAI** | `openai` | DALL-E 3, GPT-Image-1 |
| **Replicate** | `replicate` | SDXL, Playground v2.5 |

### 4.3 Development & Quality

| Tool | Purpose |
|------|---------|
| **pnpm** | Package management (workspaces support) |
| **Turborepo** | Monorepo build system |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **ESLint + Prettier** | Code quality |
| **Zod** | Runtime validation |
| **Sentry** | Error tracking |
| **PostHog** | Product analytics |

### 4.4 Package Structure (Monorepo)

```
/apps
  /web                 # Next.js application
  /docs                # Documentation site (optional)
  
/packages
  /db                  # Drizzle schema + migrations
  /ai                  # AI provider adapters
  /credits             # Credit service logic
  /shared              # Shared types, utils, constants
  /ui                  # Shared UI components (shadcn/ui)
  /config              # Shared configs (ESLint, TS, etc.)
```

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
      │ 1:N           ┌─────┴─────┐
      │               │           │
┌─────▼─────┐   ┌─────▼─────┐   ┌─▼───────────┐
│  Credit   │   │    Job    │───│  Generation │
│  Balance  │   │           │1:N│   Output    │
└───────────┘   └───────────┘   └─────────────┘
      │
      │ 1:N
┌─────▼───────────┐
│    Credit       │
│  Transaction    │
└─────────────────┘
```

### 5.2 Core Entities

#### 5.2.1 User

```typescript
interface User {
  id: string;                    // UUID (Supabase Auth)
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  
  // Settings
  defaultAspectRatio: AspectRatio;
  preferredProvider: ProviderId | 'auto';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}
```

#### 5.2.2 Project

```typescript
interface Project {
  id: string;                    // UUID
  userId: string;                // FK → User
  
  // Core
  name: string;                  // e.g., "Cocadas Product Line"
  description: string | null;
  slug: string;                  // URL-friendly: "cocadas-product-line"
  
  // Aesthetic Configuration
  masterAestheticPrompt: string; // Prepended to all generations
  negativePrompt: string | null; // What to avoid
  
  // Generation Defaults
  defaultAspectRatio: AspectRatio;
  defaultProvider: ProviderId | 'auto';
  defaultModel: string | null;   // e.g., "flux-pro-v1.1"
  defaultSafetyLevel: SafetyLevel;
  
  // Statistics (denormalized for performance)
  totalGenerations: number;
  totalCreditsSpent: number;
  
  // Metadata
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';
type SafetyLevel = 'strict' | 'moderate' | 'permissive';
```

#### 5.2.3 Reference Image

```typescript
interface ReferenceImage {
  id: string;                    // UUID
  projectId: string;             // FK → Project
  
  // Classification
  type: ReferenceType;
  label: string;                 // User-defined: "Main Product", "Style A"
  description: string | null;    // For AI context
  
  // Storage
  storagePath: string;           // Supabase Storage path
  publicUrl: string;             // CDN URL
  thumbnailUrl: string | null;   // Resized version
  
  // Technical
  mimeType: string;              // image/png, image/jpeg
  sizeBytes: number;
  width: number;
  height: number;
  
  // Usage tracking
  usageCount: number;            // How many times used in generations
  
  // Metadata
  isActive: boolean;             // Soft delete
  createdAt: Date;
  updatedAt: Date;
}

type ReferenceType = 
  | 'subject'    // Product/person to maintain identity
  | 'style'      // Visual style to apply
  | 'control'    // Structure/pose to follow
  | 'character'  // Character for consistency (FLUX Kontext)
  | 'brand';     // Brand assets (logos, colors)
```

#### 5.2.4 Job

```typescript
interface Job {
  id: string;                    // UUID
  projectId: string;             // FK → Project
  userId: string;                // FK → User (denormalized for RLS)
  
  // Request
  prompt: string;                // User's prompt
  combinedPrompt: string;        // With aesthetic + references
  
  // References Used
  referenceIds: string[];        // Array of ReferenceImage IDs
  
  // Provider Configuration
  providerId: ProviderId;
  modelId: string;
  
  // Parameters
  aspectRatio: AspectRatio;
  safetyLevel: SafetyLevel;
  seed: number | null;           // For reproducibility
  
  // Status
  status: JobStatus;
  progress: number;              // 0-100
  
  // Credit Tracking
  creditTransactionId: string;   // FK → CreditTransaction
  estimatedCredits: number;      // Reserved on creation
  actualCredits: number | null;  // Committed on completion
  
  // Results
  outputs: GenerationOutput[];   // Inline for simplicity
  
  // Error Handling
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  failedAt: Date | null;
  
  // Timing
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

type JobStatus = 
  | 'pending'      // Waiting in queue
  | 'reserved'     // Credits reserved, waiting for worker
  | 'processing'   // AI provider working
  | 'uploading'    // Saving to storage
  | 'completed'    // Success
  | 'failed'       // All retries exhausted
  | 'cancelled';   // User cancelled

type ProviderId = 'fal' | 'vertex' | 'openai' | 'replicate';
```

#### 5.2.5 Generation Output

```typescript
interface GenerationOutput {
  id: string;                    // UUID
  jobId: string;                 // FK → Job
  
  // Storage
  storagePath: string;
  publicUrl: string;
  thumbnailUrl: string;
  
  // Technical
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  
  // Provider Response
  providerMetadata: Record<string, unknown>; // Raw response
  generationTimeMs: number;
  
  // Metadata
  createdAt: Date;
}
```

#### 5.2.6 Credit Balance

```typescript
interface CreditBalance {
  id: string;                    // UUID
  userId: string;                // FK → User (unique)
  
  // Balances
  availableCredits: number;      // Can be spent
  reservedCredits: number;       // Held for pending jobs
  lifetimeCredits: number;       // Total ever purchased
  
  // Metadata
  updatedAt: Date;
}

// Invariant: availableCredits >= 0
// Invariant: reservedCredits >= 0
// Invariant: availableCredits + reservedCredits <= lifetimeCredits
```

#### 5.2.6.1 Credit Pack (for expiration tracking)

```typescript
interface CreditPack {
  id: string;                    // UUID
  userId: string;                // FK → User
  
  // Pack Info
  originalCredits: number;       // Credits when purchased
  remainingCredits: number;      // Credits still available
  
  // Source
  source: 'purchase' | 'welcome' | 'bonus' | 'refund';
  stripePaymentId: string | null;
  
  // Expiration
  expiresAt: Date;               // 15 days from creation
  isExpired: boolean;            // Computed or trigger-updated
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// CRITICAL: Credits are consumed FIFO (oldest packs first)
// Expiration check runs daily via scheduled Inngest job
// Expiring credits warning sent 3 days before expiration
```

#### 5.2.7 Credit Transaction

```typescript
interface CreditTransaction {
  id: string;                    // UUID
  userId: string;                // FK → User
  
  // Transaction Type
  type: TransactionType;
  status: TransactionStatus;
  
  // Amounts
  amount: number;                // Positive for credits, negative for debits
  balanceBefore: number;         // Snapshot for auditing
  balanceAfter: number;
  
  // References
  jobId: string | null;          // For generation transactions
  stripePaymentId: string | null;// For purchase transactions
  relatedTransactionId: string | null; // For refunds/rollbacks
  
  // Description
  description: string;           // Human-readable
  metadata: Record<string, unknown>;
  
  // Metadata
  createdAt: Date;
}

type TransactionType =
  | 'purchase'     // Bought credits via Stripe
  | 'welcome'      // 10 credits for new users (expire in 15 days)
  | 'bonus'        // Promotional credits
  | 'reserve'      // Held for pending job
  | 'commit'       // Completed generation
  | 'rollback'     // Cancelled/failed job refund
  | 'refund'       // Admin refund
  | 'expire';      // Credits expired after 15 days

type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

---

## 6. Functional Requirements

### 6.1 Authentication & Authorization

#### FR-AUTH-001: User Registration
- **Priority**: P0 (Critical)
- **Description**: Users can register via OAuth (Google, GitHub) or Magic Link
- **Acceptance Criteria**:
  - OAuth flow completes in < 3 seconds
  - Magic Link emails sent within 5 seconds
  - New users receive **10 welcome credits** on first login (expire in 15 days)
  - User profile created with sensible defaults
  - Welcome email sent with getting started guide

#### FR-AUTH-002: Session Management
- **Priority**: P0 (Critical)
- **Description**: Secure session handling with automatic refresh
- **Acceptance Criteria**:
  - Sessions expire after 7 days of inactivity
  - Active sessions auto-refresh
  - Users can view and revoke active sessions
  - Session invalidation propagates within 1 minute

#### FR-AUTH-003: Row-Level Security
- **Priority**: P0 (Critical)
- **Description**: All data access enforced at database level
- **Acceptance Criteria**:
  - Users can ONLY access their own data
  - RLS policies cover all tables
  - No client-side security bypasses possible
  - Admin overrides require explicit role check

### 6.2 Project Management

#### FR-PROJ-001: Create Project
- **Priority**: P0 (Critical)
- **Description**: Users can create new projects with configuration
- **Acceptance Criteria**:
  - Project name required, 3-100 characters
  - Slug auto-generated from name, user-editable
  - Master aesthetic prompt optional, max 2000 chars
  - Default settings inherited from user preferences
  - Project created within 500ms

#### FR-PROJ-002: Project Gallery
- **Priority**: P1 (High)
- **Description**: View all generations within a project
- **Acceptance Criteria**:
  - Infinite scroll with virtualization
  - Filter by status, date range, model
  - Sort by date, credit cost
  - Bulk actions (delete, download)
  - Image preview with zoom

#### FR-PROJ-003: Project Settings
- **Priority**: P1 (High)
- **Description**: Configure project defaults and aesthetics
- **Acceptance Criteria**:
  - Edit name, description, aesthetic prompt
  - Set default provider/model
  - Configure safety level
  - Archive/unarchive project
  - Delete project (with confirmation, soft delete)

### 6.3 Reference Images

#### FR-REF-001: Upload Reference Images
- **Priority**: P0 (Critical)
- **Description**: Upload images to use as references in generations
- **Acceptance Criteria**:
  - Drag-and-drop or file picker
  - Support PNG, JPEG, WebP up to 10MB
  - Auto-generate thumbnail (256px)
  - Classify type (subject, style, control, character)
  - Maximum 20 active references per project

#### FR-REF-002: Manage References
- **Priority**: P1 (High)
- **Description**: Organize and edit reference images
- **Acceptance Criteria**:
  - Rename and add descriptions
  - Change classification type
  - View usage statistics
  - Delete (soft delete, warn if used in pending jobs)
  - Reorder for default selection priority

#### FR-REF-003: Reference Preview
- **Priority**: P2 (Medium)
- **Description**: Preview how references affect generation
- **Acceptance Criteria**:
  - Show reference alongside sample output
  - Display compatible models for each reference type
  - Estimate credit cost based on reference count

### 6.4 Image Generation

#### FR-GEN-001: Single Generation
- **Priority**: P0 (Critical)
- **Description**: Generate a single image from a prompt
- **Acceptance Criteria**:
  - Input prompt (required, 1-2000 chars)
  - Select references (optional, max 4)
  - Choose aspect ratio from supported options
  - Select provider/model or use "auto"
  - Display credit cost before generation
  - Generation starts within 1 second of submission

#### FR-GEN-002: Batch Generation
- **Priority**: P1 (High)
- **Description**: Generate multiple images from a list of prompts
- **Acceptance Criteria**:
  - Upload CSV or paste multiple prompts
  - Apply same references to all
  - Display total credit cost
  - Parallel processing (configurable concurrency)
  - Individual job progress tracking
  - Cancel remaining jobs at any point

#### FR-GEN-003: Realtime Progress
- **Priority**: P0 (Critical)
- **Description**: Show generation progress in real-time
- **Acceptance Criteria**:
  - Status updates via Supabase Realtime
  - Progress percentage when available
  - Estimated time remaining
  - Immediate image display on completion
  - Error display with retry option

#### FR-GEN-004: Retry Failed Jobs
- **Priority**: P1 (High)
- **Description**: Retry failed generations
- **Acceptance Criteria**:
  - One-click retry for failed jobs
  - Option to change provider on retry
  - Automatic retry (configurable, default 2 attempts)
  - No additional credit charge for provider errors
  - Clear error messages with troubleshooting hints

#### FR-GEN-005: Provider Selection
- **Priority**: P1 (High)
- **Description**: Choose or auto-select AI provider
- **Acceptance Criteria**:
  - Display all available providers with models
  - Show credit cost per provider
  - "Auto" mode selects based on references and cost
  - Remember last used provider per project
  - Fallback to next provider on failure (configurable)

### 6.5 Gallery & Outputs

#### FR-GAL-001: Image Gallery
- **Priority**: P0 (Critical)
- **Description**: Browse all generated images
- **Acceptance Criteria**:
  - Global gallery (all projects) and per-project
  - Grid and list view options
  - Filter by project, date, model, status
  - Sort by date, alphabetical, cost
  - Responsive design (mobile-friendly)

#### FR-GAL-002: Image Details
- **Priority**: P1 (High)
- **Description**: View full details of generated image
- **Acceptance Criteria**:
  - Full resolution image view
  - Original prompt and combined prompt
  - References used (thumbnails)
  - Provider, model, generation time
  - Credit cost
  - Download in multiple formats (PNG, JPEG, WebP)

#### FR-GAL-003: Bulk Operations
- **Priority**: P2 (Medium)
- **Description**: Perform actions on multiple images
- **Acceptance Criteria**:
  - Select multiple images
  - Bulk download (ZIP)
  - Bulk delete
  - Move to different project (future)

### 6.6 Credit System

#### FR-CRED-001: View Balance
- **Priority**: P0 (Critical)
- **Description**: Display current credit balance
- **Acceptance Criteria**:
  - Available credits prominently displayed
  - Reserved credits shown separately
  - Low balance warning (< 10 credits)
  - Link to purchase more credits

#### FR-CRED-002: Purchase Credits
- **Priority**: P0 (Critical)
- **Description**: Buy credits via Stripe Checkout
- **Acceptance Criteria**:
  - Multiple credit packs (100, 500, 1000, 5000)
  - Volume discounts for larger packs
  - Stripe Checkout redirect
  - Credits added immediately on successful payment
  - Email receipt sent
  - Transaction recorded in history

#### FR-CRED-003: Transaction History
- **Priority**: P1 (High)
- **Description**: View all credit transactions
- **Acceptance Criteria**:
  - List all purchases, generations, refunds
  - Filter by type, date range
  - Export to CSV
  - Link to related job for generation transactions

#### FR-CRED-004: Cost Estimation
- **Priority**: P0 (Critical)
- **Description**: Show cost before generation
- **Acceptance Criteria**:
  - Display estimated credits for single generation
  - Display total for batch generation
  - Warning if insufficient credits
  - Breakdown by model and options (if applicable)

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load (LCP)** | < 2.5s | Lighthouse |
| **Time to Interactive** | < 3.5s | Lighthouse |
| **API Response (p95)** | < 200ms | Vercel Analytics |
| **Generation Start** | < 2s | Custom metric |
| **Realtime Latency** | < 500ms | Supabase metrics |
| **Image Upload** | < 5s for 10MB | Custom metric |

### 7.2 Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Vercel/Supabase SLA |
| **Error Rate** | < 0.1% | Sentry |
| **Job Success Rate** | > 98% | Custom metric |
| **Data Durability** | 99.999999999% | Supabase (11 nines) |

### 7.3 Scalability

| Metric | Target | Notes |
|--------|--------|-------|
| **Concurrent Users** | 10,000 | Vercel Edge |
| **Concurrent Generations** | 1,000 | Inngest workers |
| **Storage per User** | 10GB | Supabase tier |
| **Projects per User** | 100 | Soft limit |
| **References per Project** | 20 | Hard limit |

### 7.4 Security

| Requirement | Implementation |
|-------------|----------------|
| **Authentication** | Supabase Auth (OAuth 2.0, MFA optional) |
| **Authorization** | Row-Level Security (RLS) |
| **Data Encryption (rest)** | AES-256 (Supabase default) |
| **Data Encryption (transit)** | TLS 1.3 |
| **Secrets Management** | Vercel Environment Variables |
| **API Rate Limiting** | 100 req/min per user |
| **Input Validation** | Zod schemas on all endpoints |
| **OWASP Compliance** | Top 10 mitigations |

### 7.5 Compliance

| Regulation | Status | Notes |
|------------|--------|-------|
| **GDPR** | Required | Data export, deletion rights |
| **CCPA** | Required | California privacy |
| **SOC 2** | Roadmap | Via Supabase/Vercel |

---

## 8. AI Provider Integration

### 8.1 Provider Registry Architecture

```typescript
interface AIProvider {
  id: ProviderId;
  name: string;
  
  // Capabilities
  supportedFeatures: ProviderFeature[];
  supportedAspectRatios: AspectRatio[];
  
  // Models
  models: AIModel[];
  
  // Methods
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  estimateCost(request: GenerationRequest): CreditCost;
  healthCheck(): Promise<HealthStatus>;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  
  // Capabilities
  supportsReferences: boolean;
  referenceTypes: ReferenceType[];
  maxReferences: number;
  
  // Quality & Speed
  qualityTier: 'standard' | 'high' | 'ultra';
  averageGenerationTimeMs: number;
  
  // Cost
  baseCreditCost: number;
  perReferenceCost: number;
}

type ProviderFeature =
  | 'text-to-image'
  | 'image-to-image'
  | 'inpainting'
  | 'outpainting'
  | 'upscaling'
  | 'character-consistency'
  | 'style-transfer'
  | 'controlnet';
```

### 8.2 MVP Model Priority

The following 5 models are prioritized for MVP launch. The codebase MUST be architected to support all available models, but these are guaranteed for launch:

| Priority | Provider | Model | Use Case |
|----------|----------|-------|----------|
| **1** | fal.ai | FLUX Pro 1.1 | General purpose, high quality |
| **2** | fal.ai | FLUX Kontext | Character/subject consistency |
| **3** | Vertex AI | Imagen 3 | Google ecosystem, enterprise |
| **4** | fal.ai | Recraft V3 | Design/graphics focused |
| **5** | OpenAI | DALL-E 3 | Strong prompt adherence |

**Post-MVP Expansion:**
- FLUX Pro 1.1 Ultra (higher resolution)
- Imagen 3 Capability (reference images)
- Ideogram V2 (text in images)
- Stable Diffusion XL (cost-effective)
- Replicate models (community models)

### 8.3 Provider Configurations

#### 8.3.1 fal.ai (Primary)

```typescript
const FAL_PROVIDER: AIProvider = {
  id: 'fal',
  name: 'fal.ai',
  
  supportedFeatures: [
    'text-to-image',
    'image-to-image',
    'character-consistency',
    'style-transfer',
    'controlnet',
  ],
  
  models: [
    {
      id: 'fal-ai/flux-pro/v1.1',
      name: 'FLUX Pro 1.1',
      description: 'High-quality general purpose generation',
      supportsReferences: false,
      qualityTier: 'high',
      baseCreditCost: 5,
    },
    {
      id: 'fal-ai/flux-pro/v1.1-ultra',
      name: 'FLUX Pro 1.1 Ultra',
      description: 'Maximum quality, higher resolution',
      supportsReferences: false,
      qualityTier: 'ultra',
      baseCreditCost: 10,
    },
    {
      id: 'fal-ai/flux-kontext',
      name: 'FLUX Kontext',
      description: 'Character consistency across images',
      supportsReferences: true,
      referenceTypes: ['character', 'subject'],
      maxReferences: 4,
      qualityTier: 'high',
      baseCreditCost: 8,
      perReferenceCost: 2,
    },
    {
      id: 'fal-ai/recraft-v3',
      name: 'Recraft V3',
      description: 'Design-focused, great for graphics',
      supportsReferences: true,
      referenceTypes: ['style'],
      maxReferences: 1,
      qualityTier: 'high',
      baseCreditCost: 6,
    },
    {
      id: 'fal-ai/ideogram/v2',
      name: 'Ideogram V2',
      description: 'Best for text in images',
      supportsReferences: false,
      qualityTier: 'high',
      baseCreditCost: 5,
    },
  ],
};
```

#### 8.3.2 Vertex AI (Secondary)

```typescript
const VERTEX_PROVIDER: AIProvider = {
  id: 'vertex',
  name: 'Google Vertex AI',
  
  supportedFeatures: [
    'text-to-image',
    'image-to-image',
    'character-consistency',
    'style-transfer',
  ],
  
  models: [
    {
      id: 'imagen-3.0-generate-001',
      name: 'Imagen 3',
      description: 'Google flagship image generation',
      supportsReferences: false,
      qualityTier: 'high',
      baseCreditCost: 6,
    },
    {
      id: 'imagen-3.0-fast-generate-001',
      name: 'Imagen 3 Fast',
      description: 'Faster generation, good quality',
      supportsReferences: false,
      qualityTier: 'standard',
      baseCreditCost: 3,
    },
    {
      id: 'imagen-3.0-capability-001',
      name: 'Imagen 3 Capability',
      description: 'Supports reference images',
      supportsReferences: true,
      referenceTypes: ['subject', 'style', 'control'],
      maxReferences: 4,
      qualityTier: 'high',
      baseCreditCost: 8,
      perReferenceCost: 2,
    },
  ],
};
```

#### 8.3.3 OpenAI (Alternative)

```typescript
const OPENAI_PROVIDER: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  
  supportedFeatures: [
    'text-to-image',
  ],
  
  models: [
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      description: 'OpenAI flagship, great prompt following',
      supportsReferences: false,
      qualityTier: 'high',
      baseCreditCost: 8,
    },
  ],
};
```

### 8.4 Auto-Selection Algorithm

```typescript
function selectProvider(request: GenerationRequest): ProviderSelection {
  const { references, preferredProvider, preferQuality, preferSpeed, preferCost } = request;
  
  // 1. If references used, filter to supporting models
  const compatibleModels = references?.length
    ? getAllModels().filter(m => 
        m.supportsReferences && 
        references.every(r => m.referenceTypes.includes(r.type))
      )
    : getAllModels();
  
  // 2. Apply user preference if valid
  if (preferredProvider && preferredProvider !== 'auto') {
    const preferred = compatibleModels.filter(m => m.providerId === preferredProvider);
    if (preferred.length) return selectBestModel(preferred, { preferQuality, preferSpeed, preferCost });
  }
  
  // 3. Score models based on preferences
  return selectBestModel(compatibleModels, { preferQuality, preferSpeed, preferCost });
}

function selectBestModel(models: AIModel[], preferences: Preferences): ProviderSelection {
  const scores = models.map(model => ({
    model,
    score: calculateScore(model, preferences),
  }));
  
  return scores.sort((a, b) => b.score - a.score)[0];
}
```

### 8.5 Fallback Strategy

```typescript
const FALLBACK_CHAIN: Record<ProviderId, ProviderId[]> = {
  fal: ['vertex', 'openai', 'replicate'],
  vertex: ['fal', 'openai', 'replicate'],
  openai: ['fal', 'vertex', 'replicate'],
  replicate: ['fal', 'vertex', 'openai'],
};

async function generateWithFallback(request: GenerationRequest): Promise<GenerationResult> {
  const providers = [request.providerId, ...FALLBACK_CHAIN[request.providerId]];
  
  for (const providerId of providers) {
    try {
      return await getProvider(providerId).generate(request);
    } catch (error) {
      if (isRetryable(error) && hasMoreProviders(providers, providerId)) {
        logger.warn({ providerId, error }, 'Provider failed, trying fallback');
        continue;
      }
      throw error;
    }
  }
  
  throw new AllProvidersFailedError(providers);
}
```

---

## 9. Credit System & Billing

### 9.1 Credit Pricing Model

#### 9.1.1 Credit Packs

| Pack | Credits | Price (USD) | Per Credit | Savings |
|------|---------|-------------|------------|---------|
| Starter | 100 | $10 | $0.100 | — |
| Creator | 500 | $40 | $0.080 | 20% |
| Pro | 1,000 | $70 | $0.070 | 30% |
| Studio | 5,000 | $300 | $0.060 | 40% |

#### 9.1.2 Credit Costs per Model

| Model | Base Cost | Per Reference | Typical Total |
|-------|-----------|---------------|---------------|
| FLUX Pro 1.1 | 5 | — | 5 |
| FLUX Pro Ultra | 10 | — | 10 |
| FLUX Kontext | 8 | +2 each | 12-16 |
| Imagen 3 | 6 | — | 6 |
| Imagen 3 Fast | 3 | — | 3 |
| Imagen 3 Capability | 8 | +2 each | 12-16 |
| DALL-E 3 | 8 | — | 8 |
| Recraft V3 | 6 | +1 style | 7 |

### 9.2 Credit Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GENERATION REQUEST FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

User Submits Generation
         │
         ▼
┌─────────────────┐
│ 1. ESTIMATE     │  Calculate credits needed based on model + references
│    CREDITS      │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. CHECK        │  Verify user has sufficient available credits
│    BALANCE      │  Return error if insufficient
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. RESERVE      │  availableCredits -= estimatedCredits
│    CREDITS      │  reservedCredits += estimatedCredits
│                 │  Create PENDING transaction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. QUEUE JOB    │  Submit to Inngest for processing
│                 │  Status: RESERVED
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    ▼         ▼
SUCCESS    FAILURE
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────┐
│5a.COMMIT│ │ 5b. ROLLBACK│
│ CREDITS │ │    CREDITS  │
│         │ │             │
│reserved │ │ reserved    │
│ -= est  │ │  -= est     │
│         │ │ available   │
│ Create  │ │  += est     │
│COMPLETED│ │             │
│  txn    │ │ Create      │
└─────────┘ │ CANCELLED   │
            │   txn       │
            └─────────────┘
```

### 9.3 Transactional Guarantees

```typescript
// All credit operations MUST be atomic
// Uses PostgreSQL transaction with serializable isolation

async function reserveCredits(userId: string, amount: number, jobId: string): Promise<CreditTransaction> {
  return await db.transaction(async (tx) => {
    // 1. Lock balance row for update
    const balance = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .for('update')
      .limit(1);
    
    if (!balance.length) {
      throw new NoCreditBalanceError(userId);
    }
    
    const { availableCredits, reservedCredits } = balance[0];
    
    // 2. Check sufficient funds
    if (availableCredits < amount) {
      throw new InsufficientCreditsError(availableCredits, amount);
    }
    
    // 3. Update balance
    await tx
      .update(creditBalances)
      .set({
        availableCredits: availableCredits - amount,
        reservedCredits: reservedCredits + amount,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));
    
    // 4. Create transaction record
    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type: 'reserve',
        status: 'pending',
        amount: -amount,
        balanceBefore: availableCredits,
        balanceAfter: availableCredits - amount,
        jobId,
        description: `Reserved ${amount} credits for job ${jobId}`,
      })
      .returning();
    
    return transaction;
  }, { isolationLevel: 'serializable' });
}
```

### 9.4 Stripe Integration

```typescript
// Stripe Checkout Session Creation
async function createCheckoutSession(userId: string, packId: CreditPackId): Promise<string> {
  const pack = CREDIT_PACKS[packId];
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: await getUserEmail(userId),
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${pack.credits} Credits`,
          description: `RBIG Credit Pack - ${pack.name}`,
        },
        unit_amount: pack.priceInCents,
      },
      quantity: 1,
    }],
    metadata: {
      userId,
      packId,
      credits: pack.credits.toString(),
    },
    success_url: `${env.APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/credits`,
  });
  
  return session.url!;
}

// Stripe Webhook Handler
async function handleCheckoutCompleted(event: Stripe.CheckoutSessionCompletedEvent): Promise<void> {
  const { userId, packId, credits } = event.data.object.metadata;
  
  await db.transaction(async (tx) => {
    // 1. Add credits to balance
    await tx
      .update(creditBalances)
      .set({
        availableCredits: sql`${creditBalances.availableCredits} + ${parseInt(credits)}`,
        lifetimeCredits: sql`${creditBalances.lifetimeCredits} + ${parseInt(credits)}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));
    
    // 2. Record transaction
    await tx.insert(creditTransactions).values({
      userId,
      type: 'purchase',
      status: 'completed',
      amount: parseInt(credits),
      stripePaymentId: event.data.object.payment_intent as string,
      description: `Purchased ${credits} credits`,
    });
  });
  
  // 3. Send confirmation email
  await sendPurchaseConfirmation(userId, parseInt(credits), event.data.object.amount_total!);
}
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   User      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  OAuth  │  │  Magic  │  │  Email  │
        │ (Google │  │  Link   │  │  Pass   │
        │ GitHub) │  │         │  │(Future) │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Supabase   │
                   │    Auth     │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   JWT       │
                   │  (httpOnly  │
                   │   cookie)   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Session    │
                   │  Validated  │
                   │  on Every   │
                   │   Request   │
                   └─────────────┘
```

### 10.2 Row-Level Security Policies

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Projects belong to users
CREATE POLICY "Users can CRUD own projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- References belong to projects (which belong to users)
CREATE POLICY "Users can CRUD own references"
ON reference_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = reference_images.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Jobs have denormalized user_id for performance
CREATE POLICY "Users can view own jobs"
ON jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create jobs in own projects"
ON jobs FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = jobs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Credit balances are private
CREATE POLICY "Users can view own balance"
ON credit_balances FOR SELECT
USING (auth.uid() = user_id);

-- Transactions are append-only for users
CREATE POLICY "Users can view own transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);
```

### 10.3 API Security

```typescript
// Middleware stack
const securityMiddleware = [
  // 1. Rate limiting
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (ctx) => ctx.user?.id ?? ctx.ip,
  }),
  
  // 2. Input validation (Zod)
  zodValidation(),
  
  // 3. Authentication check
  requireAuth(),
  
  // 4. Request logging
  requestLogger(),
];

// Protected procedure
const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(rateLimitMiddleware)
  .use(loggingMiddleware);

// Example: Create job with full validation
const createJob = protectedProcedure
  .input(CreateJobSchema)
  .mutation(async ({ ctx, input }) => {
    // User already validated via middleware
    const { user } = ctx;
    
    // Project ownership verified via RLS
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, input.projectId),
    });
    
    if (!project) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    
    // Credit check
    const cost = estimateCreditCost(input);
    const balance = await getCreditBalance(user.id);
    
    if (balance.availableCredits < cost) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Insufficient credits. Need ${cost}, have ${balance.availableCredits}`,
      });
    }
    
    // ... continue with job creation
  });
```

### 10.4 Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| `SUPABASE_SERVICE_KEY` | Vercel env | Manual |
| `FAL_API_KEY` | Vercel env | On demand |
| `GOOGLE_APPLICATION_CREDENTIALS` | Vercel env (JSON) | Annual |
| `OPENAI_API_KEY` | Vercel env | On demand |
| `STRIPE_SECRET_KEY` | Vercel env | Never (use webhook signing) |
| `STRIPE_WEBHOOK_SECRET` | Vercel env | On endpoint change |
| `SENTRY_DSN` | Vercel env | Never |

---

## 11. Observability & Operations

### 11.1 Logging Strategy

```typescript
// Structured logging with Pino
const logger = pino({
  level: env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'rbig',
    version: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    environment: env.VERCEL_ENV,
  },
});

// Context-aware child loggers
function createJobLogger(jobId: string, userId: string): Logger {
  return logger.child({
    jobId,
    userId,
    correlationId: crypto.randomUUID(),
  });
}

// Standard log events
const LOG_EVENTS = {
  // Job lifecycle
  JOB_CREATED: 'job.created',
  JOB_STARTED: 'job.started',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  JOB_RETRYING: 'job.retrying',
  
  // Credits
  CREDITS_RESERVED: 'credits.reserved',
  CREDITS_COMMITTED: 'credits.committed',
  CREDITS_ROLLED_BACK: 'credits.rolled_back',
  CREDITS_PURCHASED: 'credits.purchased',
  
  // Providers
  PROVIDER_CALLED: 'provider.called',
  PROVIDER_SUCCEEDED: 'provider.succeeded',
  PROVIDER_FAILED: 'provider.failed',
  PROVIDER_FALLBACK: 'provider.fallback',
} as const;
```

### 11.2 Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `job.created` | Counter | Jobs created |
| `job.completed` | Counter | Jobs completed successfully |
| `job.failed` | Counter | Jobs failed after all retries |
| `job.duration_ms` | Histogram | End-to-end job duration |
| `generation.duration_ms` | Histogram | AI generation time only |
| `credits.reserved` | Counter | Credits reserved |
| `credits.committed` | Counter | Credits actually charged |
| `credits.rolled_back` | Counter | Credits returned |
| `provider.requests` | Counter | Requests per provider |
| `provider.errors` | Counter | Errors per provider |
| `provider.latency_ms` | Histogram | Provider response time |

### 11.3 Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | Error rate > 5% for 5 min | Critical | Page on-call |
| Provider Down | Provider errors > 50% for 2 min | High | Auto-failover + notify |
| Credit Anomaly | Rollbacks > 10% of commits | High | Investigate |
| Queue Backup | Pending jobs > 1000 for 10 min | Medium | Scale workers |
| Low Balance Warning | Any user balance < 5 credits | Low | Send email |

### 11.4 Health Checks

```typescript
// /api/health endpoint
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkStorage(),
    checkProviders(),
    checkQueue(),
  ]);
  
  const results = {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: formatCheck(checks[0]),
      storage: formatCheck(checks[1]),
      providers: formatCheck(checks[2]),
      queue: formatCheck(checks[3]),
    },
  };
  
  return Response.json(results, {
    status: results.status === 'healthy' ? 200 : 503,
  });
}
```

---

## 12. API Specification

### 12.1 tRPC Router Structure

```typescript
const appRouter = router({
  // Authentication
  auth: router({
    getSession: publicProcedure.query(...),
    signOut: protectedProcedure.mutation(...),
  }),
  
  // User
  user: router({
    getProfile: protectedProcedure.query(...),
    updateProfile: protectedProcedure.mutation(...),
    getSettings: protectedProcedure.query(...),
    updateSettings: protectedProcedure.mutation(...),
  }),
  
  // Projects
  project: router({
    list: protectedProcedure.query(...),
    getById: protectedProcedure.input(z.string()).query(...),
    create: protectedProcedure.input(CreateProjectSchema).mutation(...),
    update: protectedProcedure.input(UpdateProjectSchema).mutation(...),
    delete: protectedProcedure.input(z.string()).mutation(...),
    archive: protectedProcedure.input(z.string()).mutation(...),
  }),
  
  // Reference Images
  reference: router({
    list: protectedProcedure.input(z.string()).query(...),
    upload: protectedProcedure.input(UploadReferenceSchema).mutation(...),
    update: protectedProcedure.input(UpdateReferenceSchema).mutation(...),
    delete: protectedProcedure.input(z.string()).mutation(...),
    getUploadUrl: protectedProcedure.mutation(...),
  }),
  
  // Jobs
  job: router({
    list: protectedProcedure.input(JobListSchema).query(...),
    getById: protectedProcedure.input(z.string()).query(...),
    create: protectedProcedure.input(CreateJobSchema).mutation(...),
    createBatch: protectedProcedure.input(CreateBatchSchema).mutation(...),
    cancel: protectedProcedure.input(z.string()).mutation(...),
    retry: protectedProcedure.input(z.string()).mutation(...),
    estimateCost: protectedProcedure.input(EstimateCostSchema).query(...),
  }),
  
  // Credits
  credit: router({
    getBalance: protectedProcedure.query(...),
    getTransactions: protectedProcedure.input(TransactionListSchema).query(...),
    createCheckoutSession: protectedProcedure.input(z.string()).mutation(...),
    verifyPurchase: protectedProcedure.input(z.string()).mutation(...),
  }),
  
  // Providers
  provider: router({
    list: protectedProcedure.query(...),
    getModels: protectedProcedure.input(z.string()).query(...),
    healthCheck: protectedProcedure.query(...),
  }),
});
```

### 12.2 Key Schemas

```typescript
// Create Job
const CreateJobSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1).max(2000),
  referenceIds: z.array(z.string().uuid()).max(4).optional(),
  providerId: z.enum(['fal', 'vertex', 'openai', 'replicate', 'auto']).default('auto'),
  modelId: z.string().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']).default('1:1'),
  safetyLevel: z.enum(['strict', 'moderate', 'permissive']).default('moderate'),
  seed: z.number().int().positive().optional(),
});

// Batch Generation
const CreateBatchSchema = z.object({
  projectId: z.string().uuid(),
  prompts: z.array(z.string().min(1).max(2000)).min(1).max(100),
  referenceIds: z.array(z.string().uuid()).max(4).optional(),
  providerId: z.enum(['fal', 'vertex', 'openai', 'replicate', 'auto']).default('auto'),
  modelId: z.string().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']).default('1:1'),
  concurrency: z.number().int().min(1).max(10).default(3),
});

// Upload Reference
const UploadReferenceSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['subject', 'style', 'control', 'character', 'brand']),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  // File uploaded separately via signed URL
});
```

---

## 13. User Interface Requirements

### 13.1 Design System

- **Component Library**: shadcn/ui (Radix primitives + Tailwind)
- **Icons**: Lucide React
- **Typography**: Inter (body), JetBrains Mono (code)
- **Theme**: Dark mode default, light mode optional
- **Responsive**: Mobile-first, breakpoints at sm/md/lg/xl

### 13.2 Key Screens

#### 13.2.1 Dashboard (`/dashboard`)
- Credit balance (prominent)
- Recent generations (grid)
- Quick actions (new generation, new project)
- Project summary cards

#### 13.2.2 Projects List (`/projects`)
- Grid/list toggle
- Search and filter
- Create new project CTA
- Archive toggle

#### 13.2.3 Project Detail (`/projects/[id]`)
- Project header (name, description, settings)
- Reference images section
- Generation history
- Prompt input with reference selection
- Cost preview

#### 13.2.4 Studio (`/projects/[id]/studio`)
- Full-screen generation interface
- Left panel: References + History
- Center: Prompt input + Preview
- Right panel: Settings + Cost

#### 13.2.5 Gallery (`/gallery`)
- All generations across projects
- Filters: project, date, model, status
- Bulk selection
- Lightbox view

#### 13.2.6 Credits (`/credits`)
- Current balance
- Purchase options (credit packs)
- Transaction history
- Usage analytics

### 13.3 Realtime Updates

```typescript
// Client-side subscription
function useJobUpdates(projectId: string) {
  const supabase = useSupabaseClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Update local state
          queryClient.invalidateQueries(['jobs', projectId]);
          
          // Show toast on completion
          if (payload.new.status === 'completed') {
            toast.success('Image generated!');
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
}
```

---

## 14. Data Migration Strategy

### 14.1 From v2.x to v3.0

Since v2.x is single-user with local storage, migration is a fresh start:

1. **Export v2.x Data** (optional)
   - Export `jobs.json` to CSV
   - Copy `./output` images to local folder

2. **Import to v3.0**
   - Create new project in v3.0
   - Bulk upload images to gallery (for reference)
   - Import prompts as templates (optional feature)

### 14.2 Database Migrations

```typescript
// Using Drizzle Kit
// pnpm db:generate - Generate migration
// pnpm db:push - Push to database (dev)
// pnpm db:migrate - Run migrations (prod)

// Migration example
import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RLS policies applied via Supabase dashboard or migration
```

---

## 15. Definition of Done

### 15.1 Feature Complete Checklist

#### Authentication & Authorization
- [ ] OAuth login (Google, GitHub)
- [ ] Magic Link login
- [ ] Session management
- [ ] Row-Level Security on all tables
- [ ] Profile settings

#### Project Management
- [ ] Create/Edit/Delete projects
- [ ] Project settings (aesthetic, defaults)
- [ ] Project archival
- [ ] Project statistics

#### Reference Images
- [ ] Upload with progress
- [ ] Classification (subject/style/control/character)
- [ ] Thumbnail generation
- [ ] Usage tracking
- [ ] Delete with dependency check

#### Image Generation
- [ ] Single generation with preview
- [ ] Batch generation (up to 100)
- [ ] Provider/model selection
- [ ] Reference image integration
- [ ] Cost estimation
- [ ] Realtime progress
- [ ] Retry mechanism
- [ ] Cancel in-progress

#### Gallery
- [ ] Grid/list views
- [ ] Filters and sorting
- [ ] Lightbox view
- [ ] Download (single and bulk)
- [ ] Delete (single and bulk)

#### Credits
- [ ] Balance display
- [ ] Stripe Checkout integration
- [ ] Transaction history
- [ ] Purchase confirmation emails
- [ ] Low balance warnings

#### Providers
- [ ] fal.ai integration (3+ models)
- [ ] Vertex AI integration (3+ models)
- [ ] OpenAI integration (DALL-E 3)
- [ ] Auto-selection algorithm
- [ ] Fallback chain
- [ ] Health monitoring

### 15.2 Quality Checklist

- [ ] 80%+ test coverage (unit + integration)
- [ ] E2E tests for critical paths
- [ ] Lighthouse score > 90 (all categories)
- [ ] Zero TypeScript errors (strict mode)
- [ ] Zero ESLint warnings
- [ ] Sentry error tracking configured
- [ ] PostHog analytics configured
- [ ] Documentation complete

### 15.3 Security Checklist

- [ ] OWASP Top 10 review
- [ ] Penetration testing (basic)
- [ ] RLS policies audited
- [ ] API rate limiting active
- [ ] Input validation on all endpoints
- [ ] Secrets in environment variables only
- [ ] HTTPS enforced
- [ ] CSP headers configured

### 15.4 Operations Checklist

- [ ] Health check endpoint
- [ ] Structured logging
- [ ] Error alerting
- [ ] Database backups (Supabase)
- [ ] Rollback procedure documented
- [ ] Runbook for common issues

---

## Appendix A: Future-Proofing for Team Features

### A.1 Shared Projects (Planned for v3.1+)

The v3.0 data model is designed to support shared projects without breaking changes:

```typescript
// FUTURE: Project membership for team collaboration
interface ProjectMember {
  id: string;
  projectId: string;           // FK → Project
  userId: string;              // FK → User
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: string;           // FK → User
  invitedAt: Date;
  acceptedAt: Date | null;
}

// FUTURE: Organization/Team entity
interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;             // FK → User
  
  // Billing at org level
  creditBalance: number;
  stripeCustomerId: string;
  
  createdAt: Date;
}

interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}
```

### A.2 v3.0 Preparation

To enable smooth migration to team features:

1. **User ID on all entities**: Every entity has `userId` for current ownership
2. **Project as container**: Projects are the unit of sharing, not individual jobs
3. **RLS policies use functions**: Easy to extend for team membership checks
4. **Credit system per-user**: Can be migrated to per-org in future

```sql
-- Current RLS (v3.0)
CREATE POLICY "Users can access own projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- Future RLS (v3.1+ with teams)
CREATE POLICY "Users can access projects they're members of"
ON projects FOR ALL
USING (
  auth.uid() = user_id  -- Owner
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);
```

---

## Appendix B: Credit Expiration System

### B.1 Expiration Rules

| Credit Source | Expiration | Warning |
|---------------|------------|---------|
| **Welcome Credits** | 15 days from signup | 3 days before |
| **Purchased Credits** | 15 days from purchase | 3 days before |
| **Bonus Credits** | 15 days from grant | 3 days before |
| **Refund Credits** | 15 days from refund | 3 days before |

### B.2 FIFO Consumption

Credits are consumed from oldest packs first (First-In-First-Out):

```typescript
async function consumeCredits(userId: string, amount: number): Promise<void> {
  // Get all active packs ordered by expiration (soonest first)
  const packs = await db.query.creditPacks.findMany({
    where: and(
      eq(creditPacks.userId, userId),
      gt(creditPacks.remainingCredits, 0),
      gt(creditPacks.expiresAt, new Date()),
    ),
    orderBy: asc(creditPacks.expiresAt),
  });
  
  let remaining = amount;
  
  for (const pack of packs) {
    if (remaining <= 0) break;
    
    const toConsume = Math.min(remaining, pack.remainingCredits);
    
    await db.update(creditPacks)
      .set({ remainingCredits: pack.remainingCredits - toConsume })
      .where(eq(creditPacks.id, pack.id));
    
    remaining -= toConsume;
  }
  
  if (remaining > 0) {
    throw new InsufficientCreditsError();
  }
}
```

### B.3 Scheduled Jobs

```typescript
// Inngest function: Run daily at 00:00 UTC
export const expireCredits = inngest.createFunction(
  { id: 'credits/expire' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    // 1. Mark expired packs
    const expired = await step.run('mark-expired', async () => {
      return await db.update(creditPacks)
        .set({ isExpired: true })
        .where(and(
          eq(creditPacks.isExpired, false),
          lt(creditPacks.expiresAt, new Date()),
          gt(creditPacks.remainingCredits, 0),
        ))
        .returning();
    });
    
    // 2. Create expiration transactions
    for (const pack of expired) {
      await step.run(`record-expiration-${pack.id}`, async () => {
        await db.insert(creditTransactions).values({
          userId: pack.userId,
          type: 'expire',
          amount: -pack.remainingCredits,
          description: `${pack.remainingCredits} credits expired`,
          metadata: { packId: pack.id },
        });
      });
    }
    
    // 3. Update balances
    // ... update availableCredits for affected users
    
    return { expiredPacks: expired.length };
  }
);

// Inngest function: Send warning emails 3 days before expiration
export const warnExpiringCredits = inngest.createFunction(
  { id: 'credits/warn-expiring' },
  { cron: '0 9 * * *' },  // 9 AM UTC daily
  async ({ step }) => {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringPacks = await step.run('find-expiring', async () => {
      return await db.query.creditPacks.findMany({
        where: and(
          eq(creditPacks.isExpired, false),
          gt(creditPacks.remainingCredits, 0),
          lte(creditPacks.expiresAt, threeDaysFromNow),
          // Not already warned
          isNull(creditPacks.warningEmailSentAt),
        ),
      });
    });
    
    for (const pack of expiringPacks) {
      await step.run(`send-warning-${pack.id}`, async () => {
        await sendExpirationWarningEmail(pack.userId, pack.remainingCredits, pack.expiresAt);
        await db.update(creditPacks)
          .set({ warningEmailSentAt: new Date() })
          .where(eq(creditPacks.id, pack.id));
      });
    }
    
    return { warningsSent: expiringPacks.length };
  }
);
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Credit** | Virtual currency for generations (1 credit ≈ $0.06-0.10) |
| **Generation** | Single AI image creation request |
| **Job** | Database record tracking a generation request |
| **Provider** | AI service (fal.ai, Vertex, OpenAI) |
| **Model** | Specific AI model within a provider |
| **Reference** | User-uploaded image for style/subject/control |
| **Project** | Collection of generations with shared settings |
| **Aesthetic Prompt** | Master prompt prepended to all generations |
| **RLS** | Row-Level Security (PostgreSQL feature) |

---

## Appendix D: Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=https://ursa.ai
NEXT_PUBLIC_APP_NAME=Ursa

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Providers
FAL_API_KEY=fal-...
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Observability
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Queue
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

---

## Appendix E: Credit Cost Matrix

| Model | Base | +1 Ref | +2 Refs | +3 Refs | +4 Refs |
|-------|------|--------|---------|---------|---------|
| FLUX Pro 1.1 | 5 | — | — | — | — |
| FLUX Pro Ultra | 10 | — | — | — | — |
| FLUX Kontext | 8 | 10 | 12 | 14 | 16 |
| Imagen 3 | 6 | — | — | — | — |
| Imagen 3 Capability | 8 | 10 | 12 | 14 | 16 |
| DALL-E 3 | 8 | — | — | — | — |
| Recraft V3 | 6 | 7 | — | — | — |

---

**Document Status**: DRAFT  
**Last Updated**: 2025-01-XX  
**Author**: The Resilient Architect  
**Review Required By**: Project Stakeholder

