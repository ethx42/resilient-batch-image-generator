# 🚀 Plan de Desarrollo Greenfield — Ursa Platform

> **Documento de Planificación Técnica**  
> **Versión:** 1.0.0  
> **Fecha:** Enero 2025  
> **Arquitectura:** Desarrollo Modular Hexagonal (Ports & Adapters)  
> **Stack Objetivo:** Next.js 15/16 LTS + Cloud Run + Cloud Tasks + Cloudflare R2

---

## 📑 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Fases del Proyecto](#fases-del-proyecto)
4. [Fase 0: Cimientos e Infraestructura](#fase-0-cimientos-e-infraestructura)
5. [Fase 1: Motor Core RBIG Engine](#fase-1-motor-core-rbig-engine)
6. [Fase 2: UI & Design System](#fase-2-ui--design-system)
7. [Fase 3: Orquestación Batch & Realtime](#fase-3-orquestación-batch--realtime)
8. [Fase 4: QA & Producción](#fase-4-qa--producción)
9. [Cronograma](#cronograma)
10. [Checklist de Entrega](#checklist-de-entrega)

---

## Resumen Ejecutivo

### Objetivo

Construir **Ursa** desde cero como una plataforma SaaS de nueva generación para generación de imágenes con IA. Este es un proyecto **Greenfield** — no hay código legacy que migrar, solo arquitectura de clase mundial que implementar.

### Principios de Desarrollo

| Principio                  | Descripción                         |
| -------------------------- | ----------------------------------- |
| **Cloud-Native First**     | Diseñado para GCP desde el día 1    |
| **Hexagonal Architecture** | Core desacoplado de infraestructura |
| **Infrastructure as Code** | Todo en Terraform, nada manual      |
| **Double-Entry Ledger**    | Contabilidad de créditos inmutable  |
| **Zero Egress**            | Cloudflare R2 para outputs          |

### Métricas de Éxito

| Métrica                 | Objetivo                                    |
| ----------------------- | ------------------------------------------- |
| Tiempo de carga inicial | < 3s                                        |
| Time to Interactive     | < 4s                                        |
| Lighthouse Performance  | > 90                                        |
| Acción de Oro           | ≤3 clics (Proyecto → Referencias → Generar) |
| Ledger Accuracy         | 100% (partida doble balanceada)             |

---

## Stack Tecnológico

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STACK URSA                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EDGE (Cloudflare)                                                          │
│  ├── CDN + WAF                                                              │
│  └── R2 Storage (outputs, zero egress)                                      │
│                                                                              │
│  COMPUTE (GCP Cloud Run)                                                     │
│  ├── Next.js 15/16 Application                                              │
│  ├── Server Actions                                                          │
│  └── API Routes                                                              │
│                                                                              │
│  QUEUE (GCP Cloud Tasks)                                                     │
│  ├── generation/process-batch                                                │
│  ├── credits/expire-packs                                                    │
│  └── notifications/send-webhook                                              │
│                                                                              │
│  DATABASE (GCP Cloud SQL)                                                    │
│  ├── PostgreSQL 15+                                                          │
│  ├── Double-Entry Ledger Schema                                              │
│  └── Row-Level Security                                                      │
│                                                                              │
│  AI (GCP Vertex AI Studio)                                                   │
│  ├── Imagen 3.0 Models                                                       │
│  └── Prompt Template Management                                              │
│                                                                              │
│  AUTH (GCP Identity Platform)                                                │
│  ├── OAuth (Google, GitHub)                                                  │
│  ├── Email/Password + MFA                                                    │
│  └── Firebase Auth SDK                                                       │
│                                                                              │
│  REALTIME (Firebase)                                                         │
│  ├── Realtime Database                                                       │
│  ├── Push Notifications                                                      │
│  └── Presence                                                                │
│                                                                              │
│  OBSERVABILITY (GCP)                                                         │
│  ├── Cloud Monitoring                                                        │
│  ├── Cloud Logging                                                           │
│  └── Error Reporting                                                         │
│                                                                              │
│  IaC (Terraform)                                                             │
│  ├── All GCP resources                                                       │
│  ├── Cloudflare R2                                                           │
│  └── CI/CD (Cloud Build)                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dependencias Principales

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.460.0",

    "zod": "^3.23.8",
    "drizzle-orm": "^0.38.0",

    "@google-cloud/aiplatform": "^3.27.0",
    "@google-cloud/tasks": "^5.0.0",
    "firebase-admin": "^12.0.0",

    "pino": "^9.5.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "drizzle-kit": "^0.30.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.49.0"
  }
}
```

---

## Fases del Proyecto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROADMAP DE DESARROLLO                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FASE 0 ─────────────────► FASE 1 ─────────────────► FASE 2                 │
│  Infraestructura          Núcleo de Confianza      Motor IA &               │
│  (IaC + Monorepo)         (DB + Ledger + Auth)     Orquestación             │
│  [Semana 1-2]             [Semana 3-4]             [Semana 5-6]             │
│                                                                              │
│                                    │                                         │
│                                    ▼                                         │
│                              FASE 3 ─────────────────► FASE 4               │
│                              Interfaz de Usuario      QA &                   │
│                              & Realtime               Hardening              │
│                              [Semana 7-8]             [Continuo]             │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  TOTAL ESTIMADO: 8 semanas de desarrollo + QA continuo                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 0: Infraestructura (IaC + Monorepo)

> **Duración:** Semana 1-2  
> **Objetivo:** Configurar toda la infraestructura GCP y Cloudflare con Terraform, y establecer el Monorepo con Turborepo

### Milestone 0.1: Proyecto GCP, Cloudflare y Red

**Entregables:**

- [ ] Proyecto GCP `ursa-production` creado
- [ ] VPC y subnets configuradas
- [ ] IAM roles y service accounts
- [ ] Secret Manager configurado
- [ ] Cloudflare account y R2 configurado

**Terraform Modules:**

```hcl
# infrastructure/terraform/main.tf

module "project" {
  source     = "./modules/project"
  project_id = "ursa-production"
  region     = "us-central1"
}

module "network" {
  source     = "./modules/network"
  project_id = module.project.project_id

  vpc_name = "ursa-vpc"
  subnets = {
    "us-central1" = "10.0.0.0/24"
  }
}

module "iam" {
  source     = "./modules/iam"
  project_id = module.project.project_id

  service_accounts = {
    "ursa-app"      = "Cloud Run application"
    "ursa-tasks"    = "Cloud Tasks processor"
    "ursa-firebase" = "Firebase admin"
  }
}

module "secrets" {
  source     = "./modules/secrets"
  project_id = module.project.project_id

  secrets = [
    "stripe-secret-key",
    "stripe-webhook-secret",
    "r2-access-key-id",
    "r2-secret-access-key",
    "database-url",
  ]
}

# Cloudflare R2 (para imágenes generadas - zero egress)
module "cloudflare" {
  source           = "./modules/cloudflare"
  cloudflare_account_id = var.cloudflare_account_id

  r2_buckets = {
    "ursa-outputs" = {
      location = "WNAM"  # Western North America
    }
  }

  custom_domain = "cdn.ursa.ai"
}
```

**Tareas:**

| ID    | Tarea                                                    | Prioridad | Tiempo |
| ----- | -------------------------------------------------------- | --------- | ------ |
| 0.1.1 | Crear proyecto GCP con Terraform                         | Alta      | 2h     |
| 0.1.2 | Configurar VPC y networking                              | Alta      | 2h     |
| 0.1.3 | Crear service accounts con least privilege               | Alta      | 2h     |
| 0.1.4 | Configurar Secret Manager                                | Alta      | 1h     |
| 0.1.5 | Habilitar APIs necesarias (Vertex AI, Cloud Tasks, etc.) | Alta      | 1h     |
| 0.1.6 | Configurar Cloudflare R2 bucket                          | Alta      | 1h     |
| 0.1.7 | Configurar custom domain cdn.ursa.ai                     | Alta      | 1h     |

### Milestone 0.2: Monorepo Setup (Turborepo)

**Entregables:**

- [ ] Monorepo inicializado con Turborepo
- [ ] Estructura de paquetes definida (`/ai-core`, `/database`, `/ledger`, `/shared-types`)
- [ ] CI/CD pipeline configurado (Cloud Build)
- [ ] Despliegue automático a Cloud Run

**Estructura del Monorepo:**

```
/ursa
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   └── web/                    # Next.js 15 LTS
├── packages/
│   ├── ai-core/                # RBIG Engine (domain logic)
│   ├── database/               # Cloud SQL PostgreSQL layer
│   ├── ledger/                 # Double-entry credit system
│   ├── shared-types/           # Shared TypeScript types
│   └── ui/                     # Ursa Design System
└── infrastructure/
    ├── terraform/
    └── cloudbuild/
```

**Tareas:**

| ID    | Tarea                                        | Prioridad | Tiempo |
| ----- | -------------------------------------------- | --------- | ------ |
| 0.2.1 | Inicializar Turborepo con pnpm               | Alta      | 2h     |
| 0.2.2 | Crear estructura de paquetes                 | Alta      | 2h     |
| 0.2.3 | Configurar TypeScript paths y references     | Alta      | 2h     |
| 0.2.4 | Configurar Cloud Build para CI/CD            | Alta      | 3h     |
| 0.2.5 | Configurar despliegue automático a Cloud Run | Alta      | 2h     |

### Milestone 0.3: Base de Datos (Cloud SQL)

**Entregables:**

- [ ] Cloud SQL PostgreSQL 15 provisionado
- [ ] High Availability configurado
- [ ] Conexión privada via VPC
- [ ] Backup automático habilitado

**Terraform Module:**

```hcl
# infrastructure/terraform/modules/database/main.tf

resource "google_sql_database_instance" "ursa" {
  name             = "ursa-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-g1-small"  # Upgrade for production

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    database_flags {
      name  = "log_statement"
      value = "all"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "ursa" {
  name     = "ursa"
  instance = google_sql_database_instance.ursa.name
}
```

**Tareas:**

| ID    | Tarea                               | Prioridad | Tiempo |
| ----- | ----------------------------------- | --------- | ------ |
| 0.3.1 | Provisionar Cloud SQL con Terraform | Alta      | 2h     |
| 0.3.2 | Configurar conexión privada         | Alta      | 1h     |
| 0.3.3 | Crear usuario de aplicación         | Alta      | 30m    |
| 0.3.4 | Verificar backups automáticos       | Alta      | 30m    |

### Milestone 0.4: Firebase Project

**Entregables:**

- [ ] Firebase project vinculado a GCP project
- [ ] Realtime Database habilitado
- [ ] Firebase Admin SDK configurado
- [ ] Security rules definidas

**Tareas:**

| ID    | Tarea                                  | Prioridad | Tiempo |
| ----- | -------------------------------------- | --------- | ------ |
| 0.4.1 | Vincular Firebase a GCP project        | Alta      | 30m    |
| 0.4.2 | Habilitar Realtime Database            | Alta      | 30m    |
| 0.4.3 | Configurar security rules              | Alta      | 1h     |
| 0.4.4 | Generar service account para Admin SDK | Alta      | 30m    |

### Milestone 0.5: Cloud Tasks

**Entregables:**

- [ ] Queue `generation-queue` creada
- [ ] Queue `notification-queue` creada
- [ ] Rate limits configurados
- [ ] Retry policies definidas (solución a timeouts)

**Terraform:**

```hcl
# infrastructure/terraform/modules/tasks/main.tf

resource "google_cloud_tasks_queue" "generation" {
  name     = "generation-queue"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 100
    max_dispatches_per_second = 10
  }

  retry_config {
    max_attempts       = 5
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_doublings      = 4
  }
}

resource "google_cloud_tasks_queue" "notifications" {
  name     = "notification-queue"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 50
    max_dispatches_per_second = 20
  }

  retry_config {
    max_attempts = 3
    min_backoff  = "1s"
    max_backoff  = "10s"
  }
}
```

**Tareas:**

| ID    | Tarea                           | Prioridad | Tiempo |
| ----- | ------------------------------- | --------- | ------ |
| 0.6.1 | Crear queue de generación       | Alta      | 1h     |
| 0.6.2 | Crear queue de notificaciones   | Alta      | 30m    |
| 0.6.3 | Configurar IAM para Cloud Tasks | Alta      | 30m    |

---

## Fase 1: El Núcleo de Confianza (DB + Ledger + Auth)

> **Duración:** Semana 3-4  
> **Objetivo:** Implementar la base de datos, el Ledger de Créditos y la autenticación con GCP Identity Platform

### Milestone 1.1: Schema de Base de Datos (Drizzle ORM)

**Entregables:**

- [ ] Schema completo definido con Drizzle ORM
- [ ] Migraciones iniciales ejecutadas
- [ ] Row-Level Security (RLS) policies configuradas
- [ ] Índices optimizados para queries frecuentes

**Tareas:**

| ID    | Tarea                                   | Prioridad | Tiempo |
| ----- | --------------------------------------- | --------- | ------ |
| 1.1.1 | Definir schema Users, Projects, Jobs    | Alta      | 4h     |
| 1.1.2 | Definir schema Referencias y Outputs    | Alta      | 3h     |
| 1.1.3 | Crear y ejecutar migraciones            | Alta      | 2h     |
| 1.1.4 | Configurar RLS policies                 | Alta      | 3h     |
| 1.1.5 | Crear índices para consultas frecuentes | Alta      | 2h     |

### Milestone 1.2: Autenticación Multi-Tenant (GCP Identity Platform)

> **Arquitectura Multi-Tenant:** Ursa es una plataforma SaaS multi-tenant donde cada usuario tiene datos completamente aislados. El aislamiento se garantiza en tres niveles:
>
> 1. **Identity Platform** — Cada usuario tiene un UID único
> 2. **Row-Level Security (RLS)** — PostgreSQL filtra datos por `user_id` en cada query
> 3. **JWT Claims** — El token incluye `user_id` que se propaga a todas las capas

**Entregables:**

- [ ] Identity Platform habilitado y configurado
- [ ] OAuth providers configurados (Google, GitHub)
- [ ] Email/Password habilitado con verificación
- [ ] MFA opcional configurado
- [ ] Integración con Next.js (middleware de auth)
- [ ] Aislamiento multi-tenant verificado en todas las tablas

**Modelo de Tenancy:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELO MULTI-TENANT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Usuario A (tenant)           Usuario B (tenant)                            │
│  ┌─────────────────┐          ┌─────────────────┐                          │
│  │ user_id: abc123 │          │ user_id: xyz789 │                          │
│  ├─────────────────┤          ├─────────────────┤                          │
│  │ Projects        │          │ Projects        │   ← Aislados por RLS     │
│  │ Jobs            │          │ Jobs            │                          │
│  │ Credit Account  │          │ Credit Account  │                          │
│  │ Ledger Entries  │          │ Ledger Entries  │                          │
│  │ Outputs (R2)    │          │ Outputs (R2)    │   ← Paths incluyen uid   │
│  └─────────────────┘          └─────────────────┘                          │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│  PRINCIPIO: Un usuario NUNCA puede ver datos de otro usuario.               │
│  Esto se garantiza a nivel de base de datos (RLS), no solo en la app.       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Row-Level Security (PostgreSQL):**

```sql
-- Habilitar RLS en todas las tablas con datos de usuario
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_outputs ENABLE ROW LEVEL SECURITY;

-- Política: Usuario solo ve sus propios proyectos
CREATE POLICY "Users can only access own projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- Política: Usuario solo ve sus propios jobs
CREATE POLICY "Users can only access own jobs"
ON jobs FOR ALL
USING (auth.uid() = user_id);

-- Política: Usuario solo ve su cuenta de créditos
CREATE POLICY "Users can only access own credit account"
ON credit_accounts FOR ALL
USING (auth.uid() = user_id);
```

**Tareas:**

| ID    | Tarea                                                         | Prioridad | Tiempo |
| ----- | ------------------------------------------------------------- | --------- | ------ |
| 1.2.1 | Habilitar Identity Platform en GCP                            | Alta      | 1h     |
| 1.2.2 | Configurar Google OAuth                                       | Alta      | 1h     |
| 1.2.3 | Configurar GitHub OAuth                                       | Alta      | 1h     |
| 1.2.4 | Configurar email templates                                    | Media     | 1h     |
| 1.2.5 | Implementar middleware de auth en Next.js                     | Alta      | 3h     |
| 1.2.6 | Crear hook useAuth y contexto                                 | Alta      | 2h     |
| 1.2.7 | Habilitar MFA (TOTP) opcional                                 | Media     | 1h     |
| 1.2.8 | Configurar RLS policies en todas las tablas                   | Alta      | 3h     |
| 1.2.9 | Test de aislamiento: verificar que usuario A no ve datos de B | Alta      | 2h     |

### Milestone 1.3: Credit Ledger (Double-Entry)

**Entregables:**

- [ ] Adapter implementa `IImageGenerator`
- [ ] Soporte para Imagen 3.0 (todos los modelos)
- [ ] Prompt Template management
- [ ] Reference image handling

**Código de Referencia:**

```typescript
// packages/adapters/vertex-ai/VertexImageGenerator.ts

import {
  IImageGenerator,
  GenerationRequest,
  GenerationResult,
} from "@ursa/core/ports";
import { PredictionServiceClient } from "@google-cloud/aiplatform";

export class VertexImageGenerator implements IImageGenerator {
  private readonly client: PredictionServiceClient;
  private readonly projectId: string;
  private readonly location: string;

  constructor(config: VertexConfig) {
    this.projectId = config.projectId;
    this.location = config.location;
    this.client = new PredictionServiceClient({
      apiEndpoint: `${config.location}-aiplatform.googleapis.com`,
    });
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const endpoint = this.getEndpoint(request.modelId);

    const instances = [
      {
        prompt: request.combinedPrompt,
        ...(request.references && this.formatReferences(request.references)),
      },
    ];

    const parameters = {
      sampleCount: 1,
      aspectRatio: request.aspectRatio,
      safetyFilterLevel: request.safetyLevel,
      ...(request.seed && { seed: request.seed }),
    };

    const [response] = await this.client.predict({
      endpoint,
      instances,
      parameters: { structValue: { fields: this.toFields(parameters) } },
    });

    return this.parseResponse(response);
  }

  private getEndpoint(modelId: string): string {
    return `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}`;
  }

  // ... implementation details
}
```

**Tareas:**

| ID    | Tarea                                   | Prioridad | Tiempo |
| ----- | --------------------------------------- | --------- | ------ |
| 1.2.1 | Implementar VertexImageGenerator        | Alta      | 6h     |
| 1.2.2 | Implementar reference image handling    | Alta      | 4h     |
| 1.2.3 | Implementar prompt template integration | Alta      | 3h     |
| 1.2.4 | Unit tests con mocks                    | Alta      | 3h     |

### Milestone 1.3: Credit Ledger (Contabilidad de Partida Doble)

**Entregables:**

- [ ] Schema de base de datos para Ledger (partida doble)
- [ ] Transaction types implementados (RESERVATION, CONFIRMATION, RELEASE)
- [ ] Balance calculation siempre desde el Ledger (nunca almacenado)
- [ ] FIFO consumption logic para paquetes de créditos
- [ ] Reconciliación diaria automatizada

> **Mandato del Arquitecto:** "La lógica del Ledger debe estar completamente desacoplada de la infraestructura GCP. El paquete `/ledger` define interfaces que el paquete `/database` implementa."

**Database Schema (Drizzle):**

```typescript
// packages/ledger/schema.ts

import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "PURCHASE",
  "WELCOME",
  "BONUS",
  "RESERVATION",
  "CONFIRMATION",
  "RELEASE",
  "EXPIRATION",
  "REFUND",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "posted",
  "cancelled",
]);

// Credit Accounts (one per user)
export const creditAccounts = pgTable("credit_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ledger Transactions (immutable after posting)
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),

  // References
  jobId: uuid("job_id").references(() => jobs.id),
  stripePaymentId: text("stripe_payment_id"),
  relatedTransactionId: uuid("related_transaction_id"),

  description: text("description").notNull(),
  metadata: text("metadata"), // JSON

  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ledger Entries (double-entry: always sum to zero per transaction)
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => ledgerTransactions.id),

  accountId: uuid("account_id").notNull(), // User account or system account
  accountType: text("account_type").notNull(), // 'USER' | 'SYSTEM'

  amount: integer("amount").notNull(), // Positive = credit, Negative = debit
  balanceAfter: integer("balance_after").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit Packs (for expiration tracking)
export const creditPacks = pgTable("credit_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  originalCredits: integer("original_credits").notNull(),
  remainingCredits: integer("remaining_credits").notNull(),

  source: text("source").notNull(), // 'purchase' | 'welcome' | 'bonus' | 'refund'
  stripePaymentId: text("stripe_payment_id"),
  ledgerTransactionId: uuid("ledger_transaction_id").references(
    () => ledgerTransactions.id
  ),

  expiresAt: timestamp("expires_at").notNull(),
  isExpired: boolean("is_expired").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Tareas:**

| ID    | Tarea                                                                     | Prioridad | Tiempo |
| ----- | ------------------------------------------------------------------------- | --------- | ------ |
| 1.3.1 | Crear schema Drizzle para Ledger                                          | Alta      | 4h     |
| 1.3.2 | Implementar reserveCredits() — transacción RESERVATION                    | Alta      | 4h     |
| 1.3.3 | Implementar confirmCredits() — transacción CONFIRMATION                   | Alta      | 3h     |
| 1.3.4 | Implementar releaseCredits() — transacción RELEASE (reembolso automático) | Alta      | 3h     |
| 1.3.5 | Implementar calculateBalance() — siempre desde Ledger                     | Alta      | 2h     |
| 1.3.6 | Implementar FIFO consumption para paquetes de créditos                    | Alta      | 4h     |
| 1.3.7 | Implementar job de expiración de créditos (15 días)                       | Alta      | 3h     |
| 1.3.8 | Unit tests con database de test                                           | Alta      | 4h     |

---

## Fase 2: Motor de IA & Orquestación

> **Duración:** Semana 5-6  
> **Objetivo:** Conexión con Vertex AI Studio e implementación de colas de trabajo con Cloud Tasks

### Milestone 2.1: Vertex AI Studio Adapter

**Entregables:**

- [ ] Adapter implementa `IImageGenerator` (arquitectura hexagonal)
- [ ] Soporte para Imagen 3.0 (Fast, Standard, Controlled)
- [ ] Prompt Template management (artefactos versionados)
- [ ] Reference image handling para capacidades creativas

**Código de Referencia:**

```typescript
// packages/ai-core/adapters/vertex-ai/VertexImageGenerator.ts

import { IImageGenerator, GenerationRequest, GenerationResult } from "../ports";
import { PredictionServiceClient } from "@google-cloud/aiplatform";

export class VertexImageGenerator implements IImageGenerator {
  private readonly client: PredictionServiceClient;
  private readonly projectId: string;
  private readonly location: string;

  constructor(config: VertexConfig) {
    this.projectId = config.projectId;
    this.location = config.location;
    this.client = new PredictionServiceClient({
      apiEndpoint: `${config.location}-aiplatform.googleapis.com`,
    });
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const endpoint = this.getEndpoint(request.modelId);

    const instances = [
      {
        prompt: request.combinedPrompt,
        ...(request.references && this.formatReferences(request.references)),
      },
    ];

    const parameters = {
      sampleCount: 1,
      aspectRatio: request.aspectRatio,
      safetyFilterLevel: request.safetyLevel,
      ...(request.seed && { seed: request.seed }),
    };

    const [response] = await this.client.predict({
      endpoint,
      instances,
      parameters: { structValue: { fields: this.toFields(parameters) } },
    });

    return this.parseResponse(response);
  }

  private getEndpoint(modelId: string): string {
    return `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}`;
  }
}
```

**Tareas:**

| ID    | Tarea                                              | Prioridad | Tiempo |
| ----- | -------------------------------------------------- | --------- | ------ |
| 2.1.1 | Implementar VertexImageGenerator (IImageGenerator) | Alta      | 6h     |
| 2.1.2 | Implementar reference image handling               | Alta      | 4h     |
| 2.1.3 | Implementar prompt template integration            | Alta      | 3h     |
| 2.1.4 | Unit tests con mocks                               | Alta      | 3h     |

### Milestone 2.2: Storage Adapter (Cloudflare R2)

**Entregables:**

- [ ] Adapter implementa `IStorageProvider`
- [ ] Upload de imágenes generadas (zero egress)
- [ ] Thumbnail generation
- [ ] Signed URLs para referencias

**Tareas:**

| ID    | Tarea                                    | Prioridad | Tiempo |
| ----- | ---------------------------------------- | --------- | ------ |
| 2.2.1 | Implementar R2StorageProvider            | Alta      | 4h     |
| 2.2.2 | Implementar thumbnail generation (Sharp) | Alta      | 2h     |
| 2.2.3 | Implementar signed URL generation        | Alta      | 2h     |

### Milestone 2.3: Cloud Tasks Integration

**Entregables:**

- [ ] Task creation para generación de imágenes
- [ ] Task handler (receiver endpoint)
- [ ] Retry handling con backoff exponencial (solución a timeouts)
- [ ] Dead letter queue para jobs fallidos

> **Nota sobre Timeouts:** Cloud Tasks maneja automáticamente los reintentos con backoff exponencial. Si un job de generación falla o timeout, se reintentará hasta 5 veces con delays crecientes (10s → 20s → 40s → 80s → 160s). Si todos los reintentos fallan, el Ledger ejecuta automáticamente un RELEASE para devolver los créditos.

**Tareas:**

| ID    | Tarea                                             | Prioridad | Tiempo |
| ----- | ------------------------------------------------- | --------- | ------ |
| 2.3.1 | Implementar CloudTasksAdapter (IQueueService)     | Alta      | 4h     |
| 2.3.2 | Crear task handler endpoint /api/tasks/generation | Alta      | 4h     |
| 2.3.3 | Implementar retry logic con RELEASE automático    | Alta      | 3h     |
| 2.3.4 | Configurar dead letter queue                      | Alta      | 2h     |

---

## Fase 3: Interfaz de Usuario & Realtime

> **Duración:** Semana 7-8  
> **Objetivo:** Construcción del Dashboard en Next.js 15 e implementación de la galería consumiendo desde Cloudflare R2

### Milestone 3.1: Proyecto Next.js 15 LTS

**Entregables:**

- [ ] Proyecto Next.js 15 LTS inicializado
- [ ] TypeScript strict mode
- [ ] Tailwind CSS v4 configurado
- [ ] shadcn/ui inicializado con tema Ursa

**Configuración de Tema Ursa:**

```css
/* apps/web/app/globals.css */
@import "tailwindcss";

@theme {
  /* Ursa Brand - Constellation Theme */
  --color-ursa-50: oklch(0.97 0.01 280);
  --color-ursa-100: oklch(0.94 0.02 280);
  --color-ursa-500: oklch(0.55 0.18 280);
  --color-ursa-600: oklch(0.48 0.2 280);
  --color-ursa-900: oklch(0.22 0.08 280);

  /* Capability Colors */
  --color-style: oklch(0.7 0.2 330); /* 🎨 Pink/Magenta */
  --color-control: oklch(0.65 0.18 250); /* 📐 Blue */
  --color-subject: oklch(0.7 0.18 145); /* 🎯 Green */
  --color-character: oklch(0.68 0.16 60); /* 👤 Orange */
  --color-brand: oklch(0.65 0.15 280); /* 🏷️ Purple */

  /* Status Colors */
  --color-pending: oklch(0.75 0.12 85);
  --color-processing: oklch(0.65 0.18 250);
  --color-completed: oklch(0.7 0.18 145);
  --color-failed: oklch(0.6 0.22 25);

  /* Typography */
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

**Tareas:**

| ID    | Tarea                                | Prioridad | Tiempo |
| ----- | ------------------------------------ | --------- | ------ |
| 3.1.1 | Inicializar proyecto Next.js 15 LTS  | Alta      | 1h     |
| 3.1.2 | Configurar TypeScript strict         | Alta      | 1h     |
| 3.1.3 | Configurar Tailwind CSS v4           | Alta      | 1h     |
| 3.1.4 | Inicializar shadcn/ui                | Alta      | 1h     |
| 3.1.5 | Configurar tema Ursa (constellation) | Alta      | 3h     |

### Milestone 3.2: Layout Components

**Entregables:**

- [ ] `<Sidebar>` con balance de créditos (Ledger)
- [ ] `<Header>` con breadcrumbs
- [ ] `<DashboardLayout>`
- [ ] `<ProjectLayout>` con tabs

**Tareas:**

| ID    | Tarea                        | Prioridad | Tiempo |
| ----- | ---------------------------- | --------- | ------ |
| 3.2.1 | Crear Sidebar con balance    | Alta      | 4h     |
| 3.2.2 | Crear Header con breadcrumbs | Alta      | 2h     |
| 3.2.3 | Crear DashboardLayout        | Alta      | 2h     |
| 3.2.4 | Crear ProjectLayout con tabs | Alta      | 3h     |

### Milestone 3.3: Componentes de Capacidades Creativas

**Entregables:**

- [ ] `<CapabilitySelector>` (NO model selector — lenguaje de capacidades)
- [ ] `<CapabilityChip>` con ícono y costo
- [ ] `<ModeSelector>` (Precisión/Estándar/Rápido)
- [ ] `<CostPreview>` panel de costos (transparencia total)

**Tareas:**

| ID    | Tarea                                       | Prioridad | Tiempo |
| ----- | ------------------------------------------- | --------- | ------ |
| 3.3.1 | Crear CapabilitySelector                    | Alta      | 4h     |
| 3.3.2 | Crear CapabilityChip                        | Alta      | 2h     |
| 3.3.3 | Crear ModeSelector                          | Alta      | 3h     |
| 3.3.4 | Crear CostPreview panel (desglose completo) | Alta      | 4h     |

### Milestone 3.4: Pages Core

**Entregables:**

- [ ] Dashboard (`/dashboard`)
- [ ] Projects list (`/projects`)
- [ ] Project Studio (`/projects/[id]/studio`)
- [ ] Credits con vista de Ledger (`/credits`)

**Tareas:**

| ID    | Tarea                                                   | Prioridad | Tiempo |
| ----- | ------------------------------------------------------- | --------- | ------ |
| 3.4.1 | Implementar Dashboard con balance y proyectos recientes | Alta      | 4h     |
| 3.4.2 | Implementar Projects list con colecciones               | Alta      | 3h     |
| 3.4.3 | Implementar Project Studio (3 paneles)                  | Alta      | 8h     |
| 3.4.4 | Implementar Credits page con Ledger view                | Alta      | 4h     |

### Milestone 3.5: Galería desde Cloudflare R2

**Entregables:**

- [ ] Galería consumiendo directamente desde cdn.ursa.ai (R2)
- [ ] Infinite scroll con virtualización
- [ ] Filtros por colección, capacidad, fecha
- [ ] Lightbox con metadata

**Tareas:**

| ID    | Tarea                                    | Prioridad | Tiempo |
| ----- | ---------------------------------------- | --------- | ------ |
| 3.5.1 | Implementar componente Gallery           | Alta      | 4h     |
| 3.5.2 | Implementar infinite scroll virtualizado | Alta      | 3h     |
| 3.5.3 | Implementar filtros y búsqueda           | Alta      | 3h     |
| 3.5.4 | Implementar Lightbox con metadata        | Alta      | 2h     |

### Milestone 3.6: Firebase Realtime Integration

**Entregables:**

- [ ] Job status updates via Firebase Realtime Database
- [ ] Push notifications (incluso con browser cerrado)
- [ ] Progress bar visual durante generación
- [ ] Webhook dispatch para integraciones

**Tareas:**

| ID    | Tarea                                             | Prioridad | Tiempo |
| ----- | ------------------------------------------------- | --------- | ------ |
| 3.6.1 | Implementar FirebaseNotificationAdapter           | Alta      | 4h     |
| 3.6.2 | Implementar client-side listener (useRealtimeJob) | Alta      | 3h     |
| 3.6.3 | Implementar push notifications                    | Alta      | 4h     |
| 3.6.4 | Implementar webhook dispatch                      | Alta      | 4h     |

---

## Fase 4: QA & Hardening

> **Duración:** Continuo (post-desarrollo)  
> **Objetivo:** Pruebas de carga de batch y auditoría de seguridad en transacciones de créditos

### Milestone 4.1: Pruebas de Carga de Batch

**Entregables:**

- [ ] Suite de pruebas de carga para batch de hasta 100 prompts
- [ ] Verificación de Cloud Tasks bajo carga concurrente
- [ ] Validación de tiempos de respuesta p95 < 30s
- [ ] Stress test del Ledger bajo transacciones concurrentes

**Tareas:**

| ID    | Tarea                                                 | Prioridad | Tiempo |
| ----- | ----------------------------------------------------- | --------- | ------ |
| 4.1.1 | Configurar k6 o Artillery para load testing           | Alta      | 2h     |
| 4.1.2 | Test de carga: 50 batches concurrentes de 10 prompts  | Alta      | 4h     |
| 4.1.3 | Test de carga: 10 batches concurrentes de 100 prompts | Alta      | 4h     |
| 4.1.4 | Stress test: Ledger con 1000 transacciones/minuto     | Alta      | 4h     |
| 4.1.5 | Verificar auto-scaling de Cloud Run bajo carga        | Alta      | 2h     |

### Milestone 4.2: Auditoría de Seguridad — Transacciones de Créditos

**Entregables:**

- [ ] Auditoría de atomicidad de transacciones del Ledger
- [ ] Verificación de integridad de partida doble (suma = 0)
- [ ] Test de race conditions en reservas/confirmaciones
- [ ] Validación de RLS policies en PostgreSQL

**Tareas:**

| ID    | Tarea                                                       | Prioridad | Tiempo |
| ----- | ----------------------------------------------------------- | --------- | ------ |
| 4.2.1 | Auditar transacciones atómicas (RESERVATION → CONFIRMATION) | Alta      | 4h     |
| 4.2.2 | Test de race conditions: reservas simultáneas               | Alta      | 4h     |
| 4.2.3 | Verificar reembolso automático (RELEASE) en fallos          | Alta      | 3h     |
| 4.2.4 | Auditar RLS policies en todas las tablas                    | Alta      | 3h     |
| 4.2.5 | Penetration testing en endpoints de créditos                | Alta      | 4h     |
| 4.2.6 | Verificar reconciliación diaria del Ledger                  | Alta      | 2h     |

### Milestone 4.3: Testing Funcional

**Entregables:**

- [ ] Unit tests para Core (Vitest)
- [ ] Integration tests para Adapters
- [ ] E2E tests para flujos críticos (Playwright)
- [ ] Ledger reconciliation tests

**Tareas:**

| ID    | Tarea                                    | Prioridad | Tiempo |
| ----- | ---------------------------------------- | --------- | ------ |
| 4.3.1 | Unit tests para CreditService (Ledger)   | Alta      | 4h     |
| 4.3.2 | Unit tests para GenerationService        | Alta      | 4h     |
| 4.3.3 | Integration tests para Vertex AI Adapter | Alta      | 4h     |
| 4.3.4 | E2E: Flujo crear proyecto con colección  | Alta      | 3h     |
| 4.3.5 | E2E: Flujo generación batch (async)      | Alta      | 4h     |
| 4.3.6 | E2E: Flujo compra créditos (Stripe)      | Alta      | 3h     |
| 4.3.7 | Test: Notificación push con tab cerrada  | Alta      | 2h     |

### Milestone 4.4: Cloud Run Deployment

**Entregables:**

- [ ] Dockerfile optimizado (multi-stage build)
- [ ] Cloud Build pipeline con tests
- [ ] Environment configuration
- [ ] Health checks y graceful shutdown

**Terraform:**

```hcl
# infrastructure/terraform/modules/cloudrun/main.tf

resource "google_cloud_run_v2_service" "ursa" {
  name     = "ursa-web"
  location = var.region

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/ursa/web:${var.image_tag}"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      # ... more env vars
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}
```

**Tareas:**

| ID    | Tarea                                        | Prioridad | Tiempo |
| ----- | -------------------------------------------- | --------- | ------ |
| 4.4.1 | Crear Dockerfile optimizado (multi-stage)    | Alta      | 2h     |
| 4.4.2 | Configurar Cloud Build con tests             | Alta      | 3h     |
| 4.4.3 | Terraform para Cloud Run                     | Alta      | 3h     |
| 4.4.4 | Configurar health checks y graceful shutdown | Alta      | 1h     |

### Milestone 4.5: Observability

**Entregables:**

- [ ] Cloud Monitoring dashboards
- [ ] Alerting policies (incluyendo Ledger mismatch)
- [ ] Structured logging con Pino
- [ ] Error tracking con Cloud Error Reporting

**Tareas:**

| ID    | Tarea                                                     | Prioridad | Tiempo |
| ----- | --------------------------------------------------------- | --------- | ------ |
| 4.5.1 | Crear dashboards de monitoring (jobs, créditos, latencia) | Alta      | 3h     |
| 4.5.2 | Configurar alertas críticas (Ledger mismatch = Critical)  | Alta      | 2h     |
| 4.5.3 | Implementar structured logging                            | Alta      | 2h     |
| 4.5.4 | Configurar error reporting                                | Alta      | 1h     |

---

## Cronograma

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRONOGRAMA GANTT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Semana    1    2    3    4    5    6    7    8    QA                       │
│           ───────────────────────────────────────────────────                │
│                                                                              │
│  Fase 0   ████████                                                           │
│  Infra    ████████                                                           │
│  +Monorepo                                                                   │
│                                                                              │
│  Fase 1            ████████████████                                          │
│  Núcleo            ████████████████                                          │
│  Confianza                                                                   │
│                                                                              │
│  Fase 2                            ████████████████                          │
│  Motor IA                          ████████████████                          │
│  +Cloud Tasks                                                                │
│                                                                              │
│  Fase 3                                            ████████████████          │
│  UI &                                              ████████████████          │
│  Realtime                                                                    │
│                                                                              │
│  Fase 4                                                            ▒▒▒▒▒▒▒▒│
│  QA &                                                              ▒▒▒▒▒▒▒▒│
│  Hardening                                                         (continuo)│
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  HITOS CLAVE:                                                                │
│  ├── Semana 2: Infraestructura + Monorepo (IaC) ✅                          │
│  ├── Semana 4: DB + Ledger + Auth funcional ✅                              │
│  ├── Semana 6: Vertex AI + Cloud Tasks operativo ✅                         │
│  ├── Semana 8: UI + Realtime + Galería completa ✅                          │
│  └── Continuo: QA & Hardening (carga + seguridad) 🔒                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Entrega

### Fase 0: Infraestructura + Monorepo ✓

- [ ] Proyecto GCP creado con Terraform
- [ ] Cloudflare R2 bucket `ursa-outputs` configurado
- [ ] VPC y networking configurados
- [ ] Monorepo Turborepo inicializado
- [ ] Paquetes `/ai-core`, `/database`, `/ledger`, `/shared-types` creados
- [ ] Cloud SQL PostgreSQL provisionado
- [ ] Firebase project vinculado
- [ ] Cloud Tasks queues creadas
- [ ] CI/CD pipeline (Cloud Build) configurado
- [ ] Secret Manager poblado

### Fase 1: El Núcleo de Confianza ✓

- [ ] Schema de base de datos completo (Drizzle)
- [ ] Identity Platform configurado (OAuth + MFA)
- [ ] Middleware de autenticación en Next.js
- [ ] **Arquitectura Multi-Tenant implementada:**
  - [ ] RLS policies en TODAS las tablas con datos de usuario
  - [ ] Test de aislamiento: usuario A no puede ver datos de B
  - [ ] JWT claims propagados a todas las capas
- [ ] Double-Entry Ledger completo
- [ ] Transacciones atómicas: RESERVATION → CONFIRMATION/RELEASE
- [ ] FIFO credit consumption working
- [ ] Job de expiración de créditos (15 días)

### Fase 2: Motor de IA & Orquestación ✓

- [ ] Vertex AI Studio adapter funcional
- [ ] Soporte para Imagen 3 (Fast, Standard, Controlled)
- [ ] Prompt Template management
- [ ] R2 storage adapter funcional
- [ ] Cloud Tasks integration completa
- [ ] Retry handling con RELEASE automático
- [ ] Unit tests passing (>80% coverage)

### Fase 3: Interfaz de Usuario & Realtime ✓

- [ ] Design System Ursa implementado
- [ ] Dashboard funcional con balance de Ledger
- [ ] Project Studio operativo (3 paneles)
- [ ] CostPreview panel con transparencia total
- [ ] Credits page con vista de Ledger (partida doble)
- [ ] Galería consumiendo desde Cloudflare R2
- [ ] Gestión de Colecciones implementada
- [ ] Firebase Realtime integration
- [ ] Push notifications funcionales
- [ ] Webhook dispatch implementado
- [ ] Lighthouse > 90

### Fase 4: QA & Hardening ✓

- [ ] Pruebas de carga de batch (50-100 prompts concurrentes)
- [ ] Auditoría de seguridad del Ledger
- [ ] Test de race conditions en transacciones
- [ ] E2E tests passing
- [ ] Cloud Run deployed
- [ ] Cloud Build pipeline activo
- [ ] Monitoring dashboards creados
- [ ] Alerting policies configuradas (Ledger mismatch = Critical)
- [ ] Documentación completa

---

## Apéndice A: Terraform Module Structure

```
infrastructure/
├── terraform/
│   ├── main.tf                 # Root module
│   ├── variables.tf
│   ├── outputs.tf
│   ├── backend.tf              # GCS state backend
│   │
│   ├── modules/
│   │   ├── project/            # GCP project setup
│   │   ├── network/            # VPC, subnets
│   │   ├── iam/                # Service accounts, roles
│   │   ├── database/           # Cloud SQL
│   │   ├── tasks/              # Cloud Tasks queues
│   │   ├── cloudrun/           # Cloud Run service
│   │   ├── secrets/            # Secret Manager
│   │   └── monitoring/         # Dashboards, alerts
│   │
│   └── environments/
│       ├── development/
│       ├── staging/
│       └── production/
│
└── cloudbuild/
    ├── build.yaml              # Build pipeline
    ├── deploy.yaml             # Deploy pipeline
    └── terraform.yaml          # IaC pipeline
```

---

## Apéndice B: Comandos de Referencia

```bash
# Terraform
cd infrastructure/terraform
terraform init
terraform plan -var-file=environments/production/terraform.tfvars
terraform apply -var-file=environments/production/terraform.tfvars

# Development
pnpm install
pnpm dev

# Database migrations
pnpm db:generate
pnpm db:push

# Testing
pnpm test
pnpm test:e2e

# Build & Deploy
pnpm build
gcloud builds submit --config=cloudbuild/deploy.yaml
```

---

**Documento generado para:** Cognitio Artifacts  
**Proyecto:** Ursa Platform  
**Versión del Plan:** 1.0.0  
**Fecha:** Enero 2025
