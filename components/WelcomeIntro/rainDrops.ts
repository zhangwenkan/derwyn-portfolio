/* Drop simulation for the cabin window, ported from codrops/RainEffect
   (src/raindrops.js, Lucas Bebber). The mechanism is the point of the port, so the
   parts that carry it are kept as they are:

   - Drops are drawn into a 2D canvas that is never shown. It is a normal map, not
     a picture: drop-color.png ramps R with y and G with x, so a drop stamped into
     it writes the surface slope of a lens at that spot. rainWater.ts reads those
     two channels back as a refraction vector.
   - The blue channel is thickness, screened in per drop by radius, and the shader
     scales refraction by it. That is what makes a big drop bend the view more than
     a small one instead of just covering more of it.
   - Drops are stamped from 255 pre-composited sprites rather than composited per
     frame. At the drop counts this runs the per-frame path is what kills it.
   - Trails are spawned drops, not a drawn line: a running drop sheds smaller ones
     behind it and shrinks as it does. That is where the whole look comes from --
     a stroked tail reads as a pen mark, this reads as water.
   - Collision merges by area, not by radius, and gives the survivor the momentum.
     Drops eating each other on the way down is what makes the pane read as alive.

   What is tuned for this scene rather than ported: the aperture is 399x565 at plate
   scale, a fraction of the full-window canvas the original runs on, so the radii,
   rates and limits below are set for that area. See RAIN_OPTIONS. */

export type DropTextures = {
  alpha: HTMLImageElement;
  color: HTMLImageElement;
};

type Drop = {
  x: number;
  y: number;
  r: number;
  spreadX: number;
  spreadY: number;
  momentum: number;
  momentumX: number;
  lastSpawn: number;
  nextSpawn: number;
  parent: Drop | null;
  isNew: boolean;
  killed: boolean;
  shrink: number;
};

export type RainOptions = {
  minR: number;
  maxR: number;
  rainPower: number;
  maxDrops: number;
  rainChance: number;
  rainLimit: number;
  dropletsRate: number;
  dropletsSize: [number, number];
  dropletsCleaningRadiusMultiplier: number;
  globalTimeScale: number;
  trailRate: number;
  autoShrink: boolean;
  spawnArea: [number, number];
  trailScaleRange: [number, number];
  collisionRadius: number;
  collisionRadiusIncrease: number;
  dropFallMultiplier: number;
  collisionBoostMultiplier: number;
  collisionBoost: number;
};

// The sprite atlas resolution: 255 thickness steps, each a 64x64 stamp. Straight
// from the original -- the shader reads thickness out of an 8-bit channel, so there
// is nothing to gain from more steps.
const DROP_SIZE = 64;
const GFX_STEPS = 255;

// Three call shapes, and the no-argument one is load-bearing: `chance` is
// `random() <= c`, so `random()` has to be a uniform 0..1 draw. Defaulting `from`
// to 0 instead of null collapses the range to [0,0], `random()` returns 0, and
// every `chance()` in the simulation is `0 <= c` -- true for all of them, every
// frame. That reads as a plausible port until measured: rain spawns 30x over
// intent, no drop ever rests because break-loose fires continuously, and
// rainChance / rainLimit / the shrink probability are all inert.
const random = (
  from: number | null = null,
  to: number | null = null,
  interpolation: ((n: number) => number) | null = null,
) => {
  let lo = 0;
  let hi = 1;
  if (from !== null) {
    if (to !== null) {
      lo = from;
      hi = to;
    } else {
      hi = from;
    }
  }
  const shape = interpolation ?? ((n: number) => n);
  return lo + shape(Math.random()) * (hi - lo);
};
const chance = (c: number) => random() <= c;

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export function createRaindrops(
  width: number,
  height: number,
  scale: number,
  textures: DropTextures,
  options: RainOptions,
) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const droplets = makeCanvas(width, height);
  const dropletsCtx = droplets.getContext("2d");
  if (!ctx || !dropletsCtx) return null;

  const deltaR = options.maxR - options.minR;
  // Rates in the original are quoted per 1024x768; this keeps a small pane from
  // getting a full window's worth of drops.
  const areaMultiplier = Math.sqrt((width * height) / scale / (1024 * 768));

  // 255 stamps, each the alpha mask filled with the normal map and screened with a
  // blue level. Built once: this is the expensive part, and it never changes.
  const dropsGfx: HTMLCanvasElement[] = [];
  {
    const buffer = makeCanvas(DROP_SIZE, DROP_SIZE);
    const bufferCtx = buffer.getContext("2d");
    if (!bufferCtx) return null;
    for (let i = 0; i < GFX_STEPS; i++) {
      const drop = makeCanvas(DROP_SIZE, DROP_SIZE);
      const dropCtx = drop.getContext("2d");
      if (!dropCtx) return null;

      bufferCtx.clearRect(0, 0, DROP_SIZE, DROP_SIZE);
      bufferCtx.globalCompositeOperation = "source-over";
      bufferCtx.drawImage(textures.color, 0, 0, DROP_SIZE, DROP_SIZE);
      // Screen, so the normal in R and G survives untouched and only the empty blue
      // channel takes the level. Encoding thickness into an unused channel is what
      // lets one stamp carry both.
      bufferCtx.globalCompositeOperation = "screen";
      bufferCtx.fillStyle = `rgba(0,0,${i},1)`;
      bufferCtx.fillRect(0, 0, DROP_SIZE, DROP_SIZE);

      dropCtx.globalCompositeOperation = "source-over";
      dropCtx.drawImage(textures.alpha, 0, 0, DROP_SIZE, DROP_SIZE);
      dropCtx.globalCompositeOperation = "source-in";
      dropCtx.drawImage(buffer, 0, 0, DROP_SIZE, DROP_SIZE);
      dropsGfx.push(drop);
    }
  }

  // Brush that erases droplets from under a passing drop -- a run wipes the mist it
  // crosses, which is what makes its path read as cleared glass.
  const clearGfx = makeCanvas(128, 128);
  {
    const c = clearGfx.getContext("2d");
    if (!c) return null;
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(64, 64, 64, 0, Math.PI * 2);
    c.fill();
  }

  let drops: Drop[] = [];
  let dropletsCounter = 0;
  let textureCleaningIterations = 0;
  let lastRender: number | null = null;

  const newDrop = (init: Partial<Drop>): Drop => ({
    x: 0,
    y: 0,
    r: 0,
    spreadX: 0,
    spreadY: 0,
    momentum: 0,
    momentumX: 0,
    lastSpawn: 0,
    nextSpawn: 0,
    parent: null,
    isNew: true,
    killed: false,
    shrink: 0,
    ...init,
  });

  const createDrop = (init: Partial<Drop>) =>
    drops.length >= options.maxDrops * areaMultiplier ? null : newDrop(init);

  const drawDrop = (target: CanvasRenderingContext2D, drop: Drop) => {
    // Drops are stretched vertically: a bead on glass hangs, and 1.5 is the ratio
    // the original settled on.
    const scaleX = 1;
    const scaleY = 1.5;
    // Thickness from radius, then knocked down by how much the drop is spread:
    // a drop that has just landed is flattened out, so it is thin even if it is
    // wide, and it refracts less until it pulls itself together.
    let d = Math.max(0, Math.min(1, ((drop.r - options.minR) / deltaR) * 0.9));
    d *= 1 / ((drop.spreadX + drop.spreadY) * 0.5 + 1);

    target.globalAlpha = 1;
    target.globalCompositeOperation = "source-over";
    const step = Math.floor(d * (dropsGfx.length - 1));
    target.drawImage(
      dropsGfx[step],
      (drop.x - drop.r * scaleX * (drop.spreadX + 1)) * scale,
      (drop.y - drop.r * scaleY * (drop.spreadY + 1)) * scale,
      drop.r * 2 * scaleX * (drop.spreadX + 1) * scale,
      drop.r * 2 * scaleY * (drop.spreadY + 1) * scale,
    );
  };

  const clearDroplets = (x: number, y: number, r: number) => {
    dropletsCtx.globalCompositeOperation = "destination-out";
    dropletsCtx.drawImage(
      clearGfx,
      (x - r) * scale,
      (y - r) * scale,
      r * 2 * scale,
      r * 2 * scale * 1.5,
    );
  };

  const updateDroplets = (timeScale: number) => {
    if (textureCleaningIterations > 0) {
      textureCleaningIterations -= timeScale;
      dropletsCtx.globalCompositeOperation = "destination-out";
      dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
      dropletsCtx.fillRect(0, 0, width, height);
    }
    dropletsCounter += options.dropletsRate * timeScale * areaMultiplier;
    while (dropletsCounter > 0) {
      dropletsCounter -= 1;
      // Squared draw on the size, so most of the mist is at the small end and only
      // the occasional speck is big.
      drawDrop(
        dropletsCtx,
        newDrop({
          x: random(width / scale),
          y: random(height / scale),
          r: random(options.dropletsSize[0], options.dropletsSize[1], (n) => n * n),
        }),
      );
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(droplets, 0, 0, width, height);
  };

  const updateRain = (timeScale: number) => {
    const spawned: Drop[] = [];
    const limit = options.rainLimit * timeScale * areaMultiplier;
    let count = 0;
    while (chance(options.rainChance * timeScale * areaMultiplier) && count < limit) {
      count++;
      // Weighted draw across the range. The original's exponent is 3, which on a full
      // window is right: it wants thousands of specks and a handful of fat ones. This
      // aperture holds a few dozen drops at a time, so a cubed draw spends nearly all
      // of them at the floor and the pane reads as uniformly small however wide the
      // range is -- the median lands at minR + deltaR/8 whatever maxR says.
      const r = random(options.minR, options.maxR, (n) => Math.pow(n, options.rainPower));
      const drop = createDrop({
        x: random(width / scale),
        y: random(
          (height / scale) * options.spawnArea[0],
          (height / scale) * options.spawnArea[1],
        ),
        r,
        momentum: 1 + (r - options.minR) * 0.1 + random(2),
        // Lands flattened and pulls in over the next few frames -- the impact.
        spreadX: 1.5,
        spreadY: 1.5,
      });
      if (drop) spawned.push(drop);
    }
    return spawned;
  };

  const updateDrops = (timeScale: number) => {
    const next: Drop[] = [];
    updateDroplets(timeScale);
    next.push(...updateRain(timeScale));

    // Sorted by scanline position so the collision pass can look at a bounded slice
    // of neighbours instead of every other drop.
    drops.sort((a, b) => {
      const va = a.y * (width / scale) + a.x;
      const vb = b.y * (width / scale) + b.x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    drops.forEach((drop, i) => {
      if (drop.killed) return;

      // Whether a drop breaks loose is a per-frame chance weighted by size, not a
      // constant fall: that is why the pane has drops sitting still next to drops
      // running, and why one starts moving without anything having changed.
      if (
        chance(
          (drop.r - options.minR * options.dropFallMultiplier) *
            (0.1 / deltaR) *
            timeScale,
        )
      ) {
        drop.momentum += random((drop.r / options.maxR) * 4);
      }
      // Strictly below minR, which is a departure from the original's `<=`, and at a
      // far steeper rate than its 0.05/0.01. Both changes are about the same thing:
      // this is the only mechanism that can retire a sub-minR drop at all, because the
      // break-loose chance is `(r - minR) * k` and goes negative there, so trail debris
      // neither falls nor shrinks on its own and sits on the glass forever. The
      // original's rate grinds a speck away in about eight seconds, which on a full
      // window is nothing and here leaves several times as much debris standing at any
      // moment -- and debris is not neutral on this pane, because the outline the water
      // shader draws renders every speck as a dark dot. Roughly two seconds here.
      //
      // The `<` matters as well: the original's `<=` also catches beads resting at
      // exactly minR, which is what grinds a quiet pane empty. Spawn draws from minR
      // upward, so `<` leaves the beads alone and still collects every trail.
      if (options.autoShrink && drop.r < options.minR && chance(0.3 * timeScale)) {
        drop.shrink += 0.03;
      }
      drop.r -= drop.shrink * timeScale;
      if (drop.r <= 0) drop.killed = true;

      // Trail: the run sheds a smaller drop behind it and loses radius doing it, so
      // it thins out as it goes and eventually has nothing left to shed.
      drop.lastSpawn += drop.momentum * timeScale * options.trailRate;
      if (drop.lastSpawn > drop.nextSpawn) {
        const trail = createDrop({
          x: drop.x + random(-drop.r, drop.r) * 0.1,
          y: drop.y - drop.r * 0.01,
          r: drop.r * random(options.trailScaleRange[0], options.trailScaleRange[1]),
          spreadY: drop.momentum * 0.1,
          parent: drop,
        });
        if (trail) {
          next.push(trail);
          drop.r *= Math.pow(0.97, timeScale);
          drop.lastSpawn = 0;
          drop.nextSpawn =
            random(options.minR, options.maxR) -
            drop.momentum * 2 * options.trailRate +
            (options.maxR - drop.r);
        }
      }

      // Spread relaxes back to round, x faster than y: gravity keeps pulling the
      // vertical stretch even after the impact flattening is gone.
      drop.spreadX *= Math.pow(0.4, timeScale);
      drop.spreadY *= Math.pow(0.7, timeScale);

      const moved = drop.momentum > 0;
      if (moved && !drop.killed) {
        drop.y += drop.momentum * options.globalTimeScale;
        drop.x += drop.momentumX * options.globalTimeScale;
        if (drop.y > height / scale + drop.r) drop.killed = true;
      }

      // The isNew clause is in the port so a rain drop that has just landed can merge
      // on arrival, before it has moved. Trail debris inherits it by accident, and the
      // accident is not harmless: a speck that is new for one frame can eat its
      // neighbours, and a chain of specks left behind by a run will assemble itself
      // into a bead that then starts shedding trails of its own. Requiring minR to eat
      // while stationary keeps the case the clause is for -- rain never spawns smaller
      // than that -- and leaves debris to be eaten rather than to feed.
      const checkCollision =
        (moved || (drop.isNew && drop.r >= options.minR)) && !drop.killed;
      drop.isNew = false;

      if (checkCollision) {
        // Bounded slice, and only against smaller drops: a big one eats a small one,
        // never the other way round, so a merge always has a clear survivor.
        drops.slice(i + 1, i + 70).forEach((other) => {
          if (
            drop === other ||
            drop.r <= other.r ||
            drop.parent === other ||
            other.parent === drop ||
            other.killed
          ) {
            return;
          }
          const dx = other.x - drop.x;
          const dy = other.y - drop.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const reach =
            (drop.r + other.r) *
            (options.collisionRadius +
              drop.momentum * options.collisionRadiusIncrease * timeScale);
          if (dist >= reach) return;

          // Merged by area, and only 80% of the smaller one is kept: volume is
          // conserved, not width, which is why two mid drops make one slightly
          // bigger drop rather than one twice the size.
          const a1 = Math.PI * drop.r * drop.r;
          const a2 = Math.PI * other.r * other.r;
          drop.r = Math.min(options.maxR, Math.sqrt((a1 + a2 * 0.8) / Math.PI));
          drop.momentumX += dx * 0.1;
          drop.spreadX = 0;
          drop.spreadY = 0;
          other.killed = true;
          // The survivor is boosted, so a merge is what sets off a run down the
          // pane -- drops collecting until one is heavy enough to go.
          drop.momentum = Math.max(
            other.momentum,
            Math.min(
              40,
              drop.momentum +
                drop.r * options.collisionBoostMultiplier +
                options.collisionBoost,
            ),
          );
        });
      }

      drop.momentum -= Math.max(1, options.minR * 0.5 - drop.momentum) * 0.1 * timeScale;
      if (drop.momentum < 0) drop.momentum = 0;
      drop.momentumX *= Math.pow(0.7, timeScale);

      if (!drop.killed) {
        next.push(drop);
        if (moved && options.dropletsRate > 0) {
          clearDroplets(drop.x, drop.y, drop.r * options.dropletsCleaningRadiusMultiplier);
        }
        drawDrop(ctx, drop);
      }
    });

    drops = next;
  };

  return {
    canvas,
    // Driven by the caller rather than owning a requestAnimationFrame of its own,
    // so the pane can be paused when the dolly starts for the same reason the
    // broadcast is.
    step(now: number) {
      ctx.clearRect(0, 0, width, height);
      if (lastRender === null) lastRender = now;
      // Clamped, so a dropped frame or a backgrounded tab does not advance the
      // simulation by a visible jump when it comes back.
      let timeScale = Math.min(1.1, (now - lastRender) / ((1 / 60) * 1000));
      timeScale *= options.globalTimeScale;
      lastRender = now;
      updateDrops(timeScale);
    },
    reset() {
      drops = [];
      dropletsCounter = 0;
      lastRender = null;
      textureCleaningIterations = 50;
      ctx.clearRect(0, 0, width, height);
      dropletsCtx.clearRect(0, 0, width, height);
    },
  };
}
