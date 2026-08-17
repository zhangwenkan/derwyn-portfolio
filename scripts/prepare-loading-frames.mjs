// Keys the green screen off the loading sprite sheet and repacks it as an RGBA
// grid. The sheet is a 5x4 walk cycle on a flat (37,213,57) screen; the art
// contains its own greens (the apple juice carton reads d~60 from the key), so
// the matte is grown from the canvas border by connectivity instead of a plain
// colour threshold, which is what keeps the carton intact.
//
// Source is the 2x render, so the pixel-space constants (grid, SHELF) are twice
// the originals. The colour-space thresholds are unchanged: the key and the
// artwork palette did not move between the two renders.
import sharp from "sharp";

const SRC = "public/assets/welcome/loading3.webp";
const DIR = "public/assets/welcome";
const W = 3040;
const H = 1920;
const N = W * H;
const COLS = 5;
const ROWS = 4;
const CW = W / COLS;
const CH = H / ROWS;
const K = [37, 213, 57];

// Pure screen peaks at d 36.5 across the gutters; the carton's darkest green
// bottoms out around d 60, so the gap is wide enough to key on distance alone.
const D_CORE = 45;
// Enclosed screen pockets (the grip hole, the gap between the ankles) sit at
// mean d <= 21; anything greener than this is artwork and must stay opaque.
const D_POCKET = 40;
// Source ramp measures 1-2px at this resolution (93.5% of transitions), so a
// 2px band is all the matte ever needs to grow into.
const BAND = 2;
const S_LO = 45;
const S_HI = 150;

// Every green in the artwork is a cart good: the champagne glass, the tray
// vegetables and the apple juice carton all sit on the shelf inside this cell-
// local rect. Connectivity alone cannot clear screen the character fully
// encloses — the gap between her legs is a thin sliver whose pixels never come
// within d 45 of the key, so it survives the fill. Outside the shelf there is
// no green artwork at all, which is what lets the plain ramp key those crevices
// without risking the drawing.
const SHELF = { x0: 302, x1: 552, y0: 124, y1: 268 };
// Residual cast left on outlines the ramp reads as opaque. Neutral and warm
// pixels sit below this already, so the clamp only bites on spill.
const SPILL_TOLERANCE = 8;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const rgb = await sharp(SRC).removeAlpha().raw().toBuffer();

const dist = new Float32Array(N);
const score = new Int16Array(N);
for (let i = 0; i < N; i++) {
  const r = rgb[i * 3];
  const g = rgb[i * 3 + 1];
  const b = rgb[i * 3 + 2];
  dist[i] = Math.hypot(r - K[0], g - K[1], b - K[2]);
  score[i] = g - Math.max(r, b);
}

const cand = new Uint8Array(N);
for (let i = 0; i < N; i++) if (dist[i] <= D_CORE) cand[i] = 1;

// 4-connected fill so the matte cannot slip through a diagonal pinhole in an
// outline. Every cell's screen reaches the border through the gutters.
const bg = new Uint8Array(N);
const stack = [];
const push = (i) => {
  if (cand[i] && !bg[i]) {
    bg[i] = 1;
    stack.push(i);
  }
};
const drain = () => {
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
};

for (let x = 0; x < W; x++) {
  push(x);
  push((H - 1) * W + x);
}
for (let y = 0; y < H; y++) {
  push(y * W);
  push(y * W + W - 1);
}
drain();

// Screen the character encloses is unreachable from the border, so sweep the
// leftovers and re-seed the ones whose colour is genuinely the key.
let pockets = 0;
const seen = new Uint8Array(N);
for (let s = 0; s < N; s++) {
  if (!cand[s] || bg[s] || seen[s]) continue;
  const queue = [s];
  const members = [];
  seen[s] = 1;
  let sum = 0;
  while (queue.length) {
    const i = queue.pop();
    members.push(i);
    sum += dist[i];
    const x = i % W;
    const y = (i / W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= N) continue;
      if (cand[j] && !bg[j] && !seen[j]) {
        seen[j] = 1;
        queue.push(j);
      }
    }
  }
  if (sum / members.length <= D_POCKET) {
    pockets++;
    for (const i of members) push(i);
    drain();
  }
}

// Band of pixels the matte is allowed to feather into.
let near = bg;
for (let p = 0; p < BAND; p++) {
  const next = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (near[i]) {
        next[i] = 1;
        continue;
      }
      let hit = 0;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          if (near[yy * W + xx]) {
            hit = 1;
            break;
          }
        }
      }
      next[i] = hit;
    }
  }
  near = next;
}

const alpha = new Uint8Array(N);
const out = Buffer.alloc(N * 3);
let feathered = 0;
let despilled = 0;

for (let i = 0; i < N; i++) {
  const r = rgb[i * 3];
  const g = rgb[i * 3 + 1];
  const b = rgb[i * 3 + 2];

  if (bg[i]) {
    alpha[i] = 0;
    continue;
  }

  const lx = (i % W) % CW;
  const ly = ((i / W) | 0) % CH;
  const onShelf =
    lx >= SHELF.x0 && lx <= SHELF.x1 && ly >= SHELF.y0 && ly <= SHELF.y1;

  let a = 1;
  // On the shelf the matte may only feather where it already touches screen, so
  // the carton's own greens are untouchable. Everywhere else greenness is proof
  // of screen, so the ramp runs unrestricted and reaches enclosed slivers.
  if (score[i] > S_LO && (onShelf ? near[i] : true)) {
    // Ramp handles mixes with light artwork; the channel bound is exact wherever
    // the artwork is darker than the key, which is the common case behind the
    // outlines. Taking the max means neither case can over-erode the edge.
    const ramp = (S_HI - score[i]) / (S_HI - S_LO);
    const bound = Math.max(1 - r / K[0], 1 - g / K[1], 1 - b / K[2]);
    a = clamp(Math.max(ramp, bound), 0, 1);
  }

  if (a >= 1) {
    alpha[i] = 255;
    out[i * 3] = r;
    out[i * 3 + 2] = b;
    // Opaque shelf pixels are copied untouched so the cart goods keep their own
    // greens; off the shelf any leftover cast can only be spill.
    const capped = onShelf ? g : Math.min(g, Math.max(r, b) + SPILL_TOLERANCE);
    if (capped !== g) despilled++;
    out[i * 3 + 1] = capped;
    continue;
  }

  if (a <= 0) {
    alpha[i] = 0;
    continue;
  }

  feathered++;
  alpha[i] = Math.round(a * 255);
  // Un-composite the observed mix off the key so straight alpha carries no
  // spill, then clamp any residue the ramp's overestimate leaves behind.
  const ur = clamp((r - (1 - a) * K[0]) / a, 0, 255);
  const ug = clamp((g - (1 - a) * K[1]) / a, 0, 255);
  const ub = clamp((b - (1 - a) * K[2]) / a, 0, 255);
  out[i * 3] = Math.round(ur);
  out[i * 3 + 1] = Math.round(Math.min(ug, Math.max(ur, ub)));
  out[i * 3 + 2] = Math.round(ub);
}

// Union bbox of the matte in cell-local space, so every frame is cropped
// identically and the walk cycle keeps its registration.
let bx0 = CW;
let bx1 = -1;
let by0 = CH;
let by1 = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!alpha[y * W + x]) continue;
    const lx = x % CW;
    const ly = y % CH;
    if (lx < bx0) bx0 = lx;
    if (lx > bx1) bx1 = lx;
    if (ly < by0) by0 = ly;
    if (ly > by1) by1 = ly;
  }
}
bx0 = Math.max(0, bx0 - 1);
by0 = Math.max(0, by0 - 1);
bx1 = Math.min(CW - 1, bx1 + 1);
by1 = Math.min(CH - 1, by1 + 1);
const FW = bx1 - bx0 + 1;
const FH = by1 - by0 + 1;

const sheet = Buffer.alloc(COLS * FW * ROWS * FH * 4);
const SW = COLS * FW;
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const si = (r * CH + by0 + y) * W + c * CW + bx0 + x;
        const di = ((r * FH + y) * SW + c * FW + x) * 4;
        const a = alpha[si];
        sheet[di] = a ? out[si * 3] : 0;
        sheet[di + 1] = a ? out[si * 3 + 1] : 0;
        sheet[di + 2] = a ? out[si * 3 + 2] : 0;
        sheet[di + 3] = a;
      }
    }
  }
}

const raw = { raw: { width: SW, height: ROWS * FH, channels: 4 } };
await sharp(sheet, raw)
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(`${DIR}/loading-frames.webp`);
// The component blits the avif. q52 is where it stops undercutting the webp on
// edge fidelity, and it still lands at half the bytes.
await sharp(sheet, raw)
  .avif({ quality: 52, effort: 6 })
  .toFile(`${DIR}/loading-frames.avif`);

let opaque = 0;
for (let i = 0; i < N; i++) if (alpha[i] === 255) opaque++;
console.log(`source ${W}x${H} -> cell ${CW}x${CH}`);
console.log(`crop x${bx0} y${by0} ${FW}x${FH}`);
console.log(`sheet ${SW}x${ROWS * FH} (${COLS}x${ROWS} = ${COLS * ROWS} frames)`);
console.log(`pockets re-seeded ${pockets}, feathered px ${feathered}, despilled px ${despilled}`);
console.log(`opaque ${((100 * opaque) / N).toFixed(1)}%`);
