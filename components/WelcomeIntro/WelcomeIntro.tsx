"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { CabinMonitorShell } from "./CabinMonitorShell";
import { CabinMonitorSky, SKY_SPIN_SPAN } from "./CabinMonitorSky";
import { CabinVent } from "./CabinVent";
import { createRaindrops, type RainOptions } from "./rainDrops";
import { createWaterRenderer } from "./rainWater";
import {
  CloudLayer,
  CLOUD_IDLE_SPEED,
  CLOUD_FLIGHT_SPEED,
  type CloudLayerControls,
} from "./CloudLayer";
import styles from "./WelcomeIntro.module.css";

gsap.registerPlugin(CustomEase);

const LAYER_MIDDLE = "/assets/welcome/layer-middle.webp";
const LAYERS = [
  "/assets/cloud.png",
  LAYER_MIDDLE,
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

// Where the cycle is parked once she arrives. Picked from the existing sheet by
// eye: frame 15 has both feet flat on the ground with the legs crossed at rest --
// the natural standing pose -- while frame 19 holds one foot mid-lift. The source
// renders are not in the repo, so the pose has to come from one of the 20 frames
// as-is. 15 also sits close to the end of the cycle, keeping the parking jump small.
const LOADING_REST_FRAME = 15;

// Printable ASCII only. The balloon is set in Oxanium, whose file is subset to
// U+0020..U+007E, so anything outside that -- an em dash, a curly quote -- falls back
// mid-sentence to a system face and lands as a stroke several times heavier than the
// hairline around it. Spaced hyphens where a dash is wanted.
const LOADING_LINES = [
  "Passenger, please refrain from breakdancing in your seat",
  "Please don't tap the viewport - aliens get shy",
  "The cart's dodging asteroids - slight space traffic jam",
  "Sorry, the cart slowed down passing a black hole",
  "Drinks are undergoing zero-g calibration",
  "Your space soda is on its way",
  "Your space snacks are currently en route",
  "Cabin service delayed - attendant is petting the ship's space cat",
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

// Rain on the cabin window. The aperture is a hole punched clean through
// layer-middle.webp -- alpha is 0 across its whole interior -- so layer-far shows
// through it directly, which is also what the refraction pass samples.
//
// Measured off the plate's alpha edge: x819 y173, 399x565 of 2048x1152.
const RAIN_APERTURE = { x: 819, y: 173, w: 399, h: 565 };
const DROP_ALPHA = "/assets/welcome/drop-alpha.png";
const DROP_COLOR = "/assets/welcome/drop-color.png";

// The simulation runs at plate scale, so a drop radius here is a radius on the
// 2048-wide artwork and holds its apparent size at any viewport.
const RAIN_SCALE = 1;

// The original's live values, which are not the ones its Raindrops defaults declare:
// index.js overrides some in the constructor, then updateWeather() runs
// Object.assign(raindrops.options, weatherData.rain) over the top of that, and the
// weather profile wins. So the effective config is the constructor's collisionRadius
// 0.45 and dropletsCleaningRadiusMultiplier 0.28 -- neither is the 0.65/0.43 the
// defaults declare -- with the profile's collisionRadiusIncrease 0.0002, rainLimit 6,
// dropletsRate 50 and trailScaleRange [0.25, 0.35].
//
// Everything dimensionless is taken from that as-is. The radii, rates and time scale
// are not: the original is a full-window storm and this is one cabin window, so it is
// dialled back on three axes that are independent of each other.
//
// Original codrops/RainEffect defaults, kept verbatim except where the aperture forces
// a change. The only deliberate departure is rainPower, which the original hard-codes.
const RAIN_OPTIONS: RainOptions = {
  minR: 10,
  maxR: 40,
  rainPower: 3,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4],
  dropletsCleaningRadiusMultiplier: 0.43,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  trailScaleRange: [0.2, 0.5],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
};

// Refraction strength, in water-map pixels. The original's 256/512 is quoted against
// a full-window canvas, and the shader divides by resolution, so what it actually
// means is an offset of roughly a fifth of the pane's width. These are that same
// fraction re-expressed for a 399-wide pane -- the offset in uv matches the original
// rather than the number matching it.
//
// The reason such a large offset works there and not here used to be the whole
// problem: it refracts a 96x64 texture, so a drop's interior is a soft wash and the
// offset only has to move it convincingly. rainWater.ts now builds that same soft
// texture, which is what lets the strength come back up to the original's.
//
// Original defaults: alphaMultiply 20 / alphaSubtract 5 for a hard clip, brightness 1.04.
// No shine, no shadow, no lens shading — those were added to make drops visible on flat
// cartoon fill and are removed to match the original look.
const RAIN_WATER_OPTIONS = {
  minRefraction: 40,
  maxRefraction: 80,
  brightness: 1.04,
  alphaMultiply: 20,
  alphaSubtract: 5,
};

// Scroll cue. Drawn in the plate's own line language rather than as a UI chrome
// widget: same navy ink as the balloon, same uneven-stroke hand.
const CUE_IN = 0.7;
const CUE_OUT = 0.4;
// Wheel travel inside the mouse body, in the cue SVG's own units.
const CUE_WHEEL_TRAVEL = 7;
const CUE_CHEVRON_DROP = 5;

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

// Captain's broadcast on the port-wall monitor. A hand-drawn pixel portrait that
// already carries its own alpha, so nothing preprocesses it on the way in.
const TV_CAPTAIN = "/assets/welcome/captain.webp";

// Printable ASCII only, same constraint as the balloon copy: Oxanium is subset to
// U+0020..U+007E, so a curly apostrophe here would fall back mid-word to a system
// face several times heavier than the hairline around it.
const TV_LINES = ["Hey, I'm Captain King.", "Welcome aboard."];

// The plate's own starfield gets this long to be the thing the eye lands on, so
// the blank has something to take away rather than opening onto nothing. At
// TV_SPIN per revolution the window has to span a noticeable fraction of a turn,
// or the globe reads as a still and the spin lands nowhere.
const TV_LEAD = 2.3;

// How the starfield leaves. Two versions before this one both tried to make it the
// power-on run backwards -- collapse to a line, pinch to a dot -- and both read as the
// same ceremony performed twice, because that is what they were. Overlapping the beats
// and handing the dot over made the seam invisible without changing the fact that the
// eye was being shown one gesture and then its mirror.
//
// So the departure is no longer the arrival's inverse. Fog: the field is pulled apart
// into wisps and goes soft, drifting as it goes, and only the dark it leaves behind is
// shared with the power-on. Soft against hard, lateral against centred, organic against
// geometric -- nothing about it rhymes with the beam, which is the point.
const TV_FOG = 0.8;

// Displacement scale and blur at full fog, in plate px. The warp is what makes it fog
// rather than defocus: a blur alone is a camera losing focus, where a picture torn into
// streaks that then go soft is something passing in front of it.
const TV_FOG_WARP = 26;
const TV_FOG_BLUR = 4.5;

// The noise field's own frequency, start to end. Animating it is what makes the fog
// flow: the pattern doing the displacing keeps changing shape, so the smear rolls
// instead of sitting there as one frozen distortion. Coarsening as it thickens, because
// fine noise reads as grain and what this wants is volume.
const TV_FOG_FREQ_IN = 0.045;
const TV_FOG_FREQ_OUT = 0.011;

// Lateral drift while it dissolves, in plate px. Small on purpose -- it only has to give
// the dissolve a direction, and anything larger reads as the picture sliding off.
const TV_FOG_DRIFT = 9;

// Where in the fog the thinning starts, as a share of it. The warp and the blur get this
// much of a head start: a picture that begins fading on the first frame is a crossfade
// with a texture over it, and the tearing is the part that has to be seen.
const TV_FOG_LAG = 0.3;

// The plate goes dark this long before the dot, and holds there. Short enough to read as
// the set having nothing to show, long enough that the eye has registered dark by the
// time the beam lands on it. The veil rides exactly this window: it is opaque, so putting
// any of it over the dissolve would make it the thing taking the picture away, which is
// the curtain this whole beat exists to stop being. It belongs to the dark, not to the fog.
const TV_BLANK_HOLD = 0.16;

// CRT power-on, in the three beats the gesture actually has: the beam blooms at
// rest, stretches into a line, then the line opens into the raster. A single scale
// from zero was the obvious version and it reads as a panel zooming in -- what
// makes it a screen is that the horizontal arrives well before the vertical.
const TV_DOT_IN = 0.06;
const TV_DOT_HOLD = 0.2;
const TV_SWEEP = 0.18;
const TV_OPEN = 0.3;

// The dot, as a share of the screen it is a share of. Both axes land near 6px of
// the source plate, which with the raster's 50% radius is what makes it round
// rather than a stubby bar.
const TV_DOT_X = 0.0375;
const TV_DOT_Y = 0.0405;

// Concentrated beam, washed out to near-white. Saturation has to come down with
// the brightness: the field is navy, so brightness alone drives it to cyan and
// never to the white a phosphor dot actually is.
const TV_HOT = 5.5;
const TV_HOT_WASH = 0.25;
// Where the horizontal sweep leaves it -- still lit, since the line is the part of
// the gesture that has to read from across the cabin.
const TV_WARM = 3.4;
const TV_WARM_WASH = 0.45;

// Keystroke interval, drawn per character rather than divided out of a fixed
// duration: an even cadence reads as a progress bar, and the thing being imitated
// is a person typing.
const TV_KEY_MIN = 0.028;
const TV_KEY_MAX = 0.085;

// What a character costs after its own keystroke. Slowing at a word boundary and
// stopping at punctuation is most of what separates typing from a reveal.
const TV_HOLD: Record<string, number> = { " ": 0.05, ",": 0.16, ".": 0.34 };

// Beat between lines, and long enough to read as a new thought rather than as a
// wrap.
const TV_LINE_GAP = 0.45;

// Signal break-up. The set is never clean: from the moment the picture arrives there
// is a carrier of noise under it, and the break-ups are peaks in that carrier rather
// than events on an otherwise still screen. A screen that is spotless until it
// suddenly tears reads as an effect firing on cue; one that is always slightly wrong
// reads as the far end of a long link.
//
// How often the grain is reshuffled while the signal is holding, and how often
// during a break-up. Both drawn per step for the same reason the keystrokes are: an
// even interval is a strobe, and interference has no tempo. The break-up rate is only
// a little quicker than the carrier's, because past about 12 steps a second it stops
// reading as a rate at all and reads as a flicker, and a flicker cannot be followed.
const TV_NOISE_MIN = 0.055;
const TV_NOISE_MAX = 0.145;
const TV_GLITCH_MIN = 0.045;
const TV_GLITCH_MAX = 0.135;

// A break-up's length, and the share of it spent at full strength before tapering
// out. The taper is not cosmetic: a burst that ends on its loudest step drops back to
// the carrier within one frame, which reads as the effect being switched off rather
// than as the signal recovering. Most of the window is taper, so the recovery is the
// part being watched. The floor is a couple of steps -- short enough that a word
// boundary gets a blink rather than an event.
const TV_SPAN_MIN = 0.11;
const TV_SPAN_MAX = 0.55;
const TV_BURST_HOLD = 0.3;

// Where the break-ups fall: in the pauses the typing already has. The shortest hold
// that counts as a pause (a word boundary, so nearly all of them do), how long after
// the character lands the picture goes, the pause length that earns a full-strength
// break-up, and how likely the shortest pause is to get anything at all.
//
// Break-ups spaced on a schedule of their own keep landing mid-word, which reads as
// two unrelated things sharing a screen -- and, since nothing about them varies with
// what they land on, as the same event repeating however randomly they are spaced.
// Hung off the pauses they read as one transmission struggling, and the pause's own
// length then sets how long and how hard each one goes, so the message's phrasing
// decides which are blinks and where the real one is.
const TV_REST_MIN = 0.045;
const TV_REST_LEAD = 0.06;
const TV_REST_LONG = 0.8;
const TV_REST_TAKE = 0.45;
const TV_BURST_MIN = 0.26;
const TV_BURST_MAX = 0.6;

// The lull before the echo behind the last break-up, the echo's strength, and its
// length against the one it answers. Two bursts at the end rather than one: a single
// hit reads as a transition wipe, and what makes it a signal is that the picture comes
// back wrong before it comes back.
const TV_GLITCH_GAP = 0.4;
const TV_ECHO_FORCE = 0.45;
const TV_ECHO_SPAN = 0.6;

// How long the carrier keeps running once the last break-up is over.
const TV_NOISE_TAIL = 0.8;

// Sign-off. The transmission is not faded out, it is lost: the last break-up is the one
// the picture does not come back from. A clean dissolve reads as someone turning the
// picture down, and nothing else about this link has ever behaved that way -- the whole
// broadcast has been coming apart in steps, so the end of it comes apart in steps too.
//
// The lull before the terminal break-up, its window, the share of that window spent at
// full strength before the picture starts leaving, and where the picture is gone by.
// The lull is not TV_GLITCH_GAP: two equal gaps in a row is a tempo, and the point of
// this one is that the picture had come back before it went. The tail of the window is
// deliberate too -- full-strength tear over an empty screen says the signal is still
// arriving and there is simply nothing left in it.
const TV_OFF_LEAD = 0.5;
const TV_OFF_SPAN = 1.2;
const TV_OFF_HOLD = 0.25;
const TV_OFF_GONE = 0.82;

// How far below its ceiling one step can pull the picture, as a share of whatever is
// left rather than as a flat subtraction. Multiplicative for two reasons: a flat dip
// deep enough to be worth watching drives the picture to zero while most of the window
// is still to come, so it dies early and the length of its death varies wildly run to
// run; and clamping at zero flattens the variation exactly where the flicker should be
// finest. Scaled, the flicker is loud while there is picture to lose and quiet once
// there is not, and the ceiling alone decides when it is gone.
const TV_OFF_DIP = 0.55;

// The one beat where the picture comes back. Eight even steps down is still a fade
// however finely it is cut; what says the link is dying is that it recovers once and
// then does not. This is the same phrasing as the finale-plus-echo pair one level up,
// and it is here for the same reason.
//
// It moves the ceiling rather than a single step, so the recovery lasts long enough to
// be read as one, and how far through the death it lands is drawn per run. The per-step
// dips cannot be trusted to supply this: towards the end the ceiling is falling faster
// than a dip can lift a step above the one before, so the back half of the window can
// only ever descend.
const TV_OFF_BACK = 0.3;
const TV_OFF_BACK_AT_MIN = 0.35;
const TV_OFF_BACK_AT_MAX = 0.6;

// Snow with nothing under it. Dead air is louder than the carrier ever gets while the
// picture is up; left at the carrier's own level an empty screen reads as the set
// having been switched off, and a switched-off set has no starfield to come back to.
const TV_OFF_SNOW = 0.3;

// Field out, once the picture has been gone long enough to register as gone. What is
// underneath is .tvSky, which has been running the whole time, so the monitor ends on
// the starfield it began on rather than on a hole.
const TV_OFF_FIELD = 0.5;

// One revolution of the globe's surface. Slow enough that no single frame reads as
// motion -- what it is for is that a still of the monitor taken a few seconds apart
// is not the same still, which is the difference between an idle screen and a
// picture pasted onto the wall.
const TV_SPIN = 10;

// Snow density: the band the carrier wanders inside, how far it can wander per step,
// the jitter on top of that, and what a full-strength break-up adds. The carrier is
// set by what the grain does between steps rather than by how it looks in a still --
// a still understates it, since what makes low-amplitude noise read is that it moves.
// Measured on the navy field, this band shifts a mean 4-6 of 255 per step, which is
// well clear of the flicker threshold, against about 8 of lift on the field's black
// level. Below it the grain is only technically present; above it the navy starts
// reading as slate.
//
// The level walks rather than being redrawn per step. A fresh draw every step is
// stationary: every stretch of the broadcast then has the same character, which is
// what makes a long run of it feel repetitive however random the individual steps are.
// A walk spends time near the top of the band and time near the bottom, so the link
// has bad stretches and good ones.
const TV_SNOW_MIN = 0.095;
const TV_SNOW_MAX = 0.175;
const TV_SNOW_DRIFT = 0.11;
const TV_SNOW_JITTER = 0.035;
const TV_SNOW_PEAK = 0.13;

// Tear, as a share of the caption's width, so the widest step moves a band about 4px
// of the source plate.
//
// The picture comes apart in bands rather than travelling as a block, and that is the
// whole difference between a set with a bad signal and a set someone knocked. Each
// band -- the portrait, then one per caption line -- draws its own direction and
// distance, so the rows disagree with the rows above them, which is what losing
// horizontal lock looks like. A rigid picture that slides and returns is a physical
// event instead. For the same reason nothing here moves vertically and nothing eases
// back: a vertical shift is a dropped frame, and an eased return is a spring settling.
// Lock is binary, so every step of this snaps.
//
// The floor matters as much as the ceiling: a band that lands within a pixel of centre
// is a hole in the tear. It sits outside the force multiplier for that reason --
// scaled by force, a weak break-up would shrink its own visibility floor away and
// emit steps that only technically moved.
const TV_TEAR_X = 2.7;
const TV_TEAR_X_MIN = 0.85;

// How often a band is redrawn during a break-up. The ones passed over hold the offset
// they were last given, which leaves them a step or two behind the taper: a row still
// badly out while the rows around it have nearly recovered. Redrawing every row every
// step is what makes a long break-up read as one texture -- the rows disagree, but
// they disagree the same way at every step.
const TV_BAND_TAKE = 0.72;

// The dropout bar that crosses the picture during a break-up: how fast it travels, in
// percent of the screen's height per second, its opacity at full force, how often a
// break-up gets one, and the shortest window it will appear in. A rate rather than a
// distance, so a short break-up gets a brief slip and a long one gets a full sweep,
// instead of both covering the same ground at whatever speed their window implies.
// Below the floor there is no room to sweep at all and the bar is one lit line for one
// frame, which is a different fault and not this one. It never has to leave the frame
// or wrap, because its opacity rides the force and the taper fades it out while it is
// still moving.
const TV_BAR_RATE = 84;
const TV_BAR_ALPHA = 0.42;
const TV_BAR_TAKE = 0.5;
const TV_BAR_SPAN = 0.3;

// The chromatic split, as a share of the screen's width, and the alpha of the caption's
// coloured fringes. Two channel-separated copies of the bust slide apart -- one carrying
// red, the other green and blue -- and a pair of coloured shadows do the same to the
// text. This is what the portrait gets instead of being carried sideways: a face is read
// as an object, so any rigid motion of it belongs to the object and the set reads as
// having been knocked. Misregistration has no physical analogue at all -- nothing in the
// world moves a picture's red channel away from its green -- so it can only be the
// signal.
//
// The floor sits outside the force multiplier for the same reason the tear's does: a
// weak break-up whose split shrank to nothing would announce itself only by going
// slightly brighter. The alpha is its own figure rather than being derived from the
// distance, because deriving it would fade the colour out exactly as the split narrows
// and leave the small bursts with no chroma to see.
const TV_RGB_X = 1.5;
const TV_RGB_X_MIN = 0.5;
const TV_FRINGE = 0.85;

// The displaced slab: a third, opaque copy of the bust clipped to one horizontal strip
// and pushed sideways. Where the tear is a phase error -- rows arriving at the wrong
// time -- this is data arriving out of order, a block of the frame filled from the wrong
// place. Heights are a share of the picture; the offset is a share of its width, which
// against the tear's share of the wider caption works out about three times as far in
// pixels. It needs that margin: a block that moves as far as a row only reads as the row
// having been drawn wider.
//
// Gated on force as well as sampled, so a word-boundary blink stays a blink. A slab is
// the loudest thing in here, and one on every tick would be the picture's default state
// rather than its worst moment.
const TV_SLICE_H_MIN = 11;
const TV_SLICE_H_MAX = 28;
const TV_SLICE_X = 15;
const TV_SLICE_X_MIN = 4;
const TV_SLICE_TAKE = 0.55;
const TV_SLICE_FORCE = 0.5;

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
const DURATION = 2;
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
  const tvVeilRef = useRef<HTMLDivElement>(null);
  const tvRasterRef = useRef<HTMLDivElement>(null);
  const tvBodyRef = useRef<HTMLDivElement>(null);
  const tvCaptainRef = useRef<HTMLDivElement>(null);
  const tvSliceRef = useRef<HTMLImageElement>(null);
  const tvBarRef = useRef<HTMLDivElement>(null);
  const tvSnowRef = useRef<HTMLDivElement>(null);
  const tvSpinRef = useRef<SVGGElement>(null);
  const tvSpinTweenRef = useRef<gsap.core.Tween | null>(null);
  const tvSkyPicRef = useRef<SVGGElement>(null);
  const tvSkyFogRef = useRef<SVGFilterElement>(null);
  const tvStarRefs = useRef<(SVGUseElement | null)[]>([]);
  const tvStarTweensRef = useRef<gsap.core.Animation[]>([]);
  const tvLinesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tvTlRef = useRef<gsap.core.Timeline | null>(null);
  const loaderSheetRef = useRef<HTMLImageElement | null>(null);
  const loaderFrameRef = useRef(0);
  const loaderRafRef = useRef<number | null>(null);
  const loaderLastTimeRef = useRef(0);
  const loaderWalkRef = useRef<gsap.core.Timeline | null>(null);
  const loaderBubbleRef = useRef<gsap.core.Timeline | null>(null);
  const rainRef = useRef<HTMLCanvasElement>(null);
  const rainSimRef = useRef<ReturnType<typeof createRaindrops>>(null);
  const rainGLRef = useRef<ReturnType<typeof createWaterRenderer>>(null);
  const rainRafRef = useRef<number | null>(null);
  const rainPausedRef = useRef(false);
  const cueRef = useRef<HTMLDivElement>(null);
  const cueWheelRef = useRef<SVGRectElement>(null);
  const cueChevronRefs = useRef<(SVGPathElement | null)[]>([]);
  const cueTlRef = useRef<gsap.core.Timeline | null>(null);
  const cueArmRef = useRef<(() => void) | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const loopRef = useRef(false);
  const [looping, setLooping] = useState(false);
  const cloudLayerRef = useRef<CloudLayerControls | null>(null);

  const onCloudReady = useCallback((controls: CloudLayerControls | null) => {
    cloudLayerRef.current = controls;
    if (rootRef.current?.dataset.playing === "true") controls?.play();
  }, []);

  const onCloudFrame = useCallback((canvas: HTMLCanvasElement) => {
    if (!rainPausedRef.current) rainGLRef.current?.updateBackground(canvas);
  }, []);

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

  const stopCue = useCallback(() => {
    cueArmRef.current?.();
    cueArmRef.current = null;
    cueTlRef.current?.kill();
    cueTlRef.current = null;
    const cue = cueRef.current;
    if (cue) gsap.set(cue, { clearProps: "all" });
  }, []);

  // Raised when the attendant lands on 100, and it is the only thing that starts
  // the dolly -- the main timeline is built paused on purpose, so until this is
  // armed there is nothing for a scroll to interrupt.
  const showCue = useCallback(() => {
    const cue = cueRef.current;
    const wheel = cueWheelRef.current;
    const chevrons = cueChevronRefs.current.filter(
      (el): el is SVGPathElement => !!el,
    );
    if (!cue || !wheel || chevrons.length === 0) return;

    cueTlRef.current?.kill();
    const tl = gsap.timeline();
    cueTlRef.current = tl;
    tl.fromTo(
      cue,
      { xPercent: -50, opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: CUE_IN, ease: "power2.out" },
      0,
    );

    // The wheel and the chevrons run as one repeating gesture rather than as two
    // loops of their own: the ink has to leave the mouse before the arrows answer
    // it, and sibling repeats with different durations would drift out of that
    // order within a few passes.
    const beat = gsap.timeline({ repeat: -1, repeatDelay: 0.55 });
    beat.fromTo(
      wheel,
      { y: 0 },
      { y: CUE_WHEEL_TRAVEL, duration: 0.5, ease: "power2.inOut" },
      0,
    );
    beat.to(wheel, { y: 0, duration: 0.34, ease: "power2.out" }, 0.62);
    chevrons.forEach((chevron, i) => {
      beat.fromTo(
        chevron,
        { opacity: 0, y: 0 },
        {
          opacity: 1,
          y: CUE_CHEVRON_DROP,
          duration: 0.34,
          ease: "power2.out",
        },
        0.16 + i * 0.12,
      );
      beat.to(
        chevron,
        { opacity: 0, duration: 0.3, ease: "power1.in" },
        0.56 + i * 0.12,
      );
    });
    tl.add(beat, CUE_IN * 0.6);

    const launch = () => {
      cueArmRef.current?.();
      cueArmRef.current = null;
      // Retires the loop but leaves the entrance tween alone, so the cue fades on
      // its own terms instead of snapping back to its pre-entrance offset.
      beat.kill();
      gsap.to(cue, {
        opacity: 0,
        y: 10,
        duration: CUE_OUT,
        ease: "power2.in",
      });
      tlRef.current?.play();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) launch();
    };
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      if (touchY - y > 12) launch();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ")
        launch();
    };
    // Non-passive is unnecessary: the overlay already pins the body, so there is
    // no default scroll to cancel and the listener stays off the compositor's
    // critical path.
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    cueArmRef.current = () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
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
      {
        x: Math.max(0, travel),
        duration: walk,
        ease: "none",
        // The sheet is a walk cycle, so it has to stop when the walking does --
        // left running it reads as marching in place against the far wall. Parked
        // on the stance frame rather than on wherever the loop happened to be, and
        // snapped there rather than played round to it: finishing the cycle first
        // would keep the legs going for up to another second past the arrival,
        // which is the thing being fixed.
        onComplete: () => {
          if (loaderRafRef.current !== null) {
            cancelAnimationFrame(loaderRafRef.current);
            loaderRafRef.current = null;
          }
          loaderFrameRef.current = LOADING_REST_FRAME;
          drawFrame(LOADING_REST_FRAME);
          showCue();
        },
      },
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
  }, [showCue]);

  const stopRain = useCallback(() => {
    if (rainRafRef.current !== null) {
      cancelAnimationFrame(rainRafRef.current);
      rainRafRef.current = null;
    }
    rainPausedRef.current = false;
  }, []);

  const startRain = useCallback(
    (
      drops: HTMLImageElement,
      colour: HTMLImageElement,
      wall: HTMLImageElement,
    ) => {
      const canvas = rainRef.current;
      const background = cloudLayerRef.current?.canvas;
      if (!canvas || !background) return;
      stopRain();
      gsap.killTweensOf(canvas);
      gsap.set(canvas, { opacity: 1 });

      // Built once and kept: the simulation's 255 pre-composited stamps are the
      // expensive part of setting this up, and a replay only needs the drop list
      // cleared.
      rainSimRef.current ??= createRaindrops(
        RAIN_APERTURE.w,
        RAIN_APERTURE.h,
        RAIN_SCALE,
        { alpha: drops, color: colour },
        RAIN_OPTIONS,
      );
      const sim = rainSimRef.current;
      if (!sim) return;
      sim.reset();

      rainGLRef.current ??= createWaterRenderer(
        canvas,
        sim.canvas,
        background,
        wall,
        RAIN_APERTURE,
        RAIN_WATER_OPTIONS,
      );
      const water = rainGLRef.current;
      if (!water) return;

      // One rAF drives both halves. The simulation has to advance before the pass
      // that reads its canvas, so they cannot be two independent loops.
      const tick = (now: number) => {
        if (!rainPausedRef.current) {
          sim.step(now);
          water.draw();
        }
        rainRafRef.current = requestAnimationFrame(tick);
      };
      rainRafRef.current = requestAnimationFrame(tick);
    },
    [stopRain],
  );

  const stopBroadcast = useCallback(() => {
    tvTlRef.current?.kill();
    tvTlRef.current = null;
    tvSpinTweenRef.current?.kill();
    tvSpinTweenRef.current = null;
    tvStarTweensRef.current.forEach((t) => t.kill());
    tvStarTweensRef.current = [];
  }, []);

  const startBroadcast = useCallback(() => {
    const veil = tvVeilRef.current;
    const raster = tvRasterRef.current;
    const body = tvBodyRef.current;
    const captain = tvCaptainRef.current;
    const bar = tvBarRef.current;
    const snow = tvSnowRef.current;
    const slice = tvSliceRef.current;
    const spin = tvSpinRef.current;
    const pic = tvSkyPicRef.current;
    const fog = tvSkyFogRef.current;
    const stars = tvStarRefs.current.filter(
      (el): el is SVGUseElement => !!el,
    );
    if (
      !veil ||
      !raster ||
      !body ||
      !captain ||
      !bar ||
      !snow ||
      !slice ||
      !spin ||
      !pic ||
      !fog ||
      stars.length === 0
    )
      return;

    // The fog's three primitives, read off the filter rather than passed down as three
    // more refs: they are the filter's own structure, and a component that has to hand
    // out a ref per primitive cannot change that structure without changing its props.
    const turb = fog.querySelector("feTurbulence");
    const warp = fog.querySelector("feDisplacementMap");
    const soften = fog.querySelector("feGaussianBlur");
    if (!turb || !warp || !soften) return;

    // The globe turning, on a tween of its own rather than a track of the broadcast
    // timeline: it has to be running before the transmission arrives and still be
    // running after the sign-off, and the timeline below covers neither end.
    // One span of travel per pass across two tiles a span apart, so the loop is a
    // continuous surface and not a rewind.
    tvSpinTweenRef.current?.kill();
    tvSpinTweenRef.current = gsap.fromTo(
      spin,
      { x: -SKY_SPIN_SPAN },
      { x: 0, duration: TV_SPIN, ease: "none", repeat: -1 },
    );

    // The stars: each one its own irregular pulse, so no two are ever in step and
    // the field never reads as a texture blinking in unison. Each pulse is one
    // tween-and-wait cycle scheduled by gsap.delayedCall -- the gap is drawn fresh
    // every time, which is what keeps the rhythm from being a metronome.
    tvStarTweensRef.current.forEach((t) => t.kill());
    stars.forEach((star, i) => {
      const twinkle = () => {
        const peak = 0.3 + Math.random() * 0.6;
        const up = 0.08 + Math.random() * 0.12;
        const down = 0.15 + Math.random() * 0.35;
        const pulse = gsap.timeline({
          onComplete: () => {
            const gap = gsap.delayedCall(0.4 + Math.random() * 2.6, twinkle);
            tvStarTweensRef.current[i] = gap;
          },
        });
        pulse
          .to(star, { opacity: peak, duration: up, ease: "sine.inOut" })
          .to(star, { opacity: 1, duration: down, ease: "sine.inOut" });
        tvStarTweensRef.current[i] = pulse;
      };
      twinkle();
    });

    // What the tear moves: the caption rows, and only those. The portrait used to ride a
    // stretched band of its own here, and it was the one row whose motion read as the set
    // having been knocked rather than as a signal fault -- a face is an object, and an
    // object that slides was pushed. It gets the chromatic split and the displaced slab
    // instead, neither of which moves the bust as a whole. Empty lines cost nothing: a
    // line that has not been typed into has no line box to move.
    const bands: HTMLElement[] = tvLinesRef.current.filter(
      (el): el is HTMLElement => !!el,
    );

    tvTlRef.current?.kill();
    const tl = gsap.timeline();

    // Off, and explicitly so at position zero: replay re-enters this with the
    // screen left wherever the last pass ended.
    tl.set(
      raster,
      {
        scaleX: TV_DOT_X,
        scaleY: TV_DOT_Y,
        borderRadius: "50%",
        filter: `brightness(${TV_HOT}) saturate(${TV_HOT_WASH})`,
        opacity: 0,
      },
      0,
    );
    tl.set(
      body,
      { opacity: 0, filter: "none", "--tv-rgb": "0cqw", "--tv-fringe": 0 },
      0,
    );
    tl.set(bands, { xPercent: 0 }, 0);
    tl.set(bar, { opacity: 0 }, 0);
    tl.set(slice, { opacity: 0, xPercent: 0 }, 0);
    tl.set(captain, { opacity: 0, scale: 1.05 }, 0);
    tl.set(veil, { opacity: 0 }, 0);
    tl.set(snow, { opacity: 0 }, 0);
    // The picture at rest, and explicitly so at position zero: replay re-enters this
    // with the screen left wherever the last pass ended. The filter goes back to the
    // attribute rather than to an inline `none` -- an inline one would outrank the
    // attribute the fog is attached through and the dissolve would never appear.
    tl.set(pic, { opacity: 1, x: 0, y: 0 }, 0);
    tl.set(pic, { attr: { filter: "none" } }, 0);
    tl.set(turb, { attr: { baseFrequency: TV_FOG_FREQ_IN } }, 0);
    tl.set(warp, { attr: { scale: 0 } }, 0);
    tl.set(soften, { attr: { stdDeviation: 0 } }, 0);

    // The field fogs over. Attached here rather than left on the group for the whole
    // starfield window: the mottling spin invalidates the group every frame, so a live
    // filter would re-run turbulence over all 2.3s of it for no visible effect.
    tl.set(pic, { attr: { filter: "url(#skyFog)" } }, TV_LEAD);

    // Warp first and blur behind it, and the easings are what actually make that true
    // rather than nominal: the warp decelerates in, so the picture is visibly disturbed
    // while it is still solid, and the blur accelerates in behind it. Both on power1.in
    // left the first half of the beat inert and put everything in the last third, which
    // is the shape of something abrupt with a long wind-up.
    tl.to(
      warp,
      {
        attr: { scale: TV_FOG_WARP },
        duration: TV_FOG,
        ease: "sine.out",
      },
      TV_LEAD,
    );
    tl.to(
      soften,
      {
        attr: { stdDeviation: TV_FOG_BLUR },
        duration: TV_FOG,
        ease: "power1.in",
      },
      TV_LEAD,
    );

    // And the noise itself coarsens, linearly, for the whole beat. This is the track that
    // makes it flow: the pattern doing the displacing is never the same twice, so the
    // smear rolls instead of sitting there.
    tl.to(
      turb,
      {
        attr: { baseFrequency: TV_FOG_FREQ_OUT },
        duration: TV_FOG,
        ease: "none",
      },
      TV_LEAD,
    );

    // Drifting as it goes, up and to the right. Linear and small: it only has to give the
    // dissolve a direction.
    tl.to(
      pic,
      {
        x: TV_FOG_DRIFT,
        y: -TV_FOG_DRIFT * 0.35,
        duration: TV_FOG,
        ease: "none",
      },
      TV_LEAD,
    );

    // The thinning starts late and finishes with the rest. Fading from the first frame
    // would make this a crossfade with a texture on it -- the picture has to be visibly
    // torn while it is still there, or the warp is something the eye never gets to see.
    tl.to(
      pic,
      {
        opacity: 0,
        duration: TV_FOG * (1 - TV_FOG_LAG),
        ease: "power2.in",
      },
      TV_LEAD + TV_FOG * TV_FOG_LAG,
    );

    // The veil takes the dark, not the picture. It starts where the picture ends and is
    // fully up as the beam arrives, so its only job is the one it was written for:
    // darkening the centre so the dot has somewhere dark to strike.
    tl.to(
      veil,
      { opacity: 1, duration: TV_BLANK_HOLD, ease: "power1.in" },
      TV_LEAD + TV_FOG,
    );

    // The beam strikes into the dark the fog left, after a hold short enough to read as
    // the set having nothing to show. Then it sits there long enough to be a dot instead
    // of a stage the sweep passes through.
    const dot = TV_LEAD + TV_FOG + TV_BLANK_HOLD;
    tl.to(raster, { opacity: 1, duration: TV_DOT_IN, ease: "none" }, dot);

    const sweep = dot + TV_DOT_HOLD;
    tl.to(raster, { scaleX: 1, duration: TV_SWEEP, ease: "power2.out" }, sweep);
    tl.to(
      raster,
      {
        filter: `brightness(${TV_WARM}) saturate(${TV_WARM_WASH})`,
        duration: TV_SWEEP,
        ease: "none",
      },
      sweep,
    );

    // The line opens into the raster. The radius comes off with it, since a 50%
    // radius at full scale is an ellipse with the plate's navy showing round it.
    const open = sweep + TV_SWEEP;
    tl.to(
      raster,
      {
        scaleY: 1,
        borderRadius: "6%",
        duration: TV_OPEN,
        ease: "power3.out",
      },
      open,
    );
    // Outlasts the opening: the picture keeps settling for a beat after the raster
    // has stopped growing, which is what reads as a signal locking on rather than
    // as a box finishing an animation.
    tl.to(
      raster,
      {
        filter: "brightness(1) saturate(1)",
        duration: TV_OPEN * 1.4,
        ease: "power2.out",
      },
      open,
    );

    // The starfield is put back the instant the raster is opaque and full size, which
    // is the one moment in the broadcast when nothing can see it happen. It has to
    // happen somewhere: the sign-off dissolves the raster, the veil and the snow away
    // and expects to land on the sky, and the sky is currently fogged out and drifted
    // off its centre. Detaching the filter here is also what stops the turbulence being
    // recomputed under the broadcast for the rest of the run.
    tl.set(pic, { opacity: 1, x: 0, y: 0 }, open + TV_OPEN);
    tl.set(pic, { attr: { filter: "none" } }, open + TV_OPEN);

    const pictureOn = open + TV_OPEN * 0.6;
    tl.to(body, { opacity: 1, duration: 0.3, ease: "none" }, pictureOn);
    tl.to(
      captain,
      { opacity: 1, scale: 1, duration: 0.42, ease: "power2.out" },
      open + TV_OPEN * 0.9,
    );

    // Typed, not revealed: every character is its own `set` at its own drawn
    // offset, so the cadence is uneven the way a person's is and the whole thing
    // still seeks and restarts with the timeline.
    //
    // The pauses are collected as they are laid down, because the interference hangs
    // off them. Adjacent dead time is one pause and not two -- the beat between lines
    // begins exactly where the period's own hold ends, and a break-up that read those
    // as two short pauses would go twice instead of going once for longer.
    const rests: { at: number; len: number }[] = [];
    const rest = (t: number, len: number) => {
      const last = rests[rests.length - 1];
      if (last && t - (last.at + last.len) < 1e-6) last.len += len;
      else if (len >= TV_REST_MIN) rests.push({ at: t, len });
    };
    let at = open + TV_OPEN + 0.5;
    TV_LINES.forEach((line, i) => {
      const el = tvLinesRef.current[i];
      if (!el) return;
      tl.set(el, { textContent: "", attr: { "data-caret": "0" } }, 0);
      tl.set(el, { attr: { "data-caret": "1" } }, at);
      for (let n = 1; n <= line.length; n++) {
        at += gsap.utils.random(TV_KEY_MIN, TV_KEY_MAX);
        tl.set(el, { textContent: line.slice(0, n) }, at);
        const hold = TV_HOLD[line[n - 1]] ?? 0;
        rest(at, hold);
        at += hold;
      }
      // The caret is handed on rather than duplicated, and the last line keeps it.
      if (i < TV_LINES.length - 1) {
        rest(at, TV_LINE_GAP);
        at += TV_LINE_GAP;
        tl.set(el, { attr: { "data-caret": "0" } }, at);
      }
    });

    // Where the break-ups fall: one per pause in the typing, sized and weighted by how
    // long that pause is. A word boundary gets a tick, the comma gets something worse,
    // the line break worse again, and the full stop at the end gets the real thing with
    // an echo behind it -- so the interference is phrased by the message instead of
    // running alongside it. The likelihood rises with the pause too, which leaves the
    // short ones as coin flips and the long ones certain: no two runs tick in the same
    // places, but the beats that carry the shape are always there.
    //
    // Each burst fixes for its whole window the things that would read as a strobe if
    // they were redrawn per step -- which side the comb leans, the height the dropout bar
    // enters at, and whether this one displaces a slab at all. A bar that reappears at a
    // fresh height every 30ms is a flicker rather than a sweep, a comb that changes hands
    // every 30ms is the picture jumping rather than a phase error, and a slab that comes
    // and goes every 30ms is a strobe rather than a block of bad data. `bar: null` is a
    // burst without one.
    //
    // `fade` marks the one break-up the picture does not survive. It changes two things
    // about how the window is played rather than adding a track: the force stops tapering
    // (nothing is recovering) and the picture's own opacity joins the per-step walk.
    const breakUp = (
      start: number,
      span: number,
      force: number,
      bar: boolean,
      fade = false,
    ) => ({
      at: start,
      span,
      force,
      fade,
      back: fade
        ? gsap.utils.random(TV_OFF_BACK_AT_MIN, TV_OFF_BACK_AT_MAX)
        : 0,
      polarity: gsap.utils.random([-1, 1]),
      bar:
        bar && span >= TV_BAR_SPAN
          ? gsap.utils.random(-12, 100 - span * TV_BAR_RATE)
          : null,
      slice: force >= TV_SLICE_FORCE && gsap.utils.random(0, 1) < TV_SLICE_TAKE,
    });
    // The span is held to the pause that earned it, so a break-up cannot run far into
    // the characters on the far side of it -- the caption is being read through these,
    // and a full-strength tear over a word costs the word. A pause whose anchor still
    // falls inside the break-up before it is dropped rather than shortened: two
    // overlapping windows are not something one tear track can express, and the walk
    // would read the second one as already over.
    const bursts: ReturnType<typeof breakUp>[] = [];
    rests.slice(0, -1).forEach((r) => {
      if (
        gsap.utils.random(0, 1) >=
        gsap.utils.clamp(
          TV_REST_TAKE,
          1,
          gsap.utils.mapRange(TV_REST_MIN, TV_REST_LONG, TV_REST_TAKE, 1, r.len),
        )
      ) {
        return;
      }
      const start = r.at + TV_REST_LEAD;
      const prev = bursts[bursts.length - 1];
      if (prev && start < prev.at + prev.span) return;
      bursts.push(
        breakUp(
          start,
          gsap.utils.clamp(TV_SPAN_MIN, TV_SPAN_MAX, r.len),
          gsap.utils.clamp(
            TV_BURST_MIN,
            TV_BURST_MAX,
            gsap.utils.mapRange(
              TV_REST_MIN,
              TV_REST_LONG,
              TV_BURST_MIN,
              TV_BURST_MAX,
              r.len,
            ) * gsap.utils.random(0.85, 1.15),
          ),
          gsap.utils.random(0, 1) < TV_BAR_TAKE,
        ),
      );
    });
    const finale = rests[rests.length - 1].at + TV_REST_LEAD;
    bursts.push(breakUp(finale, TV_SPAN_MAX, 1, true));
    bursts.push(
      breakUp(
        finale + TV_SPAN_MAX + TV_GLITCH_GAP,
        TV_SPAN_MAX * TV_ECHO_SPAN,
        TV_ECHO_FORCE,
        gsap.utils.random(0, 1) < TV_BAR_TAKE,
      ),
    );
    // And the one that ends it. Hung off the echo rather than off a pause, because there
    // is no caption left for it to be phrased by: the message is finished, so what the
    // last event answers to is the previous event.
    const echo = bursts[bursts.length - 1];
    bursts.push(
      breakUp(echo.at + echo.span + TV_OFF_LEAD, TV_OFF_SPAN, 1, true, true),
    );
    type Burst = (typeof bursts)[number];

    // One walk lays down every step of the noise, carrier and break-up alike, so at
    // any offset there is exactly one `set` deciding what the snow looks like. A
    // separate always-on track and burst track would fight over opacity at every
    // boundary. Every step is its own `set` at its own drawn offset, same as the
    // keystrokes, so the whole thing seeks and replays with the timeline instead of
    // needing a loop of its own.
    //
    // The snow jumps to a fresh offset in its own oversized tile each step, and during
    // a break-up the bands are torn sideways under it. Neither lands on the raster:
    // the raster is the phosphor field, and a field that slips is the whole set
    // moving, whereas the picture coming apart inside a field that holds still is the
    // signal losing its lock.
    let drift = gsap.utils.random(0.2, 0.8);
    // How far gone the picture is. It is left where the terminal break-up's last step
    // put it rather than being reset, so the dead air after that window is dead air and
    // not the carrier again.
    let lost = 0;
    let entered: Burst | null = null;
    const noise = (t: number, burst: Burst | null, p: number) => {
      // Steps are laid down in order, once each, so comparing against the last one is
      // enough to know this is the step a break-up opens on.
      const onset = burst !== null && burst !== entered;
      entered = burst;
      // The carrier level walks instead of being redrawn, so the noise floor has a
      // shape over the length of the broadcast rather than only per step.
      drift = gsap.utils.clamp(
        0,
        1,
        drift + gsap.utils.random(-TV_SNOW_DRIFT, TV_SNOW_DRIFT),
      );
      // Force falls linearly across the back of the window, so the tear walks itself
      // down in snapping steps instead of being switched off. The terminal one is the
      // exception: it holds at full to the end, since a taper is a recovery and there is
      // nothing here to recover.
      const force = burst
        ? burst.fade
          ? burst.force
          : burst.force * Math.min(1, (1 - p) / (1 - TV_BURST_HOLD))
        : 0;
      if (burst?.fade) {
        const raw = (p - TV_OFF_HOLD) / (TV_OFF_GONE - TV_OFF_HOLD);
        lost = gsap.utils.clamp(
          0,
          1,
          raw > burst.back && raw < burst.back + TV_OFF_BACK
            ? raw - TV_OFF_BACK
            : raw,
        );
      }
      tl.set(
        snow,
        {
          opacity:
            gsap.utils.interpolate(TV_SNOW_MIN, TV_SNOW_MAX, drift) +
            gsap.utils.random(-TV_SNOW_JITTER, TV_SNOW_JITTER) +
            TV_SNOW_PEAK * force +
            TV_OFF_SNOW * lost,
          backgroundPosition: `${gsap.utils.random(0, 100, 1)}% ${gsap.utils.random(
            0,
            100,
            1,
          )}%`,
        },
        t,
      );
      if (!burst) return;
      // Per band, not per picture: the point of the tear is that the rows disagree,
      // and one `set` over the array would give them all the same figure. Directions
      // alternate down the bands off the burst's polarity, because a step where every
      // row agrees is the picture shifting as a block -- the one thing this is not
      // supposed to look like, and it does not take many such steps to establish that
      // reading. Distances stay independent, so the rows disagree by amount as well as
      // by side.
      //
      // Rows are passed over rather than every row being redrawn, which is also why the
      // polarity has to belong to the burst and not to the step: a row holding an offset
      // drawn under the previous step's polarity would be holding the wrong sign, and
      // enough of those and the step is a block shift again. The step it opens on is
      // exempt, because a row passed over there is still sitting at lock -- the tear
      // would begin with a hole in it instead of coming apart all at once and then
      // falling out of step with itself as it recovers.
      bands.forEach((el, i) => {
        if (!onset && gsap.utils.random(0, 1) > TV_BAND_TAKE) return;
        tl.set(
          el,
          {
            xPercent:
              (i % 2 ? -burst.polarity : burst.polarity) *
              (TV_TEAR_X_MIN +
                gsap.utils.random(0, TV_TEAR_X - TV_TEAR_X_MIN) * force),
          },
          t,
        );
      });
      if (burst.bar !== null) {
        tl.set(
          bar,
          {
            opacity: TV_BAR_ALPHA * (0.55 + 0.45 * force),
            yPercent: burst.bar + p * burst.span * TV_BAR_RATE,
          },
          t,
        );
      }
      // The slab, on the bursts that drew one: a fresh strip at a fresh offset every
      // step, because a block that holds still for the length of the window reads as a
      // badly composited layer rather than as a fault. It leans the way the burst's comb
      // leans, so the picture has one side it is failing towards.
      if (burst.slice) {
        const top = gsap.utils.random(0, 100 - TV_SLICE_H_MAX);
        const height = gsap.utils.random(TV_SLICE_H_MIN, TV_SLICE_H_MAX);
        tl.set(
          slice,
          {
            opacity: 1,
            clipPath: `inset(${top}% 0% ${100 - top - height}% 0%)`,
            xPercent:
              burst.polarity *
              (TV_SLICE_X_MIN +
                gsap.utils.random(0, TV_SLICE_X - TV_SLICE_X_MIN) * force),
          },
          t,
        );
      }
      // Interference takes the chroma before the luma, so the picture pales as it
      // brightens rather than blowing out in colour. This one is the whole picture
      // rather than per band, since a level shift is what the whole raster does.
      //
      // The split rides the same `set`: it is a property of the signal rather than of any
      // one row, and custom properties inherit, so writing them here reaches the bust's
      // two channel copies and the caption's coloured fringes at once.
      tl.set(
        body,
        {
          filter: `brightness(${1 + 0.18 * force}) saturate(${1 - 0.32 * force})`,
          "--tv-rgb": `${
            TV_RGB_X_MIN + gsap.utils.random(0, TV_RGB_X - TV_RGB_X_MIN) * force
          }cqw`,
          "--tv-fringe": TV_FRINGE * (0.5 + 0.5 * force),
        },
        t,
      );
      // The picture leaving, on the terminal break-up only, and on the same clock as
      // everything else in the window rather than on a tween of its own. A ceiling that
      // walks down with a fresh dip drawn under it per step: some steps land far below
      // the one before and some land above it, so the picture is fighting to stay rather
      // than being turned off. A tween here would be a dissolve with a tear playing over
      // the top of it, which is two things happening at once instead of one thing.
      if (burst.fade) {
        tl.set(
          body,
          {
            opacity:
              lost === 0
                ? 1
                : (1 - lost) * (1 - gsap.utils.random(0, TV_OFF_DIP)),
          },
          t,
        );
      }
    };

    // Lock regained, at the end of a break-up's window: zero-duration, like every
    // other step. It used to be an eased tween sliding the picture home, which is
    // what made the break-up read as the set being knocked rather than as a signal
    // failing -- a continuous deceleration is a spring. What replaces it is the taper
    // on the burst, which walks the tear down in snapping steps before this lands.
    //
    // Dropping the tween also drops the constraint that came with it: an eased `to`
    // outliving its window would win every frame against the `set`s underneath it and
    // swallow the next break-up, so the burst gaps had to clear its duration. Nothing
    // here has a duration, so nothing can overlap.
    const lock = (t: number) => {
      tl.set(bands, { xPercent: 0 }, t);
      tl.set(bar, { opacity: 0 }, t);
      tl.set(slice, { opacity: 0 }, t);
      tl.set(
        body,
        { filter: "none", "--tv-rgb": "0cqw", "--tv-fringe": 0 },
        t,
      );
    };

    const tail = bursts[bursts.length - 1];
    let pending = 0;
    for (let t = pictureOn; t < tail.at + tail.span + TV_NOISE_TAIL; ) {
      while (
        pending < bursts.length &&
        t >= bursts[pending].at + bursts[pending].span
      ) {
        pending += 1;
      }
      const burst =
        pending < bursts.length && t >= bursts[pending].at
          ? bursts[pending]
          : null;
      noise(t, burst, burst ? (t - burst.at) / burst.span : 0);
      t += burst
        ? gsap.utils.random(TV_GLITCH_MIN, TV_GLITCH_MAX)
        : gsap.utils.random(TV_NOISE_MIN, TV_NOISE_MAX);
    }
    bursts.forEach((b) => lock(b.at + b.span));
    // The picture does not come back from the last one. lock() homes the layers that are
    // still on screen after it; this pins the picture itself, in case the walk's last
    // step inside that window landed a hair above zero.
    tl.set(body, { opacity: 0 }, tail.at + tail.span);

    // Sign-off. The picture is already gone by here -- it went inside the terminal
    // break-up, and TV_NOISE_TAIL of dead air has run since. All that is left is to drop
    // the field, uncovering .tvSky: the set stops receiving and returns to its own idle
    // picture. Not the power-on run backwards -- a raster collapsing to a dot is a set
    // being switched off, and a switched-off set has no starfield to come back to.
    tl.to(
      [raster, veil, snow],
      { opacity: 0, duration: TV_OFF_FIELD, ease: "power2.inOut" },
      tail.at + tail.span + TV_NOISE_TAIL,
    );

    tvTlRef.current = tl;
  }, []);

  const stop = useCallback(() => {
    tlRef.current?.kill();
    tlRef.current = null;
    stopDog();
    stopLoader();
    stopBroadcast();
    stopRain();
    stopCue();
    cloudLayerRef.current?.pause();
    const root = rootRef.current;
    if (root) delete root.dataset.playing;
    document.body.style.overflow = "";
  }, [stopDog, stopLoader, stopBroadcast, stopRain, stopCue]);

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
    stopCue();
    gsap.set([far, middle, front], { clearProps: "all" });
    gsap.set([stage, walker], { opacity: 1 });
    dogGLRef.current?.clear();
    root.dataset.playing = "true";
    cloudLayerRef.current?.setProgress(0);
    cloudLayerRef.current?.setSpeed(CLOUD_IDLE_SPEED);
    cloudLayerRef.current?.play();
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    // React does not emit `muted` into the server-rendered markup, so the
    // attribute is missing at hydration and autoplay would be refused on the
    // first pass. Setting the property is what actually satisfies the policy.
    video.muted = true;
    video.currentTime = 0;

    void Promise.all([
      loadImages([LOADING_SHEET, DROP_ALPHA, DROP_COLOR, LAYER_MIDDLE]),
      preload([...LAYERS, TV_CAPTAIN]),
      // A refused autoplay must not stall the intro: the scene is the point and
      // the dog is a detail, so a rejection resolves like a success.
      video.play().catch(() => {}),
    ]).then(([[loaderSheet, dropAlpha, dropColour, wall]]) => {
      if (rootRef.current?.dataset.playing !== "true") return;
      loaderSheetRef.current = loaderSheet;
      startDog();
      startLoader();
      startBroadcast();
      startRain(dropAlpha, dropColour, wall);

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
      tl.set(far, { scale: 1, filter: "none" }, 0);
      tl.set([middle, front], { scale: 1, filter: "blur(0px)" }, 0);
      tl.to(walker, { opacity: 0, duration: 0.45, ease: "power1.out" }, 0);

      const flight = { speed: CLOUD_IDLE_SPEED };
      tl.to(
        flight,
        {
          speed: CLOUD_FLIGHT_SPEED,
          duration: DURATION + 0.2,
          ease: "power2.inOut",
          onUpdate: () => cloudLayerRef.current?.setSpeed(flight.speed),
        },
        0,
      );

      // The monitor stops the moment the dolly starts. .middle runs to scale 11 under
      // a 5px blur, and a subtree still repainting inside that forces the whole
      // blurred plane to re-rasterise every frame. At these paces the freeze is
      // not something you can see; the dropped frames would be.
      //
      // The broadcast timeline is in here too, not just the sky. It used to end at
      // ~7.2s against a 9-10s walk and so was reliably over before this ran, but the
      // longer starfield window and the stepped sign-off have pushed it past 11s --
      // .tvSnow reshuffles a mix-blend-mode layer every few frames, which is the most
      // expensive thing on the plate to leave running under the blur.
      tl.call(
        () => {
          stopLoader();
          stopCue();
          cloudLayerRef.current?.setSpeed(CLOUD_IDLE_SPEED);
          cloudLayerRef.current?.play();
          tvSpinTweenRef.current?.pause();
          tvStarTweensRef.current.forEach((t) => t.pause());
          tvTlRef.current?.pause();
          // Pause rain and fade it out over the first half of the dolly.
          rainPausedRef.current = true;
          const canvas = rainRef.current;
          if (canvas) {
            gsap.to(canvas, { opacity: 0, duration: DURATION * 0.5, ease: "power1.out" });
          }
        },
        undefined,
        0,
      );

      // The wall only has to grow until the window opening clears the viewport,
      // which happens around scale 5.1; the rest of the travel is overshoot so
      // the frame edges are long gone before the plane fades.
      tl.to(middle, { scale: 11, ease: "power2.in", duration: DURATION }, 0);
      tl.to(middle, { filter: "blur(5px)", ease: "power1.in", duration: 0.9 }, 1.1);
      tl.to(
        middle,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.7,
          onComplete: () => gsap.set(middle, { display: "none" }),
        },
        1.5,
      );

      // The window sits dead centre, so the camera flies straight through the
      // boy's seat. Defocusing the plane as it grows makes that read as a
      // foreground blur pass instead of a translucent cutout.
      tl.to(front, { scale: 13, ease: "power2.in", duration: 1.8 }, 0);
      tl.to(front, { filter: "blur(14px)", ease: "power2.in", duration: 1.6 }, 0);
      tl.to(
        front,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.9,
          onComplete: () => gsap.set(front, { display: "none" }),
        },
        0.9,
      );

      tl.to([stage, walker], { opacity: 0, ease: "power2.inOut", duration: 0.55 }, DURATION + 2.2);
    });
  }, [stop, stopCue, stopLoader, startDog, startLoader, startBroadcast, startRain]);

  const skip = useCallback(() => {
    loopRef.current = false;
    setLooping(false);
    const tl = tlRef.current;
    if (!tl) {
      stop();
      return;
    }
    stopCue();
    tl.repeat(0);
    // The dolly may still be waiting on the scroll cue, so skip has to release it
    // before winding it forward -- a timeScale on a paused timeline goes nowhere.
    tl.play();
    gsap.to(tl, { timeScale: 6, duration: 0.25, ease: "power1.in" });
  }, [stop, stopCue]);

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
          <div ref={farRef} className={`${styles.layer} ${styles.far}`}>
            <CloudLayer onReady={onCloudReady} onFrame={onCloudFrame} />
          </div>
          <div ref={middleRef} className={`${styles.layer} ${styles.middle}`}>
            {/* First child of .middle, so the glass paints under everything else on
                the wall -- the aperture is behind the cabin fittings, not over them. */}
            {/* No width/height attributes: the water renderer sizes the backing
                store to the simulation's own resolution, and a stale attribute
                would just contradict it. */}
            <canvas ref={rainRef} className={styles.rain} aria-hidden="true" />
            <div className={styles.tvShell} aria-hidden="true">
              <CabinMonitorShell />
            </div>
            <div className={styles.tv} aria-hidden="true">
              <div className={styles.tvSky}>
                <CabinMonitorSky
                  spinRef={tvSpinRef}
                  starRefs={tvStarRefs}
                  pictureRef={tvSkyPicRef}
                  fogRef={tvSkyFogRef}
                />
              </div>
              <div ref={tvVeilRef} className={styles.tvVeil} />
              <div ref={tvRasterRef} className={styles.tvRaster} />
              <div ref={tvBodyRef} className={styles.tvBody}>
                <div ref={tvCaptainRef} className={styles.tvPix}>
                  {/* Three copies of the one image, each filling the box. The first two
                      are the channel pair screened back together -- at rest they are
                      indistinguishable from a single copy. The third is the slab, opaque
                      and invisible until a break-up clips it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={`${styles.tvCaptain} ${styles.tvChan} ${styles.tvChanR}`}
                    src={TV_CAPTAIN}
                    alt=""
                    draggable={false}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={`${styles.tvCaptain} ${styles.tvChan} ${styles.tvChanC}`}
                    src={TV_CAPTAIN}
                    alt=""
                    draggable={false}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={tvSliceRef}
                    className={`${styles.tvCaptain} ${styles.tvSlice}`}
                    src={TV_CAPTAIN}
                    alt=""
                    draggable={false}
                  />
                </div>
                <span className={styles.tvCaption}>
                  {/* GSAP types into these; the markup only supplies the boxes. */}
                  {TV_LINES.map((line, i) => (
                    <span
                      key={line}
                      className={styles.tvLine}
                      ref={(el) => {
                        tvLinesRef.current[i] = el;
                      }}
                    />
                  ))}
                </span>
              </div>
              <div ref={tvBarRef} className={styles.tvBar} />
              <div ref={tvSnowRef} className={styles.tvSnow} />
            </div>
            <div className={styles.vent} aria-hidden="true">
              <CabinVent />
            </div>
            <div className={styles.statusLights} aria-hidden="true">
              <span className={styles.statusLight}>
                <span
                  className={`${styles.lens} ${styles.lensGrey} ${styles.beatGrey}`}
                />
              </span>
              <span className={styles.statusLight}>
                <span
                  className={`${styles.lens} ${styles.lensRed} ${styles.beatRed}`}
                />
              </span>
              <span className={styles.statusLight}>
                <span
                  className={`${styles.lens} ${styles.lensGreen} ${styles.beatGreen}`}
                />
              </span>
            </div>
          </div>
          <div ref={frontRef} className={`${styles.layer} ${styles.front}`}>
            <canvas ref={dogRef} className={styles.dog} aria-hidden="true" />
          </div>
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
        {/* Raised by showCue once the cart lands on 100. Inline stroke widths
            rather than a class each: the four are deliberately unequal so the
            outline reads as pen pressure, matching the plate's own line. */}
        <div ref={cueRef} className={styles.cue} aria-hidden="true">
          <svg className={styles.cueGlyph} viewBox="0 0 44 78" fill="none">
            <g stroke="#203050" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M9.4 15.5C9.4 7.9 15.1 2.2 22.2 2.2C29.2 2.2 34.8 7.6 34.7 15.3C34.6 22.9 34.9 31.6 34.6 36.4C34.2 43.1 28.8 48.4 22 48.4C15.2 48.4 9.8 43.2 9.5 36.3C9.3 31.5 9.4 23.1 9.4 15.5Z"
                strokeWidth="2.4"
              />
              <rect
                ref={cueWheelRef}
                x="20.6"
                y="11.4"
                width="2.9"
                height="7.4"
                rx="1.45"
                fill="#203050"
                stroke="none"
              />
            </g>
            {/* Two chevrons, the lower one lighter and narrower: the fall reads as
                one gesture carrying on rather than as two equal ticks. */}
            <g stroke="#203050" strokeLinecap="round" strokeLinejoin="round">
              <path
                ref={(el) => {
                  cueChevronRefs.current[0] = el;
                }}
                d="M13.6 57.4L22.1 64.6L30.8 57.1"
                strokeWidth="2.5"
                opacity="0"
              />
              <path
                ref={(el) => {
                  cueChevronRefs.current[1] = el;
                }}
                d="M16.4 65.9L22.1 70.8L27.9 65.6"
                strokeWidth="1.9"
                opacity="0"
              />
            </g>
          </svg>
          <span className={styles.cueText}>Scroll</span>
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
