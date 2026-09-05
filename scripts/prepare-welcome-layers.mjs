// Builds the three welcome parallax plates from the source renders, which are
// opaque RGB: the front plate ships on a green screen and the middle plate has
// the window painted in rather than hollow.
import sharp from "sharp";

const DIR = "public/assets/welcome";
const W = 2048;
const H = 1152;
const N = W * H;

const WINDOW = { x0: 818, x1: 1218, y0: 172, y1: 738, r: 139 };
const MIDDLE_ONLY = process.argv.includes("--middle-only");

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

function windowMask({ x0, x1, y0, y1, r }, rgb) {
  const mask = Buffer.alloc(N);
  const source = Buffer.from(rgb);
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const halfWidth = (x1 - x0) / 2;
  const halfHeight = (y1 - y0) / 2;
  const band = 8;
  const profileCount = 1024;
  const strokeHalfWidth = 1.2;
  const samplesPerAxis = 8;
  const luminance = (color) =>
    color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  const sample = (column, row) => {
    const left = Math.floor(column);
    const top = Math.floor(row);
    const horizontal = column - left;
    const vertical = row - top;
    return [0, 1, 2].map((channel) =>
      source[(top * W + left) * 3 + channel] * (1 - horizontal) * (1 - vertical) +
      source[(top * W + left + 1) * 3 + channel] * horizontal * (1 - vertical) +
      source[((top + 1) * W + left) * 3 + channel] * (1 - horizontal) * vertical +
      source[((top + 1) * W + left + 1) * 3 + channel] * horizontal * vertical,
    );
  };

  const boundaryAt = (angle) => {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const horizontalRadius = halfWidth / Math.abs(directionX);
    const verticalRadius = halfHeight / Math.abs(directionY);
    let radius;
    let normalX;
    let normalY;
    if (horizontalRadius * Math.abs(directionY) <= halfHeight - r) {
      radius = horizontalRadius;
      normalX = Math.sign(directionX);
      normalY = 0;
    } else if (verticalRadius * Math.abs(directionX) <= halfWidth - r) {
      radius = verticalRadius;
      normalX = 0;
      normalY = Math.sign(directionY);
    } else {
      const cornerX = Math.sign(directionX) * (halfWidth - r);
      const cornerY = Math.sign(directionY) * (halfHeight - r);
      const projection = directionX * cornerX + directionY * cornerY;
      radius = projection + Math.sqrt(
        r * r - cornerX * cornerX - cornerY * cornerY + projection * projection,
      );
      normalX = (directionX * radius - cornerX) / r;
      normalY = (directionY * radius - cornerY) / r;
    }
    return {
      column: centerX + directionX * radius,
      row: centerY + directionY * radius,
      radius,
      normalX,
      normalY,
      projection: directionX * normalX + directionY * normalY,
    };
  };

  const profiles = Array.from({ length: profileCount }, (_, index) => {
    const boundary = boundaryAt(index * Math.PI * 2 / profileCount);
    let ink = null;
    let inkLuminance = 100;
    let inkOffset = 0;
    for (let offset = band; offset >= -band; offset -= 0.25) {
      const color = [-3, -2, -1, 0, 1, 2, 3]
        .map((tangent) => sample(
          boundary.column + boundary.normalX * offset - boundary.normalY * tangent,
          boundary.row + boundary.normalY * offset + boundary.normalX * tangent,
        ))
        .sort((first, second) => luminance(first) - luminance(second))[3];
      const brightness = luminance(color);
      if (brightness < inkLuminance) {
        ink = color;
        inkLuminance = brightness;
        inkOffset = offset;
      } else if (ink && brightness > inkLuminance + 8) {
        break;
      }
    }
    if (!ink) throw new Error(`Window outline missing at profile ${index}`);
    return { ink, offset: inkOffset };
  });
  const offsets = profiles.map((_, index) => {
    let sum = 0;
    let weights = 0;
    for (let neighbor = -9; neighbor <= 9; neighbor++) {
      const weight = Math.exp(-(neighbor * neighbor) / 18);
      sum += profiles[(index + neighbor + profileCount) % profileCount].offset * weight;
      weights += weight;
    }
    return sum / weights;
  });
  const inkColor = [0, 1, 2].map((channel) =>
    profiles.map((profile) => profile.ink[channel]).sort((first, second) => first - second)[
      profileCount / 2
    ],
  );

  for (let row = y0 - band; row <= y1 + band; row++) {
    for (let column = x0 - band; column <= x1 + band; column++) {
      const deltaX = column - centerX;
      const deltaY = row - centerY;
      const angle = (Math.atan2(deltaY, deltaX) + Math.PI * 2) % (Math.PI * 2);
      const boundary = boundaryAt(angle);
      const profilePosition = angle * profileCount / (Math.PI * 2);
      const profileIndex = Math.floor(profilePosition);
      const fraction = profilePosition - profileIndex;
      const offset = offsets[profileIndex] * (1 - fraction) +
        offsets[(profileIndex + 1) % profileCount] * fraction;
      const distance = (Math.hypot(deltaX, deltaY) - boundary.radius) *
        boundary.projection - offset;
      const index = row * W + column;
      if (distance < -strokeHalfWidth - 1) {
        mask[index] = 255;
        continue;
      }
      if (distance > 3.5) continue;

      const rim = sample(
        boundary.column + boundary.normalX * (offset + 4),
        boundary.row + boundary.normalY * (offset + 4),
      );
      const rimBlend = Math.max(0, Math.min(1, (distance - 2) / 1.5));
      let inkCoverage = 0;
      let rimCoverage = 0;
      for (let sampleY = 0; sampleY < samplesPerAxis; sampleY++) {
        for (let sampleX = 0; sampleX < samplesPerAxis; sampleX++) {
          const coverageDistance = distance +
            ((sampleX + 0.5) / samplesPerAxis - 0.5) * boundary.normalX +
            ((sampleY + 0.5) / samplesPerAxis - 0.5) * boundary.normalY;
          if (coverageDistance > strokeHalfWidth) rimCoverage++;
          else if (coverageDistance >= -strokeHalfWidth) inkCoverage++;
        }
      }
      const coverage = inkCoverage + rimCoverage;
      mask[index] = Math.round(255 * (1 - coverage / (samplesPerAxis * samplesPerAxis)));
      if (coverage > 0) {
        for (let channel = 0; channel < 3; channel++) {
          const rimColor = rim[channel] * (1 - rimBlend) +
            source[index * 3 + channel] * rimBlend;
          rgb[index * 3 + channel] = Math.round(
            (inkColor[channel] * inkCoverage + rimColor * rimCoverage) / coverage,
          );
        }
      }
    }
  }
  return mask;
}

const write = (rgb, alpha, name, alphaQuality = 90, quality = 82) =>
  sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
    .webp({ quality, alphaQuality })
    .toFile(`${DIR}/${name}.webp`);

const front = MIDDLE_ONLY ? null : chromaKey(await raw("layer-front.png"));
if (front) await write(front.rgb, front.alpha, "layer-front");

// The frame is everything outside the opening; the stroke around the glass is
// part of the wall, so the hole stops just inside it.
const middle = await raw("layer-middle.png");
const hole = windowMask(WINDOW, middle);
const wall = Buffer.alloc(N);
for (let i = 0; i < N; i++) wall[i] = 255 - hole[i];
await write(middle, wall, "layer-middle", 100, 94);

if (!MIDDLE_ONLY) {
  await sharp(`${DIR}/layer-far.png`).webp({ quality: 84 }).toFile(`${DIR}/layer-far.webp`);
}

let opaque = 0;
if (front) {
  for (let i = 0; i < N; i++) if (front.alpha[i] > 127) opaque++;
}
const pct = (v, total) => +((100 * v) / total).toFixed(3);
console.log(`canvas ${W}x${H}`);
if (front) console.log(`front matte coverage ${((100 * opaque) / N).toFixed(1)}%`);
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
