/**
 * Benchmark Report Generator
 *
 * Generates an HTML report with side-by-side comparison of benchmark results.
 *
 * @module benchmark/report-generator
 */

import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { BenchmarkReport } from "../types/index.js";
import { createChildLogger, defaultLogger } from "../config/logger.js";

const logger = createChildLogger(defaultLogger, {
  component: "ReportGenerator",
});

/**
 * Generate an HTML report from benchmark results.
 */
export async function generateHtmlReport(
  report: BenchmarkReport,
  outputDir: string
): Promise<string> {
  const reportPath = join(outputDir, "report.html");
  const html = buildHtml(report, outputDir);
  await writeFile(reportPath, html, "utf-8");
  logger.info({ path: reportPath }, "Generated HTML report");
  return reportPath;
}

/**
 * Build the complete HTML document.
 */
function buildHtml(report: BenchmarkReport, outputDir: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RBIG Benchmark Report - ${report.runId}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b0;
      --accent-cyan: #00d4ff;
      --accent-magenta: #ff00aa;
      --accent-green: #00ff88;
      --accent-yellow: #ffcc00;
      --border-color: #2a2a3a;
      --gradient-1: linear-gradient(135deg, #00d4ff 0%, #ff00aa 100%);
      --gradient-2: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: var(--bg-secondary);
      border-radius: 16px;
      border: 1px solid var(--border-color);
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .run-id {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .meta {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
    }

    .meta-value {
      color: var(--accent-cyan);
      font-weight: 600;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .model-card {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      position: relative;
      overflow: hidden;
    }

    .model-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-1);
    }

    .model-card:nth-child(2)::before {
      background: var(--gradient-2);
    }

    .model-name {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .model-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: var(--text-secondary);
    }

    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    .stat-value.success {
      color: var(--accent-green);
    }

    .stat-value.warning {
      color: var(--accent-yellow);
    }

    .stat-value.error {
      color: var(--accent-magenta);
    }

    /* Timing Comparison */
    .timing-section {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 2rem;
      border: 1px solid var(--border-color);
      margin-bottom: 3rem;
    }

    .timing-section h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: var(--accent-cyan);
    }

    .timing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .timing-cell {
      text-align: center;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: 8px;
    }

    .timing-metric {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .timing-values {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .timing-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .timing-value.model-1 {
      color: var(--accent-cyan);
    }

    .timing-value.model-2 {
      color: var(--accent-green);
    }

    /* Gallery */
    .gallery-section {
      margin-bottom: 3rem;
    }

    .gallery-section h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: var(--accent-cyan);
    }

    .comparison-grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .comparison-row {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
    }

    .prompt-header {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .prompt-text {
      color: var(--text-primary);
      margin-top: 0.5rem;
      font-style: italic;
    }

    .images-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .image-cell {
      position: relative;
    }

    .image-cell img {
      width: 100%;
      border-radius: 8px;
      display: block;
    }

    .image-label {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .image-label.model-1 {
      color: var(--accent-cyan);
    }

    .image-label.model-2 {
      color: var(--accent-green);
    }

    .image-meta {
      margin-top: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .image-error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      color: var(--accent-magenta);
      font-size: 0.9rem;
      text-align: center;
      padding: 1rem;
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    footer a {
      color: var(--accent-cyan);
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      h1 {
        font-size: 1.75rem;
      }

      .meta {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${buildHeader(report)}
    ${buildStatsGrid(report)}
    ${buildTimingSection(report)}
    ${buildGallery(report, outputDir)}
    ${buildFooter()}
  </div>
</body>
</html>`;
}

function buildHeader(report: BenchmarkReport): string {
  const duration = formatDuration(report.totalDurationMs);
  const startDate = new Date(report.startedAt).toLocaleString();

  return `
    <header>
      <h1>⚡ Benchmark Report</h1>
      <div class="run-id">Run ID: ${report.runId}</div>
      <div class="meta">
        <div class="meta-item">
          <span>📊</span>
          <span class="meta-value">${report.config.promptCount}</span> prompts
        </div>
        <div class="meta-item">
          <span>🤖</span>
          <span class="meta-value">${report.config.models.length}</span> models
        </div>
        <div class="meta-item">
          <span>⏱️</span>
          <span class="meta-value">${duration}</span> total
        </div>
        <div class="meta-item">
          <span>📅</span>
          <span class="meta-value">${startDate}</span>
        </div>
      </div>
    </header>`;
}

function buildStatsGrid(report: BenchmarkReport): string {
  const cards = report.models
    .map(
      (model) => `
      <div class="model-card">
        <div class="model-name">${model.modelName}</div>
        <div class="model-id">${model.modelId}</div>
        
        <div class="stat-row">
          <span class="stat-label">Success Rate</span>
          <span class="stat-value ${
            model.successRate >= 90
              ? "success"
              : model.successRate >= 70
              ? "warning"
              : "error"
          }">${model.successRate}%</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">Generated</span>
          <span class="stat-value">${model.successCount} / ${
        model.totalPrompts
      }</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">Avg Time</span>
          <span class="stat-value">${formatDuration(model.timing.mean)}</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">P95 Time</span>
          <span class="stat-value">${formatDuration(model.timing.p95)}</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">Total Time</span>
          <span class="stat-value">${formatDuration(model.timing.total)}</span>
        </div>
      </div>`
    )
    .join("");

  return `<div class="stats-grid">${cards}</div>`;
}

function buildTimingSection(report: BenchmarkReport): string {
  if (report.models.length < 2) {
    return "";
  }

  const metrics = ["min", "max", "mean", "p50", "p95", "p99"] as const;

  const cells = metrics
    .map((metric) => {
      const values = report.models
        .map(
          (model, i) => `
          <div class="timing-value model-${i + 1}">${formatDuration(
            model.timing[metric]
          )}</div>`
        )
        .join("");

      return `
        <div class="timing-cell">
          <div class="timing-metric">${metric.toUpperCase()}</div>
          <div class="timing-values">${values}</div>
        </div>`;
    })
    .join("");

  const legend = report.models
    .map(
      (model, i) =>
        `<span style="color: var(--accent-${i === 0 ? "cyan" : "green"})">${
          model.modelName
        }</span>`
    )
    .join(" vs ");

  return `
    <div class="timing-section">
      <h2>⏱️ Timing Comparison (${legend})</h2>
      <div class="timing-grid">${cells}</div>
    </div>`;
}

function buildGallery(report: BenchmarkReport, outputDir: string): string {
  if (report.models.length === 0) {
    return "";
  }

  const promptCount = report.config.promptCount;
  const rows: string[] = [];

  for (let i = 0; i < promptCount; i++) {
    const prompt = report.models[0]?.results[i]?.prompt ?? "";

    const images = report.models
      .map((model, modelIdx) => {
        const result = model.results[i];
        if (!result) {
          return `<div class="image-cell"><div class="image-error">No result</div></div>`;
        }

        if (!result.success) {
          return `
            <div class="image-cell">
              <div class="image-error">
                <span class="image-label model-${modelIdx + 1}">${
            model.modelName
          }</span>
                ❌ ${result.error ?? "Generation failed"}
              </div>
            </div>`;
        }

        // Get relative path from report to image
        const imagePath = result.outputPath
          ? relative(outputDir, result.outputPath)
          : "";

        return `
          <div class="image-cell">
            <span class="image-label model-${modelIdx + 1}">${
          model.modelName
        }</span>
            <img src="${imagePath}" alt="${model.modelName} - Prompt ${
          i + 1
        }" loading="lazy">
            <div class="image-meta">${formatDuration(result.durationMs)}</div>
          </div>`;
      })
      .join("");

    rows.push(`
      <div class="comparison-row">
        <div class="prompt-header">
          Prompt #${i + 1}
          <div class="prompt-text">"${escapeHtml(prompt.slice(0, 200))}${
      prompt.length > 200 ? "..." : ""
    }"</div>
        </div>
        <div class="images-row">${images}</div>
      </div>`);
  }

  return `
    <div class="gallery-section">
      <h2>🖼️ Side-by-Side Comparison</h2>
      <div class="comparison-grid">${rows.join("")}</div>
    </div>`;
}

function buildFooter(): string {
  return `
    <footer>
      Generated by <a href="#">RBIG</a> (Resilient Batch Image Generator)
    </footer>`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
