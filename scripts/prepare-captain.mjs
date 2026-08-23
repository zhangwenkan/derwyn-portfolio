// Keys the green screen off the captain portrait and crops it to a broadcast
// bust for the cabin monitor in the welcome intro.
//
// Much simpler than prepare-loading-frames.mjs, and deliberately so: that sheet
// carried genuine greens in the artwork (the apple juice carton) and needed a
// connectivity fill to protect them. Nothing in this portrait is green -- the
// palette is skin, white twill, navy and gold, and the greenest true-artwork
// pixel scores 105 only because it is a lit edge against the screen -- so
// greenness is proof of screen everywhere in the frame. That makes a plain ramp
// safe and lets the despill run over the whole image rather than around a mask.
//
// The source is WebP data behind a .png extension; sharp dispatches on content,
// so the name is left as the render wrote it.
import sharp from "sharp";

const SRC = "public/assets/welcome/captain.png";
const OUT = "public/assets/welcome/captain.webp";

// Flat key, sampled at a corner. Its own greenness score is 193 - 36 = 157.
const K = [31, 193, 36];

// The screen's own variation. Its distance histogram holds 934k px inside d 10,
// thins to a floor around d 70-80, then climbs back into the artwork past d 120,
// so this sits in the valley and can only ever claim screen.
const D_CORE = 60;
// Under S_LO a pixel is not green enough to be a mix of anything; at S_HI it is
// the key itself.
const S_LO = 45;
const S_HI = 157;
// Residual cast the ramp leaves behind, which lands almost entirely on the white
// twill -- it is the one large pale surface facing the screen and takes the most
// bounce. Nothing in the palette is legitimately green-positive (the gold braid
// scores -40, the collar 0), so the clamp only ever bites on spill.
const SPILL_TOLERANCE = 6;

// Broadcast framing, measured off the matte. The hair tip is at y89 and the
// silhouette runs off the bottom of the frame -- 810 px of it sit on the last row
// -- so the crop, not the render, is what decides where the bust ends. It ends
// just below the wings pin: the epaulettes and the pin are what read as "captain"
// at the ~86 px this is drawn at, and there is nothing but featureless twill
// under them. Centred on x640, which is the head's own centre rather than the
// frame's, and wide enough to clear the shoulders at the crop's bottom edge
// (they span x273-1007 by then).
const CROP = { left: 262, top: 70, width: 756, height: 1050 };

// The plate is about 86 px of a 2048-wide source, which lands near 70 CSS px on a
// 1600-wide viewport and near 170 on a 4K one. 512 leaves headroom at 2x DPR and
// still costs almost nothing at this aspect.
const OUT_H = 512;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const { data: rgb, info } = await sharp(SRC)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

const out = Buffer.alloc(N * 4);
let feathered = 0;
let despilled = 0;

for (let i = 0; i < N; i++) {
  const r = rgb[i * 3];
  const g = rgb[i * 3 + 1];
  const b = rgb[i * 3 + 2];
  const score = g - Math.max(r, b);

  let a = 1;
  if (Math.hypot(r - K[0], g - K[1], b - K[2]) <= D_CORE) {
    a = 0;
  } else if (score > S_LO) {
    // The ramp handles mixes with light artwork; the channel bound is exact
    // wherever the artwork is darker than the key, which is the common case
    // behind the hair and the sunglasses. Taking the max means neither case can
    // over-erode the edge.
    const ramp = (S_HI - score) / (S_HI - S_LO);
    const bound = Math.max(1 - r / K[0], 1 - g / K[1], 1 - b / K[2]);
    a = clamp(Math.max(ramp, bound), 0, 1);
  }

  const o = i * 4;
  if (a <= 0) continue;

  if (a >= 1) {
    const capped = Math.min(g, Math.max(r, b) + SPILL_TOLERANCE);
    if (capped !== g) despilled++;
    out[o] = r;
    out[o + 1] = capped;
    out[o + 2] = b;
    out[o + 3] = 255;
    continue;
  }

  feathered++;
  // Un-composite the observed mix off the key, so straight alpha carries no
  // spill, then clamp whatever residue the ramp's overestimate leaves behind.
  const ur = clamp((r - (1 - a) * K[0]) / a, 0, 255);
  const ug = clamp((g - (1 - a) * K[1]) / a, 0, 255);
  const ub = clamp((b - (1 - a) * K[2]) / a, 0, 255);
  out[o] = Math.round(ur);
  out[o + 1] = Math.round(Math.min(ug, Math.max(ur, ub)));
  out[o + 2] = Math.round(ub);
  out[o + 3] = Math.round(a * 255);
}

const info2 = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .extract(CROP)
  // libvips premultiplies around a resize on an image with alpha, so the zeroed
  // RGB left in fully transparent pixels cannot drag a dark fringe into the edge.
  .resize({ height: OUT_H })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(OUT);

let opaque = 0;
for (let i = 0; i < N; i++) if (out[i * 4 + 3] === 255) opaque++;
console.log(`source ${W}x${H} -> crop ${CROP.width}x${CROP.height} @ ${CROP.left},${CROP.top}`);
console.log(`out ${info2.width}x${info2.height}, ${(info2.size / 1024).toFixed(1)} KiB`);
console.log(`feathered px ${feathered}, despilled px ${despilled}`);
console.log(`opaque ${((100 * opaque) / N).toFixed(1)}%`);
