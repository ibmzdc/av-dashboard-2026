#!/usr/bin/env node
/**
 * patch-dashboard.mjs
 *
 * Run this after every AV Dashboard regeneration.
 * It takes the freshly generated HTML from Generated-Outputs/ and patches in
 * all GitHub-specific additions that must survive regeneration:
 *   1. CSS — badge-redownload, pulse-orange, Always-On panel styles
 *   2. HTML — Always-On Assets panel (pinned above summary bar)
 *   3. Script — AV_FILES_URL, deckHTML(), injectDeckLinks() with always_on support
 *
 * Output: GitHub/av-dashboard-2026/index.html (ready to push)
 *
 * Usage:
 *   node patch-dashboard.mjs <path-to-generated-html>
 * Example:
 *   node patch-dashboard.mjs "../Generated-Outputs/ZDC_AV_Dashboard_20261002_091155.html"
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '../..');

// ── Resolve input file ────────────────────────────────────────────────────────
let inputPath = process.argv[2];
if (!inputPath) {
  // Auto-detect latest AV Dashboard in Generated-Outputs/
  const outDir = resolve(ROOT, 'Generated-Outputs');
  const files = readdirSync(outDir)
    .filter(f => f.startsWith('ZDC_AV_Dashboard_') && f.endsWith('.html'))
    .sort()
    .reverse();
  if (!files.length) {
    console.error('❌  No ZDC_AV_Dashboard_*.html found in Generated-Outputs/');
    process.exit(1);
  }
  inputPath = resolve(outDir, files[0]);
  console.log(`ℹ  Auto-detected: ${files[0]}`);
}

const outputPath = resolve(__dir, 'index.html');
let html = readFileSync(inputPath, 'utf8');

// ── 1. CSS patch ─────────────────────────────────────────────────────────────
const CSS_MARKER = '  /* DECK STATUS BAR */';
const CSS_INSERT = `
  /* RE-DOWNLOAD BADGE */
  .badge-redownload { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #fff7ed; color: #c2410c; border: 1px solid #f97316; white-space: nowrap; animation: pulse-orange 1.4s ease-in-out infinite; }
  @keyframes pulse-orange { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

  /* DECK BTNS */
  .deck-btns { display: flex; flex-direction: column; align-items: center; gap: 4px; }

  /* ALWAYS-ON PANEL */
  .always-on-panel { background: #fff; border: 2px solid #1e2761; border-radius: 6px; margin: 18px 28px 4px; overflow: hidden; }
  .always-on-header { background: #1e2761; color: #fff; padding: 7px 14px; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px; }
  .always-on-header span { font-size: 15px; }
  .always-on-row { display: flex; align-items: center; gap: 14px; padding: 11px 16px; border-top: 1px solid #e8eaf0; }
  .always-on-row:first-of-type { border-top: none; }
  .always-on-info { flex: 1; }
  .always-on-title { font-size: 13px; font-weight: 700; color: #1a1a2e; }
  .always-on-desc { font-size: 11px; color: #666; margin-top: 2px; }
  .always-on-btn { flex-shrink: 0; min-width: 110px; text-align: center; }

`;

if (!html.includes('.always-on-panel')) {
  html = html.replace(CSS_MARKER, CSS_INSERT + CSS_MARKER);
  console.log('✅  CSS patch applied');
} else {
  console.log('⏭  CSS already present — skipped');
}

// ── 2. HTML patch — Always-On panel ──────────────────────────────────────────
const HTML_MARKER = '<div class="summary-bar">';
const HTML_INSERT = `
<div id="deck-status" class="loading">Loading presentation decks from Box\u2026</div>

<!-- \u26a1 ALWAYS-ON ASSETS (pinned, not affected by filters) -->
<div class="always-on-panel">
  <div class="always-on-header"><span>\u26a1</span> Always-On Assets</div>
  <div class="always-on-row" id="ao-Holding Slide">
    <div class="always-on-info">
      <div class="always-on-title">Holding Slide</div>
      <div class="always-on-desc">Shown before event start and during all breaks</div>
    </div>
    <div class="always-on-btn"><span class="deck-pending">Pending</span></div>
  </div>
  <div class="always-on-row" id="ao-Opening Video">
    <div class="always-on-info">
      <div class="always-on-title">Opening Video</div>
      <div class="always-on-desc">Played at event start</div>
    </div>
    <div class="always-on-btn"><span class="deck-pending">Pending</span></div>
  </div>
</div>

`;

if (!html.includes('always-on-panel')) {
  // Remove any existing bare deck-status div (regenerator may have written one)
  html = html.replace(/<div id="deck-status"[^>]*>[^<]*<\/div>\s*/g, '');
  html = html.replace(HTML_MARKER, HTML_INSERT + HTML_MARKER);
  console.log('✅  Always-On HTML panel injected');
} else {
  console.log('⏭  Always-On HTML already present — skipped');
}

// ── 3. Script patch — replace existing <script> block ────────────────────────
const SCRIPT_OPEN  = '<script>';
const SCRIPT_CLOSE = '</script>';

const GITHUB_SCRIPT = `<script>
// \u2500\u2500\u2500 Live deck links from GitHub (av-files.json) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Repo:      https://github.com/ibmzdc/av-dashboard-2026
// Dashboard: https://ibmzdc.github.io/av-dashboard-2026/
// To update a deck link: edit av-files.json \u2192 commit & push \u2192 live within ~30s
var AV_FILES_URL = 'https://raw.githubusercontent.com/ibmzdc/av-dashboard-2026/main/av-files.json';

function deckHTML(entry) {
  if (entry && entry.url && entry.url.trim() !== '') {
    var html = '<div class="deck-btns"><a class="btn-deck" href="' + entry.url + '" target="_blank" rel="noopener">&#8681; Download</a>';
    if (entry.redownload) html += '<span class="badge-redownload">&#8635; Re-download!</span>';
    html += '</div>';
    return html;
  }
  return '<span class="deck-pending">Pending</span>';
}

function injectDeckLinks(sessions, alwaysOn) {
  // Session deck cells
  document.querySelectorAll('td.deck-cell[data-session-key]').forEach(function(cell) {
    var key = cell.getAttribute('data-session-key');
    var tmp = document.createElement('textarea');
    tmp.innerHTML = key;
    var entry = sessions[tmp.value];
    cell.innerHTML = deckHTML(entry);
  });
  // Always-On panel
  var aoAssets = alwaysOn || {};
  Object.keys(aoAssets).forEach(function(key) {
    var row = document.getElementById('ao-' + key);
    if (!row) return;
    var btnDiv = row.querySelector('.always-on-btn');
    if (btnDiv) btnDiv.innerHTML = deckHTML(aoAssets[key]);
  });
}

function setDeckStatus(cls, msg) {
  var bar = document.getElementById('deck-status');
  bar.className = cls;
  bar.textContent = msg;
  if (cls === 'loaded') {
    setTimeout(function() { bar.style.display = 'none'; }, 4000);
  }
}

fetch(AV_FILES_URL)
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(data) {
    injectDeckLinks(data.sessions || {}, data.always_on || {});
    var total = Object.keys(data.sessions || {}).length;
    var ready = Object.values(data.sessions || {}).filter(function(s){ return s.url && s.url.trim(); }).length;
    setDeckStatus('loaded', '\u2713 Deck links loaded \u2014 ' + ready + ' of ' + total + ' decks available');
  })
  .catch(function(err) {
    setDeckStatus('error', '\u26a0 Could not load deck links (' + err.message + ').');
  });

// \u2500\u2500\u2500 FILTERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
`;

// Find the last <script> block (the filter/applyFilters one) and replace from
// its opening tag up to (but not including) the applyFilters function
const scriptStart = html.lastIndexOf(SCRIPT_OPEN);
const scriptEnd   = html.lastIndexOf(SCRIPT_CLOSE);

if (scriptStart !== -1 && scriptEnd !== -1) {
  // Extract the existing filter function body (everything from applyFilters onward)
  const existingScript = html.slice(scriptStart, scriptEnd + SCRIPT_CLOSE.length);
  const filterIdx = existingScript.indexOf('function applyFilters');
  if (filterIdx !== -1) {
    const filterBody = existingScript.slice(filterIdx, existingScript.lastIndexOf(SCRIPT_CLOSE));
    const newScript = GITHUB_SCRIPT + filterBody + '\n' + SCRIPT_CLOSE;
    html = html.slice(0, scriptStart) + newScript + html.slice(scriptEnd + SCRIPT_CLOSE.length);
    console.log('✅  Script block patched (AV_FILES_URL + deckHTML + injectDeckLinks + filters preserved)');
  } else {
    console.warn('⚠  Could not find applyFilters — script block not patched');
  }
} else {
  console.warn('⚠  Could not find <script> block — script not patched');
}

// ── Write output ──────────────────────────────────────────────────────────────
writeFileSync(outputPath, html, 'utf8');
console.log(`\n✅  Patched dashboard written to:\n    ${outputPath}\n`);
console.log('Next step: run push-to-github.sh to deploy.');
