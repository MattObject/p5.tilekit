/**
 * p5.tilekit — any canvas → any physical size, tiled for print
 * Usage:
 *   const tk = new Tilekit(p, { poster:[36,48], tile:'letter' })
 *   tk.ui()  // shows semi-transparent control bar
 *   // or p.createTilekit(opts).ui()
 * Depends only on p5. jsPDF auto-loaded for PDF export.
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof define === 'function' && define.amd) define([], function(){ return mod; });
  else if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.Tilekit = mod.Tilekit; root.Tilekit.createTilekit = mod.createTilekit; root.Tilekit.PAPER = mod.PAPER; root.Tilekit.Tilekit = mod.Tilekit; }
}(typeof self !== 'undefined' ? self : this, function (root) {

const PAPER = {
  letter: [8.5, 11], legal: [8.5, 14], tabloid: [11, 17], ledger: [17, 11],
  archA: [9, 12], archB: [12, 18], archC: [18, 24], archD: [24, 36], archE: [36, 48],
  a4: [8.27, 11.69], a3: [11.69, 16.54], a2: [16.54, 23.39], a1: [23.39, 33.11], a0: [33.11, 46.81],
  roll36: [36, 48], roll42: [42, 48], roll44: [44, 48],
};
const PAPER_LABELS = {
  letter: 'Letter 8.5×11', legal: 'Legal 8.5×14', tabloid: 'Tabloid 11×17', ledger: 'Ledger 17×11',
  a4: 'A4', a3: 'A3', a2: 'A2', archC: 'Arch C 18×24', archD: 'Arch D 24×36', archE: 'Arch E 36×48',
};
const POSTER_BASE = [
  { w: 36, h: 48, label: 'Arch E' },
  { w: 24, h: 36, label: 'Arch D' },
  { w: 18, h: 24, label: 'Arch C' },
  { w: 16, h: 20, label: '' },
  { w: 11, h: 17, label: 'Tabloid' },
];
const UNITS = { in: 1, inch: 1, inches: 1, mm: 25.4, cm: 2.54, px: null };

function toInches(v, units) {
  if (units === 'px' || UNITS[units] == null) return v;
  return v / UNITS[units];
}
function sizeToInches(size, units) {
  if (!size) return null;
  if (typeof size === 'string' && PAPER[size.toLowerCase()]) {
    const [w, h] = PAPER[size.toLowerCase()];
    return { w, h, units: 'in', name: size };
  }
  if (Array.isArray(size)) return { w: toInches(size[0], units), h: toInches(size[1], units), units: 'in' };
  if (typeof size === 'object' && 'w' in size) {
    const u = size.units || units;
    return { w: toInches(size.w, u), h: toInches(size.h, u), units: 'in' };
  }
  return null;
}
function fmt(n) { return (Math.round(n * 100) / 100).toString(); }

const CSS = `
#tk-bar{position:fixed;top:0;left:0;right:0;z-index:99999;
  display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;
  background:rgba(250,250,248,.88);backdrop-filter:blur(18px) saturate(1.5);
  -webkit-backdrop-filter:blur(18px) saturate(1.5);
  border-bottom:1px solid rgba(0,0,0,.09);
  padding:7px 16px;font:13px/1.2 ui-sans-serif,system-ui,sans-serif;color:#111;
  transform:translateY(0);transition:transform .22s ease, opacity .2s}
#tk-bar.tk-autohide{transform:translateY(calc(-100% + 8px));opacity:.98}
#tk-bar.tk-autohide:hover,#tk-bar.tk-autohide:focus-within,#tk-bar.tk-autohide.tk-open,#tk-bar.tk-autohide.tk-pinned{transform:translateY(0);opacity:1}
#tk-bar.tk-autohide::after{content:"";position:absolute;left:50%;bottom:1px;transform:translateX(-50%);width:28px;height:3px;background:rgba(0,0,0,.2);border-radius:99px;pointer-events:none}
#tk-bar.tk-autohide:hover::after{opacity:0}
#tk-bar *{box-sizing:border-box}
#tk-bar .tk-brand{font-weight:800;letter-spacing:.04em;font-size:13px;display:flex;align-items:center;gap:8px;white-space:nowrap;margin-right:6px}
#tk-bar .tk-brand i{font-style:normal;font-weight:400;color:#888;font-size:11px;letter-spacing:0}
#tk-bar .tk-sep{width:1px;align-self:stretch;background:rgba(0,0,0,.09);margin:0 2px}
#tk-bar .tk-group{display:flex;align-items:center;gap:7px}
#tk-bar label{font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#666;display:flex;flex-direction:column;gap:3px}
#tk-bar input,#tk-bar select{font:13px ui-sans-serif,system-ui;border:1px solid #d0d0d0;border-radius:7px;padding:5px 8px;background:#fff;color:#111;min-width:0}
#tk-bar input{width:72px}
#tk-bar input[type=checkbox]{width:auto}
#tk-bar select{padding-right:18px}
#tk-bar .tk-x{color:#999;font-weight:300;margin:14px 0 0 0}
#tk-bar .tk-actions{margin-left:auto;display:flex;align-items:center;gap:8px}
#tk-bar button{appearance:none;border:1px solid #111;background:#111;color:#fff;border-radius:8px;padding:7px 14px;font-weight:600;cursor:pointer;white-space:nowrap}
#tk-bar button:hover{background:#222}
#tk-bar button.tk-ghost{background:#fff;color:#111;border-color:#cfcfcf}
#tk-bar button.tk-ghost:hover{background:#f2f2f2}
#tk-bar button:disabled{opacity:.45;cursor:wait}
#tk-bar .tk-report{flex-basis:100%;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;background:#111;color:#e8e8e8;border-radius:8px;padding:10px 12px;display:none;margin-top:2px}
#tk-bar.tk-open .tk-report{display:block}
#tk-brand-foot{display:none;flex-basis:100%;font:11px ui-sans-serif,system-ui;color:#888;padding:6px 2px 0}
#tk-bar.tk-open #tk-brand-foot{display:block}
#tk-bar .tk-warn{color:#ffb4b4}
#tk-bar .tk-ok{color:#9be69b}
#tk-bar .tk-foot{flex-basis:100%;display:none;gap:8px;align-items:center;justify-content:space-between;font-size:11px;color:#777;padding-top:2px}
#tk-bar.tk-open .tk-foot{display:flex}
#tk-bar .tk-toggle{border:none;background:transparent;color:#777;padding:4px 6px;font-size:12px;cursor:pointer}
#tk-overlay{position:absolute;left:0;top:0;pointer-events:none;z-index:10}
@media(max-width:760px){#tk-bar .tk-actions{margin-left:0} #tk-bar input{width:62px}}
`;

function injectCSS() {
  if (document.getElementById('tk-style')) return;
  const s = document.createElement('style');
  s.id = 'tk-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function loadJsPDF() {
  const existing = root.jspdf?.jsPDF || root.jsPDF;
  if (existing) return Promise.resolve(existing);
  if (root._tkJsPDFLoading) return root._tkJsPDFLoading;
  root._tkJsPDFLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => res(root.jspdf?.jsPDF || root.jsPDF);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return root._tkJsPDFLoading;
}

class Tilekit {
  constructor(p, opts = {}) {
    this.p = p;
    this.opts = {
      poster: null,
      tile: 'letter',
      units: 'in',
      dpi: 150,
      overlap: 0.5,
      bleed: 0,
      fit: 'cover',
      align: 'center',
      background: 255,
      cropMarks: true,
      pageLabels: true,
      paper: null,
      cols: null, rows: null,
      ...opts
    };
    if (this.opts.paper) this.opts.tile = this.opts.paper;
    this._source = null;
    this._report = null;
    this._posterPx = null;
    this._tilePx = null;
    this._grid = null;
    this._ui = null;
    this._previewOn = false;
    this._vectorFn = opts.vector || opts.draw || null;
    this._autohide = opts.autohide ?? false;
    this._autoPoster = this.opts.poster == null || this.opts.poster === 'auto';
    if (opts.ui || opts.widget || opts.showUI) setTimeout(() => this.ui(), 0);
  }

  set(patch) {
    Object.assign(this.opts, patch);
    if (patch.paper) this.opts.tile = patch.paper;
    if ('poster' in patch) this._autoPoster = patch.poster == null || patch.poster === 'auto';
    if (patch.vector) this._vectorFn = patch.vector;
    if (patch.draw) this._vectorFn = patch.draw;
    if (this._ui) this._syncUIFromReport();
    return this;
  }

  vector(fn) { this._vectorFn = fn; return this; }
  draw(fn) { return this.vector(fn); }
  onRender(fn) { return this.vector(fn); }

  capture(source) {
    const p = this.p;
    if (!source) source = p.canvas || p._curElement?.elt || document.querySelector('canvas');
    this._source = source;
    return this;
  }

  _canvasDims() {
    let w = this.p.width, h = this.p.height;
    if (!w || !h) {
      const c = this.p.canvas || this.p._curElement?.elt || document.querySelector('canvas');
      if (c) { w = c.width || c.clientWidth; h = c.height || c.clientHeight; }
    }
    if (!w || !h) { const s = this._source; if (s) { w = s.width||s.naturalWidth; h = s.height||s.naturalHeight; } }
    return { w: w||0, h: h||0 };
  }
  _posterFromCanvas() {
    const { w, h } = this._canvasDims();
    if (!w || !h) return [36, 48];
    const ar = w / h, LONG = 48;
    if (ar >= 1) return [LONG, +(LONG / ar).toFixed(2)];
    return [+(LONG * ar).toFixed(2), LONG];
  }
  _resolvePoster() {
    if (!this._autoPoster) return this.opts.poster;
    return this._posterFromCanvas();
  }
  analyze(source) {
    if (source) this.capture(source);
    const p = this.p, o = this.opts, dpi = o.dpi;
    const posterRaw = this._resolvePoster();
    const posterIn = sizeToInches(posterRaw, o.units);
    const tileIn = sizeToInches(o.tile, o.units);
    const overlapIn = typeof o.overlap === 'number' ? o.overlap : 0.5;
    const bleedIn = typeof o.bleed === 'number' ? o.bleed : 0;

    let srcW, srcH;
    const s = this._source;
    if (s && s.width && s.height) { srcW = s.width; srcH = s.height; }
    else if (s && s.elt) { srcW = s.elt.width; srcH = s.elt.height; }
    else if (s instanceof HTMLCanvasElement) { srcW = s.width; srcH = s.height; }
    else if (s instanceof HTMLImageElement) { srcW = s.naturalWidth; srcH = s.naturalHeight; }
    else { srcW = p.width; srcH = p.height; }

    const posterWpx = Math.round(posterIn.w * dpi);
    const posterHpx = Math.round(posterIn.h * dpi);
    const tileWpx = Math.round(tileIn.w * dpi);
    const tileHpx = Math.round(tileIn.h * dpi);
    const overlapPx = Math.round(overlapIn * dpi);
    const bleedPx = Math.round(bleedIn * dpi);

    const srcAR = srcW / srcH, posterAR = posterWpx / posterHpx;
    const mismatch = Math.abs(srcAR - posterAR);
    const arPct = (mismatch / Math.max(srcAR, posterAR)) * 100;

    const effW = tileWpx - overlapPx, effH = tileHpx - overlapPx;
    let cols = o.cols || Math.max(1, Math.ceil((posterWpx - overlapPx) / effW));
    let rows = o.rows || Math.max(1, Math.ceil((posterHpx - overlapPx) / effH));
    if (o.cols) cols = o.cols; if (o.rows) rows = o.rows;
    const coveredW = cols * effW + overlapPx, coveredH = rows * effH + overlapPx;

    let scale;
    if (o.fit === 'contain') scale = Math.min(posterWpx / srcW, posterHpx / srcH);
    else if (o.fit === 'cover') scale = Math.max(posterWpx / srcW, posterHpx / srcH);
    else if (o.fit === 'stretch') scale = null;
    else scale = Math.min(posterWpx / srcW, posterHpx / srcH);

    const placedW = o.fit === 'stretch' ? posterWpx : Math.round(srcW * (scale || 1));
    const placedH = o.fit === 'stretch' ? posterHpx : Math.round(srcH * (scale || 1));
    const effectiveDpi = srcW / (placedW / dpi);

    const warnings = [];
    let resolution = 'ok';
    if (arPct > 15 && o.fit === 'stretch') warnings.push(`Stretch ${(arPct).toFixed(1)}% — will distort. Use contain or cover.`);
    if (arPct > 5 && o.fit === 'contain') warnings.push(`Poster ${fmt(posterAR)}:1 vs canvas ${fmt(srcAR)}:1 — ${arPct.toFixed(1)}% mismatch: background shows on ${srcAR > posterAR ? 'top/bottom' : 'left/right'} (contain).`);
    if (arPct > 5 && o.fit === 'cover') warnings.push(`Cover: poster ${fmt(posterAR)}:1 vs canvas ${fmt(srcAR)}:1 — ${arPct.toFixed(1)}% of width/height trimmed to fill.`);
    if (!this._vectorFn) {
      if (effectiveDpi < 120) { warnings.push(`Low DPI ~${Math.round(effectiveDpi)} — will pixelate @ ${dpi} DPI. Enlarge canvas or lower DPI.`); resolution = 'low'; }
      else if (effectiveDpi < 150) { warnings.push(`Marginal DPI ~${Math.round(effectiveDpi)} — soft. Try larger canvas.`); resolution = 'marginal'; }
    }
    const mp = (posterWpx * posterHpx) / 1e6;
    if (mp > 100) warnings.push(`Huge ${posterWpx}×${posterHpx} (${fmt(mp)} MP) may exhaust memory. Use dpi:100.`);
    if (coveredW !== posterWpx || coveredH !== posterHpx) warnings.push(`Tiles add to ${fmt(coveredW / dpi)}×${fmt(coveredH / dpi)} in — ${fmt((coveredW - posterWpx)/dpi)}×${fmt((coveredH - posterHpx)/dpi)} in extra will be trimmed (whole sheets).`);

    this._report = {
      src: { w: srcW, h: srcH, ar: srcAR },
      poster: { wIn: posterIn.w, hIn: posterIn.h, wPx: posterWpx, hPx: posterHpx, ar: posterAR, dpi, megapixels: mp },
      tile: { wIn: tileIn.w, hIn: tileIn.h, wPx: tileWpx, hPx: tileHpx, overlapIn, overlapPx, bleedIn, bleedPx },
      grid: { cols, rows, tiles: cols * rows, effW, effH, coveredW, coveredH },
      fit: { mode: o.fit, scale, placedW, placedH, align: o.align },
      mismatch: { arPct, srcAR, posterAR },
      effectiveDpi, warnings, resolution, _isVector: !!this._vectorFn,
      toString() { return Tilekit.formatReport(this); }
    };
    this._posterPx = { w: posterWpx, h: posterHpx };
    this._tilePx = { w: tileWpx, h: tileHpx };
    this._grid = { cols, rows, effW, effH, overlapPx, bleedPx, w: tileWpx, h: tileHpx };
    return this._report;
  }

  static formatReport(r) {
    const l = [];
    l.push(`Poster ${fmt(r.poster.wIn)}×${fmt(r.poster.hIn)} in @ ${r.poster.dpi} DPI → ${r.poster.wPx}×${r.poster.hPx} px`);
    const shape = r.mismatch.arPct < 2 ? 'same shape as canvas' : `${fmt(r.mismatch.arPct)}% shape mismatch — ${r.fit.mode==='cover' ? 'edges cropped to fill' : 'gaps filled'}`;
    l.push(`Canvas ${r.src.w}×${r.src.h} → ${shape} (${r.fit.mode})`);
    l.push(`Paper ${fmt(r.tile.wIn)}×${r.tile.hIn} + ${fmt(r.tile.overlapIn)} in overlap → ${r.grid.cols}×${r.grid.rows} = ${r.grid.tiles} tiles`);
    if (r._isVector) l.push(`Vectors — always crisp (no DPI limit)`);
    else l.push(`Raster @ ~${Math.round(r.effectiveDpi)} DPI ${r.effectiveDpi<120?'(soft — enlarge canvas)':''}`);
    if (r.warnings.length) l.push('Notes:\n- ' + r.warnings.join('\n- '));
    return l.join('\n');
  }

  _placeMetrics() {
    const r = this._report;
    const placedW = r.fit.placedW, placedH = r.fit.placedH;
    let offX = 0, offY = 0;
    const a = (this.opts.align || 'center').toLowerCase();
    if (a.includes('center')) { offX = (r.poster.wPx - placedW) / 2; offY = (r.poster.hPx - placedH) / 2; }
    else {
      if (a.includes('left')) offX = 0; else if (a.includes('right')) offX = r.poster.wPx - placedW; else offX = (r.poster.wPx - placedW) / 2;
      if (a.includes('top')) offY = 0; else if (a.includes('bottom')) offY = r.poster.hPx - placedH; else offY = (r.poster.hPx - placedH) / 2;
    }
    return { offX, offY, placedW, placedH, scale: r.fit.scale };
  }

  _drawSourceTo(ctx, dx, dy, dw, dh) {
    const s = this._source, p = this.p;
    if (s && s.canvas) ctx.drawImage(s.canvas, dx, dy, dw, dh);
    else if (s instanceof HTMLCanvasElement) ctx.drawImage(s, dx, dy, dw, dh);
    else if (s && s.elt instanceof HTMLCanvasElement) ctx.drawImage(s.elt, dx, dy, dw, dh);
    else if (s instanceof HTMLImageElement) ctx.drawImage(s, dx, dy, dw, dh);
    else ctx.drawImage(p.canvas, dx, dy, dw, dh);
  }

  _renderVector(g) {
    if (!this._vectorFn) return false;
    const r = this._report;
    g.push();
    const pm = this._placeMetrics();
    const sx = pm.placedW / this.p.width, sy = pm.placedH / this.p.height;
    const s = Math.min(sx, sy);
    g.translate(pm.offX, pm.offY);
    g.scale(s, s);
    try { this._vectorFn(g, { poster: r, place: pm, scale: s, w: this.p.width, h: this.p.height }); } catch(e){ console.error('[tilekit] vector draw failed', e); g.pop(); return false; }
    g.pop();
    return true;
  }

  buildPosterGraphics() {
    if (!this._report) this.analyze();
    const r = this._report, p = this.p;
    const pg = p.createGraphics(r.poster.wPx, r.poster.hPx);
    pg.pixelDensity(1);
    const bg = this.opts.background;
    if (bg !== null && bg !== undefined) {
      if (Array.isArray(bg)) pg.background(bg[0], bg[1], bg[2]);
      else pg.background(bg);
    } else pg.clear();
    if (this._vectorFn) { this._renderVector(pg); return pg; }
    const { offX, offY, placedW, placedH } = this._placeMetrics();
    if (this.opts.fit === 'stretch') this._drawSourceTo(pg.drawingContext, 0, 0, r.poster.wPx, r.poster.hPx);
    else this._drawSourceTo(pg.drawingContext, offX, offY, placedW, placedH);
    return pg;
  }

  getTiles(posterGraphics) {
    if (!this._report) this.analyze();
    const r = this._report, g = this._grid, p = this.p;
    const pg = posterGraphics || this.buildPosterGraphics();
    const tiles = [];
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        const sx = col * g.effW, sy = row * g.effH;
        const tile = p.createGraphics(g.w, g.h);
        tile.pixelDensity(1);
        tile.background(255);
        tile.image(pg, 0, 0, tile.width, tile.height, sx, sy, tile.width, tile.height);
        if (this.opts.cropMarks) this._cropMarks(tile);
        if (this.opts.pageLabels) this._pageLabel(tile, col, row);
        tiles.push({ col, row, index: row * g.cols + col + 1, sx, sy, graphics: tile, pg: tile });
      }
    }
    return tiles;
  }

  _cropMarks(g) {
    const l = 24, o = 6;
    g.stroke(0); g.strokeWeight(0.5); g.noFill();
    [[o, o], [g.width - o, o], [o, g.height - o], [g.width - o, g.height - o]].forEach(([x, y]) => {
      const hx = x < g.width / 2 ? 1 : -1, hy = y < g.height / 2 ? 1 : -1;
      g.line(x, y, x + hx * l, y); g.line(x, y, x, y + hy * l);
    });
  }
  _pageLabel(g, col, row) {
    g.fill(0); g.noStroke(); g.textSize(10); g.textAlign(g.LEFT, g.TOP);
    g.text(`${col + 1}–${row + 1}`, 12, 14);
  }

  _ensureOverlay() {
    if (this._ov) return this._ov;
    const p = this.p;
    const c = p.canvas || p._curElement?.elt || document.querySelector('canvas');
    if (!c) return null;
    const wrap = c.parentElement;
    const cs = getComputedStyle(wrap);
    if (cs.position === 'static') wrap.style.position = 'relative';
    const ov = document.createElement('canvas');
    ov.id = 'tk-overlay';
    ov.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:5;display:block';
    wrap.appendChild(ov);
    this._ov = ov;
    this._ovCtx = ov.getContext('2d');
    const ro = new ResizeObserver(() => this._drawOverlay());
    ro.observe(c); ro.observe(wrap);
    this._ovRO = ro;
    return ov;
  }
  _drawOverlay() {
    if (!this._previewOn || !this._report) return;
    const ov = this._ensureOverlay(); if (!ov) return;
    const p = this.p, r = this._report, g = this._grid;
    const c = p.canvas || p._curElement?.elt;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || p.width, h = c.clientHeight || p.height;
    ov.style.width = w + 'px'; ov.style.height = h + 'px';
    ov.style.left = c.offsetLeft + 'px'; ov.style.top = c.offsetTop + 'px';
    ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr);
    const ctx = this._ovCtx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sx = w / r.poster.wPx, sy = h / r.poster.hPx;
    const s = Math.min(sx, sy) * 0.92;
    const ox = (w - r.poster.wPx * s) / 2, oy = (h - r.poster.hPx * s) / 2;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1 / s; ctx.strokeRect(0, 0, r.poster.wPx, r.poster.hPx);
    ctx.strokeStyle = 'rgba(255,0,0,0.65)';
    for (let cc = 1; cc < g.cols; cc++) { const x = cc * g.effW; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, r.poster.hPx); ctx.stroke(); }
    for (let rr = 1; rr < g.rows; rr++) { const y = rr * g.effH; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(r.poster.wPx, y); ctx.stroke(); }
    if (g.overlapPx) {
      ctx.fillStyle = 'rgba(255,0,0,0.07)';
      for (let cc = 1; cc < g.cols; cc++) ctx.fillRect(cc * g.effW - g.overlapPx, 0, g.overlapPx, r.poster.hPx);
      for (let rr = 1; rr < g.rows; rr++) ctx.fillRect(0, rr * g.effH - g.overlapPx, r.poster.wPx, g.overlapPx);
    }
    const pm = this._placeMetrics();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(pm.offX, pm.offY, pm.placedW, pm.placedH);
    ctx.restore();
    ctx.fillStyle = '#111'; ctx.font = '11px ui-sans-serif,system-ui,sans-serif';
    ctx.fillText(`${fmt(r.poster.wIn)}×${fmt(r.poster.hIn)} in  ${g.cols}×${g.rows} tiles  ${r.fit.mode}  eff ${Math.round(r.effectiveDpi)} DPI`, 8, h - 8);
  }
  _clearOverlay() { if (this._ovCtx && this._ov) { this._ovCtx.clearRect(0, 0, this._ov.width, this._ov.height); } }
  preview(show = true) {
    this._previewOn = !!show;
    if (!show) { this._clearOverlay(); if (this._ov) this._ov.style.display = 'none'; return this; }
    if (!this._report) this.analyze();
    this._ensureOverlay();
    if (this._ov) this._ov.style.display = 'block';
    this._drawOverlay();
    return this;
  }

  async saveTiles(prefix = 'tile', format = 'png') {
    const tiles = this.getTiles();
    tiles.forEach(t => {
      const name = `${prefix}_${String(t.col + 1).padStart(2, '0')}x${String(t.row + 1).padStart(2, '0')}.${format}`;
      this.p.save(t.graphics, name);
    });
    return tiles;
  }

  async savePDF(filename = 'poster-tiles.pdf') {
    const r = this._report || this.analyze();
    let jsPDF = root.jspdf?.jsPDF || root.jsPDF;
    if (!jsPDF) {
      jsPDF = await loadJsPDF();
      if (!jsPDF) { console.warn('[tilekit] jsPDF not found — falling back to PNG tiles.'); return this.saveTiles(filename.replace(/\.pdf$/i, ''), 'png'); }
    }
    const tiles = this.getTiles();
    const doc = new jsPDF({ orientation: r.tile.wIn > r.tile.hIn ? 'landscape' : 'portrait', unit: 'in', format: [r.tile.wIn, r.tile.hIn] });
    tiles.forEach((t, i) => {
      if (i) doc.addPage([r.tile.wIn, r.tile.hIn], r.tile.wIn > r.tile.hIn ? 'landscape' : 'portrait');
      const data = t.graphics.canvas.toDataURL('image/png');
      doc.addImage(data, 'PNG', 0, 0, r.tile.wIn, r.tile.hIn);
    });
    doc.save(filename);
    return tiles;
  }

  diagnose() { const r = this.analyze(); console.log(r.toString()); if (r.warnings.length) console.warn(r.warnings.join('\n')); return r; }

  ui(opts) { return this.showUI(opts); }
  widget(opts) { return this.showUI(opts); }
  _syncPosterInputs() {
    if (!this._ui) return;
    const raw = this._resolvePoster();
    const pr = sizeToInches(raw, this.opts.units);
    const pw = this._ui.querySelector('#tk-pw'), ph = this._ui.querySelector('#tk-ph');
    if (pw) pw.value = fmt(pr.w);
    if (ph) ph.value = fmt(pr.h);
    const sel = this._ui.querySelector('#tk-poster-preset');
    if (sel) sel.value = this._posterPresetValue();
    const wrap = this._ui.querySelector('#tk-custom-wrap');
    if (wrap) wrap.style.display = sel && sel.value === 'custom' ? 'flex' : 'none';
  }
  _isLandscape() { const {w,h}=this._canvasDims(); return w>h; }
  _posterOptions() {
    const land = this._isLandscape();
    const opts = [{ v:'auto', label:'Auto (match canvas)' }];
    for (const b of POSTER_BASE) {
      const w = land?b.h:b.w, h = land?b.w:b.h;
      opts.push({ v: w+','+h, label: `${w} × ${h}` + (b.label?' — '+b.label:'') });
    }
    opts.push({ v:'custom', label:'Custom…' });
    return opts;
  }
  _posterPresetValue() {
    if (this._autoPoster) return 'auto';
    const cur = this.opts.poster;
    if (!Array.isArray(cur)) return 'custom';
    const key = cur[0] + ',' + cur[1];
    return this._posterOptions().some(p=>p.v===key) ? key : 'custom';
  }
  showUI() {
    injectCSS();
    if (this._ui) { this._ui.style.display = ''; this._syncPosterInputs(); return this; }
    const bar = document.createElement('div');
    bar.id = 'tk-bar';
    const build = () => {
      if (!this.p.width && !(this.p.canvas||this.p._curElement?.elt)?.width) { requestAnimationFrame(build); return; }
      this.capture(); this.analyze();
      const posterRaw = this._resolvePoster();
      const poster = sizeToInches(posterRaw, this.opts.units);
      const opts = this._posterOptions();
      const presetVal = this._posterPresetValue();
      const isCustom = presetVal === 'custom';
      bar.innerHTML = `
      <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#666;cursor:pointer">Autohide<input type="checkbox" id="tk-autohide" ${this._autohide?'checked':''}></label>
      <div class="tk-sep"></div>
      <div class="tk-group tk-dim">
        <label>Poster<select id="tk-poster-preset">${opts.map(o=>`<option value="${o.v}" ${o.v===presetVal?'selected':''}>${o.label}</option>`).join('')}</select></label>
        <span id="tk-custom-wrap" style="display:${isCustom?'flex':'none'};align-items:center;gap:6px">
          <label>W<input id="tk-pw" type="number" step="0.25" value="${fmt(poster.w)}" style="width:64px"></label>
          <span class="tk-x">×</span>
          <label>H<input id="tk-ph" type="number" step="0.25" value="${fmt(poster.h)}" style="width:64px"></label>
          <label>units<select id="tk-units"><option value="in" ${this.opts.units==='in'?'selected':''}>in</option><option value="cm" ${this.opts.units==='cm'?'selected':''}>cm</option><option value="mm" ${this.opts.units==='mm'?'selected':''}>mm</option></select></label>
        </span>
      </div>
      <div class="tk-sep"></div>
      <div class="tk-group">
        <label>paper<select id="tk-paper">
          ${Object.keys(PAPER_LABELS).map(k=>`<option value="${k}" ${this.opts.tile===k?'selected':''}>${PAPER_LABELS[k]}</option>`).join('')}
          <option value="custom">Custom…</option>
        </select></label>
        <label style="display:none" id="tk-cw-wrap">W<input id="tk-cw" type="number" step="0.1" value="8.5" style="width:64px"></label>
        <label style="display:none" id="tk-ch-wrap">H<input id="tk-ch" type="number" step="0.1" value="11" style="width:64px"></label>
        <label>overlap<div style="display:flex;align-items:center;gap:4px"><input id="tk-overlap" type="number" min="0" max="2" step="0.125" value="${this.opts.overlap}" style="width:64px"><span style="text-transform:none;letter-spacing:0;font-size:11px;color:#888;font-weight:400">in</span></div></label>
        <label>dpi<input id="tk-dpi" type="number" min="72" max="300" step="1" value="${this.opts.dpi}" style="width:64px"></label>
      </div>
      <div class="tk-actions">
        <span id="tk-stat" style="font-size:11px;color:#666;white-space:nowrap"></span>
        <label style="flex-direction:row;align-items:center;gap:5px;text-transform:none;letter-spacing:0;font-weight:400;color:#555;cursor:pointer"><input type="checkbox" id="tk-preview" checked> grid</label>
        <button id="tk-tile">Tile → PDF</button>
        <button id="tk-png" class="tk-ghost">Tile → PNG</button>
        <button id="tk-toggle" class="tk-toggle">▾ details</button>
      </div>
      <div class="tk-report" id="tk-report"></div>
      <div id="tk-brand-foot">p5.tilekit</div>
    `;
      if (this._autohide) bar.classList.add('tk-autohide');
      document.body.appendChild(bar);
      this._ui = bar;
      this._bindUI();
      this._syncUIFromReport();
      this.preview(true);
    };
    build();
    return this;
  }

  hideUI() { if (this._ui) this._ui.style.display = 'none'; return this; }
  toggleUI() { if (!this._ui) return this.showUI(); this._ui.style.display = this._ui.style.display === 'none' ? '' : 'none'; return this; }
  destroyUI() { if (this._ui) this._ui.remove(); this._ui = null; this.preview(false); if (this._ov) { this._ov.remove(); this._ov=null; } if (this._ovRO) { this._ovRO.disconnect(); this._ovRO=null; } return this; }

  _bindUI() {
    const bar = this._ui;
    const $ = id => bar.querySelector(id);
    const readPoster = () => {
      const w = parseFloat($('#tk-pw').value) || 36, h = parseFloat($('#tk-ph').value) || 48;
      const units = $('#tk-units').value;
      return { w, h, units };
    };
    const readPaper = () => {
      const v = $('#tk-paper').value;
      if (v === 'custom') return [parseFloat($('#tk-cw').value)||8.5, parseFloat($('#tk-ch').value)||11];
      return v;
    };
    const apply = () => {
      const preset = $('#tk-poster-preset') ? $('#tk-poster-preset').value : 'auto';
      if (preset === 'auto') this._autoPoster = true;
      else if (preset === 'custom') this._autoPoster = false;
      else { this._autoPoster = false; const arr = preset.split(',').map(Number); this.opts.poster = arr; $('#tk-pw').value = fmt(arr[0]); $('#tk-ph').value = fmt(arr[1]); }
      const pu = readPoster();
      const paper = readPaper();
      const stillAuto = this._autoPoster;
      if (stillAuto) this.opts.poster = this._posterFromCanvas();
      else if (preset === 'custom') this.opts.poster = [pu.w, pu.h];
      this.opts.units = pu.units;
      this.opts.tile = paper;
      this.opts.paper = null;
      this.opts.overlap = parseFloat($('#tk-overlap').value)||0;
      this.opts.dpi = parseInt($('#tk-dpi').value,10)||150;
      this.capture();
      this.analyze();
      this._syncUIFromReport();
      if (this._previewOn) this._drawOverlay();
    };
    ['#tk-pw','#tk-ph','#tk-units','#tk-paper','#tk-cw','#tk-ch','#tk-overlap','#tk-dpi'].forEach(sel=>{
      const el=$(sel); if(el) el.addEventListener('change', apply);
      if(el && el.tagName==='INPUT') el.addEventListener('input', ()=>{ clearTimeout(this._deb); this._deb=setTimeout(apply, 320); });
    });
    const presetEl = $('#tk-poster-preset');
    if (presetEl) presetEl.addEventListener('change', ()=>{
      const v = presetEl.value;
      const wrap = $('#tk-custom-wrap');
      if (wrap) wrap.style.display = v === 'custom' ? 'flex' : 'none';
      if (v === 'auto') this._autoPoster = true;
      else if (v !== 'custom') { this._autoPoster = false; const a=v.split(',').map(Number); $('#tk-pw').value=fmt(a[0]); $('#tk-ph').value=fmt(a[1]); this.opts.poster=a; }
      else { this._autoPoster = false; }
      apply();
    });
    const onResize = () => { if (this._autoPoster) { this.opts.poster=this._posterFromCanvas(); this.capture(); this.analyze(); this._syncUIFromReport(); this._syncPosterInputs(); if(this._previewOn)this._drawOverlay(); } };
    window.addEventListener('resize', onResize);
    new ResizeObserver(onResize).observe(this.p.canvas || this.p._curElement?.elt || document.querySelector('canvas'));
    $('#tk-paper').addEventListener('change', ()=>{
      const custom = $('#tk-paper').value==='custom';
      $('#tk-cw-wrap').style.display = custom?'flex':'none';
      $('#tk-ch-wrap').style.display = custom?'flex':'none';
    });
    $('#tk-tile').addEventListener('click', async ()=>{
      const btn=$('#tk-tile'); btn.disabled=true; btn.textContent='Tiling…';
      try { apply(); await this.savePDF(`tilekit-${fmt(this._report.poster.wIn)}x${fmt(this._report.poster.hIn)}.pdf`); }
      catch(e){ console.error(e); alert('Tile failed: '+e.message); }
      finally { btn.disabled=false; btn.textContent='Tile → PDF'; }
    });
    $('#tk-png').addEventListener('click', async ()=>{
      const btn=$('#tk-png'); btn.disabled=true; btn.textContent='…';
      try { apply(); await this.saveTiles('tile','png'); } catch(e){ alert(e.message); }
      finally { btn.disabled=false; btn.textContent='Tile → PNG'; }
    });
    $('#tk-toggle').addEventListener('click', ()=>{
      bar.classList.toggle('tk-open');
      $('#tk-toggle').textContent = bar.classList.contains('tk-open') ? '▴ hide' : '▾ details';
    });
    $('#tk-preview').addEventListener('change', e=>{ this.preview(e.target.checked); });
    $('#tk-autohide').addEventListener('change', e=>{ this._autohide=e.target.checked; bar.classList.toggle('tk-autohide', this._autohide); });
  }

  _syncUIFromReport() {
    if (!this._ui || !this._report) return;
    const r=this._report, bar=this._ui;
    const rep = bar.querySelector('#tk-report');
    const stat = bar.querySelector('#tk-stat');
    const warnIcon = r.warnings.length ? '⚠' : '✓';
    const cls = r.resolution==='low' ? 'tk-warn' : r.warnings.length ? 'tk-warn' : 'tk-ok';
    let details = r.toString();
    const ni = details.indexOf('\nNotes:');
    if (ni !== -1) details = details.slice(0, ni);
    rep.innerHTML = `<div class="${cls}">${warnIcon} ${r.grid.cols}×${r.grid.rows} = ${r.grid.tiles} tiles  •  ${r.poster.wPx}×${r.poster.hPx} px  •  eff ${Math.round(r.effectiveDpi)} DPI</div>`
      + `<div style="margin-top:6px;opacity:.9">${r.warnings.length ? r.warnings.join('\n') : 'No warnings — ready to tile.'}</div>`
      + `<div style="margin-top:8px;opacity:.55">${details}</div>`;
    stat.textContent = `${fmt(r.poster.wIn)}×${fmt(r.poster.hIn)} in → ${r.grid.tiles} tiles (${r.tile.wIn}×${r.tile.hIn})`;
    stat.className = cls;
  }
}

function createTilekit(p, opts) { return new Tilekit(p, opts); }

if (typeof window !== 'undefined' && window.p5) {
  window.p5.prototype.createTilekit = function (opts) { return new Tilekit(this, opts); };
  window.p5.prototype.createTiler = window.p5.prototype.createTilekit;
}

return { Tilekit, createTilekit, PAPER };
}));
