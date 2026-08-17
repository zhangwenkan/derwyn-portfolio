// Keys the green screen off dog.mp4 and repacks it as an alpha-packed H.264
// clip: colour on top, the matte as greyscale underneath. The player rebuilds
// straight alpha from the two halves in a WebGL pass.
//
// Why not the obvious formats. H.264 has no alpha channel, so the source cannot
// be used as-is. VP9/WebM does carry alpha, but Safari decodes VP9 without it.
// A sprite sheet cannot hold this clip at all: the motion sits in four bursts of
// 14/5/7/14 frames separated by ~900ms holds, so 40 of the 124 frames carry the
// movement and subsampling hits the bursts first -- the previous 24-frame sheet
// left 1-2 frames per burst, which read as a teleport. Keeping all 124 frames as
// a grid needs 36 Mpx at 1x or 143 Mpx at 2x, both past what browsers will
// decode as one image. Video codecs have no such ceiling, and inter-frame
// prediction makes the 84 hold frames nearly free.
//
// Keying differs from the WebP source in one place: the mp4 is yuv420p, so
// chroma is half resolution and the green transition measures 2px wide instead
// of 0-1px. Hence BAND 2.
//
// Two things the plain core-distance key got wrong here, both measured:
//   - The clip paints a camera flash as a faint wash over the key. It stays
//     green-dominant (score 160-199 against the key's 225) but sits 40-59 from
//     the key colour, so the core test rejected it, it survived as opaque, and
//     the spill clamp crushed it to a black smear. A second fill pass through
//     green-dominant pixels reaches it.
//   - Colour was left black wherever alpha was 0, so the black step at the
//     silhouette got dragged back inside by chroma subsampling and again by the
//     player's bilinear tap. Growing the colour outwards past the edge is what
//     removes the dark rim, and taking edge colour from the neighbours rather
//     than un-compositing removes the red rim that dividing by a small alpha
//     used to produce.
//
// Two more, both measured on the encoded clip after the above:
//   - Alpha used to be a tunable ramp raised by a `bound` term of the form
//     1 - channel/key_channel. The key's red is 12 and its blue 14, so any key
//     pixel darker than that in either channel produced a bound near 1 and was
//     forced almost fully opaque -- the exact opposite of the intent. It left
//     ~2300 leftover key pixels per frame, 1695 of them from that term alone,
//     as a dashed dark rim tracing the whole silhouette. Greenness is linear in
//     key coverage, so coverage is just score/S_KEY and no ramp is needed.
//   - The colour extension copied from whichever neighbour the traversal reached
//     first, which fanned the margin out into diagonal streaks along the
//     traversal front. Averaging the already-placed neighbours instead diffuses
//     the colour smoothly, weighted by 1/distance so the spread is isotropic.
//
// One thing that looks wrong and is not. Open the packed clip in a plain player and
// the silhouette is ringed by a comb of short dark spokes. That is the colour
// extension diffusing the drawing's black outline outwards, modulated by the
// staircase of the aliased contour, so its period is the staircase's. It is never
// composited -- alpha is 0 across the whole band, verified against the matte -- and
// the player is simply showing padding that exists for the sampler's benefit.
// Measured attempts that did not help, so that they are not tried again: diffusing
// to the frame edge (+85% bitrate, turns the spokes into long rays), fading the
// band into a flat neutral (no change to the spokes), and 1/distance weighting
// (no change either, which is what identified the staircase as the cause).
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

const SRC = "public/assets/welcome/dog.mp4";
const DST = "public/assets/welcome/dog-alpha.mp4";
const FF = ffmpeg.path;
const CRF = 24;
const K = [12, 237, 14];
const D_CORE = 45;
const BAND = 2;
const S_LO = 30;
// Greenness of the key itself. Coverage is linear in greenness, so a pixel
// scoring this much is pure key and one scoring nothing is untouched artwork.
const S_KEY = K[1] - Math.max(K[0], K[2]);
const S_FILL = 150;
const WASH_MIN = 200;
const EDGE_EXTEND = 6;
const SPILL_TOLERANCE = 8;
const MARGIN = 24;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const run = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", ...args], {
  maxBuffer: 1 << 30,
});

// ffmpeg -i with no output always exits non-zero, so the dimensions have to be
// scraped out of stderr rather than read from a clean run.
const meta = (() => {
  let out = "";
  try {
    execFileSync(FF, ["-hide_banner", "-i", SRC], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = String(e.stderr ?? "");
  }
  const m = out.match(/(\d{2,5})x(\d{2,5})/);
  const f = out.match(/([\d.]+) fps/);
  return { w: Number(m?.[1]), h: Number(m?.[2]), fps: Number(f?.[1] ?? 24) };
})();
if (!meta.w || !meta.h) throw new Error("could not read video dimensions");
console.log(`source ${SRC} ${meta.w}x${meta.h} @ ${meta.fps}fps`);

// Locate the figure on a 1/8 decode first, so the full-res pass only has to
// carry the region that matters. Detecting rather than hardcoding means a
// re-export with different framing cannot silently crop the dog.
const SW = Math.floor(meta.w / 8);
const SH = Math.floor(meta.h / 8);
const small = run(["-i", SRC, "-an", "-vf", `scale=${SW}:${SH}`, "-f", "rawvideo",
  "-pix_fmt", "rgb24", "-"]);
const frames = Math.floor(small.length / (SW * SH * 3));
let sx0 = SW, sx1 = -1, sy0 = SH, sy1 = -1;
for (let f = 0; f < frames; f++) {
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const i = f * SW * SH * 3 + (y * SW + x) * 3;
      if (small[i + 1] - Math.max(small[i], small[i + 2]) > 60) continue;
      if (x < sx0) sx0 = x;
      if (x > sx1) sx1 = x;
      if (y < sy0) sy0 = y;
      if (y > sy1) sy1 = y;
    }
  }
}
const cx = clamp(sx0 * 8 - MARGIN, 0, meta.w);
const cy = clamp(sy0 * 8 - MARGIN, 0, meta.h);
const cw = clamp((sx1 - sx0 + 1) * 8 + MARGIN * 2, 1, meta.w - cx);
const ch = clamp((sy1 - sy0 + 1) * 8 + MARGIN * 2, 1, meta.h - cy);
console.log(`${frames} frames | rough crop ${cw}x${ch} at ${cx},${cy}`);

const work = mkdtempSync(join(tmpdir(), "dogalpha-"));
try {
  run(["-i", SRC, "-an", "-vf", `crop=${cw}:${ch}:${cx}:${cy}`, "-start_number", "0",
    join(work, "s%04d.png")]);

  const N = cw * ch;
  const alphas = [];
  const colours = [];
  let bx0 = cw, bx1 = -1, by0 = ch, by1 = -1;
  let feathered = 0;
  let washed = 0;

  for (let f = 0; f < frames; f++) {
    const rgb = await sharp(join(work, `s${String(f).padStart(4, "0")}.png`))
      .removeAlpha().raw().toBuffer();

    const cand = new Uint8Array(N);
    const score = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      const r = rgb[i * 3];
      const g = rgb[i * 3 + 1];
      const b = rgb[i * 3 + 2];
      score[i] = g - Math.max(r, b);
      if (Math.hypot(r - K[0], g - K[1], b - K[2]) <= D_CORE) cand[i] = 1;
    }

    // 4-connected from the border, so green enclosed by the drawing is kept.
    const flood = (passable) => {
      const seen = new Uint8Array(N);
      const stack = [];
      const push = (i) => {
        if (passable(i) && !seen[i]) {
          seen[i] = 1;
          stack.push(i);
        }
      };
      for (let x = 0; x < cw; x++) {
        push(x);
        push((ch - 1) * cw + x);
      }
      for (let y = 0; y < ch; y++) {
        push(y * cw);
        push(y * cw + cw - 1);
      }
      while (stack.length) {
        const i = stack.pop();
        const x = i % cw;
        const y = (i / cw) | 0;
        if (x > 0) push(i - 1);
        if (x < cw - 1) push(i + 1);
        if (y > 0) push(i - cw);
        if (y < ch - 1) push(i + cw);
      }
      return seen;
    };
    const bg = flood((i) => cand[i] === 1);

    // Second pass for the flash wash, passing through anything still
    // green-dominant. Only the large regions it adds are taken, because the
    // silhouette's own soft edge also clears S_FILL in places: measured over the
    // clip, the wash arrives as a single ~3.5k px region while no edge fragment
    // exceeds 64px, so a size gate removes the wash without eroding the edge.
    const wash = flood((i) => cand[i] === 1 || score[i] >= S_FILL);
    for (let i = 0; i < N; i++) if (bg[i]) wash[i] = 0;
    const grouped = new Uint8Array(N);
    for (let s = 0; s < N; s++) {
      if (!wash[s] || grouped[s]) continue;
      const group = [s];
      grouped[s] = 1;
      for (let q = 0; q < group.length; q++) {
        const i = group[q];
        const x = i % cw;
        const y = (i / cw) | 0;
        for (const j of [
          x > 0 ? i - 1 : -1,
          x < cw - 1 ? i + 1 : -1,
          y > 0 ? i - cw : -1,
          y < ch - 1 ? i + cw : -1,
        ]) {
          if (j >= 0 && wash[j] && !grouped[j]) {
            grouped[j] = 1;
            group.push(j);
          }
        }
      }
      if (group.length >= WASH_MIN) {
        washed += group.length;
        for (const i of group) bg[i] = 1;
      }
    }

    let near = bg;
    for (let p = 0; p < BAND; p++) {
      const next = new Uint8Array(N);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = y * cw + x;
          if (near[i]) {
            next[i] = 1;
            continue;
          }
          let hit = 0;
          for (let dy = -1; dy <= 1 && !hit; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const yy = y + dy;
              const xx = x + dx;
              if (yy < 0 || yy >= ch || xx < 0 || xx >= cw) continue;
              if (near[yy * cw + xx]) {
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
    const colour = Buffer.alloc(N * 3);
    const solid = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (bg[i]) continue;
      const r = rgb[i * 3];
      const g = rgb[i * 3 + 1];
      const b = rgb[i * 3 + 2];
      let a = 1;
      // Inside the edge band, coverage is read straight off the greenness. Outside
      // it, only pixels still as green as the fill threshold are touched: those are
      // leftover key wherever they sit, and the drawing itself carries no green, so
      // there is nothing else for the test to catch.
      if (score[i] > S_LO && (near[i] || score[i] >= S_FILL)) {
        a = clamp(1 - score[i] / S_KEY, 0, 1);
      }
      if (a >= 1) {
        alpha[i] = 255;
        solid[i] = 1;
        colour[i * 3] = r;
        colour[i * 3 + 1] = Math.min(g, Math.max(r, b) + SPILL_TOLERANCE);
        colour[i * 3 + 2] = b;
      } else if (a > 0) {
        feathered++;
        alpha[i] = Math.round(a * 255);
      }
      if (alpha[i]) {
        const x = i % cw;
        const y = (i / cw) | 0;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }

    // Everything short of fully opaque takes its colour from the nearest opaque
    // pixels, and the colour keeps growing past the silhouette into fully
    // transparent ground. Nothing there is ever shown -- alpha is 0 -- but it is
    // what both chroma subsampling and the player's bilinear tap reach for, and
    // they used to find the black the buffer was allocated with.
    //
    // Each ring averages the colours already placed around it. Copying from the
    // first neighbour the traversal reached instead fanned the margin out into
    // diagonal streaks along the traversal front.
    //
    // EDGE_EXTEND rings is enough: the widest sampler footprint that reaches out here
    // is the player's 4x4 box at the delivered 3.2x reduction, and past that the
    // matte decodes low enough (mean 1.35, max 23 one ring out) that the colour
    // behind it cannot register.
    let front = [];
    for (let i = 0; i < N; i++) {
      if (!solid[i]) continue;
      const x = i % cw;
      const y = (i / cw) | 0;
      if (x === 0 || y === 0 || x === cw - 1 || y === ch - 1) continue;
      if (solid[i - 1] && solid[i + 1] && solid[i - cw] && solid[i + cw]) continue;
      front.push(i);
    }
    const painted = Uint8Array.from(solid);
    const queued = Uint8Array.from(solid);
    for (let d = 0; d < EDGE_EXTEND && front.length; d++) {
      const ring = [];
      for (const i of front) {
        const x = i % cw;
        const y = (i / cw) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy < 0 || yy >= ch || xx < 0 || xx >= cw) continue;
            const j = yy * cw + xx;
            if (queued[j]) continue;
            queued[j] = 1;
            ring.push(j);
          }
        }
      }
      // Averaged against the previous ring only, so the result cannot depend on the
      // order pixels happen to be visited in, and weighted by 1/distance so the
      // spread does not run ahead along the diagonals.
      for (const j of ring) {
        const x = j % cw;
        const y = (j / cw) | 0;
        let n = 0;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy < 0 || yy >= ch || xx < 0 || xx >= cw) continue;
            const k = yy * cw + xx;
            if (!painted[k]) continue;
            const w = dx && dy ? Math.SQRT1_2 : 1;
            n += w;
            sr += colour[k * 3] * w;
            sg += colour[k * 3 + 1] * w;
            sb += colour[k * 3 + 2] * w;
          }
        }
        colour[j * 3] = Math.round(sr / n);
        colour[j * 3 + 1] = Math.round(sg / n);
        colour[j * 3 + 2] = Math.round(sb / n);
      }
      for (const j of ring) painted[j] = 1;
      front = ring;
    }
    alphas.push(alpha);
    colours.push(colour);
    if (f % 25 === 0) process.stdout.write(`  keyed ${f}/${frames}\r`);
  }

  // Even dimensions, so H.264 chroma planes divide cleanly and no resampling
  // step can shift the matte off the colour by half a pixel.
  let fw = bx1 - bx0 + 1;
  let fh = by1 - by0 + 1;
  if (fw % 2) fw++;
  if (fh % 2) fh++;
  fw = Math.min(fw, cw - bx0);
  fh = Math.min(fh, ch - by0);
  console.log(`\ncontent ${fw}x${fh} at ${bx0},${by0} | feathered px ${feathered} | washed px ${washed}`);

  // Colour over matte in one tall frame; the matte is written to all three
  // channels so chroma subsampling cannot pull it away from its luma.
  for (let f = 0; f < frames; f++) {
    const packed = Buffer.alloc(fw * fh * 2 * 3);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const s = (by0 + y) * cw + bx0 + x;
        const top = (y * fw + x) * 3;
        const bot = ((fh + y) * fw + x) * 3;
        const a = alphas[f][s];
        packed[top] = colours[f][s * 3];
        packed[top + 1] = colours[f][s * 3 + 1];
        packed[top + 2] = colours[f][s * 3 + 2];
        packed[bot] = a;
        packed[bot + 1] = a;
        packed[bot + 2] = a;
      }
    }
    await sharp(packed, { raw: { width: fw, height: fh * 2, channels: 3 } })
      .png({ compressionLevel: 6 })
      .toFile(join(work, `p${String(f).padStart(4, "0")}.png`));
    if (f % 25 === 0) process.stdout.write(`  packed ${f}/${frames}\r`);
  }

  run(["-y", "-framerate", String(meta.fps), "-i", join(work, "p%04d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", DST]);

  console.log(`\npacked ${fw}x${fh * 2}, ${frames} frames @ ${meta.fps}fps -> ${DST}`);
  console.log(`set DOG_W ${fw} and DOG_H ${fh} in WelcomeIntro.tsx`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
