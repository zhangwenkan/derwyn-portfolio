// Keys the green screen off the dog sprite sheet and repacks it as an RGBA grid,
// replacing 121 loose PNG frames whose canvases were mostly empty padding.
//
// Simpler than the loading sheet's key: this artwork contains no green at all
// (of 7550 strongly-green interior pixels, 7548 sit directly against the screen
// and 2 are stray), and no screen is enclosed by the drawing. So the border
// flood fill alone separates figure from ground -- no protected region, no
// pocket re-seeding. Screen is also very flat (99.9% within d 23.2 of the key)
// and its edge is hard (48% of transitions are 0px, 49% are 1px), so the matte
// only ever needs to feather a single pixel.
import sharp from "sharp";

const SRC = "public/assets/welcome/dog.webp";
const DST = "public/assets/welcome/dog-frames.webp";
const W = 4224;
const H = 2816;
const N = W * H;
const COLS = 6;
const ROWS = 4;
const CW = W / COLS;
const CH = H / ROWS;
const K = [12, 235, 11];

// Screen sits at p99.9 = 23.2, artwork carries no green, so this is loose on
// purpose: there is nothing above it that needs protecting.
const D_CORE = 45;
// Source edge is 0-1px, so one dilation covers every mix pixel there is.
const BAND = 1;
// No artwork colour reaches a positive greenness of any size -- orange fur,
// white shell, blue seat and black outlines all score at or below zero -- so any
// greenness at all is screen contamination.
const S_LO = 30;
const S_HI = 190;
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

// 4-connected so the matte cannot slip through a diagonal pinhole in an outline.
const bg = new Uint8Array(N);
const stack = [];
const push = (i) => {
  if (cand[i] && !bg[i]) {
    bg[i] = 1;
    stack.push(i);
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
while (stack.length) {
  const i = stack.pop();
  const x = i % W;
  const y = (i / W) | 0;
  if (x > 0) push(i - 1);
  if (x < W - 1) push(i + 1);
  if (y > 0) push(i - W);
  if (y < H - 1) push(i + W);
}

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

  let a = 1;
  if (score[i] > S_LO && near[i]) {
    const ramp = (S_HI - score[i]) / (S_HI - S_LO);
    const bound = Math.max(1 - r / K[0], 1 - g / K[1], 1 - b / K[2]);
    a = clamp(Math.max(ramp, bound), 0, 1);
  }

  if (a >= 1) {
    alpha[i] = 255;
    out[i * 3] = r;
    out[i * 3 + 2] = b;
    const capped = Math.min(g, Math.max(r, b) + SPILL_TOLERANCE);
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

// Union bbox in cell-local space, so every frame is cropped identically and the
// animation keeps its registration.
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

const SW = COLS * FW;
const sheet = Buffer.alloc(SW * ROWS * FH * 4);
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

await sharp(sheet, { raw: { width: SW, height: ROWS * FH, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(DST);

let opaque = 0;
for (let i = 0; i < N; i++) if (alpha[i] === 255) opaque++;
console.log(`source ${W}x${H} -> cell ${CW}x${CH}`);
console.log(`crop x${bx0} y${by0} ${FW}x${FH}`);
console.log(`sheet ${SW}x${ROWS * FH} (${COLS}x${ROWS} = ${COLS * ROWS} frames)`);
console.log(`feathered px ${feathered}, despilled px ${despilled}`);
console.log(`opaque ${((100 * opaque) / N).toFixed(1)}%`);
