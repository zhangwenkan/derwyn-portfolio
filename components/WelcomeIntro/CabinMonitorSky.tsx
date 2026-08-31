import type { RefObject } from "react";

/* The monitor's own idle picture: the planet, its ring and five stars, redrawn over
   the ones painted into layer-middle.webp so that erasing the painted set does not
   leave the screen opening onto nothing.

   Plate coordinates again -- viewBox 137 284 166 145 is exactly the box .tv covers,
   so every number here is a pixel of the 2048x1152 plate and lines up with the
   aperture outline in CabinMonitorShell. .tv's clip-path trims this to the screen's
   real contour, so nothing here has to know the corners are rounded.

   Geometry off a mask scan of the plate (.claude/checkpoints/captain-tv-rebuild.md).
   The ring is drawn as a clean elliptical annulus rather than traced: the painted one
   is not a projected circle -- solving for its minor axis from the near arm gives 9
   and from the far arm gives 16 -- and a ring whose two halves disagree reads as a
   drawing mistake rather than as a tilt. Same call as SHELL, and for the same reason.
   Fitted to what the painted one does agree on: the two tips, which put the centre on
   the globe and the major axis at -21 degrees. */

const C = { x: 222, y: 364 };
const GLOBE_R = 34;

/* One revolution of the surface, in plate px of travel. The globe's diameter, so the
   mottling tile and its repeat are the same width and the loop is seamless. */
export const SKY_SPIN_SPAN = 68;

/* Annulus, in the ring's own frame before the -21 rotation. Centre line a=50 b=13,
   band 2.6 either side. evenodd over two ellipse subpaths is the hole. */
const RING = `M${C.x - 52.6} ${C.y} a52.6 15.6 0 1 0 105.2 0 a52.6 15.6 0 1 0 -105.2 0 Z M${C.x - 47.4} ${C.y} a47.4 10.4 0 1 0 94.8 0 a47.4 10.4 0 1 0 -94.8 0 Z`;

/* Four-point sparkle in a unit box, scaled per star. The sides bow towards the centre
   -- a convex four-point star reads as a diamond, and what makes these read as stars
   is that the arms are thin where they meet. */
const STAR =
  "M0 -1 C0.06 -0.34 0.34 -0.06 1 0 C0.34 0.06 0.06 0.34 0 1 C-0.06 0.34 -0.34 0.06 -1 0 C-0.34 -0.06 -0.06 -0.34 0 -1 Z";

/* Centre and half-extents measured at L>150, which is where each glyph's arms end.
   They differ in both size and aspect; a field of identical stars reads as a texture. */
const STARS: [number, number, number, number][] = [
  [165.5, 324, 6, 8.5],
  [275.5, 320, 4, 5],
  [152.5, 366.5, 5, 5],
  [164, 399.5, 5, 6],
  [270.5, 399, 7, 7.5],
];

export function CabinMonitorSky({
  spinRef,
  starRefs,
  pictureRef,
  fogRef,
}: {
  spinRef: RefObject<SVGGElement | null>;
  starRefs: RefObject<(SVGUseElement | null)[]>;
  pictureRef: RefObject<SVGGElement | null>;
  fogRef: RefObject<SVGFilterElement | null>;
}) {
  return (
    <svg viewBox="137 284 166 145" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* The fog the starfield leaves in. fractalNoise displaces the picture and a
            blur goes over the top, both driven up from zero by GSAP, so the field is
            torn into wisps and softened rather than covered over. The warp is what
            separates this from defocus: a blur on its own is a camera losing focus,
            where streaks that then go soft read as something passing in front of it.

            Animating the noise's own baseFrequency is what makes it flow -- the pattern
            doing the displacing keeps changing shape, so the smear rolls instead of
            sitting there as one frozen distortion.

            sRGB is not optional. Under the default linearRGB the map's R and G are
            gamma-shifted off centre, and a map that should push both ways pushes almost
            entirely one way. */}
        <filter
          ref={fogRef}
          id="skyFog"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="3"
            seed="11"
            result="fogNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="fogNoise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
            result="fogWarp"
          />
          <feGaussianBlur in="fogWarp" stdDeviation="0" />
        </filter>

        {/* Lit from the upper left, which is where the plate's brightest sample sits
            (L194 at 208,346 against L166 at the centre and L149 low). Plate units so
            the focus lands on the sphere rather than on a fraction of its box. */}
        <radialGradient
          id="skyGlobe"
          gradientUnits="userSpaceOnUse"
          cx="207"
          cy="347"
          r="52"
        >
          <stop offset="0" stopColor="#b0cbdc" />
          <stop offset="0.2" stopColor="#90b7d3" />
          <stop offset="0.45" stopColor="#7aafd1" />
          <stop offset="0.78" stopColor="#70a6cb" />
          <stop offset="1" stopColor="#6a9ec6" />
        </radialGradient>
        {/* The dark rim, and it is only really dark along the bottom: the plate reads
            L169 across the top contour and L75 under the south limb. A rim of one
            weight all the way round reads as an outline drawn on a disc. */}
        <linearGradient
          id="skyRim"
          gradientUnits="userSpaceOnUse"
          x1="222"
          y1="330"
          x2="222"
          y2="399"
        >
          <stop offset="0" stopColor="#33506a" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#2f4a63" stopOpacity="0.5" />
          <stop offset="1" stopColor="#2a4258" stopOpacity="1" />
        </linearGradient>
        {/* Holds the mottling to the sphere. */}
        <clipPath id="skyGlobeClip">
          <circle cx={C.x} cy={C.y} r={GLOBE_R} />
        </clipPath>
        {/* Fades the mottling out at both limbs, so a patch arrives at one edge and
            leaves at the other instead of sliding in as a flat sheet. This is what
            carries the rotation: the shading above it never moves, so the only thing
            changing is which part of the surface is turned towards us. Sits on a
            wrapper that is not translated -- on the moving group the fade would
            travel with the patches and hide nothing. */}
        <linearGradient
          id="skyLimbFade"
          gradientUnits="userSpaceOnUse"
          x1={C.x - GLOBE_R}
          y1="0"
          x2={C.x + GLOBE_R}
          y2="0"
        >
          <stop offset="0" stopColor="#000000" />
          <stop offset="0.22" stopColor="#ffffff" />
          <stop offset="0.78" stopColor="#ffffff" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="skyLimbMask">
          <rect
            x={C.x - GLOBE_R}
            y={C.y - GLOBE_R}
            width={GLOBE_R * 2}
            height={GLOBE_R * 2}
            fill="url(#skyLimbFade)"
          />
        </mask>
        {/* Both blob fills, in objectBoundingBox units so each one gets its own centred
            falloff scaled to its own box. Soft edges are the whole point: a flat fill
            gives a disc with a hard rim, and a sphere covered in hard-rimmed discs reads
            as a cratered moon rather than as cloud. A blur filter would do the same but
            would re-render the group on every frame of the spin, and this does not.
            Two fills and not seven: the patches were painted in four hexes within 16 of
            each other per channel, which is a difference nothing could see. What
            actually separates them is per-blob opacity. */}
        <radialGradient id="skyBlob">
          <stop offset="0" stopColor="#c9dcec" />
          <stop offset="0.55" stopColor="#c9dcec" stopOpacity="0.72" />
          <stop offset="1" stopColor="#c9dcec" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skySpeck">
          <stop offset="0" stopColor="#eef4f9" />
          <stop offset="0.5" stopColor="#eef4f9" stopOpacity="0.58" />
          <stop offset="1" stopColor="#eef4f9" stopOpacity="0" />
        </radialGradient>
        {/* One revolution of surface. Every blob stays clear of x=188 and x=256 so the
            tile can butt against its own copy without a patch being cut in half as the
            seam crosses the disc. */}
        <g id="skyMottle">
          <ellipse cx="205" cy="350" rx="7" ry="5.5" fill="url(#skyBlob)" opacity="0.52" />
          <ellipse cx="218" cy="340" rx="8.5" ry="5" fill="url(#skyBlob)" opacity="0.4" />
          <ellipse cx="236" cy="347" rx="6" ry="4.5" fill="url(#skyBlob)" opacity="0.42" />
          <ellipse cx="245" cy="378" rx="6.5" ry="5" fill="url(#skyBlob)" opacity="0.34" />
          <ellipse cx="213" cy="372" rx="5" ry="4" fill="url(#skyBlob)" opacity="0.4" />
          <ellipse cx="228" cy="387" rx="7.5" ry="4.5" fill="url(#skyBlob)" opacity="0.32" />
          <ellipse cx="196" cy="363" rx="4.5" ry="5.5" fill="url(#skyBlob)" opacity="0.34" />
          <circle cx="207" cy="348" r="2.6" fill="url(#skySpeck)" opacity="0.66" />
          <circle cx="240" cy="356" r="2" fill="url(#skySpeck)" opacity="0.52" />
          <circle cx="222" cy="369" r="1.8" fill="url(#skySpeck)" opacity="0.48" />
        </g>
        {/* Half-planes in the ring's own frame, so which arm is in front is decided by
            geometry rather than by two hand-written paths that could disagree. */}
        <clipPath id="skyRingFar">
          <rect x="120" y="280" width="204" height={C.y - 280} />
        </clipPath>
        <clipPath id="skyRingNear">
          <rect x="120" y={C.y} width="204" height="88" />
        </clipPath>
        <path id="skyRingBand" d={RING} fillRule="evenodd" />
        <path id="skyStar" d={STAR} />
      </defs>

      {/* #253749 is the field navy .tvVeil and .tvRaster both end on. It has to be
          exactly that: the veil crossfades over this in the opening beat, and any
          difference would show up as the picture area lifting away from its border. */}
      <rect x="137" y="284" width="166" height="145" fill="#253749" />

      {/* Everything with light in it, on one group, because the whole picture is what
          the set takes away when it switches off: GSAP folds this to a line, pinches
          the line to a dot and lets the dot decay. The field rect above stays out of
          it -- a screen that keeps its navy while the picture collapses into it is a
          set losing its deflection, where collapsing the navy too would open a hole
          onto the plate's own painted monitor. */}
      <g ref={pictureRef}>
        {STARS.map(([x, y, hw, hh], i) => (
          <use
            key={`${x}-${y}`}
            ref={(el) => {
              starRefs.current[i] = el;
            }}
            href="#skyStar"
            transform={`translate(${x} ${y}) scale(${hw} ${hh})`}
            fill="#eef2f6"
          />
        ))}

        {/* Far arm first: the globe drawn over it is what hides the middle of it, so
            the two stubs at the shoulders are left without masking either by hand. */}
        <g transform={`rotate(-21 ${C.x} ${C.y})`}>
          <g clipPath="url(#skyRingFar)">
            <use href="#skyRingBand" fill="#969ea2" />
          </g>
        </g>

        <circle cx={C.x} cy={C.y} r={GLOBE_R + 1.5} fill="url(#skyRim)" />
        <circle cx={C.x} cy={C.y} r={GLOBE_R} fill="url(#skyGlobe)" />
        <g clipPath="url(#skyGlobeClip)">
          <g mask="url(#skyLimbMask)">
            <g ref={spinRef}>
              <use href="#skyMottle" />
              <use href="#skyMottle" x={SKY_SPIN_SPAN} />
            </g>
          </g>
        </g>

        {/* Near arm over the globe. It needs the contour the far arm does not: against
            the navy field the band separates on brightness alone, against a lit sphere
            of similar value it does not. */}
        <g transform={`rotate(-21 ${C.x} ${C.y})`}>
          <g clipPath="url(#skyRingNear)">
            <use
              href="#skyRingBand"
              fill="#c6c7c2"
              stroke="#33475a"
              strokeWidth="0.7"
              strokeOpacity="0.5"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
