/** Port of feralui.dev Flow field (JapaneseGradients m5 path). */

export type FlowParams = {
  scale: number;
  distortion: number;
  swirl: number;
};

export type OpalPreset = {
  stops: string[];
  flow: FlowParams;
  grain: number;
  speed: number;
};

/** Opal (蛋白石) preset from feralui Flow gallery. */
export const OPAL: OpalPreset = {
  stops: ["#F6F9FF", "#9BE0E8", "#C4B5F7", "#F8B8D9"],
  flow: { scale: 52, distortion: 46, swirl: 8 },
  grain: 5,
  speed: 24,
};

const DIST_POWER = 3.5;
const CLOCK_SCALE = 1.2;

export function fract(x: number) {
  return x - Math.floor(x);
}

export function smoothstep(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB 0–255 → OKLab. */
function srgbToOklab(hex: string): [number, number, number] {
  const [r8, g8, b8] = parseHex(hex);
  const lin = [r8, g8, b8].map((c) => {
    const p = c / 255;
    return p <= 0.04045 ? p / 12.92 : Math.pow((p + 0.055) / 1.055, 2.4);
  });
  const [n, o, i] = lin;
  const l = Math.cbrt(0.4122214708 * n + 0.5363325363 * o + 0.0514459929 * i);
  const m = Math.cbrt(0.2119034982 * n + 0.6806995451 * o + 0.1073969566 * i);
  const s = Math.cbrt(0.0883024619 * n + 0.2817188376 * o + 0.6299787005 * i);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB 0–255. */
function oklabToSrgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => {
    const c =
      v <= 0.0031308
        ? v * 12.92
        : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(c * 255)));
  }) as [number, number, number];
}

function defaultDivs(count: number) {
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => (i + 1) / count);
}

function stopEdges(count: number, divs?: number[]) {
  return [0, ...(divs && divs.length === count - 1 ? divs : defaultDivs(count)), 1];
}

/** Per-stop influence weight from divider spans. */
function stopWeight(count: number, index: number, divs?: number[]) {
  const edges = stopEdges(count, divs);
  return (edges[index + 1] - edges[index]) * count;
}

/** Animated blob center for stop i at time t. */
function blobCenter(index: number, t: number): [number, number] {
  const phase = index * 0.37;
  const fx = 0.6 + fract(index / 3) * 0.9;
  const fy = 0.8 + fract((index + 1) / 4);
  return [0.5 + 0.5 * Math.sin(t * fx + phase), 0.5 + 0.5 * Math.cos(t * fy + phase * 1.5)];
}

export function grainAlpha(grain: number) {
  return (Math.max(0, Math.min(100, grain)) / 100) * 0.5;
}

export function advanceClock(clock: number, speed: number, dtSec: number) {
  return clock + (speed / 100) * CLOCK_SCALE * Math.min(0.05, dtSec);
}

/**
 * Paint one Flow frame into ImageData (OKLab IDW + distortion/swirl).
 * Matches feralui m5 for type FLOW.
 */
export function paintFlow(
  image: ImageData,
  width: number,
  height: number,
  stops: string[],
  flow: FlowParams,
  t: number,
  divs?: number[],
) {
  const count = stops.length;
  const labs = stops.map(srgbToOklab);
  const centers = stops.map((_, i) => blobCenter(i, t));
  const weights = stops.map((_, i) => stopWeight(count, i, divs));
  const distortion = flow.distortion / 100;
  const swirl = flow.swirl / 100;
  const zoom = 0.4 + (flow.scale / 100) * 1.2;
  const data = image.data;

  for (let y = 0; y < height; y++) {
    const ny = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      let u = ((x + 0.5) / width - 0.5) / zoom + 0.5;
      let v = (ny - 0.5) / zoom + 0.5;
      const radial = smoothstep(Math.hypot(u - 0.5, v - 0.5));
      const falloff = 1 - radial;

      for (let octave = 1; octave <= 2; octave++) {
        u +=
          ((distortion * falloff) / octave) *
          Math.sin(t + octave * 0.4 * smoothstep(v)) *
          Math.cos(0.2 * t + octave * 2.4 * smoothstep(v));
        v +=
          ((distortion * falloff) / octave) *
          Math.cos(t + octave * 2 * smoothstep(u));
      }

      const angle = 3 * swirl * radial;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const dx = u - 0.5;
      const dy = v - 0.5;
      u = cos * dx - sin * dy + 0.5;
      v = sin * dx + cos * dy + 0.5;

      let L = 0;
      let a = 0;
      let b = 0;
      let wSum = 0;
      for (let i = 0; i < count; i++) {
        const cx = u - centers[i][0];
        const cy = v - centers[i][1];
        const dist2 = cx * cx + cy * cy;
        const w = weights[i] / (Math.pow(dist2, DIST_POWER / 2) + 1e-4);
        L += labs[i][0] * w;
        a += labs[i][1] * w;
        b += labs[i][2] * w;
        wSum += w;
      }
      const inv = 1 / Math.max(1e-4, wSum);
      const [r, g, bl] = oklabToSrgb(L * inv, a * inv, b * inv);
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = bl;
      data[idx + 3] = 255;
    }
  }
}

export function makeNoiseTile(size = 128): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.round(((Math.random() + Math.random()) / 2) * 255);
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
