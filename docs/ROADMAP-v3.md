# Ursa — Implementation Roadmap

**Product:** Ursa (ursa.ai)  
**Tagline:** "Create with constellation-grade precision"  
**Version:** 3.0.0

---

## 📋 Executive Summary

Ursa es una reinvención completa del sistema como **SaaS multi-tenant enterprise-grade** con:

- **Multi-tenancy**: Usuarios con múltiples proyectos aislados
- **Sistema de Créditos**: Prepago via Stripe, transparencia total
- **Multi-Provider**: fal.ai (primary), Vertex AI, OpenAI, Replicate
- **Imágenes de Referencia**: Subject, style, control, character consistency
- **100% Serverless**: Vercel + Supabase, escala a cero

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│                 Next.js 15 + shadcn/ui                      │
│    Dashboard │ Projects │ Studio │ Gallery │ Billing        │
└───────────────────────────┬─────────────────────────────────┘
                            │ tRPC
┌───────────────────────────┼─────────────────────────────────┐
│                      BACKEND                                │
│               Vercel Serverless + Inngest                   │
│    Auth │ Credits │ Jobs │ Provider Registry                │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Supabase   │     │  AI APIs    │     │   Stripe    │
│  Postgres   │     │  fal.ai     │     │  Payments   │
│  Storage    │     │  Vertex     │     │             │
│  Realtime   │     │  OpenAI     │     │             │
│  Auth       │     │  Replicate  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 📊 Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 15 | App Router, RSC, API Routes, Edge |
| **Database** | Supabase Postgres | RLS, Realtime, Auth, Storage bundled |
| **ORM** | Drizzle | Type-safe, performant, SQL-first |
| **API** | tRPC v11 | E2E types, zero codegen |
| **Queue** | Inngest | Serverless, retries, observability |
| **Payments** | Stripe | Industry standard |
| **Primary AI** | fal.ai | 600+ models, true serverless |
| **UI** | shadcn/ui | Radix + Tailwind, composable |

---

## 🗓️ Implementation Phases

### Phase 0: Foundation (Week 1-2)
**Goal**: Project setup, infrastructure, basic auth

```
□ Initialize monorepo (Turborepo + pnpm)
□ Setup Next.js 15 with App Router
□ Configure Supabase project
  □ PostgreSQL database
  □ Authentication (OAuth + Magic Link)
  □ Storage buckets
  □ Realtime enabled
□ Setup Drizzle ORM + initial schema
□ Configure Vercel deployment
□ Setup Inngest for background jobs
□ Configure environment variables
□ Basic landing page + auth flow
```

**Deliverables**:
- Working deployment pipeline
- User can sign up and log in
- Empty dashboard after login

---

### Phase 1: Core Data Model (Week 2-3)
**Goal**: Projects, References, Jobs infrastructure

```
□ Database schema implementation
  □ Users table + RLS
  □ Projects table + RLS
  □ Reference Images table + RLS
  □ Jobs table + RLS
  □ Credit Balances table + RLS
  □ Credit Transactions table + RLS
□ tRPC router setup
  □ Project CRUD
  □ Reference Image upload flow
  □ Basic job creation
□ Storage integration
  □ Signed upload URLs
  □ Thumbnail generation
  □ CDN configuration
□ Realtime subscriptions
  □ Job status updates
  □ Project changes
```

**Deliverables**:
- User can create projects
- User can upload reference images
- Jobs can be created (not executed)

---

### Phase 2: AI Provider Integration (Week 3-5)
**Goal**: Working image generation with multiple providers

```
□ Provider abstraction layer
  □ ImageGenerator interface
  □ Provider registry
  □ Model catalog
□ fal.ai integration
  □ FLUX Pro 1.1
  □ FLUX Kontext (references)
  □ Recraft V3
  □ Ideogram V2
□ Vertex AI integration
  □ Imagen 3
  □ Imagen 3 Fast
  □ Imagen 3 Capability (references)
□ OpenAI integration
  □ DALL-E 3
□ Auto-selection algorithm
□ Fallback chain implementation
□ Job processor (Inngest)
  □ Queue job
  □ Call provider
  □ Save output to storage
  □ Update job status
  □ Emit realtime events
□ Error handling + retries
```

**Deliverables**:
- User can generate images (without credits)
- Multiple providers working
- Reference images functional
- Realtime progress updates

---

### Phase 3: Credit System (Week 5-6)
**Goal**: Full billing implementation with expiration

```
□ Credit service implementation
  □ Reserve credits (atomic, FIFO from oldest packs)
  □ Commit credits (atomic)
  □ Rollback credits (atomic)
  □ Refund credits
  □ Credit Pack model (for expiration tracking)
□ Credit expiration (15 days)
  □ CreditPack entity with expiresAt
  □ FIFO consumption (oldest first)
  □ Daily Inngest job to expire credits
  □ Warning email 3 days before expiration
□ Cost estimation
  □ Per-model pricing
  □ Reference surcharges
  □ Preview before generation
□ Stripe integration
  □ Checkout session creation
  □ Webhook handler
  □ Credit fulfillment (creates CreditPack)
  □ Receipt emails
□ Welcome credits
  □ 10 credits on first signup
  □ Expire in 15 days
□ Credit UI
  □ Balance display (header)
  □ Expiring soon warning
  □ Purchase page
  □ Transaction history
  □ Low balance warnings
□ Integration with job processor
  □ Reserve before processing
  □ Commit on success
  □ Rollback on failure
```

**Deliverables**:
- User can purchase credits
- 10 welcome credits on signup
- Credits expire after 15 days (FIFO consumption)
- Expiration warnings via email
- Generations deduct credits
- Full transaction history
- No credit leakage

---

### Phase 4: UI Polish (Week 6-8)
**Goal**: Production-ready user experience

```
□ Dashboard
  □ Credit balance widget
  □ Recent generations
  □ Quick actions
  □ Project cards
□ Projects list
  □ Grid/list toggle
  □ Search + filters
  □ Archive toggle
□ Project detail
  □ Settings panel
  □ Reference gallery
  □ Generation history
  □ Inline generation
□ Studio (full-screen generation)
  □ Reference sidebar
  □ Prompt editor
  □ Provider/model selector
  □ Cost preview
  □ History panel
□ Gallery
  □ Infinite scroll
  □ Lightbox
  □ Bulk operations
  □ Download (ZIP)
□ Settings
  □ Profile
  □ Preferences
  □ Active sessions
□ Responsive design
  □ Mobile layouts
  □ Touch interactions
```

**Deliverables**:
- Complete, polished UI
- Mobile-friendly
- Intuitive UX

---

### Phase 5: Quality & Security (Week 8-9)
**Goal**: Production hardening

```
□ Testing
  □ Unit tests (80%+ coverage)
  □ Integration tests (API)
  □ E2E tests (critical paths)
□ Security audit
  □ RLS policy review
  □ API rate limiting
  □ Input validation audit
  □ OWASP checklist
□ Performance
  □ Lighthouse audit
  □ Query optimization
  □ Image optimization
  □ Caching strategy
□ Observability
  □ Sentry error tracking
  □ PostHog analytics
  □ Structured logging
  □ Health checks
  □ Alerting rules
□ Documentation
  □ API documentation
  □ User guide
  □ Admin runbook
```

**Deliverables**:
- Test suite passing
- Security audit complete
- Error tracking active
- Documentation published

---

### Phase 6: Launch Prep (Week 9-10)
**Goal**: Ready for production users

```
□ Production environment
  □ Domain configuration
  □ SSL certificates
  □ Environment variables
  □ Stripe production mode
□ Legal
  □ Terms of Service
  □ Privacy Policy
  □ Cookie consent
□ Onboarding
  □ Welcome email
  □ Bonus credits for new users
  □ Interactive tutorial (optional)
□ Support
  □ Help center / FAQ
  □ Contact form
  □ Feedback mechanism
□ Launch checklist
  □ Database backups verified
  □ Rollback procedure tested
  □ Monitoring dashboards
  □ On-call rotation (if applicable)
```

**Deliverables**:
- Production-ready system
- Legal compliance
- Launch announcement ready

---

## 📈 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Vercel/Supabase |
| **Generation Success** | 98% | Custom metric |
| **Page Load (LCP)** | < 2.5s | Lighthouse |
| **Credit Accuracy** | 100% | Audit logs |
| **Error Rate** | < 0.1% | Sentry |

---

## 💰 Cost Estimates

### Infrastructure (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| **Vercel** | Pro | $20/month |
| **Supabase** | Pro | $25/month |
| **Inngest** | Pro | $50/month |
| **Sentry** | Team | $26/month |
| **PostHog** | Free | $0 |
| **Domain** | Annual | ~$15/year |
| **Total Fixed** | | **~$125/month** |

### Variable Costs (per Generation)

| Provider | Model | Our Cost | Charge User |
|----------|-------|----------|-------------|
| fal.ai | FLUX Pro 1.1 | ~$0.025 | 5 credits ($0.30) |
| fal.ai | FLUX Kontext | ~$0.04 | 8 credits ($0.48) |
| Vertex | Imagen 3 | ~$0.04 | 6 credits ($0.36) |
| OpenAI | DALL-E 3 | ~$0.04 | 8 credits ($0.48) |

**Margin**: ~80-90% gross margin per generation

---

## 🚀 Getting Started

### Prerequisites

```bash
# Node.js 20+
node --version  # v20.x.x

# pnpm 8+
pnpm --version  # 8.x.x

# Accounts needed:
# - Supabase (supabase.com)
# - Vercel (vercel.com)
# - Stripe (stripe.com)
# - fal.ai (fal.ai)
# - Google Cloud (for Vertex AI)
# - OpenAI (optional)
```

### Initial Setup

```bash
# 1. Clone and install
git clone <repo>
cd ursa
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Fill in all required values

# 3. Setup database
pnpm db:push

# 4. Start development
pnpm dev
```

---

## 📁 Proposed Directory Structure

```
/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages
│       │   ├── (auth)/         # Auth pages (login, signup)
│       │   ├── (dashboard)/    # Protected pages
│       │   │   ├── dashboard/
│       │   │   ├── projects/
│       │   │   ├── gallery/
│       │   │   ├── credits/
│       │   │   └── settings/
│       │   └── api/            # API routes
│       │       ├── trpc/
│       │       ├── webhooks/
│       │       └── inngest/
│       ├── components/         # React components
│       │   ├── ui/             # shadcn/ui components
│       │   ├── layout/         # Layout components
│       │   └── features/       # Feature-specific
│       ├── lib/                # Utilities
│       │   ├── supabase/       # Supabase clients
│       │   ├── trpc/           # tRPC setup
│       │   └── utils/          # Helpers
│       └── styles/             # Global styles
│
├── packages/
│   ├── db/                     # Database schema + migrations
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── seed/
│   │
│   ├── ai/                     # AI provider adapters
│   │   ├── providers/
│   │   │   ├── fal.ts
│   │   │   ├── vertex.ts
│   │   │   ├── openai.ts
│   │   │   └── replicate.ts
│   │   ├── registry.ts
│   │   └── types.ts
│   │
│   ├── credits/                # Credit service
│   │   ├── service.ts
│   │   ├── pricing.ts
│   │   └── types.ts
│   │
│   └── shared/                 # Shared code
│       ├── types/
│       ├── constants/
│       └── utils/
│
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## ✅ Decisions Made

| Question | Decision |
|----------|----------|
| **Branding** | Ursa (ursa.ai) |
| **Pricing Model** | Prepaid credits only (no subscriptions) |
| **Welcome Credits** | 10 credits for new users |
| **Credit Expiration** | 15 days from purchase/grant |
| **MVP Models** | FLUX Pro 1.1, FLUX Kontext, Imagen 3, Recraft V3, DALL-E 3 |
| **Team Features** | Planned for v3.1+ (architecture prepared) |

---

## 📞 Next Steps

1. ~~Review this document~~ ✅
2. ~~Answer open questions~~ ✅
3. **Setup accounts** — Supabase, Vercel, Stripe, fal.ai
4. **Begin Phase 0** — Project initialization

---

*Document Version: 1.0*  
*Created: December 2024*  
*Status: APPROVED*  
*SRD Reference: [SRD-v3.0.md](./SRD-v3.0.md)*

