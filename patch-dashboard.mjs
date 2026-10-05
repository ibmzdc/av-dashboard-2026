#!/usr/bin/env node
/**
 * patch-dashboard.mjs
 *
 * Run this after every AV Dashboard regeneration.
 * It takes the freshly generated HTML from Generated-Outputs/ and patches in
 * all GitHub-specific additions that must survive regeneration:
 *   1. CSS — badge-redownload, pulse-orange, audio-cell, badge-xlr, Always-On panel styles
 *   2. HTML — Always-On Assets panel (pinned above summary bar)
 *   3. Table — col-audio column added to all colgroups, theads, and tbody rows
 *   4. Script — AV_FILES_URL, deckHTML(), injectDeckLinks() with audio cell + always_on support
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
  /* PRINT BUTTON + DROPDOWN */
  .print-group { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .btn-print { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: #1e2761; color: #fff; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .btn-print:hover { background: #2d3a8c; }
  .btn-print svg { flex-shrink: 0; }
  #print-scope { font-size: 12px; padding: 5px 10px; border: 1px solid #c8d0e0; border-radius: 4px; background: #f7f8fa; color: #1a1a2e; cursor: pointer; }

  /* PRINT TITLE (hidden on screen, shown when printing) */
  #print-title { display: none; }

`;

const PRINT_MEDIA_MARKER = '  @media print {';
const PRINT_MEDIA_REPLACE = `  @media print {
    body { background: #fff; }
    .controls, .summary-bar, .always-on-panel, #deck-status, footer { display: none !important; }
    #print-title { display: block; font-family: -apple-system, "Segoe UI", system-ui, sans-serif; font-size: 15px; font-weight: 700; color: #1e2761; padding: 10px 0 6px; border-bottom: 2px solid #1e2761; margin-bottom: 14px; }
    .content { padding: 0; }
    .day-section { page-break-inside: avoid; margin-bottom: 18px; }
    .day-section.print-hidden { display: none !important; }
    tr.print-hidden-row { display: none !important; }
    col.col-deck,
    thead th:last-child,
    tbody td:last-child { display: none !important; }
    .badge-redownload { animation: none !important; }
    a.btn-deck { color: #1e2761 !important; text-decoration: none !important; }
  }
`;

const CSS_INSERT_REDOWNLOAD = `
  /* RE-DOWNLOAD BADGE */
  .badge-redownload { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #fff7ed; color: #c2410c; border: 1px solid #f97316; white-space: nowrap; animation: pulse-orange 1.4s ease-in-out infinite; }
  @keyframes pulse-orange { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

  /* AUDIO CELL */
  col.col-audio { width: 90px; }
  .audio-cell { text-align: center; vertical-align: middle !important; }
  .badge-xlr { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; white-space: nowrap; }

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

// Print CSS patch (idempotent — check for the button class, not the @media rule)
if (!html.includes('.btn-print {')) {
  html = html.replace(CSS_MARKER, CSS_INSERT + CSS_MARKER);
  // Also replace the existing bare @media print block with the enhanced one
  html = html.replace(/(\s*@media print \{[\s\S]*?\n  \})/m, '\n' + PRINT_MEDIA_REPLACE);
  console.log('✅  Print CSS patch applied');
} else {
  console.log('⏭  Print CSS already present — skipped');
}

// AV / Always-On CSS patch (idempotent — check for the panel CSS rule itself)
if (!html.includes('.always-on-panel {')) {
  html = html.replace(CSS_MARKER, CSS_INSERT_REDOWNLOAD + CSS_MARKER);
  console.log('✅  AV/Always-On CSS patch applied');
} else {
  console.log('⏭  AV/Always-On CSS already present — skipped');
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

if (!html.includes('ao-Holding Slide')) {
  // Remove any existing bare deck-status div (regenerator may have written one)
  html = html.replace(/<div id="deck-status"[^>]*>[^<]*<\/div>\s*/g, '');
  html = html.replace(HTML_MARKER, HTML_INSERT + HTML_MARKER);
  console.log('✅  Always-On HTML panel injected');
} else {
  console.log('⏭  Always-On HTML already present — skipped');
}

// ── 2b. HTML patch — Print title div + print controls in controls bar ─────────
const PRINT_TITLE_MARKER = '<div class="controls">';
const PRINT_TITLE_INSERT = `<div id="print-title"></div>\n\n`;

const PRINT_CONTROLS_MARKER = '</div>\n</div>\n\n<div id="deck-status"';
const PRINT_CONTROLS_INSERT = `\n  <div class="print-group">
    <select id="print-scope">
      <option value="all">Print: All Sessions</option>
      <optgroup label="── By Day ──">
        <option value="day:Sunday">Sunday, Oct 18</option>
        <option value="day:Monday">Monday, Oct 19</option>
        <option value="day:Tuesday">Tuesday, Oct 20</option>
        <option value="day:Wednesday">Wednesday, Oct 21</option>
        <option value="day:Thursday">Thursday, Oct 22</option>
      </optgroup>
      <optgroup label="── By Room ──">
        <option value="room:Ballroom Foyer">Ballroom Foyer</option>
        <option value="room:Belle Epoque Ballroom">Belle Epoque Ballroom</option>
        <option value="room:Cullinan">Cullinan</option>
        <option value="room:Florentine">Florentine</option>
        <option value="room:Groenplaats 1">Groenplaats 1</option>
        <option value="room:Groenplaats 2">Groenplaats 2</option>
        <option value="room:Groenplaats 3">Groenplaats 3</option>
        <option value="room:Hope">Hope</option>
        <option value="room:Sancy">Sancy</option>
        <option value="room:Teun">Teun</option>
        <option value="room:Tiffany/Shah">Tiffany/Shah</option>
      </optgroup>
    </select>
    <button class="btn-print" onclick="doPrint()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print
    </button>
  </div>
</div>

`;

if (!html.includes('id="print-scope"')) {
  // Insert #print-title div just before the controls bar
  html = html.replace(PRINT_TITLE_MARKER, PRINT_TITLE_INSERT + PRINT_TITLE_MARKER);
  // Close existing </div>\n</div> of projection filter group, then append print controls before deck-status
  html = html.replace(PRINT_CONTROLS_MARKER, PRINT_CONTROLS_INSERT + '<div id="deck-status"');
  console.log('✅  Print controls HTML injected');
} else {
  console.log('⏭  Print controls HTML already present — skipped');
}

// ── 3. Table patch — add Audio column to all colgroups, theads, tbody rows ───
if (!html.includes('<th>Audio</th>')) {
  // Add col-audio before col-deck in all colgroups
  html = html.replace(/<col class="col-timer"><col class="col-monitor"><col class="col-deck">/g,
    '<col class="col-timer"><col class="col-monitor"><col class="col-audio"><col class="col-deck">');
  // Add Audio header before Deck header in all theads
  html = html.replace(/<th>Monitor \/ Display<\/th><th>Deck<\/th>/g,
    '<th>Monitor / Display</th><th>Audio</th><th>Deck</th>');
  // Add audio-cell (keyed) before keyed deck-cell in every AV-tracked row
  html = html.replace(/<td class="deck-cell" data-session-key="([^"]+)">(<span[^>]+>[^<]*<\/span>)<\/td>/g,
    (m, key, inner) => `<td class="audio-cell" data-session-key="${key}"></td>\n        <td class="deck-cell" data-session-key="${key}">${inner}</td>`);
  // Add blank audio-cell before deck-na cells in all other rows
  html = html.replace(/<td class="deck-cell"><span class="deck-na">—<\/span><\/td>/g,
    '<td class="audio-cell"></td>\n        <td class="deck-cell"><span class="deck-na">—</span></td>');
  console.log('✅  Audio column patched into all tables');
} else {
  console.log('⏭  Audio column already present — skipped');
}

// ── 4. Script patch — replace existing <script> block ────────────────────────
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
  // Audio cells — show XLR Feed badge when xlr_feed is true, blank otherwise
  document.querySelectorAll('td.audio-cell[data-session-key]').forEach(function(cell) {
    var key = cell.getAttribute('data-session-key');
    var tmp = document.createElement('textarea');
    tmp.innerHTML = key;
    var entry = sessions[tmp.value];
    cell.innerHTML = (entry && entry.xlr_feed) ? '<span class="badge-xlr">&#127908; XLR Feed</span>' : '';
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

// \u2500\u2500\u2500 PRINT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
var DAY_LABELS = {
  'Sunday':    'Sunday, October 18, 2026',
  'Monday':    'Monday, October 19, 2026',
  'Tuesday':   'Tuesday, October 20, 2026',
  'Wednesday': 'Wednesday, October 21, 2026',
  'Thursday':  'Thursday, October 22, 2026'
};

function doPrint() {
  var scope = document.getElementById('print-scope').value;
  var titleEl = document.getElementById('print-title');
  document.querySelectorAll('.day-section').forEach(function(s) { s.classList.remove('print-hidden'); });
  document.querySelectorAll('tbody tr').forEach(function(r) { r.classList.remove('print-hidden-row'); });
  if (scope === 'all') {
    titleEl.textContent = 'IBM Z Design Council 2026 Fall \u2014 AV Requirements \u2014 All Sessions';
  } else if (scope.indexOf('day:') === 0) {
    var day = scope.slice(4);
    titleEl.textContent = 'IBM Z Design Council 2026 Fall \u2014 AV Requirements \u2014 ' + (DAY_LABELS[day] || day);
    document.querySelectorAll('.day-section').forEach(function(s) {
      if (s.getAttribute('data-day') !== day) s.classList.add('print-hidden');
    });
  } else if (scope.indexOf('room:') === 0) {
    var room = scope.slice(5);
    titleEl.textContent = 'IBM Z Design Council 2026 Fall \u2014 AV Requirements \u2014 ' + room;
    document.querySelectorAll('.day-section').forEach(function(section) {
      var rows = section.querySelectorAll('tbody tr');
      var anyVisible = false;
      rows.forEach(function(row) {
        if (row.getAttribute('data-room') !== room) { row.classList.add('print-hidden-row'); } else { anyVisible = true; }
      });
      if (!anyVisible) section.classList.add('print-hidden');
    });
  }
  window.print();
  setTimeout(function() {
    document.querySelectorAll('.day-section').forEach(function(s) { s.classList.remove('print-hidden'); });
    document.querySelectorAll('tbody tr').forEach(function(r) { r.classList.remove('print-hidden-row'); });
    titleEl.textContent = '';
  }, 1000);
}

// \u2500\u2500\u2500 FILTERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
`;

// Find the last <script> block (the filter/applyFilters one) and replace from
// its opening tag up to (but not including) the applyFilters function
const scriptStart = html.lastIndexOf(SCRIPT_OPEN);
const scriptEnd   = html.lastIndexOf(SCRIPT_CLOSE);

if (scriptStart !== -1 && scriptEnd !== -1) {
  // Extract the existing filter function body (everything from applyFilters onward)
  const existingScript = html.slice(scriptStart, scriptEnd + SCRIPT_CLOSE.length);
  // Prefer preserving doPrint if already present, otherwise start from applyFilters
  const printIdx  = existingScript.indexOf('function doPrint');
  const filterIdx = existingScript.indexOf('function applyFilters');
  const bodyStart = (printIdx !== -1) ? printIdx : filterIdx;
  if (bodyStart !== -1) {
    const filterBody = existingScript.slice(bodyStart, existingScript.lastIndexOf(SCRIPT_CLOSE));
    // Strip old doPrint block if present (the new GITHUB_SCRIPT now contains it)
    const strippedBody = filterBody.replace(/\/\/ ─+ PRINT ─+[\s\S]*?(?=\/\/ ─+ FILTERS|function applyFilters)/, '');
    const newScript = GITHUB_SCRIPT + strippedBody + '\n' + SCRIPT_CLOSE;
    html = html.slice(0, scriptStart) + newScript + html.slice(scriptEnd + SCRIPT_CLOSE.length);
    console.log('✅  Script block patched (AV_FILES_URL + deckHTML + injectDeckLinks + doPrint + filters preserved)');
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
