"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import styles from "./WelcomeIntro.module.css";

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
const LOADING_WALK_MIN = 5;
const LOADING_WALK_MAX = 7;

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
  const loaderSheetRef = useRef<HTMLImageElement | null>(null);
  const loaderFrameRef = useRef(0);
  const loaderRafRef = useRef<number | null>(null);
  const loaderLastTimeRef = useRef(0);
  const loaderWalkRef = useRef<gsap.core.Tween | null>(null);
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
  }, []);

  const startLoader = useCallback(() => {
    const canvas = loaderRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    const sheet = loaderSheetRef.current;
    if (!canvas || !ctx || !sheet) return;
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
    gsap.set(canvas, { x: 0 });
    const rect = canvas.getBoundingClientRect();
    const travel =
      (rootRef.current?.clientWidth ?? rect.right) - rect.width - rect.left * 2;
    loaderWalkRef.current?.kill();
    loaderWalkRef.current = gsap.to(canvas, {
      x: Math.max(0, travel),
      duration: gsap.utils.random(LOADING_WALK_MIN, LOADING_WALK_MAX),
      ease: "none",
    });
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
    const loader = loaderRef.current;
    const video = dogVideoRef.current;
    if (!root || !stage || !far || !middle || !front || !loader || !video) return;

    tlRef.current?.kill();
    tlRef.current = null;
    gsap.set([far, middle, front], { clearProps: "all" });
    gsap.set([stage, loader], { opacity: 1 });
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
      tl.set([stage, loader], { opacity: 1 }, 0);
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
      tl.to([stage, loader], { opacity: 0, ease: "power2.inOut", duration: 0.65 }, 2.9);
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
        <canvas
          ref={loaderRef}
          className={styles.loader}
          width={LOADING_FRAME_W}
          height={LOADING_FRAME_H}
          aria-hidden="true"
        />
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
