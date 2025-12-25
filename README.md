# Resilient Batch Image Generator (RBIG)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready, fault-tolerant batch image generation system powered by **Google Vertex AI Imagen 3**. Features automated resume-on-failure, real-time observability dashboard, and event-driven architecture.

## 🎯 Key Features

- **Fault-Tolerant**: Automatic resume from interruption point
- **Real-Time Dashboard**: SSE-powered live monitoring at `localhost:3000`
- **Zero-Config**: Auto-provisions GCP resources and directories
- **Strategy Pattern**: Pluggable image generation backends
- **Type-Safe**: Strict TypeScript with Zod validation
- **Production-Ready**: ACID-like state persistence with `jobs.json`

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Orchestrator  │────▶│  State Manager   │────▶│   jobs.json     │
│   (Core Loop)   │     │  (Persistence)   │     │   (SSOT)        │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────────┐  ┌──────────────────┐
│  Strategy Layer │  │  Observer        │
│  (Vertex AI)    │  │  (Dashboard)     │
└─────────────────┘  └──────────────────┘
```

## 📋 Prerequisites

- Node.js 20+ (LTS)
- Google Cloud Project with billing enabled
- Service Account with `Vertex AI User` role
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable set

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Set GCP credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Start the system (builds and runs)
yarn start
```

Open your browser at **http://localhost:3000** to watch the generation process in real-time.

## 📁 Project Structure

```
/resilient-batch-image-generator
├── /src
│   ├── /adapters              # Strategy implementations
│   │   ├── generator.interface.ts
│   │   └── vertex-imagen3.ts
│   ├── /core                  # Business logic
│   │   ├── state.ts
│   │   └── orchestrator.ts
│   ├── /server                # Dashboard
│   │   └── dashboard.ts
│   ├── /config                # Constants
│   │   └── constants.ts
│   ├── setup.ts               # Auto-provisioning
│   └── index.ts               # Entry point
├── /docs
│   └── SRD.md                 # Full specification
├── /output                    # Generated images
├── jobs.json                  # State persistence
└── package.json
```

## 🔧 Configuration

Environment variables (optional):

```bash
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
DASHBOARD_PORT=3000
MAX_RETRIES=3
```

## 🧪 Development

```bash
# Run in development mode with hot reload
yarn dev

# Build TypeScript
yarn build

# Clean build artifacts
yarn clean
```

## 🎨 How It Works

1. **Initialization**: Validates GCP credentials, enables APIs, creates directories
2. **State Loading**: Reads or creates `jobs.json` with 32 job entries
3. **Processing Loop**: 
   - Picks next `PENDING` job
   - Combines master aesthetic prompt with job-specific prompt
   - Calls Vertex AI Imagen 3
   - Saves image to `./output`
   - Updates state to `DONE`
   - Emits SSE event to dashboard
4. **Resume**: On restart, skips all `DONE` jobs and continues from last checkpoint

## 📊 Dashboard Features

- **Live Progress Bar**: Visual completion percentage
- **Job Status Grid**: Real-time status for all 32 jobs
- **Image Gallery**: Auto-updating grid of completed images
- **Error Reporting**: Inline display of failed generations

## 🛡️ Error Handling

- **Network Failures**: Automatic retry with exponential backoff
- **API Quota Limits**: Rate limiting with configurable delays
- **Corrupted State**: Atomic file writes prevent `jobs.json` corruption
- **Partial Completion**: Resume from exact interruption point

## 📄 License

MIT © Santiago Torres

## 🤝 Contributing

This is a portfolio project. Feel free to fork and adapt for your use cases.

## 📚 Documentation

See [docs/SRD.md](docs/SRD.md) for complete technical specification.

---

**Built with**: TypeScript • Vertex AI • Fastify • Node.js
