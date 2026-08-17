"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import styles from "./WelcomeIntro.module.css";

gsap.registerPlugin(CustomEase);

const LAYERS = [
  "/assets/welcome/layer-far.webp",
  "/assets/welcome/layer-middle.webp",
  "/assets/welcome/layer-front.webp",
];

// Alpha-packed H.264: colour in the top half of every frame, the matte as
// greyscale underneath, recombined on the GPU. H.264 carries no alpha channel,
// and the codecs that do lose it in a major browser -- Safari decodes VP9
// without its alpha plane, and HEVC-with-alpha only comes out of VideoToolbox.
//
// Video rather than a sprite sheet because the motion sits in four bursts of
// 14/5/7/14 frames separated by ~900ms holds: 40 of the 124 frames carry the
// movement, so subsampling eats the bursts first and the poses read as
// teleports. Keeping all 124 frames in one image needs 36 Mpx at this size, past
// what browsers will decode as a single bitmap; inter-frame prediction makes the
// 84 hold frames nearly free instead.
const DOG_VIDEO = "/assets/welcome/dog-alpha.mp4";
const DOG_W = 1038;
const DOG_H = 1046;

const DOG_VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
  // texImage2D puts the clip's first row at t=0, so v runs top-down, and the
  // quarter scale confines it to the top half: colour rows are uv.y, matte rows
  // are uv.y + 0.5.
  uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.25);
}`;

// highp, not the usual mediump: the matte rows sit at v around 0.5-1.0, where
// mediump resolves to about 1/1024 while one texel row of this 2092-row clip is
// 1/2092. Halving the addressable resolution would sample the wrong row.
//
// Only green is read from the matte. It was written to all three channels, but
// the clip is yuv420p, where a grey pixel is luma with neutral chroma: red and
// blue come back carrying any chroma error amplified by the 1.402/1.772
// coefficients, while green stays closest to the untouched luma.
//
// The 4x4 tap grid is a box filter over the destination pixel's footprint, since
// the sprite is drawn about 3x smaller than the clip. One bilinear tap reads only
// a 2x2 texel neighbourhood, so at that reduction it skips source texels: the
// silhouette stepped and the thin black line art broke into dashes. Taps are
// summed premultiplied, which is the only form in which colour and alpha can be
// averaged together without transparent texels dragging their colour in, and it
// is also what the canvas expects back.
//
// Offsets stay inside each half by construction, so no clamp is needed: uv.y is
// at worst a quarter of a destination pixel from the 0.0/0.5 seam, while the
// largest offset is 0.1875 of one, so a colour tap can never reach into the
// matte rows below it.
const DOG_FRAG = `
precision highp float;
uniform sampler2D tex;
uniform vec2 tap;
varying vec2 uv;
void main() {
  vec4 sum = vec4(0.0);
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      vec2 s = uv + (vec2(float(i), float(j)) * 0.25 - 0.375) * tap;
      float a = texture2D(tex, vec2(s.x, s.y + 0.5)).g;
      vec3 c = texture2D(tex, s).rgb;
      sum += vec4(c * a, a);
    }
  }
  gl_FragColor = sum * 0.0625;
}`;

const createDogCompositor = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
) => {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, DOG_VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, DOG_FRAG));
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

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  // Non-power-of-two source, so clamped and unmipped is the only legal setup.
  // That rules out mipmaps as the answer to minification, which is why the
  // fragment shader filters by hand.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);
  const tapLoc = gl.getUniformLocation(program, "tap");

  // The backing store follows the element's own box rather than the clip's size.
  // A fixed 1038px store looked like the safe choice, but the sprite is laid out
  // at a share of the stage -- about 323px on a 1600px viewport -- so the browser
  // was left minifying the canvas 3.2x with a 2-tap filter it gives no control
  // over. Drawing at the size it is actually shown at moves that resampling into
  // the shader, where the tap grid can cover the whole footprint.
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.min(DOG_W, Math.round(canvas.clientWidth * dpr)));
    const h = Math.max(1, Math.min(DOG_H, Math.round(canvas.clientHeight * dpr)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    // One destination pixel measured in uv. Vertically the quad spans half the
    // texture, so the height that matters is 0.5, not 1.0.
    gl.uniform2f(tapLoc, 1 / w, 0.5 / h);
  };
  resize();

  return {
    resize,
    draw: () => {
      if (video.readyState < 2) return;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    clear: () => gl.clear(gl.COLOR_BUFFER_BIT),
  };
};

// Keyed by scripts/prepare-loading-frames.mjs into a 5x4 grid of 496x361 cells.
// The cells are 2x the on-screen size so the sprite stays sharp on HiDPI.
const LOADING_SHEET = "/assets/welcome/loading-frames.avif";
const LOADING_COLS = 5;
const LOADING_FRAME_COUNT = 20;
const LOADING_FRAME_W = 496;
const LOADING_FRAME_H = 361;
const LOADING_FRAME_DURATION = 1000 / 20;
const LOADING_WALK_MIN = 9;
const LOADING_WALK_MAX = 10;

const LOADING_LINES = [
  "Passenger, please refrain from breakdancing in your seat",
  "Please don't tap the viewport — aliens get shy",
  "The cart's dodging asteroids — slight space traffic jam",
  "Sorry, the cart slowed down passing a black hole",
  "Drinks are undergoing zero-g calibration",
  "Your space soda is on its way",
  "Your space snacks are currently en route",
  "Cabin service delayed — attendant is petting the ship's space cat",
  "Loading cosmic-grade refreshments. Please stand by",
  "Loading slow? Try counting stars while you wait",
];

// Everything in a balloon beat except the hold is fixed, so the walk minus this
// overhead is the reading budget the drawn lines share out between them.
const BUBBLE_LEAD = 0.9;
const BUBBLE_TAIL = 0.8;
const BUBBLE_IN = 0.34;
const BUBBLE_OUT = 0.26;
const BUBBLE_GAP = 0.2;

// Odometer on the cart's front panel. Every column reads the same 0-100 walk
// progress divided down, which is the gearing a mechanical counter has: the tens
// advance a tenth as often as the units and the hundreds turn once over the run.
const METER_COLUMNS = [100, 10, 1];

// What a column shows at a given reading. An upper wheel that has not been reached
// yet rests on nothing rather than on a 0, so the counter never displays a leading
// zero it has not earned.
const meterFace = (value: number, divisor: number) => {
  const wheel = Math.floor(value / divisor);
  return wheel === 0 && divisor > 1 ? "" : String(wheel % 10);
};

// How far the counter may jump at once. Any size in the range, so the readings are
// arbitrary numbers rather than multiples of one step, which is what stops the
// meter from reading as a metronome. The jumps always total 100, so this range is
// also the frequency control: a wider draw means fewer stops over the same walk and
// a longer look at each one. The floor matters most -- it caps how many stops the
// draw can possibly produce, and so how little time the narrowest gap can have.
const METER_JUMP_MIN = 3;
const METER_JUMP_MAX = 14;

// Hold weight every stop gets before its own jump is added. Not a brake -- the
// stops are spread over a fixed walk either way -- but the split between the part
// of each gap that is shared equally and the part a wide jump earns for itself.
// Lower for more varied pacing, higher for flatter.
const METER_HOLD = 12;

// A reading is replaced rather than rolled to: on every stop the whole readout is
// blanked and brought back in, fading up through a short rise and a blur. Rise and
// blur are in em because the readout is sized off the cart, so its font size moves
// with the viewport and a px gesture would grow heavier as the sprite shrinks. The
// rise is kept just inside the space a centred glyph has below it, which is what
// lets the window go unclipped.
const METER_POP = 0.5;
const METER_POP_RISE = "0.3em";
const METER_POP_BLUR = "0.09em";

// Delay between one column and the next, so the readout arrives as a wave running
// down from the highest wheel rather than as one flash. Animating only the columns
// whose glyph changed was the obvious alternative and it reads far worse: the units
// carry nearly every stop on their own, so the gesture all but disappears, and the
// stops that do turn several wheels then stand out as the whole number flickering.
const METER_POP_STAGGER = 0.07;

// Share of a reading's own time the wave may take. This is the full gesture on all
// but the tightest gaps, and the cap is what keeps a narrow one from having a column
// still arriving when the next jump replaces it -- since the jumps are drawn at
// random, the closest pair of stops is not known until they are drawn. Stagger and
// rise are scaled together by it, which holds the wave's shape steady instead of
// bunching the columns up against each other. The remainder is the reading standing
// still, which every stop is guaranteed some of.
const METER_POP_SHARE = 0.8;

// Overshoots a few percent, so a digit settles instead of easing to a dead stop.
// Kept slight: over a rise this short, a springier curve reads as a twitch.
const METER_POP_EASE = CustomEase.create(
  "meterPop",
  "M0,0 C0.34,1.45 0.64,1 1,1",
);

// Stops from 0 to exactly 100, each with the share of the walk it is reached at.
const meterStops = () => {
  const jumps: number[] = [];
  for (let sum = 0; sum < 100; ) {
    const jump = Math.min(
      gsap.utils.random(METER_JUMP_MIN, METER_JUMP_MAX, 1),
      100 - sum,
    );
    sum += jump;
    jumps.push(jump);
  }
  // Jumps always total 100, so the weights total this whatever the draw was.
  // Normalising them into shares is what lands the last stop exactly as the walker
  // arrives, and it means the pauses stay proportioned to each other rather than
  // to any absolute clock.
  const total = jumps.length * METER_HOLD + 100;
  let value = 0;
  let held = 0;
  return jumps.map((jump) => {
    value += jump;
    held += METER_HOLD + jump;
    return { value, at: held / total };
  });
};

const loadImages = (sources: string[]) =>
  Promise.all(
    sources.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = src;
        }),
    ),
  );

const SEEN_KEY = "derwyn:welcome-seen";
const DURATION = 3.2;
const DEV = process.env.NODE_ENV !== "production";

const preload = (sources: string[]) =>
  Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );

export default function WelcomeIntro() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const dogRef = useRef<HTMLCanvasElement>(null);
  const dogVideoRef = useRef<HTMLVideoElement>(null);
  const dogGLRef = useRef<ReturnType<typeof createDogCompositor>>(null);
  const dogCancelRef = useRef<(() => void) | null>(null);
  const loaderRef = useRef<HTMLCanvasElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLParagraphElement>(null);
  const meterDigitsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const loaderSheetRef = useRef<HTMLImageElement | null>(null);
  const loaderFrameRef = useRef(0);
  const loaderRafRef = useRef<number | null>(null);
  const loaderLastTimeRef = useRef(0);
  const loaderWalkRef = useRef<gsap.core.Timeline | null>(null);
  const loaderBubbleRef = useRef<gsap.core.Timeline | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const loopRef = useRef(false);
  const [looping, setLooping] = useState(false);

  const stopDog = useCallback(() => {
    dogCancelRef.current?.();
    dogCancelRef.current = null;
    dogVideoRef.current?.pause();
  }, []);

  const startDog = useCallback(() => {
    const canvas = dogRef.current;
    const video = dogVideoRef.current;
    if (!canvas || !video) return;
    dogGLRef.current ??= createDogCompositor(canvas, video);
    const dog = dogGLRef.current;
    if (!dog) return;
    // Replay re-enters play() without tearing down first, so an already-running
    // loop has to be cancelled or it keeps drawing alongside the new one.
    dogCancelRef.current?.();

    // The backing store is sized from the layout box, so it has to be recomputed
    // when the box changes. Resizing clears the canvas, and the clip holds still
    // for most of its length, so the frame has to be redrawn rather than waited
    // for.
    const onResize = () => {
      dog.resize();
      dog.draw();
    };
    window.addEventListener("resize", onResize);

    // One texture upload per presented frame. requestVideoFrameCallback knows
    // when a new frame has arrived; the fallback gates on the playback position
    // instead, so a 24fps clip is not re-uploaded as a 2.2 Mpx texture on all 60
    // of a display's refreshes.
    const vfc = typeof video.requestVideoFrameCallback === "function";
    let handle = 0;
    let shown = -1;
    const tick = () => {
      if (vfc || video.currentTime !== shown) {
        shown = video.currentTime;
        dog.draw();
      }
      handle = vfc
        ? video.requestVideoFrameCallback(tick)
        : requestAnimationFrame(tick);
    };
    handle = vfc
      ? video.requestVideoFrameCallback(tick)
      : requestAnimationFrame(tick);
    dogCancelRef.current = () => {
      window.removeEventListener("resize", onResize);
      if (vfc) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, []);

  const stopLoader = useCallback(() => {
    if (loaderRafRef.current !== null) {
      cancelAnimationFrame(loaderRafRef.current);
      loaderRafRef.current = null;
    }
    loaderWalkRef.current?.kill();
    loaderWalkRef.current = null;
    loaderBubbleRef.current?.kill();
    loaderBubbleRef.current = null;
  }, []);

  const startLoader = useCallback(() => {
    const canvas = loaderRef.current;
    const walker = walkerRef.current;
    const bubble = bubbleRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    const sheet = loaderSheetRef.current;
    if (!canvas || !walker || !bubble || !ctx || !sheet) return;
    loaderFrameRef.current = 0;
    loaderLastTimeRef.current = 0;
    // Blitting exact cell rects out of the sheet, rather than stepping a CSS
    // background, is what keeps neighbouring frames from bleeding in when the
    // canvas lands on a fractional device pixel.
    const drawFrame = (idx: number) => {
      ctx.clearRect(0, 0, LOADING_FRAME_W, LOADING_FRAME_H);
      ctx.drawImage(
        sheet,
        (idx % LOADING_COLS) * LOADING_FRAME_W,
        Math.floor(idx / LOADING_COLS) * LOADING_FRAME_H,
        LOADING_FRAME_W,
        LOADING_FRAME_H,
        0,
        0,
        LOADING_FRAME_W,
        LOADING_FRAME_H,
      );
    };
    drawFrame(0);
    const tick = (time: number) => {
      if (loaderLastTimeRef.current === 0) loaderLastTimeRef.current = time;
      let advanced = false;
      while (time - loaderLastTimeRef.current >= LOADING_FRAME_DURATION) {
        loaderLastTimeRef.current += LOADING_FRAME_DURATION;
        loaderFrameRef.current =
          (loaderFrameRef.current + 1) % LOADING_FRAME_COUNT;
        advanced = true;
      }
      if (advanced) drawFrame(loaderFrameRef.current);
      loaderRafRef.current = requestAnimationFrame(tick);
    };
    loaderRafRef.current = requestAnimationFrame(tick);

    // Distance is measured off the live layout instead of expressed in CSS
    // units so the walker lands the same margin short of the right edge as it
    // starts from the left, at any viewport width. Linear ease keeps the stride
    // reading at a constant pace against the looping frames.
    gsap.set(walker, { x: 0 });
    const rect = walker.getBoundingClientRect();
    const travel =
      (rootRef.current?.clientWidth ?? rect.right) - rect.width - rect.left * 2;
    loaderWalkRef.current?.kill();
    const walk = gsap.utils.random(LOADING_WALK_MIN, LOADING_WALK_MAX);
    // Walk and readout ride one timeline rather than sibling tweens, so however
    // the walk is seeked, killed or restarted the readout goes with it and 100
    // still lands on arrival. Between stops the two only track loosely: pauses are
    // proportioned by hold weight, not by distance.
    const walkTl = gsap.timeline();
    walkTl.to(
      walker,
      { x: Math.max(0, travel), duration: walk, ease: "none" },
      0,
    );
    const stops = meterStops();
    // Which columns are still collapsed, carried forward stop by stop. The glyphs
    // themselves are not tracked -- every column re-enters on every stop -- but a
    // width only has to be opened the once.
    const blank = METER_COLUMNS.map((divisor) => meterFace(0, divisor) === "");
    METER_COLUMNS.forEach((divisor, i) => {
      const digit = meterDigitsRef.current[i];
      if (!digit) return;
      walkTl.set(
        digit,
        {
          textContent: meterFace(0, divisor),
          y: 0,
          opacity: 1,
          filter: "blur(0em)",
        },
        0,
      );
      // Collapsed, not just blank: a leading wheel that still reads nothing must
      // not hold a column's worth of space either, or the reading sits off-centre
      // in the window. Cleared rather than tweened back so the width returns to
      // the stylesheet's em and survives a resize mid-walk.
      if (blank[i]) walkTl.set(digit.parentElement, { width: 0 }, 0);
    });
    stops.forEach((stop, t) => {
      const at = walk * stop.at;
      // Flooring inside meterFace is the gearing: a wheel only turns once the one
      // below it has wrapped, which is what keeps the upper digits on a whole
      // number instead of half-way between two.
      const faces = METER_COLUMNS.map((divisor) =>
        meterFace(stop.value, divisor),
      );
      // The wave is only as long as the columns that are actually showing, so a
      // two-digit reading is not paced as if it had a hundreds wheel to wait for.
      const live = faces.reduce((n, face) => n + (face === "" ? 0 : 1), 0);
      const full = (live - 1) * METER_POP_STAGGER + METER_POP;
      // How much of the gesture fits. The last stop is not followed by another, so
      // its wave is free to run on past the walk; nothing is going to overwrite it.
      const next = stops[t + 1];
      const fit = next
        ? Math.min(1, (walk * (next.at - stop.at) * METER_POP_SHARE) / full)
        : 1;
      let order = 0;
      faces.forEach((face, i) => {
        const digit = meterDigitsRef.current[i];
        if (!digit || face === "") return;
        // Opened before the wave reaches it, so the digit rises into a window that
        // is already there rather than pushing one open as it goes.
        if (blank[i]) {
          walkTl.set(digit.parentElement, { clearProps: "width" }, at);
          blank[i] = false;
        }
        // The whole reading is swapped and hidden here, at the stop, before any
        // column starts arriving. That is what makes the stagger safe: what shows
        // part-way through the wave is part of the new reading -- 1, then 10, then
        // 100 -- rather than new digits mixed into the old ones, which on a carry
        // would briefly spell a number the counter never passed through.
        walkTl.set(
          digit,
          {
            textContent: face,
            y: METER_POP_RISE,
            opacity: 0,
            filter: `blur(${METER_POP_BLUR})`,
          },
          at,
        );
        walkTl.to(
          digit,
          {
            y: 0,
            opacity: 1,
            // 0em, not 0px: GSAP interpolates a filter string by pairing up the
            // numbers in it and takes the unit from the end value, so a px target
            // would quietly retune the blur to 0.09px and cancel it out.
            filter: "blur(0em)",
            duration: METER_POP * fit,
            ease: METER_POP_EASE,
          },
          at + order * METER_POP_STAGGER * fit,
        );
        order += 1;
      });
    });
    loaderWalkRef.current = walkTl;

    // Two or three lines per pass, drawn by shuffling rather than by sampling
    // one at a time, which is what stops a pass from repeating itself.
    const lines = gsap.utils
      .shuffle(LOADING_LINES.slice())
      .slice(0, gsap.utils.random(2, 3, 1));
    const chars = lines.reduce((sum, line) => sum + line.length, 0);
    // Reading budget left once the fixed beats are paid for, split by length:
    // the longest line is more than twice the shortest, so equal holds would
    // either rush it or leave the short ones sitting there.
    const budget =
      walk -
      BUBBLE_LEAD -
      BUBBLE_TAIL -
      lines.length * (BUBBLE_IN + BUBBLE_OUT) -
      (lines.length - 1) * BUBBLE_GAP;

    loaderBubbleRef.current?.kill();
    const bubbleTl = gsap.timeline();
    // Growing out of the tail root, not the centre, is what makes it read as
    // spoken rather than as a panel fading up.
    bubbleTl.set(
      bubble,
      { rotation: -2.5, transformOrigin: "13% 100%", scale: 0.15, opacity: 0 },
      0,
    );
    let at = BUBBLE_LEAD;
    for (const line of lines) {
      const hold = (budget * line.length) / chars;
      // Swapped while the balloon is collapsed, so its reflow is never seen.
      bubbleTl.call(() => void (bubble.textContent = line), undefined, at);
      bubbleTl.to(
        bubble,
        { scale: 1, opacity: 1, duration: BUBBLE_IN, ease: "back.out(2.6)" },
        at,
      );
      bubbleTl.to(
        bubble,
        { scale: 0.12, opacity: 0, duration: BUBBLE_OUT, ease: "back.in(2)" },
        at + BUBBLE_IN + hold,
      );
      at += BUBBLE_IN + hold + BUBBLE_OUT + BUBBLE_GAP;
    }
    loaderBubbleRef.current = bubbleTl;
  }, []);

  const stop = useCallback(() => {
    tlRef.current?.kill();
    tlRef.current = null;
    stopDog();
    stopLoader();
    const root = rootRef.current;
    if (root) delete root.dataset.playing;
    document.body.style.overflow = "";
  }, [stopDog, stopLoader]);

  const play = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const far = farRef.current;
    const middle = middleRef.current;
    const front = frontRef.current;
    const walker = walkerRef.current;
    const video = dogVideoRef.current;
    if (!root || !stage || !far || !middle || !front || !walker || !video) return;

    tlRef.current?.kill();
    tlRef.current = null;
    gsap.set([far, middle, front], { clearProps: "all" });
    gsap.set([stage, walker], { opacity: 1 });
    dogGLRef.current?.clear();
    root.dataset.playing = "true";
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    // React does not emit `muted` into the server-rendered markup, so the
    // attribute is missing at hydration and autoplay would be refused on the
    // first pass. Setting the property is what actually satisfies the policy.
    video.muted = true;
    video.currentTime = 0;

    void Promise.all([
      loadImages([LOADING_SHEET]),
      preload(LAYERS),
      // A refused autoplay must not stall the intro: the scene is the point and
      // the dog is a detail, so a rejection resolves like a success.
      video.play().catch(() => {}),
    ]).then(([[loaderSheet]]) => {
      if (rootRef.current?.dataset.playing !== "true") return;
      loaderSheetRef.current = loaderSheet;
      startDog();
      startLoader();

      const tl = gsap.timeline({
        repeat: loopRef.current ? -1 : 0,
        repeatDelay: 0.5,
        paused: true,
        onComplete: () => {
          if (!loopRef.current) stop();
        },
      });
      tlRef.current = tl;

      // Explicit zero-position state so each loop pass starts from scratch.
      tl.set([stage, walker], { opacity: 1 }, 0);
      tl.set([far, middle, front], { opacity: 1, display: "block" }, 0);
      tl.set([middle, front], { scale: 1, filter: "blur(0px)" }, 0);

      // Three planes share the window centre as their origin; the speed spread
      // between them is what sells the dolly through the glass. The far plane
      // is full frame, so it starts slightly overscanned to keep its own blurred
      // edge outside the viewport.
      tl.to(far, { scale: 1.75, ease: "power1.in", duration: DURATION }, 0);
      tl.fromTo(
        far,
        { scale: 1.06, filter: "blur(7px)" },
        { filter: "blur(0px)", ease: "sine.out", duration: 1.9 },
        0,
      );

      // The wall only has to grow until the window opening clears the viewport,
      // which happens around scale 5.1; the rest of the travel is overshoot so
      // the frame edges are long gone before the plane fades.
      tl.to(middle, { scale: 11, ease: "power2.in", duration: DURATION }, 0);
      tl.to(middle, { filter: "blur(5px)", ease: "power1.in", duration: 0.9 }, 2.0);
      tl.to(
        middle,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.7,
          onComplete: () => gsap.set(middle, { display: "none" }),
        },
        2.4,
      );

      // The window sits dead centre, so the camera flies straight through the
      // boy's seat. Defocusing the plane as it grows makes that read as a
      // foreground blur pass instead of a translucent cutout.
      tl.to(front, { scale: 13, ease: "power2.in", duration: DURATION * 0.9 }, 0);
      tl.to(front, { filter: "blur(14px)", ease: "power2.in", duration: 1.8 }, 0);
      tl.to(
        front,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.9,
          onComplete: () => gsap.set(front, { display: "none" }),
        },
        1.2,
      );

      // Fades the stage rather than the root so the controls stay reachable.
      tl.to([stage, walker], { opacity: 0, ease: "power2.inOut", duration: 0.65 }, 2.9);
    });
  }, [stop, startDog, startLoader]);

  const skip = useCallback(() => {
    loopRef.current = false;
    setLooping(false);
    const tl = tlRef.current;
    if (!tl) {
      stop();
      return;
    }
    tl.repeat(0);
    gsap.to(tl, { timeScale: 6, duration: 0.25, ease: "power1.in" });
  }, [stop]);

  const toggleLoop = useCallback(() => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLooping(next);
    tlRef.current?.repeat(next ? -1 : 0);
  }, []);

  useLayoutEffect(() => {
    const seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Stays mounted but hidden; the CSS default keeps it out of paint and hit
    // testing until data-playing flips, which is also what makes replay cheap.
    if (pathname !== "/" || seen || reduced) return;

    window.sessionStorage.setItem(SEEN_KEY, "1");
    play();
    return stop;
  }, [pathname, play, stop]);

  return (
    <>
      <div ref={rootRef} className={styles.root}>
        <div ref={stageRef} className={styles.stage} aria-hidden="true">
          <div ref={farRef} className={`${styles.layer} ${styles.far}`} />
          <div ref={middleRef} className={`${styles.layer} ${styles.middle}`} />
          <div ref={frontRef} className={`${styles.layer} ${styles.front}`} />
          {/* No width/height here: the compositor sizes the backing store from
              the laid-out box, and a stale attribute would just contradict it. */}
          <canvas ref={dogRef} className={styles.dog} aria-hidden="true" />
        </div>
        {/* Texture source for .dog, never painted itself. preload="none" keeps
            the fetch off every page load; play() is what pulls it down. */}
        <video
          ref={dogVideoRef}
          className={styles.dogSource}
          src={DOG_VIDEO}
          preload="none"
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div ref={walkerRef} className={styles.walker} aria-hidden="true">
          <canvas
            ref={loaderRef}
            className={styles.loader}
            width={LOADING_FRAME_W}
            height={LOADING_FRAME_H}
          />
          {/* Sits on the cart's front panel; .meter carries the registration. */}
          <div className={styles.meter}>
            <span className={styles.meterFace}>
              {METER_COLUMNS.map((divisor, i) => (
                <span key={divisor} className={styles.meterCol}>
                  {/* GSAP owns the text from here on, so the markup only seeds the
                      reading the counter starts on. */}
                  <span
                    className={styles.meterDigit}
                    ref={(el) => {
                      meterDigitsRef.current[i] = el;
                    }}
                  >
                    {meterFace(0, divisor)}
                  </span>
                </span>
              ))}
              <span className={styles.meterPct}>%</span>
            </span>
          </div>
          {/* Filled from LOADING_LINES as each beat comes up. */}
          <p ref={bubbleRef} className={styles.bubble} />
        </div>
        <div className={styles.controls}>
          {DEV ? (
            <>
              <button type="button" className={styles.btn} onClick={play}>
                重播
              </button>
              <button
                type="button"
                className={`${styles.btn} ${looping ? styles.btnOn : ""}`}
                onClick={toggleLoop}
                aria-pressed={looping}
              >
                {looping ? "循环中" : "循环"}
              </button>
            </>
          ) : null}
          <button type="button" className={styles.btn} onClick={skip}>
            跳过
          </button>
        </div>
      </div>
      {/* Sibling of the overlay: PageTransition's .view sets will-change, which
          would make a fixed launcher inside the page scroll with it. */}
      {DEV && pathname === "/" ? (
        <button
          type="button"
          className={`${styles.btn} ${styles.replayLauncher}`}
          onClick={play}
        >
          回到欢迎页
        </button>
      ) : null}
    </>
  );
}
