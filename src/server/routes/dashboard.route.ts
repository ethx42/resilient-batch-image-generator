/**
 * Dashboard Route
 *
 * Serves the single-file HTML dashboard.
 * No build step required - uses Tailwind CDN.
 *
 * @module server/routes/dashboard
 */

import type { FastifyInstance } from "fastify";

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register the dashboard route.
 *
 * Endpoint: GET /
 *
 * Returns the dashboard HTML inline (no external files).
 */
export function registerDashboardRoute(app: FastifyInstance): void {
  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(DASHBOARD_HTML);
  });
}

// =============================================================================
// Dashboard HTML Template
// =============================================================================

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RBIG Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'rbig-dark': '#0a0a0f',
            'rbig-card': '#12121a',
            'rbig-border': '#1e1e2e',
            'rbig-accent': '#7c3aed',
            'rbig-success': '#10b981',
            'rbig-warning': '#f59e0b',
            'rbig-error': '#ef4444',
          },
          fontFamily: {
            'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
            'mono': ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    /* Animations */
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
      50% { box-shadow: 0 0 20px 5px rgba(124, 58, 237, 0.2); }
    }
    .processing { animation: pulse-glow 2s ease-in-out infinite; }
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fade-in 0.3s ease-out; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #12121a; }
    ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #2e2e3e; }
    
    /* Image hover */
    .image-card:hover img { transform: scale(1.05); }
    .image-card img { transition: transform 0.2s ease; }
  </style>
</head>
<body class="bg-rbig-dark text-gray-100 min-h-screen">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Header -->
    <header class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-rbig-accent to-purple-400 bg-clip-text text-transparent">
            Resilient Batch Image Generator
          </h1>
          <p class="text-gray-500 mt-1 font-mono text-sm">v2.1.0 • Vertex AI Imagen 3</p>
        </div>
        <div id="connection-status" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rbig-card border border-rbig-border">
          <span id="status-dot" class="w-2 h-2 rounded-full bg-gray-500"></span>
          <span id="status-text" class="text-sm text-gray-400">Connecting...</span>
        </div>
      </div>
    </header>
    
    <!-- Stats Cards -->
    <div id="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-rbig-card border border-rbig-border rounded-xl p-4">
        <p class="text-gray-500 text-sm mb-1">Pending</p>
        <p id="stat-pending" class="text-2xl font-bold text-gray-300">-</p>
      </div>
      <div class="bg-rbig-card border border-rbig-border rounded-xl p-4">
        <p class="text-gray-500 text-sm mb-1">Processing</p>
        <p id="stat-processing" class="text-2xl font-bold text-rbig-accent">-</p>
      </div>
      <div class="bg-rbig-card border border-rbig-border rounded-xl p-4">
        <p class="text-gray-500 text-sm mb-1">Completed</p>
        <p id="stat-done" class="text-2xl font-bold text-rbig-success">-</p>
      </div>
      <div class="bg-rbig-card border border-rbig-border rounded-xl p-4">
        <p class="text-gray-500 text-sm mb-1">Failed</p>
        <p id="stat-failed" class="text-2xl font-bold text-rbig-error">-</p>
      </div>
    </div>
    
    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-500">Progress</span>
        <span id="progress-text" class="text-sm font-mono text-gray-400">0 / 0</span>
      </div>
      <div class="bg-rbig-card rounded-full h-3 overflow-hidden border border-rbig-border">
        <div id="progress-bar" class="bg-gradient-to-r from-rbig-accent to-purple-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
      </div>
    </div>
    
    <!-- Gallery -->
    <section>
      <h2 class="text-lg font-semibold text-gray-300 mb-4">Generated Images</h2>
      <div id="gallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <!-- Dynamic content -->
      </div>
      <p id="empty-state" class="text-center text-gray-600 py-12 hidden">
        No images generated yet. Start the batch process to see results here.
      </p>
    </section>
    
  </div>
  
  <script>
    // ==========================================================================
    // State
    // ==========================================================================
    
    const state = {
      jobs: [],
      stats: { pending: 0, processing: 0, done: 0, failed: 0, total: 0 },
      connected: false,
    };
    
    // ==========================================================================
    // DOM Elements
    // ==========================================================================
    
    const elements = {
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      statPending: document.getElementById('stat-pending'),
      statProcessing: document.getElementById('stat-processing'),
      statDone: document.getElementById('stat-done'),
      statFailed: document.getElementById('stat-failed'),
      progressBar: document.getElementById('progress-bar'),
      progressText: document.getElementById('progress-text'),
      gallery: document.getElementById('gallery'),
      emptyState: document.getElementById('empty-state'),
    };
    
    // ==========================================================================
    // SSE Connection
    // ==========================================================================
    
    function connect() {
      const eventSource = new EventSource('/events');
      
      eventSource.addEventListener('open', () => {
        state.connected = true;
        updateConnectionStatus(true);
        console.log('[SSE] Connected');
      });
      
      eventSource.addEventListener('INIT', (e) => {
        const { jobs, stats } = JSON.parse(e.data);
        state.jobs = jobs;
        state.stats = stats;
        renderAll();
        console.log('[SSE] Initialized with', jobs.length, 'jobs');
      });
      
      eventSource.addEventListener('STATUS_UPDATE', (e) => {
        const { jobId, status, error } = JSON.parse(e.data);
        updateJobStatus(jobId, status, error);
      });
      
      eventSource.addEventListener('IMAGE_READY', (e) => {
        const { jobId, imageUrl } = JSON.parse(e.data);
        addImageToJob(jobId, imageUrl);
      });
      
      eventSource.addEventListener('BATCH_COMPLETE', (e) => {
        const { stats } = JSON.parse(e.data);
        state.stats = stats;
        updateStats();
        console.log('[SSE] Batch complete');
      });
      
      eventSource.addEventListener('HEARTBEAT', () => {
        // Keep-alive, no action needed
      });
      
      eventSource.addEventListener('error', () => {
        state.connected = false;
        updateConnectionStatus(false);
        console.log('[SSE] Disconnected, reconnecting...');
        eventSource.close();
        setTimeout(connect, 3000);
      });
    }
    
    // ==========================================================================
    // Rendering
    // ==========================================================================
    
    function renderAll() {
      updateStats();
      updateProgress();
      renderGallery();
    }
    
    function updateConnectionStatus(connected) {
      if (connected) {
        elements.statusDot.className = 'w-2 h-2 rounded-full bg-rbig-success';
        elements.statusText.textContent = 'Connected';
        elements.statusText.className = 'text-sm text-rbig-success';
      } else {
        elements.statusDot.className = 'w-2 h-2 rounded-full bg-rbig-error';
        elements.statusText.textContent = 'Disconnected';
        elements.statusText.className = 'text-sm text-rbig-error';
      }
    }
    
    function updateStats() {
      elements.statPending.textContent = state.stats.pending;
      elements.statProcessing.textContent = state.stats.processing;
      elements.statDone.textContent = state.stats.done;
      elements.statFailed.textContent = state.stats.failed;
    }
    
    function updateProgress() {
      const total = state.stats.total || 1;
      const completed = state.stats.done + state.stats.failed;
      const percent = Math.round((completed / total) * 100);
      
      elements.progressBar.style.width = percent + '%';
      elements.progressText.textContent = completed + ' / ' + total;
    }
    
    function renderGallery() {
      // Sort by ID
      const sortedJobs = [...state.jobs].sort((a, b) => a.id - b.id);
      
      elements.gallery.innerHTML = sortedJobs.map(job => createJobCard(job)).join('');
      elements.emptyState.classList.toggle('hidden', sortedJobs.length > 0);
    }
    
    function createJobCard(job) {
      const statusClass = getStatusClass(job.status);
      const isProcessing = job.status === 'PROCESSING';
      
      if (job.status === 'DONE' && job.outputPath) {
        // Completed with image
        const imageUrl = '/output/' + job.outputPath.split('/').pop();
        return \`
          <div class="image-card group relative aspect-square rounded-xl overflow-hidden border border-rbig-border bg-rbig-card fade-in">
            <img src="\${imageUrl}" alt="Job #\${job.id}" class="w-full h-full object-cover" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="absolute bottom-0 left-0 right-0 p-3">
                <p class="text-xs font-mono text-white/80 truncate">#\${job.id}</p>
                <p class="text-xs text-white/60 truncate">\${job.prompt.slice(0, 50)}...</p>
              </div>
            </div>
          </div>
        \`;
      }
      
      // Pending, Processing, or Failed
      return \`
        <div class="aspect-square rounded-xl border border-rbig-border bg-rbig-card flex flex-col items-center justify-center p-4 \${isProcessing ? 'processing' : ''} fade-in">
          <div class="w-10 h-10 rounded-full \${statusClass} flex items-center justify-center mb-3">
            \${getStatusIcon(job.status)}
          </div>
          <p class="text-xs font-mono text-gray-500 mb-1">#\${job.id}</p>
          <p class="text-xs text-center \${getStatusTextClass(job.status)}">\${formatStatus(job.status)}</p>
          \${job.errorLog ? \`<p class="text-xs text-rbig-error/70 mt-2 text-center truncate max-w-full">\${job.errorLog.slice(0, 30)}...</p>\` : ''}
        </div>
      \`;
    }
    
    function getStatusClass(status) {
      switch (status) {
        case 'PENDING': return 'bg-gray-800';
        case 'PROCESSING': return 'bg-rbig-accent/20';
        case 'DONE': return 'bg-rbig-success/20';
        case 'FAILED': return 'bg-rbig-error/20';
        default: return 'bg-gray-800';
      }
    }
    
    function getStatusTextClass(status) {
      switch (status) {
        case 'PENDING': return 'text-gray-500';
        case 'PROCESSING': return 'text-rbig-accent';
        case 'DONE': return 'text-rbig-success';
        case 'FAILED': return 'text-rbig-error';
        default: return 'text-gray-500';
      }
    }
    
    function getStatusIcon(status) {
      switch (status) {
        case 'PENDING':
          return '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>';
        case 'PROCESSING':
          return '<svg class="w-5 h-5 text-rbig-accent animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8v8H4z"/></svg>';
        case 'DONE':
          return '<svg class="w-5 h-5 text-rbig-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        case 'FAILED':
          return '<svg class="w-5 h-5 text-rbig-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
        default:
          return '';
      }
    }
    
    function formatStatus(status) {
      switch (status) {
        case 'PENDING': return 'Waiting';
        case 'PROCESSING': return 'Generating...';
        case 'DONE': return 'Complete';
        case 'FAILED': return 'Failed';
        default: return status;
      }
    }
    
    // ==========================================================================
    // Event Handlers
    // ==========================================================================
    
    function updateJobStatus(jobId, status, error) {
      const job = state.jobs.find(j => j.id === jobId);
      if (job) {
        job.status = status;
        if (error) job.errorLog = error;
        
        // Update stats
        recalculateStats();
        renderAll();
      }
    }
    
    function addImageToJob(jobId, imageUrl) {
      const job = state.jobs.find(j => j.id === jobId);
      if (job) {
        job.outputPath = imageUrl;
        job.status = 'DONE';
        
        recalculateStats();
        renderAll();
      }
    }
    
    function recalculateStats() {
      state.stats = {
        pending: state.jobs.filter(j => j.status === 'PENDING').length,
        processing: state.jobs.filter(j => j.status === 'PROCESSING').length,
        done: state.jobs.filter(j => j.status === 'DONE').length,
        failed: state.jobs.filter(j => j.status === 'FAILED').length,
        total: state.jobs.length,
      };
    }
    
    // ==========================================================================
    // Initialize
    // ==========================================================================
    
    connect();
  </script>
</body>
</html>`;

