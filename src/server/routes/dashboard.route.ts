/**
 * Dashboard Route - Enterprise UI with Config, Gallery & Benchmark
 * @module server/routes/dashboard
 */

import type { FastifyInstance } from "fastify";

export function registerDashboardRoute(app: FastifyInstance): void {
  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(DASHBOARD_HTML);
  });
}

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
            'rbig-dark': '#0a0a0f', 'rbig-card': '#12121a', 'rbig-border': '#1e1e2e',
            'rbig-accent': '#7c3aed', 'rbig-success': '#10b981', 'rbig-warning': '#f59e0b',
            'rbig-error': '#ef4444', 'rbig-cyan': '#06b6d4', 'rbig-pink': '#ec4899',
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); } 50% { box-shadow: 0 0 20px 5px rgba(124, 58, 237, 0.2); } }
    .processing { animation: pulse-glow 2s ease-in-out infinite; }
    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fade-in 0.3s ease-out; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: #12121a; } ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }
    .tab-active { border-bottom: 2px solid #7c3aed; color: #fff; }
    .tab-inactive { border-bottom: 2px solid transparent; color: #666; }
    .tab-inactive:hover { color: #999; }
    .model-card { transition: all 0.2s; }
    .model-card.selected { border-color: #7c3aed; background: rgba(124, 58, 237, 0.1); }
    .model-card:not(.selected):hover { border-color: #3e3e5e; }
    .image-card:hover img { transform: scale(1.02); }
    .image-card img { transition: transform 0.2s ease; }
    /* Ensure content sections are not hidden behind other elements */
    section { position: relative; z-index: 1; }
    #reference-guide { position: relative; z-index: 2; }
    /* Batch preview animations */
    @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .preview-board { animation: slide-up 0.3s ease-out; }
    /* Smooth transitions for interactive elements */
    button, input, textarea { transition: all 0.2s ease; }
    /* Scrollbar styling for preview */
    #board-preview-grid::-webkit-scrollbar { width: 6px; }
    #board-preview-grid::-webkit-scrollbar-track { background: #12121a; border-radius: 3px; }
    #board-preview-grid::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
    #board-preview-grid::-webkit-scrollbar-thumb:hover { background: #2e2e3e; }
  </style>
</head>
<body class="bg-rbig-dark text-gray-100 min-h-screen">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Header -->
    <header class="mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-rbig-accent to-purple-400 bg-clip-text text-transparent">RBIG Dashboard</h1>
          <p class="text-gray-500 mt-1 font-mono text-sm">Resilient Batch Image Generator</p>
        </div>
        <div id="connection-status" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rbig-card border border-rbig-border">
          <span id="status-dot" class="w-2 h-2 rounded-full bg-gray-500"></span>
          <span id="status-text" class="text-sm text-gray-400">Connecting...</span>
        </div>
      </div>
    </header>
    
    <!-- Tabs -->
    <div class="flex gap-6 border-b border-rbig-border mb-6">
      <button id="tab-config" onclick="showTab('config')" class="pb-3 px-1 text-sm font-medium tab-active">⚙️ Configuration</button>
      <button id="tab-gallery" onclick="showTab('gallery')" class="pb-3 px-1 text-sm font-medium tab-inactive">🖼️ Gallery</button>
      <button id="tab-batch" onclick="showTab('batch')" class="pb-3 px-1 text-sm font-medium tab-inactive">⚡ Parallel</button>
      <button id="tab-benchmark" onclick="showTab('benchmark')" class="pb-3 px-1 text-sm font-medium tab-inactive">🏆 Benchmark</button>
    </div>
    
    <!-- ========== CONFIG TAB ========== -->
    <div id="panel-config" class="space-y-6">
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-300 flex items-center gap-2"><span class="text-rbig-cyan">🎨</span> Master Aesthetic Prompt</h2>
          <button id="btn-edit-aesthetic" onclick="toggleEditAesthetic()" class="text-sm text-rbig-accent hover:text-rbig-accent/80">✏️ Edit</button>
        </div>
        <div id="aesthetic-view"><p id="master-aesthetic" class="text-sm text-gray-400 leading-relaxed bg-rbig-dark/50 rounded-lg p-4 border border-rbig-border font-mono whitespace-pre-wrap">Loading...</p></div>
        <div id="aesthetic-edit" class="hidden">
          <textarea id="aesthetic-textarea" rows="6" class="w-full bg-rbig-dark border border-rbig-border rounded-lg p-4 text-sm text-gray-300 font-mono focus:border-rbig-accent focus:outline-none"></textarea>
          <div class="flex gap-2 mt-3"><button onclick="saveAesthetic()" class="px-4 py-2 bg-rbig-accent text-white text-sm font-medium rounded-lg">💾 Save</button><button onclick="cancelEditAesthetic()" class="px-4 py-2 bg-rbig-border text-gray-300 text-sm rounded-lg">Cancel</button></div>
        </div>
      </section>
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-300 flex items-center gap-2"><span class="text-rbig-warning">📝</span> Prompts <span id="prompt-count" class="text-sm font-normal text-gray-500">(0)</span></h2>
          <button onclick="toggleEditPrompts()" class="text-sm text-rbig-accent hover:text-rbig-accent/80">✏️ Edit</button>
        </div>
        <div id="prompts-view"><div id="prompts-list" class="space-y-2 max-h-80 overflow-y-auto pr-2"><p class="text-gray-500 text-sm">Loading...</p></div></div>
        <div id="prompts-edit" class="hidden">
          <p class="text-xs text-gray-500 mb-2">One prompt per line</p>
          <textarea id="prompts-textarea" rows="12" class="w-full bg-rbig-dark border border-rbig-border rounded-lg p-4 text-sm text-gray-300 font-mono focus:border-rbig-accent focus:outline-none"></textarea>
          <div class="flex gap-2 mt-3"><button onclick="savePrompts()" class="px-4 py-2 bg-rbig-accent text-white text-sm font-medium rounded-lg">💾 Save</button><button onclick="cancelEditPrompts()" class="px-4 py-2 bg-rbig-border text-gray-300 text-sm rounded-lg">Cancel</button></div>
        </div>
      </section>
      <!-- Model Selection -->
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-5">
        <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-pink">🤖</span> Select Model</h2>
        <div id="batch-model-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <p class="text-gray-500 text-sm">Loading models...</p>
        </div>
      </section>
      
      <!-- Control Buttons -->
      <section class="flex gap-4 flex-wrap items-center">
        <button id="btn-start" onclick="startBatch()" class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rbig-accent to-purple-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50">▶️ Start Batch</button>
        <button id="btn-cancel" onclick="cancelBatch()" class="hidden flex items-center gap-2 px-6 py-3 bg-rbig-error/20 text-rbig-error font-semibold rounded-xl border border-rbig-error/30">⏹️ Cancel</button>
        <button id="btn-reinit" onclick="reinitializeJobs()" class="flex items-center gap-2 px-6 py-3 bg-rbig-cyan/20 text-rbig-cyan font-semibold rounded-xl border border-rbig-cyan/30 disabled:opacity-50">🔄 Sync Prompts</button>
        <button id="btn-reset" onclick="resetJobs()" class="flex items-center gap-2 px-6 py-3 bg-rbig-card text-gray-300 font-semibold rounded-xl border border-rbig-border disabled:opacity-50">🗑️ Reset All</button>
        <span id="selected-model-info" class="text-sm text-gray-500 ml-auto"></span>
      </section>
      
      <!-- Warning about prompts sync -->
      <div id="sync-warning" class="hidden bg-rbig-warning/10 border border-rbig-warning/30 rounded-xl p-4">
        <p class="text-rbig-warning text-sm">⚠️ <strong>Prompts may be out of sync!</strong> If you updated config/prompts.json, click "Sync Prompts" to recreate jobs from the current prompts.</p>
      </div>
    </div>
    
    <!-- ========== GALLERY TAB ========== -->
    <div id="panel-gallery" class="hidden space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-rbig-card border border-rbig-border rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Pending</p><p id="stat-pending" class="text-2xl font-bold text-gray-300">-</p></div>
        <div class="bg-rbig-card border border-rbig-border rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Processing</p><p id="stat-processing" class="text-2xl font-bold text-rbig-accent">-</p></div>
        <div class="bg-rbig-card border border-rbig-border rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Completed</p><p id="stat-done" class="text-2xl font-bold text-rbig-success">-</p></div>
        <div class="bg-rbig-card border border-rbig-border rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Failed</p><p id="stat-failed" class="text-2xl font-bold text-rbig-error">-</p></div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex justify-between items-center mb-2"><span class="text-sm text-gray-500">Progress</span><span id="progress-text" class="text-sm font-mono text-gray-400">0 / 0</span></div>
          <div class="bg-rbig-card rounded-full h-3 overflow-hidden border border-rbig-border"><div id="progress-bar" class="bg-gradient-to-r from-rbig-accent to-purple-500 h-full transition-all duration-500" style="width:0%"></div></div>
        </div>
        <button id="btn-cancel-gallery" onclick="cancelBatch()" class="hidden px-4 py-2 bg-rbig-error/20 text-rbig-error font-semibold rounded-lg border border-rbig-error/30 text-sm">⏹️ Cancel</button>
      </div>
      <div id="gallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"></div>
      <p id="empty-state" class="text-center text-gray-600 py-12 hidden">No images yet. Start a batch to see results.</p>
    </div>
    
    <!-- ========== BATCH TAB ========== -->
    <div id="panel-batch" class="hidden space-y-6">
      
      <!-- Parallel Info Banner -->
      <div class="bg-gradient-to-r from-rbig-cyan/10 to-blue-600/10 border border-rbig-cyan/30 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">⚡</span>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-200">Parallel Generation</h3>
            <p class="text-sm text-gray-400 mt-1">Process multiple prompts in parallel with controlled concurrency. Preview your batch organization before starting.</p>
          </div>
        </div>
      </div>
      
      <!-- Batch Configuration -->
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-300 flex items-center gap-2"><span class="text-rbig-cyan">📝</span> Prompts JSON</h2>
          <div class="flex gap-2">
            <button onclick="loadExampleBatch()" class="text-xs px-3 py-1.5 bg-rbig-dark/50 hover:bg-rbig-dark border border-rbig-border rounded-lg text-gray-400 hover:text-white transition-colors">📋 Example</button>
            <button onclick="validateBatchJson()" class="text-xs px-3 py-1.5 bg-rbig-dark/50 hover:bg-rbig-dark border border-rbig-border rounded-lg text-gray-400 hover:text-white transition-colors">✓ Validate</button>
          </div>
        </div>
        
        <!-- Format Examples -->
        <div class="mb-4 p-3 bg-rbig-dark/50 rounded-lg border border-rbig-border/50">
          <p class="text-xs text-gray-500 mb-2">💡 Supported formats:</p>
          <div class="flex gap-4 flex-wrap text-xs font-mono">
            <div class="flex-1 min-w-48">
              <p class="text-gray-400 mb-1">Simple (text array):</p>
              <code class="text-rbig-cyan">["prompt 1", "prompt 2"]</code>
            </div>
            <div class="flex-1 min-w-48">
              <p class="text-gray-400 mb-1">With references:</p>
              <code class="text-rbig-cyan">[{"text": "prompt", "references": [...]}]</code>
            </div>
          </div>
        </div>
        
        <textarea id="batch-json-input" rows="8" placeholder='[
  "A cat in a cyberpunk city",
  "A robot playing chess",
  "Northern lights over mountains"
]' class="w-full bg-rbig-dark border border-rbig-border rounded-lg p-4 text-sm text-gray-300 font-mono focus:border-rbig-cyan focus:outline-none transition-colors" oninput="calculateBatchPreview()"></textarea>
        
        <div class="flex items-center justify-between mt-3">
          <p id="batch-json-status" class="text-sm text-gray-500"></p>
          <p id="batch-prompt-count-display" class="text-xs text-gray-600 font-mono"></p>
        </div>
      </section>
      
      <!-- Preview & Configuration Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Model & Settings -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Model Selection -->
          <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
            <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-pink">🤖</span> Model</h2>
            <div id="batch-tab-model-grid" class="space-y-2">
              <p class="text-gray-500 text-sm">Loading models...</p>
            </div>
          </section>
          
          <!-- Settings -->
          <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
            <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-warning">⚡</span> Settings</h2>
            
            <div class="space-y-5">
              <!-- Aspect Ratio -->
              <div>
                <label class="block text-sm text-gray-500 mb-3">Aspect Ratio</label>
                <div class="grid grid-cols-5 gap-2">
                  <button type="button" onclick="selectBatchAspectRatio('1:1')" id="ar-1-1" class="aspect-ratio-btn p-2 rounded-lg border border-rbig-cyan bg-rbig-cyan/10 text-center transition-all">
                    <div class="w-6 h-6 mx-auto border-2 border-current rounded-sm"></div>
                    <span class="text-xs mt-1 block">1:1</span>
                  </button>
                  <button type="button" onclick="selectBatchAspectRatio('16:9')" id="ar-16-9" class="aspect-ratio-btn p-2 rounded-lg border border-rbig-border hover:border-rbig-border/80 text-center text-gray-400 transition-all">
                    <div class="w-8 h-5 mx-auto border-2 border-current rounded-sm"></div>
                    <span class="text-xs mt-1 block">16:9</span>
                  </button>
                  <button type="button" onclick="selectBatchAspectRatio('9:16')" id="ar-9-16" class="aspect-ratio-btn p-2 rounded-lg border border-rbig-border hover:border-rbig-border/80 text-center text-gray-400 transition-all">
                    <div class="w-4 h-7 mx-auto border-2 border-current rounded-sm"></div>
                    <span class="text-xs mt-1 block">9:16</span>
                  </button>
                  <button type="button" onclick="selectBatchAspectRatio('4:3')" id="ar-4-3" class="aspect-ratio-btn p-2 rounded-lg border border-rbig-border hover:border-rbig-border/80 text-center text-gray-400 transition-all">
                    <div class="w-6 h-5 mx-auto border-2 border-current rounded-sm"></div>
                    <span class="text-xs mt-1 block">4:3</span>
                  </button>
                  <button type="button" onclick="selectBatchAspectRatio('3:4')" id="ar-3-4" class="aspect-ratio-btn p-2 rounded-lg border border-rbig-border hover:border-rbig-border/80 text-center text-gray-400 transition-all">
                    <div class="w-5 h-6 mx-auto border-2 border-current rounded-sm"></div>
                    <span class="text-xs mt-1 block">3:4</span>
                  </button>
                </div>
              </div>
              
              <!-- Concurrency -->
              <div>
                <label class="block text-sm text-gray-500 mb-3">Concurrency (parallel requests)</label>
                <div class="flex items-center gap-4">
                  <input type="range" id="batch-concurrency" min="1" max="10" value="3" class="flex-1 accent-rbig-cyan" oninput="updateBatchConcurrency(); calculateBatchPreview();">
                  <span id="batch-concurrency-value" class="text-xl font-mono text-rbig-cyan w-10 text-center">3</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">⚠️ Higher values may trigger rate limits</p>
              </div>
              
              <!-- Output Directory -->
              <div>
                <label class="block text-sm text-gray-500 mb-2">Output Directory (optional)</label>
                <input type="text" id="batch-output-dir" placeholder="batch-1" class="w-full bg-rbig-dark border border-rbig-border rounded-lg px-4 py-2 text-sm text-gray-300 font-mono focus:border-rbig-cyan focus:outline-none transition-colors">
              </div>
            </div>
          </section>
        </div>
        
        <!-- Right: Preview Panel -->
        <div class="lg:col-span-1">
          <section class="bg-rbig-card border border-rbig-border rounded-xl p-6 sticky top-6">
            <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-success">📊</span> Batch Preview</h2>
            
            <!-- Preview Stats -->
            <div id="batch-preview-stats" class="space-y-4">
              <div class="bg-rbig-dark/50 rounded-lg p-4 border border-rbig-border/50">
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-gray-500 text-xs mb-1">Prompts</p>
                    <p id="preview-prompt-count" class="text-2xl font-bold text-gray-200 font-mono">0</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs mb-1">Images</p>
                    <p id="preview-image-count" class="text-2xl font-bold text-rbig-cyan font-mono">0</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs mb-1">Boards</p>
                    <p id="preview-board-count" class="text-2xl font-bold text-rbig-success font-mono">0</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs mb-1">Est. Time</p>
                    <p id="preview-time-estimate" class="text-2xl font-bold text-rbig-warning font-mono">0m</p>
                  </div>
                </div>
              </div>
              
              <!-- Board Layout Preview -->
              <div id="board-preview-container" class="hidden">
                <p class="text-xs text-gray-500 mb-3">Layout Preview (6 images per board)</p>
                <div id="board-preview-grid" class="space-y-3 max-h-64 overflow-y-auto pr-2">
                  <!-- Boards will be rendered here -->
                </div>
              </div>
              
              <!-- Empty State -->
              <div id="preview-empty-state" class="text-center py-8">
                <div class="text-4xl mb-2">📐</div>
                <p class="text-sm text-gray-500">Enter prompts to see preview</p>
              </div>
            </div>
            
            <!-- Start Button -->
            <div class="mt-6 pt-6 border-t border-rbig-border">
              <button id="btn-start-batch" onclick="startBatchGeneration()" class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rbig-cyan to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-rbig-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed text-base transition-all hover:shadow-xl hover:shadow-rbig-cyan/30">
                <span>⚡</span>
                <span>Start Generation</span>
              </button>
              <p id="batch-ready-status" class="text-xs text-center text-gray-600 mt-2"></p>
            </div>
          </section>
        </div>
      </div>
      
      <!-- Batch Progress -->
      <div id="batch-progress-section" class="hidden">
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-300 flex items-center gap-2"><span class="animate-pulse">⏳</span> Generation in Progress</h2>
            <span id="batch-progress-status" class="text-sm text-rbig-cyan font-mono">Running...</span>
          </div>
          
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Progress</span>
              <span id="batch-progress-text" class="text-gray-300 font-mono">0/0</span>
            </div>
            <div class="bg-rbig-dark rounded-full h-3 overflow-hidden">
              <div id="batch-progress-bar" class="bg-gradient-to-r from-rbig-cyan to-blue-500 h-full transition-all" style="width:0%"></div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Success: <span id="batch-success-count" class="text-rbig-success">0</span></span>
              <span class="text-gray-500">Failed: <span id="batch-failure-count" class="text-rbig-error">0</span></span>
            </div>
            <p id="batch-current-prompt" class="text-xs text-gray-500 truncate mt-2"></p>
          </div>
        </section>
      </div>
      
      <!-- Batch Results -->
      <div id="batch-results-section" class="hidden">
        <section class="bg-gradient-to-r from-rbig-cyan/10 to-blue-600/10 border border-rbig-cyan/30 rounded-xl p-6">
          <h2 class="text-xl font-bold text-gray-200 mb-2">✅ Batch Complete</h2>
          <p id="batch-result-summary" class="text-gray-400">0 images generated in 0s</p>
        </section>
        
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6 mt-4">
          <h3 class="text-lg font-semibold text-gray-300 mb-4">📊 Results</h3>
          <div id="batch-results-list" class="max-h-96 overflow-y-auto space-y-2"></div>
        </section>
        
        <button onclick="resetBatchUI()" class="mt-4 px-6 py-3 bg-rbig-card text-gray-300 border border-rbig-border font-semibold rounded-xl">🔄 New Batch</button>
      </div>
      
      <!-- Reference Images Guide -->
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-5 relative z-10">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-300 flex items-center gap-2">📸 Reference Images Guide</h3>
          <button id="reference-guide-toggle" onclick="toggleReferenceGuide()" class="text-xs text-rbig-cyan hover:underline">Hide</button>
        </div>
        
        <div id="reference-guide" class="space-y-4 text-sm">
          <!-- Key Concept -->
          <div class="bg-rbig-warning/10 border border-rbig-warning/30 rounded-lg p-3">
            <p class="text-rbig-warning font-medium mb-1">⚡ Key Concept</p>
            <p class="text-gray-400 text-xs">
              <strong>Style</strong> comes from the <span class="text-rbig-accent">Master Aesthetic Prompt</span> (text).<br>
              <strong>Reference images</strong> are for showing <span class="text-rbig-cyan">what objects look like</span>, not style.
            </p>
          </div>
          
          <!-- Reference Types -->
          <div class="space-y-2">
            <p class="text-gray-400 font-medium">Reference Types:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div class="bg-rbig-dark/50 rounded-lg p-3 border border-rbig-border/50">
                <p class="text-rbig-success font-medium">✅ subject</p>
                <p class="text-gray-500">Maintain visual identity of products, people, animals</p>
                <p class="text-gray-600 mt-1">Use: "This is how my sneaker looks"</p>
              </div>
              <div class="bg-rbig-dark/50 rounded-lg p-3 border border-rbig-border/50">
                <p class="text-rbig-cyan font-medium">📐 control</p>
                <p class="text-gray-500">Follow composition/structure from a reference</p>
                <p class="text-gray-600 mt-1">Use: "Follow this pose/layout"</p>
              </div>
            </div>
            <div class="bg-rbig-dark/50 rounded-lg p-3 border border-rbig-error/30 opacity-60">
              <p class="text-gray-500 font-medium">🚫 style <span class="text-rbig-error text-xs">(avoid)</span></p>
              <p class="text-gray-600">Style should come from Master Aesthetic, not images</p>
            </div>
          </div>
          
          <!-- JSON Format -->
          <div class="space-y-2">
            <p class="text-gray-400 font-medium">JSON Format with References:</p>
            <pre class="bg-rbig-dark rounded-lg p-3 text-xs font-mono text-gray-400 overflow-x-auto border border-rbig-border/50"><code>[
  {
    "text": "A red sneaker on a beach at sunset",
    "references": [
      {
        "path": "sneaker_front.png",
        "type": "subject",
        "subjectType": "product",
        "description": "Red Nike sneaker with white sole"
      },
      {
        "path": "sneaker_side.png",
        "type": "subject",
        "subjectType": "product",
        "description": "Same sneaker, side view"
      }
    ]
  }
]</code></pre>
          </div>
          
          <!-- Where to put images -->
          <div class="bg-rbig-dark/50 rounded-lg p-3 border border-rbig-border/50">
            <p class="text-gray-400 font-medium mb-1">📂 Where to put reference images:</p>
            <code class="text-rbig-cyan text-xs">config/references/</code>
            <p class="text-gray-600 text-xs mt-1">Place your images there, then reference them by filename in the JSON.</p>
          </div>
          
          <!-- Subject Types -->
          <div class="flex flex-wrap gap-2 text-xs">
            <span class="text-gray-500">Subject types:</span>
            <code class="bg-rbig-dark px-2 py-0.5 rounded text-gray-400">product</code>
            <code class="bg-rbig-dark px-2 py-0.5 rounded text-gray-400">person</code>
            <code class="bg-rbig-dark px-2 py-0.5 rounded text-gray-400">animal</code>
            <code class="bg-rbig-dark px-2 py-0.5 rounded text-gray-400">object</code>
          </div>
        </div>
      </section>
    </div>
    
    <!-- ========== BENCHMARK TAB ========== -->
    <div id="panel-benchmark" class="hidden space-y-6">
      
      <!-- Benchmark Setup -->
      <div id="benchmark-setup" class="space-y-6">
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
          <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-pink">🤖</span> Select Models to Compare</h2>
          <div id="model-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Models will be injected here -->
          </div>
        </section>
        
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
          <h2 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2"><span class="text-rbig-warning">📊</span> Benchmark Configuration</h2>
          <div class="space-y-4">
            <div class="flex items-center gap-6 flex-wrap">
              <div>
                <label class="block text-sm text-gray-500 mb-2">Number of Prompts</label>
                <div class="flex items-center gap-3">
                  <input type="range" id="prompt-slider" min="1" max="32" value="5" class="w-32 accent-rbig-accent" oninput="updatePromptCount()">
                  <span id="prompt-slider-value" class="text-lg font-mono text-rbig-accent">5</span>
                </div>
              </div>
              <div class="text-sm text-gray-500">
                <p>Estimated time: <span id="estimated-time" class="text-gray-300 font-mono">~2 min</span></p>
                <p>Images to generate: <span id="total-images" class="text-gray-300 font-mono">10</span></p>
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-2">Aspect Ratio</label>
              <div class="flex gap-2">
                <button type="button" onclick="selectBenchmarkAspectRatio('1:1')" id="bench-ar-1-1" class="bench-ar-btn px-3 py-2 rounded-lg border border-rbig-accent bg-rbig-accent/10 text-sm text-rbig-accent">1:1</button>
                <button type="button" onclick="selectBenchmarkAspectRatio('16:9')" id="bench-ar-16-9" class="bench-ar-btn px-3 py-2 rounded-lg border border-rbig-border text-sm text-gray-400">16:9</button>
                <button type="button" onclick="selectBenchmarkAspectRatio('9:16')" id="bench-ar-9-16" class="bench-ar-btn px-3 py-2 rounded-lg border border-rbig-border text-sm text-gray-400">9:16</button>
                <button type="button" onclick="selectBenchmarkAspectRatio('4:3')" id="bench-ar-4-3" class="bench-ar-btn px-3 py-2 rounded-lg border border-rbig-border text-sm text-gray-400">4:3</button>
                <button type="button" onclick="selectBenchmarkAspectRatio('3:4')" id="bench-ar-3-4" class="bench-ar-btn px-3 py-2 rounded-lg border border-rbig-border text-sm text-gray-400">3:4</button>
              </div>
            </div>
          </div>
        </section>
        
        <button id="btn-start-benchmark" onclick="startBenchmark()" class="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rbig-pink to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-rbig-pink/20 disabled:opacity-50 text-lg">
          🚀 Start Benchmark
        </button>
      </div>
      
      <!-- Benchmark Progress -->
      <div id="benchmark-progress" class="hidden space-y-6">
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-300">⏳ Benchmark in Progress</h2>
            <span id="bench-status" class="text-sm text-rbig-accent font-mono">Running...</span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between text-sm"><span class="text-gray-500">Current Model</span><span id="bench-model" class="text-gray-300 font-mono">-</span></div>
            <div class="flex justify-between text-sm"><span class="text-gray-500">Progress</span><span id="bench-progress-text" class="text-gray-300 font-mono">0/0</span></div>
            <div class="bg-rbig-dark rounded-full h-2 overflow-hidden"><div id="bench-progress-bar" class="bg-gradient-to-r from-rbig-pink to-purple-500 h-full transition-all" style="width:0%"></div></div>
          </div>
        </section>
      </div>
      
      <!-- Benchmark Results -->
      <div id="benchmark-results" class="hidden space-y-6">
        <section class="bg-gradient-to-r from-rbig-pink/10 to-purple-600/10 border border-rbig-pink/30 rounded-xl p-6">
          <h2 class="text-xl font-bold text-gray-200 mb-2">🏆 Benchmark Complete</h2>
          <p id="result-summary" class="text-gray-400">Results loaded</p>
        </section>
        
        <div id="result-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"></div>
        
        <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-300 mb-4">📸 Side-by-Side Comparison</h3>
          <div id="comparison-gallery" class="space-y-6"></div>
        </section>
        
        <div class="flex gap-4">
          <button onclick="viewFullReport()" class="px-6 py-3 bg-rbig-accent text-white font-semibold rounded-xl">📄 View Full Report</button>
          <button onclick="showBenchmarkSetup()" class="px-6 py-3 bg-rbig-card text-gray-300 border border-rbig-border font-semibold rounded-xl">🔄 New Benchmark</button>
        </div>
      </div>
      
      <!-- Previous Runs -->
      <section class="bg-rbig-card border border-rbig-border rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-300 mb-4">📜 Previous Benchmark Runs</h3>
        <div id="previous-runs" class="space-y-2"><p class="text-gray-500 text-sm">Loading...</p></div>
      </section>
    </div>
  </div>
  
  <script>
    // === STATE ===
    const state = {
      jobs: [], stats: { pending: 0, processing: 0, done: 0, failed: 0, total: 0 },
      config: { masterAesthetic: '', prompts: [], batchState: { isRunning: false } },
      batch: { models: [], selectedModel: null, jobId: null, aspectRatio: '1:1' },
      benchmark: { models: [], selectedModels: [], promptCount: 5, isRunning: false, results: null, previousRuns: [], aspectRatio: '1:1' },
      currentTab: 'config'
    };
    
    // === ELEMENTS ===
    const el = {
      statusDot: document.getElementById('status-dot'), statusText: document.getElementById('status-text'),
      statPending: document.getElementById('stat-pending'), statProcessing: document.getElementById('stat-processing'),
      statDone: document.getElementById('stat-done'), statFailed: document.getElementById('stat-failed'),
      progressBar: document.getElementById('progress-bar'), progressText: document.getElementById('progress-text'),
      gallery: document.getElementById('gallery'), emptyState: document.getElementById('empty-state'),
      masterAesthetic: document.getElementById('master-aesthetic'), promptsList: document.getElementById('prompts-list'),
      promptCount: document.getElementById('prompt-count'),
      aestheticView: document.getElementById('aesthetic-view'), aestheticEdit: document.getElementById('aesthetic-edit'),
      aestheticTextarea: document.getElementById('aesthetic-textarea'),
      promptsView: document.getElementById('prompts-view'), promptsEdit: document.getElementById('prompts-edit'),
      promptsTextarea: document.getElementById('prompts-textarea'),
      batchModelGrid: document.getElementById('batch-model-grid'),
      selectedModelInfo: document.getElementById('selected-model-info'),
      modelGrid: document.getElementById('model-grid'),
      promptSlider: document.getElementById('prompt-slider'), promptSliderValue: document.getElementById('prompt-slider-value'),
      estimatedTime: document.getElementById('estimated-time'), totalImages: document.getElementById('total-images'),
      benchmarkSetup: document.getElementById('benchmark-setup'), benchmarkProgress: document.getElementById('benchmark-progress'),
      benchmarkResults: document.getElementById('benchmark-results'),
      resultCards: document.getElementById('result-cards'), comparisonGallery: document.getElementById('comparison-gallery'),
      previousRuns: document.getElementById('previous-runs'), resultSummary: document.getElementById('result-summary'),
    };
    
    // === TABS ===
    function showTab(tab) {
      state.currentTab = tab;
      ['config', 'gallery', 'batch', 'benchmark'].forEach(t => {
        document.getElementById('tab-' + t).className = 'pb-3 px-1 text-sm font-medium ' + (t === tab ? 'tab-active' : 'tab-inactive');
        document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab);
      });
      if (tab === 'benchmark') { loadBenchmarkModels(); loadPreviousRuns(); }
      if (tab === 'batch') { loadBatchTabModels(); calculateBatchPreview(); }
    }
    
    // === CONFIG EDITING ===
    function toggleEditAesthetic() { const v = el.aestheticView, e = el.aestheticEdit; if (e.classList.contains('hidden')) { el.aestheticTextarea.value = state.config.masterAesthetic; v.classList.add('hidden'); e.classList.remove('hidden'); } else { cancelEditAesthetic(); } }
    function cancelEditAesthetic() { el.aestheticView.classList.remove('hidden'); el.aestheticEdit.classList.add('hidden'); }
    async function saveAesthetic() { try { const r = await fetch('/api/config/aesthetic', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masterAesthetic: el.aestheticTextarea.value.trim() }) }); if (r.ok) { state.config.masterAesthetic = el.aestheticTextarea.value.trim(); renderConfig(); cancelEditAesthetic(); } else { alert((await r.json()).message); } } catch (e) { alert(e.message); } }
    function toggleEditPrompts() { const v = el.promptsView, e = el.promptsEdit; if (e.classList.contains('hidden')) { el.promptsTextarea.value = state.config.prompts.join('\\n'); v.classList.add('hidden'); e.classList.remove('hidden'); } else { cancelEditPrompts(); } }
    function cancelEditPrompts() { el.promptsView.classList.remove('hidden'); el.promptsEdit.classList.add('hidden'); }
    async function savePrompts() { const prompts = el.promptsTextarea.value.split('\\n').map(p => p.trim()).filter(p => p); try { const r = await fetch('/api/config/prompts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompts }) }); if (r.ok) { state.config.prompts = prompts; renderConfig(); cancelEditPrompts(); } else { alert((await r.json()).message); } } catch (e) { alert(e.message); } }
    
    // === BATCH CONTROL ===
    async function loadConfig() { 
      try { 
        state.config = await (await fetch('/api/config')).json(); 
        renderConfig(); 
        updateBatchButtons();
        updateSyncWarning();
        await loadBatchModels();
      } catch (e) { console.error(e); } 
    }
    
    function updateSyncWarning() {
      const warn = document.getElementById('sync-warning');
      if (state.config.syncStatus === 'out_of_sync' || state.config.syncStatus === 'no_jobs') {
        warn.classList.remove('hidden');
        warn.innerHTML = '<p class="text-rbig-warning text-sm">⚠️ <strong>Jobs out of sync!</strong> ' + 
          state.config.syncMessage + 
          (state.config.jobPromptPreview ? '<br><span class="text-gray-500 text-xs">Current jobs: "' + state.config.jobPromptPreview[0] + '"</span>' : '') +
          '</p>';
      } else {
        warn.classList.add('hidden');
      }
    }
    
    async function loadBatchModels() {
      try {
        const data = await (await fetch('/api/models')).json();
        state.batch.models = data.models;
        if (!state.batch.selectedModel && data.currentModel) {
          // Find the provider key (e.g., vertex-imagen3) for the current model
          const current = data.models.find(m => m.available);
          if (current) state.batch.selectedModel = current.id;
        }
        renderBatchModelGrid();
      } catch (e) { console.error('Failed to load models:', e); }
    }
    
    function renderBatchModelGrid() {
      el.batchModelGrid.innerHTML = state.batch.models.map(m => {
        const sel = state.batch.selectedModel === m.id;
        const icon = m.provider === 'vertex' ? '🔵' : m.provider === 'gemini' ? '🟣' : '🟢';
        const avail = m.available;
        return '<div class="p-3 rounded-lg border cursor-pointer transition-all ' + 
          (sel ? 'border-rbig-accent bg-rbig-accent/10' : 'border-rbig-border hover:border-rbig-border/80') + 
          (avail ? '' : ' opacity-40 cursor-not-allowed') + 
          '" ' + (avail ? 'onclick="selectBatchModel(\\'' + m.id + '\\')"' : '') + '>' +
          '<div class="flex items-center gap-2">' +
          '<span>' + icon + '</span>' +
          '<span class="font-medium text-sm ' + (sel ? 'text-white' : 'text-gray-300') + '">' + m.name + '</span>' +
          (sel ? '<span class="text-rbig-accent ml-auto">✓</span>' : '') +
          '</div>' +
          '<p class="text-xs text-gray-500 mt-1">' + m.description + '</p>' +
          (avail ? '' : '<p class="text-xs text-rbig-error mt-1">Not configured</p>') +
          '</div>';
      }).join('');
      updateSelectedModelInfo();
    }
    
    function selectBatchModel(id) {
      state.batch.selectedModel = id;
      renderBatchModelGrid();
    }
    
    function updateSelectedModelInfo() {
      const m = state.batch.models.find(x => x.id === state.batch.selectedModel);
      if (m) {
        el.selectedModelInfo.textContent = 'Using: ' + m.name;
      } else {
        el.selectedModelInfo.textContent = '';
      }
    }
    
    async function startBatch() { 
      if (!state.batch.selectedModel) {
        alert('Please select a model first');
        return;
      }
      document.getElementById('btn-start').disabled = true; 
      try { 
        const r = await fetch('/api/start', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: state.batch.selectedModel })
        }); 
        if (r.ok) { 
          state.config.batchState.isRunning = true; 
          showTab('gallery'); 
          updateBatchButtons(); 
        } else { 
          const data = await r.json();
          alert(data.message || data.error || 'Failed to start batch'); 
        } 
      } catch (e) { alert(e.message); } 
      document.getElementById('btn-start').disabled = false; 
    }
    
    async function cancelBatch() {
      if (!confirm('Cancel the batch? The current image will complete first.')) return;
      try {
        const r = await fetch('/api/cancel', { method: 'POST' });
        if (r.ok) {
          state.config.batchState.isRunning = false;
          updateBatchButtons();
          alert('Batch cancelled. The current image will complete.');
        } else {
          const data = await r.json();
          alert(data.message || data.error || 'Failed to cancel');
        }
      } catch (e) { alert(e.message); }
    }
    
    async function resetJobs() { 
      if (!confirm('Reset all jobs to PENDING? This will restart generation from scratch.')) return; 
      try { if ((await fetch('/api/reset', { method: 'POST' })).ok) location.reload(); } catch (e) { alert(e.message); } 
    }
    
    async function reinitializeJobs() { 
      if (!confirm('This will DELETE all current jobs and create new ones from config/prompts.json. Continue?')) return; 
      try { if ((await fetch('/api/reinitialize', { method: 'POST' })).ok) location.reload(); } catch (e) { alert(e.message); } 
    }
    
    function updateBatchButtons() { 
      const running = state.config.batchState?.isRunning;
      document.getElementById('btn-start').classList.toggle('hidden', running);
      document.getElementById('btn-cancel').classList.toggle('hidden', !running);
      document.getElementById('btn-cancel-gallery').classList.toggle('hidden', !running);
      ['btn-reset', 'btn-reinit'].forEach(id => document.getElementById(id).disabled = running); 
    }
    function renderConfig() { el.masterAesthetic.textContent = state.config.masterAesthetic || '(Not set)'; const p = state.config.prompts || []; el.promptCount.textContent = '(' + p.length + ')'; el.promptsList.innerHTML = p.length ? p.map((t,i) => '<div class="flex gap-3 p-3 bg-rbig-dark/50 rounded-lg border border-rbig-border/50"><span class="text-xs font-mono text-gray-600 w-8">#'+(i+1)+'</span><p class="text-sm text-gray-300">'+escapeHtml(t)+'</p></div>').join('') : '<p class="text-gray-500 text-sm">No prompts</p>'; }
    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    
    // === BATCH ===
    async function loadBatchTabModels() {
      try {
        const data = await (await fetch('/api/models')).json();
        state.batch.models = data.models;
        renderBatchTabModels();
      } catch (e) { console.error('Failed to load models:', e); }
    }
    
    function renderBatchTabModels() {
      const grid = document.getElementById('batch-tab-model-grid');
      grid.innerHTML = state.batch.models.filter(m => m.available).map(m => {
        const sel = state.batch.selectedModel === m.id;
        const icon = m.provider === 'vertex' ? '🔵' : m.provider === 'gemini' ? '🟣' : '🟢';
        return '<div class="p-3 rounded-lg border cursor-pointer transition-all ' + 
          (sel ? 'border-rbig-cyan bg-rbig-cyan/10' : 'border-rbig-border hover:border-rbig-border/80') + 
          '" onclick="selectBatchTabModel(\\'' + m.id + '\\')">' +
          '<div class="flex items-center gap-2">' +
          '<span>' + icon + '</span>' +
          '<span class="font-medium text-sm ' + (sel ? 'text-white' : 'text-gray-300') + '">' + m.name + '</span>' +
          (sel ? '<span class="text-rbig-cyan ml-auto">✓</span>' : '') +
          '</div>' +
          '</div>';
      }).join('') || '<p class="text-gray-500 text-sm">No models available</p>';
    }
    
    function selectBatchTabModel(id) {
      state.batch.selectedModel = id;
      renderBatchTabModels();
      renderBatchModelGrid(); // Also update config tab
      calculateBatchPreview(); // Update preview when model changes
    }
    
    function updateBatchConcurrency() {
      const val = document.getElementById('batch-concurrency').value;
      document.getElementById('batch-concurrency-value').textContent = val;
    }
    
    function selectBatchAspectRatio(ratio) {
      state.batch.aspectRatio = ratio;
      // Update UI
      document.querySelectorAll('#panel-batch .aspect-ratio-btn').forEach(btn => {
        const isSelected = btn.id === 'ar-' + ratio.replace(':', '-');
        btn.className = 'aspect-ratio-btn p-2 rounded-lg border text-center transition-all ' + 
          (isSelected ? 'border-rbig-cyan bg-rbig-cyan/10 text-rbig-cyan' : 'border-rbig-border hover:border-rbig-border/80 text-gray-400');
      });
      calculateBatchPreview();
    }
    
    // Calculate batch preview with board organization
    function calculateBatchPreview() {
      const data = validateBatchJson();
      const previewStats = document.getElementById('batch-preview-stats');
      const previewEmpty = document.getElementById('preview-empty-state');
      const boardContainer = document.getElementById('board-preview-container');
      const readyStatus = document.getElementById('batch-ready-status');
      
      if (!data || data.length === 0) {
        previewEmpty.classList.remove('hidden');
        boardContainer.classList.add('hidden');
        document.getElementById('preview-prompt-count').textContent = '0';
        document.getElementById('preview-image-count').textContent = '0';
        document.getElementById('preview-board-count').textContent = '0';
        document.getElementById('preview-time-estimate').textContent = '0m';
        readyStatus.textContent = '';
        return;
      }
      
      previewEmpty.classList.add('hidden');
      boardContainer.classList.remove('hidden');
      
      // Calculate prompts
      const prompts = data.map(item => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        return null;
      }).filter(p => p && p.trim().length > 0);
      
      const promptCount = prompts.length;
      const imageCount = promptCount; // One image per prompt
      const imagesPerBoard = 6; // Standard grid: 3x2 or 2x3
      const boardCount = Math.ceil(imageCount / imagesPerBoard);
      
      // Calculate time estimate
      const concurrency = parseInt(document.getElementById('batch-concurrency').value) || 3;
      const avgTimePerImage = 20; // seconds
      const totalSeconds = Math.ceil((imageCount * avgTimePerImage) / concurrency);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeEstimate = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      
      // Update stats
      document.getElementById('preview-prompt-count').textContent = promptCount;
      document.getElementById('preview-image-count').textContent = imageCount;
      document.getElementById('preview-board-count').textContent = boardCount;
      document.getElementById('preview-time-estimate').textContent = timeEstimate;
      
      // Render board preview
      renderBoardPreview(prompts, imagesPerBoard, boardCount);
      
      // Update ready status
      const hasModel = state.batch.selectedModel !== null;
      if (hasModel && promptCount > 0) {
        readyStatus.textContent = '✓ Ready to generate';
        readyStatus.className = 'text-xs text-center text-rbig-success mt-2';
        document.getElementById('btn-start-batch').disabled = false;
      } else if (promptCount > 0) {
        readyStatus.textContent = '⚠ Select a model';
        readyStatus.className = 'text-xs text-center text-rbig-warning mt-2';
        document.getElementById('btn-start-batch').disabled = true;
      } else {
        readyStatus.textContent = '';
        document.getElementById('btn-start-batch').disabled = true;
      }
    }
    
    function renderBoardPreview(prompts, imagesPerBoard, boardCount) {
      const grid = document.getElementById('board-preview-grid');
      grid.innerHTML = '';
      
      for (let boardIndex = 0; boardIndex < boardCount; boardIndex++) {
        const startIdx = boardIndex * imagesPerBoard;
        const endIdx = Math.min(startIdx + imagesPerBoard, prompts.length);
        const boardPrompts = prompts.slice(startIdx, endIdx);
        
        const boardDiv = document.createElement('div');
        boardDiv.className = 'bg-rbig-dark/50 rounded-lg p-3 border border-rbig-border/50 preview-board';
        
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-2';
        header.innerHTML = `<span class="text-xs font-semibold text-gray-400">Board ${boardIndex + 1}</span><span class="text-xs text-gray-600 font-mono">${boardPrompts.length} images</span>`;
        boardDiv.appendChild(header);
        
        const previewGrid = document.createElement('div');
        previewGrid.className = 'grid grid-cols-3 gap-1.5';
        
        boardPrompts.forEach((prompt, idx) => {
          const cell = document.createElement('div');
          cell.className = 'aspect-square bg-rbig-card border border-rbig-border/30 rounded flex items-center justify-center relative group';
          cell.innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs text-gray-600 font-mono">${startIdx + idx + 1}</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded">
              <div class="absolute bottom-0 left-0 right-0 p-1">
                <p class="text-[8px] text-white/90 truncate px-1">${escapeHtml(prompt.slice(0, 30))}${prompt.length > 30 ? '...' : ''}</p>
              </div>
            </div>
          `;
          previewGrid.appendChild(cell);
        });
        
        // Fill empty cells
        const emptyCells = imagesPerBoard - boardPrompts.length;
        for (let i = 0; i < emptyCells; i++) {
          const cell = document.createElement('div');
          cell.className = 'aspect-square bg-rbig-dark/30 border border-rbig-border/20 rounded border-dashed';
          previewGrid.appendChild(cell);
        }
        
        boardDiv.appendChild(previewGrid);
        grid.appendChild(boardDiv);
      }
    }
    
    function loadExampleBatch() {
      document.getElementById('batch-json-input').value = JSON.stringify([
        "A cat wearing astronaut helmet floating in space with Earth in background",
        "A cozy coffee shop interior with warm lighting and plants",
        {
          "text": "A red sneaker on a beach at sunset with waves in the background",
          "references": [
            {
              "path": "sneaker.png",
              "type": "subject",
              "subjectType": "product",
              "description": "Red Nike sneaker with white sole"
            }
          ]
        },
        "A serene Japanese garden with cherry blossoms and a koi pond",
        "An ancient library with magical floating books and glowing runes"
      ], null, 2);
      validateBatchJson();
      calculateBatchPreview();
    }
    
    function validateBatchJson() {
      const input = document.getElementById('batch-json-input').value.trim();
      const status = document.getElementById('batch-json-status');
      const countDisplay = document.getElementById('batch-prompt-count-display');
      
      if (!input) {
        status.textContent = '';
        countDisplay.textContent = '';
        return null;
      }
      
      try {
        const data = JSON.parse(input);
        if (!Array.isArray(data)) {
          status.textContent = '❌ Must be an array';
          status.className = 'text-sm text-rbig-error';
          countDisplay.textContent = '';
          return null;
        }
        
        // Normalize to array of prompts
        const prompts = data.map(item => {
          if (typeof item === 'string') return item;
          if (item.text) return item.text;
          return null;
        }).filter(p => p && p.trim().length > 0);
        
        status.textContent = '✅ Valid JSON';
        status.className = 'text-sm text-rbig-success';
        countDisplay.textContent = prompts.length > 0 ? `${prompts.length} prompt${prompts.length !== 1 ? 's' : ''}` : '';
        return data;
      } catch (e) {
        status.textContent = '❌ Invalid JSON: ' + e.message;
        status.className = 'text-sm text-rbig-error';
        countDisplay.textContent = '';
        return null;
      }
    }
    
    async function startBatchGeneration() {
      const data = validateBatchJson();
      if (!data || data.length === 0) {
        alert('Please enter valid prompts JSON');
        return;
      }
      
      if (!state.batch.selectedModel) {
        alert('Please select a model');
        return;
      }
      
      // Send full prompt objects (including references) - backend handles both formats
      const prompts = data.filter(item => {
        if (typeof item === 'string') return item.trim().length > 0;
        if (item && item.text) return item.text.trim().length > 0;
        return false;
      });
      const concurrency = parseInt(document.getElementById('batch-concurrency').value) || 3;
      const outputDir = document.getElementById('batch-output-dir').value.trim() || undefined;
      
      document.getElementById('btn-start-batch').disabled = true;
      
      try {
        const r = await fetch('/api/batch/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: state.batch.selectedModel,
            prompts,
            concurrency,
            outputDir,
            aspectRatio: state.batch.aspectRatio
          })
        });
        
        if (r.ok) {
          const resp = await r.json();
          state.batch.jobId = resp.jobId;
          showBatchProgress();
          pollBatchStatus();
        } else {
          const err = await r.json();
          alert(err.error || 'Failed to start batch');
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
      
      document.getElementById('btn-start-batch').disabled = false;
    }
    
    function showBatchProgress() {
      document.getElementById('batch-progress-section').classList.remove('hidden');
      document.getElementById('batch-results-section').classList.add('hidden');
    }
    
    async function pollBatchStatus() {
      const poll = async () => {
        try {
          const data = await (await fetch('/api/batch/status')).json();
          
          if (data.progress) {
            const p = data.progress;
            document.getElementById('batch-progress-text').textContent = p.completed + '/' + p.total;
            document.getElementById('batch-progress-bar').style.width = Math.round((p.completed / p.total) * 100) + '%';
            document.getElementById('batch-success-count').textContent = p.successCount;
            document.getElementById('batch-failure-count').textContent = p.failureCount;
            document.getElementById('batch-current-prompt').textContent = p.currentPrompt ? '📝 ' + p.currentPrompt : '';
          }
          
          if (data.isRunning) {
            document.getElementById('batch-progress-status').textContent = 'Running...';
            setTimeout(poll, 1000);
          } else {
            // Batch complete - load results
            document.getElementById('batch-progress-status').textContent = 'Complete!';
            await loadBatchResults();
          }
        } catch (e) {
          console.error('Batch poll error:', e);
          setTimeout(poll, 3000);
        }
      };
      poll();
    }
    
    async function loadBatchResults() {
      try {
        const data = await (await fetch('/api/batch/result')).json();
        
        if (data.error) {
          document.getElementById('batch-result-summary').textContent = 'No results available';
          return;
        }
        
        document.getElementById('batch-progress-section').classList.add('hidden');
        document.getElementById('batch-results-section').classList.remove('hidden');
        
        const secs = (data.totalDurationMs / 1000).toFixed(1);
        document.getElementById('batch-result-summary').textContent = 
          data.successCount + ' images generated in ' + secs + 's • ' +
          (data.failureCount > 0 ? data.failureCount + ' failed' : 'No failures');
        
        // Render results list
        const list = document.getElementById('batch-results-list');
        list.innerHTML = data.results.map(r => {
          const icon = r.success ? '✅' : '❌';
          const cls = r.success ? 'border-rbig-success/30' : 'border-rbig-error/30';
          return '<div class="p-3 rounded-lg border ' + cls + ' bg-rbig-dark/50">' +
            '<div class="flex items-center gap-3">' +
            '<span>' + icon + '</span>' +
            '<span class="text-sm text-gray-300 flex-1 truncate">' + escapeHtml(r.prompt) + '</span>' +
            '<span class="text-xs font-mono text-gray-500">' + formatDuration(r.durationMs) + '</span>' +
            '</div>' +
            (r.error ? '<p class="text-xs text-rbig-error mt-2 pl-7">' + escapeHtml(r.error) + '</p>' : '') +
            '</div>';
        }).join('');
      } catch (e) {
        console.error('Failed to load batch results:', e);
      }
    }
    
    function resetBatchUI() {
      document.getElementById('batch-progress-section').classList.add('hidden');
      document.getElementById('batch-results-section').classList.add('hidden');
      document.getElementById('batch-json-input').value = '';
      document.getElementById('batch-json-status').textContent = '';
      document.getElementById('batch-prompt-count-display').textContent = '';
      document.getElementById('batch-progress-bar').style.width = '0%';
      document.getElementById('batch-progress-text').textContent = '0/0';
      calculateBatchPreview();
    }
    
    function toggleReferenceGuide() {
      const guide = document.getElementById('reference-guide');
      const toggleBtn = document.getElementById('reference-guide-toggle');
      const isHidden = guide.classList.toggle('hidden');
      toggleBtn.textContent = isHidden ? 'Show' : 'Hide';
    }
    
    // === BENCHMARK ===
    async function loadBenchmarkModels() {
      try {
        const data = await (await fetch('/api/benchmark/models')).json();
        state.benchmark.models = data.models;
        renderModelGrid();
      } catch (e) { console.error(e); }
    }
    
    function renderModelGrid() {
      el.modelGrid.innerHTML = state.benchmark.models.map(m => {
        const sel = state.benchmark.selectedModels.includes(m.key);
        const icon = m.provider === 'vertex' ? '🔵' : m.provider === 'gemini' ? '🟣' : '🟢';
        const avail = m.available;
        return '<div class="model-card p-4 rounded-xl border border-rbig-border cursor-pointer '+(sel?'selected':'')+' '+(avail?'':'opacity-50 cursor-not-allowed')+'" onclick="'+(avail?'toggleModel(\\''+m.key+'\\')':'')+'"><div class="flex items-center justify-between mb-2"><span class="font-semibold text-gray-200">'+icon+' '+m.name+'</span>'+(sel?'<span class="text-rbig-accent">✓</span>':'')+'</div><p class="text-xs text-gray-500">'+m.description+'</p>'+(avail?'':'<p class="text-xs text-rbig-error mt-1">Not configured</p>')+'</div>';
      }).join('');
    }
    
    function toggleModel(id) {
      const idx = state.benchmark.selectedModels.indexOf(id);
      if (idx >= 0) state.benchmark.selectedModels.splice(idx, 1);
      else state.benchmark.selectedModels.push(id);
      renderModelGrid();
      updateBenchmarkEstimates();
    }
    
    function updatePromptCount() {
      state.benchmark.promptCount = parseInt(el.promptSlider.value);
      el.promptSliderValue.textContent = state.benchmark.promptCount;
      updateBenchmarkEstimates();
    }
    
    function updateBenchmarkEstimates() {
      const models = state.benchmark.selectedModels.length || 1;
      const prompts = state.benchmark.promptCount;
      const total = models * prompts;
      const mins = Math.ceil((total * 15) / 60); // ~15s per image
      el.estimatedTime.textContent = '~' + mins + ' min';
      el.totalImages.textContent = total;
    }
    
    function selectBenchmarkAspectRatio(ratio) {
      state.benchmark.aspectRatio = ratio;
      document.querySelectorAll('.bench-ar-btn').forEach(btn => {
        const isSelected = btn.id === 'bench-ar-' + ratio.replace(':', '-');
        btn.className = 'bench-ar-btn px-3 py-2 rounded-lg border text-sm ' + 
          (isSelected ? 'border-rbig-accent bg-rbig-accent/10 text-rbig-accent' : 'border-rbig-border text-gray-400');
      });
    }
    
    async function startBenchmark() {
      if (state.benchmark.selectedModels.length === 0) { alert('Select at least one model'); return; }
      document.getElementById('btn-start-benchmark').disabled = true;
      try {
        const r = await fetch('/api/benchmark/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ models: state.benchmark.selectedModels, promptCount: state.benchmark.promptCount, aspectRatio: state.benchmark.aspectRatio }) });
        if (r.ok) {
          state.benchmark.isRunning = true;
          el.benchmarkSetup.classList.add('hidden');
          el.benchmarkProgress.classList.remove('hidden');
          pollBenchmarkStatus();
        } else { alert((await r.json()).error); }
      } catch (e) { alert(e.message); }
      document.getElementById('btn-start-benchmark').disabled = false;
    }
    
    async function pollBenchmarkStatus() {
      const poll = async () => {
        try {
          const data = await (await fetch('/api/benchmark/status')).json();
          if (data.isRunning) {
            if (data.progress) {
              document.getElementById('bench-model').textContent = data.progress.currentModel;
              const done = (data.progress.modelsCompleted * data.progress.totalPrompts) + data.progress.currentPrompt;
              const total = data.progress.totalModels * data.progress.totalPrompts;
              document.getElementById('bench-progress-text').textContent = done + '/' + total;
              document.getElementById('bench-progress-bar').style.width = Math.round((done/total)*100) + '%';
            }
            setTimeout(poll, 2000);
          } else if (data.currentRunId) {
            await loadBenchmarkResults(data.currentRunId);
          }
        } catch (e) { setTimeout(poll, 3000); }
      };
      poll();
    }
    
    async function loadBenchmarkResults(runId) {
      try {
        const report = await (await fetch('/api/benchmark/runs/' + runId)).json();
        if (report.error) { alert('Benchmark not found: ' + runId); return; }
        state.benchmark.results = report;
        renderBenchmarkResults(report, runId);
        el.benchmarkSetup.classList.add('hidden');
        el.benchmarkProgress.classList.add('hidden');
        el.benchmarkResults.classList.remove('hidden');
        loadPreviousRuns();
      } catch (e) { console.error('Failed to load benchmark:', e); alert('Failed to load benchmark results'); }
    }
    
    function renderBenchmarkResults(report, runId) {
      state.benchmark.currentRunId = runId;
      el.resultSummary.textContent = report.models.length + ' models compared • ' + report.config.promptCount + ' prompts • ' + formatDuration(report.totalDurationMs);
      
      el.resultCards.innerHTML = report.models.map(m => {
        const icon = m.modelId.includes('dall-e') ? '🟢' : '🔵';
        return '<div class="bg-rbig-card border border-rbig-border rounded-xl p-5"><div class="flex items-center gap-2 mb-3"><span>'+icon+'</span><span class="font-semibold text-gray-200">'+m.modelName+'</span></div><div class="space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-500">Success</span><span class="text-rbig-success font-mono">'+m.successRate+'%</span></div><div class="flex justify-between"><span class="text-gray-500">Avg Time</span><span class="text-gray-300 font-mono">'+formatDuration(m.timing.mean)+'</span></div><div class="flex justify-between"><span class="text-gray-500">P95</span><span class="text-gray-300 font-mono">'+formatDuration(m.timing.p95)+'</span></div></div></div>';
      }).join('');
      
      // Side-by-side comparison
      const prompts = report.config.promptCount;
      let html = '';
      for (let i = 0; i < prompts; i++) {
        const prompt = report.models[0]?.results[i]?.prompt || '';
        html += '<div class="bg-rbig-dark/50 rounded-xl p-4 border border-rbig-border/50"><p class="text-xs text-gray-500 mb-3">Prompt #'+(i+1)+': <span class="text-gray-400">'+escapeHtml(prompt.slice(0,100))+(prompt.length>100?'...':'')+'</span></p><div class="grid grid-cols-'+Math.min(report.models.length, 4)+' gap-4">';
        report.models.forEach(m => {
          const r = m.results[i];
          const icon = m.modelId.includes('dall-e') ? '🟢' : '🔵';
          if (r?.imageUrl) {
            html += '<div class="space-y-2"><div class="relative aspect-square rounded-lg overflow-hidden border border-rbig-border"><img src="'+r.imageUrl+'" class="w-full h-full object-cover" loading="lazy"><div class="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">'+icon+' '+m.modelName+'</div></div><p class="text-xs text-gray-500 text-center font-mono">'+formatDuration(r.durationMs)+'</p></div>';
          } else {
            html += '<div class="aspect-square rounded-lg bg-rbig-card border border-rbig-border flex items-center justify-center text-rbig-error text-sm">❌ Failed</div>';
          }
        });
        html += '</div></div>';
      }
      el.comparisonGallery.innerHTML = html;
    }
    
    function formatDuration(ms) { return ms < 1000 ? ms + 'ms' : (ms/1000).toFixed(1) + 's'; }
    
    function viewFullReport() { if (state.benchmark.currentRunId) window.open('/benchmark/' + state.benchmark.currentRunId + '/report.html', '_blank'); }
    
    function showBenchmarkSetup() {
      el.benchmarkResults.classList.add('hidden');
      el.benchmarkSetup.classList.remove('hidden');
      state.benchmark.selectedModels = [];
      renderModelGrid();
    }
    
    async function loadPreviousRuns() {
      try {
        const data = await (await fetch('/api/benchmark/runs')).json();
        state.benchmark.previousRuns = data.runs;
        if (data.runs.length) {
          el.previousRuns.innerHTML = '';
          data.runs.slice(0,5).forEach(r => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 bg-rbig-dark/50 rounded-lg border border-rbig-border/50 hover:border-rbig-border cursor-pointer';
            div.innerHTML = '<div><span class="font-mono text-sm text-gray-300">'+r.runId+'</span><span class="text-xs text-gray-500 ml-3">'+new Date(r.timestamp).toLocaleString()+'</span></div><span class="text-rbig-accent text-sm">View →</span>';
            div.onclick = () => loadBenchmarkResults(r.runId);
            el.previousRuns.appendChild(div);
          });
        } else {
          el.previousRuns.innerHTML = '<p class="text-gray-500 text-sm">No previous runs</p>';
        }
      } catch (e) { el.previousRuns.innerHTML = '<p class="text-gray-500 text-sm">Failed to load</p>'; }
    }
    
    // === SSE ===
    function connect() {
      const es = new EventSource('/events');
      es.addEventListener('open', () => { el.statusDot.className = 'w-2 h-2 rounded-full bg-rbig-success'; el.statusText.textContent = 'Connected'; el.statusText.className = 'text-sm text-rbig-success'; });
      es.addEventListener('INIT', e => { const { jobs, stats } = JSON.parse(e.data); state.jobs = jobs; state.stats = stats; renderGallery(); });
      es.addEventListener('STATUS_UPDATE', e => { const { jobId, status, error } = JSON.parse(e.data); const j = state.jobs.find(x => x.id === jobId); if (j) { j.status = status; if (error) j.errorLog = error; recalcStats(); renderGallery(); } if (status === 'PROCESSING' && state.currentTab === 'config') showTab('gallery'); });
      es.addEventListener('IMAGE_READY', e => { const { jobId, imageUrl } = JSON.parse(e.data); const j = state.jobs.find(x => x.id === jobId); if (j) { j.outputPath = imageUrl; j.status = 'DONE'; recalcStats(); renderGallery(); } });
      es.addEventListener('BATCH_COMPLETE', e => { state.stats = JSON.parse(e.data).stats; state.config.batchState.isRunning = false; renderGallery(); updateBatchButtons(); });
      es.addEventListener('error', () => { el.statusDot.className = 'w-2 h-2 rounded-full bg-rbig-error'; el.statusText.textContent = 'Disconnected'; el.statusText.className = 'text-sm text-rbig-error'; es.close(); setTimeout(connect, 3000); });
    }
    
    function recalcStats() { state.stats = { pending: state.jobs.filter(j => j.status === 'PENDING').length, processing: state.jobs.filter(j => j.status === 'PROCESSING').length, done: state.jobs.filter(j => j.status === 'DONE').length, failed: state.jobs.filter(j => j.status === 'FAILED').length, total: state.jobs.length }; }
    
    // Track broken images to show warning
    const brokenImages = new Set();
    
    function handleImageError(img, jobId) {
      brokenImages.add(jobId);
      img.parentElement.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-rbig-card"><span class="text-3xl mb-2">🖼️</span><p class="text-xs text-rbig-warning">Missing</p><p class="text-xs text-gray-500 font-mono">#'+jobId+'</p></div>';
      // Show warning banner if not already shown
      if (!document.getElementById('missing-images-banner')) {
        const banner = document.createElement('div');
        banner.id = 'missing-images-banner';
        banner.className = 'bg-rbig-warning/20 border border-rbig-warning/40 rounded-xl p-4 mb-4 flex items-center justify-between';
        banner.innerHTML = '<div class="flex items-center gap-3"><span class="text-xl">⚠️</span><div><p class="text-sm text-rbig-warning font-medium">Missing Images Detected</p><p class="text-xs text-gray-400">Some images are marked as done but files are missing. Click "Reset All" to regenerate them.</p></div></div><button onclick="resetJobs()" class="px-4 py-2 bg-rbig-warning text-black text-sm font-medium rounded-lg">Reset All</button>';
        el.gallery.parentElement.insertBefore(banner, el.gallery);
      }
    }
    
    function renderGallery() {
      el.statPending.textContent = state.stats.pending; el.statProcessing.textContent = state.stats.processing;
      el.statDone.textContent = state.stats.done; el.statFailed.textContent = state.stats.failed;
      const t = state.stats.total || 1; const c = state.stats.done + state.stats.failed;
      el.progressBar.style.width = Math.round((c/t)*100) + '%'; el.progressText.textContent = c + '/' + t;
      const jobs = [...state.jobs].sort((a,b) => a.id - b.id);
      el.gallery.innerHTML = jobs.map(j => {
        if (j.status === 'DONE' && j.outputPath) {
          const url = '/output/' + j.outputPath.split('/').pop();
          return '<div class="image-card group relative aspect-square rounded-xl overflow-hidden border border-rbig-border bg-rbig-card"><img src="'+url+'" class="w-full h-full object-cover" loading="lazy" onerror="handleImageError(this, '+j.id+')"><div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity"><div class="absolute bottom-0 left-0 right-0 p-3"><p class="text-xs font-mono text-white/80">#'+j.id+'</p></div></div></div>';
        }
        const isP = j.status === 'PROCESSING';
        const cls = { PENDING: 'bg-gray-800', PROCESSING: 'bg-rbig-accent/20 processing', DONE: 'bg-rbig-success/20', FAILED: 'bg-rbig-error/20' }[j.status] || 'bg-gray-800';
        const txt = { PENDING: 'text-gray-500', PROCESSING: 'text-rbig-accent', DONE: 'text-rbig-success', FAILED: 'text-rbig-error' }[j.status] || 'text-gray-500';
        const label = { PENDING: 'Waiting', PROCESSING: 'Generating...', DONE: 'Done', FAILED: 'Failed' }[j.status] || j.status;
        return '<div class="aspect-square rounded-xl border border-rbig-border bg-rbig-card flex flex-col items-center justify-center p-4"><div class="w-10 h-10 rounded-full '+cls+' flex items-center justify-center mb-3"></div><p class="text-xs font-mono text-gray-500 mb-1">#'+j.id+'</p><p class="text-xs '+txt+'">'+label+'</p></div>';
      }).join('');
      el.emptyState.classList.toggle('hidden', jobs.length > 0);
    }
    
    // === INIT ===
    loadConfig();
    connect();
    updateBenchmarkEstimates();
  </script>
</body>
</html>`;
