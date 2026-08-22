# p5.tilekit

Any p5 canvas → any physical poster, tiled onto Letter/Tabloid (or A4/A3) and exported as a print-ready PDF. Vector-crisp — no bitmap upscaling.

```
canvas 900×700  →  poster 37.7×48 in  →  5×5 Letter tiles + 0.5" overlap → poster-tiles.pdf
```

Demo: `demo/index.html` · Library: `src/p5.tilekit.js` (no build step, depends only on p5; jsPDF auto-loaded)

---

## Quick start

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.3.1/lib/p5.min.js"></script>
<script src="src/p5.tilekit.js"></script>
<script>
let tk;
function drawPoster(g) {
  g.background(247);
  g.rect(20,20,200,200);
  g.text("HELLO", 40, 120);
}

new p5(p => {
  p.setup = () => {
    p.createCanvas(900, 700);
    drawPoster(p);
    tk = new Tilekit(p);          // poster auto-matches canvas shape
    tk.vector(drawPoster);        // re-renders vectors at full poster res
    tk.ui();                      // show menubar
  };
});
</script>
```

Without `vector()` it snapshots the canvas as a bitmap (soft when enlarged). With `vector(fn)` every tile is drawn at native poster pixels — hairlines stay sharp.

Both work:

```js
const tk = new Tilekit(p, opts)
const tk = p.createTilekit(opts)   // p5 addon
```

Call `tk.ui()` / `tk.showUI()` to show the bar, `tk.hideUI()`, `tk.toggleUI()`.

---

## Menubar

Full-width bar at top (auto-hides only if checked).

| Control | What it does |
|---|---|
| **Autohide** checkbox (left) | Slide bar off-screen until mouse hits top |
| **Poster** dropdown | `Auto (match canvas)` · `36×48 Arch E` · `24×36 Arch D` · `18×24 Arch C` · `16×20` · `11×17 Tabloid` · `Custom…` — dropdown flips `36×48 ↔ 48×36` etc. when canvas is landscape |
| **Custom W×H + units** | Shown only on `Custom`; `in / cm / mm` |
| **Paper** | `Letter 8.5×11` · `Legal` · `Tabloid 11×17` · `A4` · `A3` · `A2` · `Arch C/D/E` · `Custom…` (reveals W/H) |
| **Overlap** | In inches, default `0.5` — duplicate band on adjacent sheets for taping alignment (pink in preview) |
| **DPI** | `72–300`, default `150` |
| **Grid** | Toggle red preview overlay |
| **Tile → PDF** | Build tiles + download `tilekit-WxH.pdf` (one PDF, one page per tile) |
| **PNG** | Download each tile as separate PNG |
| **▾ details** | Expand status pane + `p5.tilekit` footer |

**Auto poster:** longest side = 48". A `900×700` canvas → `37.7×48"`. Edit via dropdown or type Custom W/H to lock. When `Auto`, resizing the canvas (or window) updates the poster live so there is never a shape mismatch.

---

## Sizing your canvas

Match common posters to avoid cropping (`fit` is locked to `cover` — scales to fill, excess trimmed). Vectors are always crisp; raster is soft if enlarged too far.

| Want | Use |
|---|---|
| 36×48 portrait | `createCanvas(900, 1200)` or `750×1000` (3:4) |
| 24×36 portrait | `900×1350` (2:3) |
| 18×24 portrait | `900×1200` (same as 36×48, different physical size) |
| 11×17 portrait | `900×1390` |
| Landscape (e.g. 48×36) | Swap: `1200×900`, `1350×900`, etc. — presets auto-flip |

**Tip:** style the on-screen canvas with CSS `width` for preview; the library uses `p.width/p.height` (drawing buffer), not CSS, for tile resolution.

---

## Reference

### Constructor

```js
new Tilekit(p, opts)
```

| Option | Default | Notes |
|---|---|---|
| `poster` | `null` → Auto | `null`/`'auto'` = match canvas · `[w,h]` in `units` · units = `in` |
| `tile` / `paper` | `'letter'` | `'letter'`, `'legal'`, `'tabloid'`, `'a4'`, `'a3'`, `'a2'`, `'archC/D/E'`, `'a0'`, `'roll36/42/44'`, or `[w,h]` |
| `units` | `'in'` | `'in'`, `'cm'`, `'mm'` |
| `dpi` | `150` | Poster/tile pixel density |
| `overlap` | `0.5` | Inches of re-printed edge between tiles |
| `bleed` | `0` | Extra inches beyond tile (reserved) |
| `fit` | `'cover'` | Locked to cover (fill, crop excess) |
| `align` | `'center'` | Poster placement: `center`, `top left`, `bottom right`, etc. |
| `background` | `255` | Fill for poster (grayscale or `[r,g,b]`) |
| `cropMarks` | `true` | Corner crop marks on each tile |
| `pageLabels` | `true` | `col–row` label per tile |
| `autohide` | `false` | Menubar autohide |
| `vector` / `draw` | `null` | `fn(g, meta)` — see below |

`tk.set({ poster:[36,48], tile:'tabloid', dpi:150 })` updates live.

### Vector mode

```js
tk.vector(fn)
// or
tk.vector((g, meta) => { g.rect(...); })
// meta = { poster, place:{offX,offY,placedW,placedH,scale}, scale, w, h }
```

Registered function is called once per `buildPosterGraphics()` at poster resolution (translated + scaled to fill via `cover`). Also works via constructor: `new Tilekit(p, { vector: myDraw })`.

Without it, tiles are a bitmap copy of `p.canvas` (or the `capture(source)` source).

### Methods

| Method | Returns | Notes |
|---|---|---|
| `tk.capture(source?)` | `this` | Set source: `p.canvas` by default, or `HTMLCanvasElement` / `p5.Graphics` / `HTMLImageElement` |
| `tk.analyze(source?)` | `report` | Compute poster/tile/grid/mismatch; also called internally |
| `tk.buildPosterGraphics()` | `p5.Graphics` | Poster-sized graphics (vector or raster) |
| `tk.getTiles(pg?)` | `tiles[]` | Array of `{ col, row, index, sx, sy, graphics, pg }` |
| `tk.preview(bool=true)` | `this` | Overlay canvas with red seams + pink overlap |
| `tk.saveTiles(prefix, fmt='png')` | `Promise<tiles>` | `p.save()` each tile |
| `tk.savePDF(filename)` | `Promise<tiles>` | One PDF via jsPDF (auto-imported), `format: [wIn,hIn]` per page |
| `tk.diagnose()` | `report` | `console.log` report + warnings |
| `tk.ui()` / `showUI` / `hideUI` / `toggleUI` / `destroyUI()` | `this` | Menubar lifecycle |

### Report (`tk.analyze()`)

```js
{
  src: { w, h, ar },
  poster: { wIn, hIn, wPx, hPx, ar, dpi, megapixels },
  tile: { wIn, hIn, wPx, hPx, overlapIn, overlapPx, bleedIn, bleedPx },
  grid: { cols, rows, tiles, effW, effH, coveredW, coveredH },
  fit: { mode, scale, placedW, placedH, align },
  mismatch: { arPct, srcAR, posterAR },
  effectiveDpi, warnings, resolution,
  toString() // human-readable
}
```

Warnings are plain English: cover crop amount, low raster DPI (suppressed in vector mode), huge poster memory hint, and `Tiles add to W×H in — X×Y extra trimmed (whole sheets)`.

### Constants

```js
Tilekit.PAPER        // { letter:[8.5,11], tabloid:[11,17], a4:[...], archE:[36,48], ... }
Tilekit.createTilekit(p, opts) // factory
```

### Tiles & print

- Each sheet is a full `tile` page (e.g. Letter) with the poster slice + 0.5" duplicated overlap + crop marks + `1–1` label.
- Overlap and marks are **not** on the preview if you uncheck Grid; they are always on the PDF.
- Stats in bar: `37.7×48 in → 25 tiles (8.5×11)` etc.; details pane shows full report.

### Requirements

- `p5` 1.4+ (instance mode recommended)
- jsPDF loaded automatically from `cdnjs` if `window.jspdf` / `window.jsPDF` absent; include it yourself to avoid the fetch.

---

## Local dev

```bash
# open demo with any static server, e.g.
npx serve .   # then /demo/
# or VS Code Live Server on `p5-tilekit/` or `p5-tilekit/demo/`
```

Gitea: `http://192.168.1.195:3000/matt/p5-tilekit.git`

```
src/p5.tilekit.js      # library (UMD + p5 addon)
demo/index.html        # vector demo
demo/src/p5.tilekit.js # copy for `demo/` as server root
```
