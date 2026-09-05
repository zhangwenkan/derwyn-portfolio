/* Refraction pass for the cabin window, ported from codrops/RainEffect
   (src/shaders/water.frag + src/rain-renderer.js, Lucas Bebber).

   This is the half that makes the drops read as glass. rainDrops.ts stamps a normal
   map into a hidden 2D canvas; this shader reads two channels out of it as a slope
   and uses that slope to offset where it samples the view behind the pane. So a
   drop does not have a highlight painted on it -- it shows the scene bent through
   it, magnified and flipped, which is what a real bead does and what no amount of
   SVG gradient can fake.

   Channel layout, measured off drop-color.png: R ramps 128->0 down y, G ramps
   254->2 across x, B is left at 0 for rainDrops.ts to screen thickness into. The
   shader takes x from green, y from red -- that is the original's mapping, and
   swapping them tilts every drop's lens 90 degrees.

   The one thing to understand before touching u_minRefraction: the original refracts
   a 96x64 texture. Drop interiors there are a blurred wash, and that is exactly why
   it can afford to offset the sample by a quarter of the pane. Refracting a sharp
   full-resolution plate instead forces the offset down to almost nothing to keep the
   interiors legible, and the drops stop reading as lenses. So the soft texture below
   is not an optimisation -- it is what buys the refraction strength.

   Departures from the original, all forced by where this runs:

   - No parallax uniforms. They exist to slide the background against pointer
     movement; this pane sits in a plate GSAP already pushes in, and a second offset
     would fight it.
   - No composite against an opaque background. The original ends on
     blend(bg, fg); this canvas sits over a hole punched clean through the wall art,
     so it outputs premultiplied alpha and lets the real plate show through wherever
     there is no drop. That also keeps the view through the window sharp -- only the
     drops are soft, which is the right way round.
   - An extra mask sampler. The hole is not a rectangle: its corners are rounded, so
     7.29% of the canvas rect is wall. Without the mask, drops render over the cabin.

   No shine and no shadow pass: the demo runs both off null textures. */

const WATER_VERT = `
attribute vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const WATER_FRAG = `
precision highp float;
uniform sampler2D u_waterMap;
uniform sampler2D u_textureFg;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;
uniform float u_brightness;

vec2 pixel() {
  return vec2(1.0, 1.0) / u_resolution;
}

vec2 texCoord() {
  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
}

void main() {
  vec2 uv = texCoord();
  vec4 cur = texture2D(u_waterMap, uv);

  float d = cur.b;
  float x = cur.g;
  float y = cur.r;

  float a = clamp(cur.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);
  a *= 1.0 - texture2D(u_mask, uv).a;

  vec2 refraction = (vec2(x, y) - 0.5) * 2.0;
  vec2 refracted = uv + pixel() * refraction * (u_minRefraction + d * u_refractionDelta);

  vec4 tex = texture2D(u_textureFg, refracted);

  gl_FragColor = vec4(tex.rgb * u_brightness * a, a);
}`;

export type WaterOptions = {
  minRefraction: number;
  maxRefraction: number;
  brightness: number;
  alphaMultiply: number;
  alphaSubtract: number;
};

// Texels across the pane's width for the refracted texture. The original's fg is 96
// wide over its full uv, so this is that same density, and the same reason: the
// refraction offset is large enough that anything sharper turns drop interiors into
// noise instead of a bent view.
const SOFT_WIDTH = 96;

export const createWaterRenderer = (
  canvas: HTMLCanvasElement,
  waterMap: HTMLCanvasElement,
  background: HTMLImageElement | HTMLCanvasElement,
  // layer-middle, sampled for its alpha so the rounded corners of the hole clip the
  // drops. Passed as the plate rather than a traced path: the outline is hand-drawn
  // and no fitted shape matches it.
  wall: HTMLImageElement,
  // The aperture in the plates' own pixels.
  crop: { x: number; y: number; w: number; h: number },
  options: WaterOptions,
) => {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const scratch = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    draw(ctx);
    return c;
  };

  const softH = Math.max(1, Math.round((SOFT_WIDTH * crop.h) / crop.w));
  let stage = scratch(crop.w, crop.h, () => {});
  if (!stage) return null;
  const levels = [stage];
  while (stage.width > SOFT_WIDTH * 2) {
    const half = Math.max(SOFT_WIDTH, stage.width >> 1);
    const height = Math.max(softH, stage.height >> 1);
    const next = scratch(half, height, () => {});
    if (!next) return null;
    stage = next;
    levels.push(stage);
  }
  const soft = scratch(SOFT_WIDTH, softH, () => {});

  // The wall mask, at the aperture's own resolution so the corner cut stays crisp.
  const mask = scratch(crop.w, crop.h, (c) =>
    c.drawImage(wall, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h),
  );
  if (!soft || !mask) return null;
  levels.push(soft);
  const contexts = levels.map((level) => level.getContext("2d")!);

  const updateSource = (source: HTMLImageElement | HTMLCanvasElement) => {
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height || !wall.naturalWidth || !wall.naturalHeight) return;
    const scaleX = width / wall.naturalWidth;
    const scaleY = height / wall.naturalHeight;
    contexts[0].clearRect(0, 0, crop.w, crop.h);
    contexts[0].drawImage(
      source,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.w * scaleX,
      crop.h * scaleY,
      0,
      0,
      crop.w,
      crop.h,
    );
    for (let index = 1; index < levels.length; index++) {
      const target = levels[index];
      contexts[index].clearRect(0, 0, target.width, target.height);
      contexts[index].drawImage(levels[index - 1], 0, 0, target.width, target.height);
    }
  };
  updateSource(background);

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, WATER_VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, WATER_FRAG));
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  const bind = (unit: number, source: TexImageSource | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    // Clamped: the refraction offset walks uv past the edge at the pane's border,
    // and wrapping there would pull the far side of the view into a drop.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
  };

  bind(0, null);
  bind(1, soft);
  bind(2, mask);

  const loc = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(loc("u_waterMap"), 0);
  gl.uniform1i(loc("u_textureFg"), 1);
  gl.uniform1i(loc("u_mask"), 2);
  gl.uniform1f(loc("u_minRefraction"), options.minRefraction);
  gl.uniform1f(
    loc("u_refractionDelta"),
    options.maxRefraction - options.minRefraction,
  );
  gl.uniform1f(loc("u_brightness"), options.brightness);
  gl.uniform1f(loc("u_alphaMultiply"), options.alphaMultiply);
  gl.uniform1f(loc("u_alphaSubtract"), options.alphaSubtract);

  const resLoc = loc("u_resolution");
  gl.clearColor(0, 0, 0, 0);

  const resize = () => {
    // The water map's resolution is fixed by the simulation, and the shader reads
    // it 1:1 through gl_FragCoord, so the backing store has to match it rather
    // than the element's laid-out box. The element is scaled by CSS instead.
    const w = waterMap.width;
    const h = waterMap.height;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(resLoc, w, h);
  };
  resize();

  return {
    resize,
    updateBackground: (source: HTMLImageElement | HTMLCanvasElement) => {
      updateSource(source);
      gl.activeTexture(gl.TEXTURE1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, soft);
    },
    draw: () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, waterMap);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    clear: () => gl.clear(gl.COLOR_BUFFER_BIT),
  };
};
