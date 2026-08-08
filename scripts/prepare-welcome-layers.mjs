// Builds the three welcome parallax plates from the source renders, which are
// opaque RGB: the front plate ships on a green screen and the middle plate has
// the window painted in rather than hollow.
import sharp from "sharp";

const DIR = "public/assets/welcome";
const W = 2048;
const H = 1152;
const N = W * H;

// Window opening measured off the line-art stroke in layer-middle.png; the
// corner radius is a least-squares circular fit of the inset profile (rms 1.9).
const WINDOW = { x0: 818, x1: 1218, y0: 172, y1: 738, r: 139 };

// The green screen sits around (22,228,27). g - max(r,b) is bimodal with an
// empty band between roughly 12 and 190, so a soft ramp inside it keeps the
// antialiased character outlines without eating any artwork.
const KEY_LO = 40;
const KEY_HI = 175;

const raw = (f) =>
  sharp(`${DIR}/${f}`)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

function chromaKey(rgb) {
  const out = Buffer.alloc(N * 3);
  const alpha = Buffer.alloc(N);
  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const peak = Math.max(r, b);
    const score = g - peak;
    const a =
      score <= KEY_LO
        ? 255
        : score >= KEY_HI
          ? 0
          : Math.round(255 * (1 - (score - KEY_LO) / (KEY_HI - KEY_LO)));
    alpha[i] = a;
    out[i * 3] = r;
    // Despill: unmatted edge pixels keep a green cast that the straight alpha
    // in webp would leave visible, so clamp green back to the other channels.
    out[i * 3 + 1] = a === 255 && score <= 0 ? g : Math.min(g, peak);
    out[i * 3 + 2] = b;
  }
  return { rgb: out, alpha };
}

function windowMask({ x0, x1, y0, y1, r }) {
  const mask = Buffer.alloc(N);
  // Corner arc centres, so the mask is antialiased from a signed distance.
  const cx = [x0 + r, x1 - r];
  const cy = [y0 + r, y1 - r];
  for (let y = y0 - 2; y <= y1 + 2; y++) {
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      const px = x < cx[0] ? cx[0] : x > cx[1] ? cx[1] : x;
      const py = y < cy[0] ? cy[0] : y > cy[1] ? cy[1] : y;
      const d =
        px === x && py === y ? -r : Math.hypot(x - px, y - py) - r;
      mask[y * W + x] = Math.round(255 * Math.min(1, Math.max(0, 0.5 - d)));
    }
  }
  return mask;
}

const write = (rgb, alpha, name) =>
  sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(`${DIR}/${name}.webp`);

const front = chromaKey(await raw("layer-front.png"));
await write(front.rgb, front.alpha, "layer-front");

// The frame is everything outside the opening; the stroke around the glass is
// part of the wall, so the hole stops just inside it.
const middle = await raw("layer-middle.png");
const hole = windowMask(WINDOW);
const wall = Buffer.alloc(N);
for (let i = 0; i < N; i++) wall[i] = 255 - hole[i];
await write(middle, wall, "layer-middle");

await sharp(`${DIR}/layer-far.png`).webp({ quality: 84 }).toFile(`${DIR}/layer-far.webp`);

let opaque = 0;
for (let i = 0; i < N; i++) if (front.alpha[i] > 127) opaque++;
const pct = (v, total) => +((100 * v) / total).toFixed(3);
console.log(`canvas ${W}x${H}`);
console.log(`front matte coverage ${((100 * opaque) / N).toFixed(1)}%`);
console.log(
  "window %:",
  JSON.stringify({
    left: pct(WINDOW.x0, W),
    top: pct(WINDOW.y0, H),
    width: pct(WINDOW.x1 - WINDOW.x0 + 1, W),
    height: pct(WINDOW.y1 - WINDOW.y0 + 1, H),
    centreX: pct((WINDOW.x0 + WINDOW.x1) / 2, W),
    centreY: pct((WINDOW.y0 + WINDOW.y1) / 2, H),
  }),
);
