/* Cabin monitor housing, redrawn over the one painted into layer-middle.webp.

   The SVG works in plate coordinates -- viewBox 84 206 282 318 of the 2048x1152
   plate -- rather than in a normalised box, because every number came off a per-row
   scan of that plate (.claude/checkpoints/captain-tv-rebuild.md).

   The shear is deliberately gentler and more consistent than the plate's. The
   painted set slopes its top edge down 19px to the right while its bottom edge stays
   flat, which traced faithfully reads as a mistake rather than as perspective: a
   viewer resolves a quadrilateral by comparing its opposite edges, so top and bottom
   disagreeing that far looks like a skewed rectangle rather than a tilted object.
   Here both horizontals fall to the right and both verticals lean left going down,
   with the right side 12px shorter than the left -- one coherent read, and still off
   axis enough to sit on a curved wall.

   The band and the panel are one path, not two. Drawing them as separate outlines is
   what made their edges disagree -- each had to restate the lean and the bow, so any
   difference read as the inner panel being tilted against the outer one. Here the
   panel is the fill and the band is an inner stroke of that same path, clipped to it,
   so the band is the same thickness everywhere and the two edges cannot drift apart.
   The black outline and the black seam are further inner strokes, each a few units
   wider than whatever is drawn over it: that is how a 1.5px line lands on a curve
   SVG gives no offset-path for. Order matters -- widest first, since every one of
   them covers w/2 inward from the shared edge.

   The screen is a hole, not a fill. What fills it is .tv, whose bottom layer is the
   planet-and-stars SVG in CabinMonitorSky.tsx; a navy fill here would be a second
   opinion about the field colour behind the same aperture. .tv covers that aperture
   exactly -- which is also what lets the well around it be drawn as strokes centred
   on the aperture outline: everything inside is hidden, so only the outward half of
   each stroke survives. */

/* Corner radii are ~40% larger than the plate's own, because every inner stroke
   sharpens a convex corner by its half-width: the cream panel is what the eye
   actually reads as the housing's corner, and the w32 band takes 16 off it. */
const SHELL =
  "M113 257 Q116 211 154 212 Q232 215 309 227 Q351 230 350 274 Q348 370 337 466 Q334 512 294 512 Q214 516 134 502 Q92 501 93 463 Q96 360 113 257 Z";

/* The screen is a tilted rounded square carrying the same lean as the housing, not
   the plate's own slightly barrelled trapezoid: at this size the barrel only reads
   as an unsteady edge. .tv's clip-path is this outline in its own object-bounding-box
   units, duplicated below rather than re-derived -- the two have to agree to the
   pixel or the panel shows a navy rim. */
const SCREEN =
  "M146 300 Q147 285 162 284 Q224 285 286 292 Q301 293 302 308 Q303 360 294 412 Q293 427 278 428 Q216 429 154 424 Q139 423 138 408 Q137 354 146 300 Z";

/* Same outline over the box x137-303 / y284-429 that .tv covers: (x-137)/166,
   (y-284)/145. */
const SCREEN_CLIP =
  "M0.0542 0.1103 Q0.0602 0.0069 0.1506 0 Q0.5241 0.0069 0.8976 0.0552 Q0.988 0.0621 0.994 0.1655 Q1 0.5241 0.9458 0.8828 Q0.9398 0.9862 0.8494 0.9931 Q0.4759 1 0.1024 0.9655 Q0.012 0.9586 0.006 0.8552 Q0 0.4828 0.0542 0.1103 Z";

export function CabinMonitorShell() {
  return (
    <svg viewBox="84 206 282 318" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="tvBand" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#878283" />
          <stop offset="0.5" stopColor="#948f90" />
          <stop offset="1" stopColor="#a19d9c" />
        </linearGradient>
        <linearGradient id="tvPanel" x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#d2ccc9" />
          <stop offset="0.5" stopColor="#c9c2c0" />
          <stop offset="1" stopColor="#bfb8b6" />
        </linearGradient>
        {/* What actually gives the plate's panel depth. Its face is flat -- L189-200
            everywhere -- except for a bright rim along its *right* inner edge only
            (L211-215 at x325, while x125 stays L189-195 and the top and bottom stay
            L190-198). One-sided like that reads as a sunken face lit from the left,
            so the ramp is horizontal in plate coordinates and pads to transparent
            across the whole left half. */}
        <linearGradient id="tvPanelBevel" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="332" y2="0">
          <stop offset="0" stopColor="#e2dcd9" stopOpacity="0" />
          <stop offset="0.55" stopColor="#e2dcd9" stopOpacity="0.25" />
          <stop offset="1" stopColor="#e2dcd9" stopOpacity="0.95" />
        </linearGradient>
        {/* The well the screen sits in. One diagonal ramp does all four walls: the
            plate has the left wall at L72-142 and the right at L124-163, so the
            gradient runs mostly across rather than down. Plate coordinates, not
            bounding-box fractions -- on a stroke the bbox is the stroke's own, so
            fractional stops land somewhere different on each side and the wall
            visibly steps. The bright end stays at L150 against a panel of L190-205:
            a 40-level gap is the whole reason the plate's well reads as outlined,
            there is no drawn contour to find. */}
        <linearGradient id="tvRingFace" gradientUnits="userSpaceOnUse" x1="126" y1="350" x2="314" y2="380">
          <stop offset="0" stopColor="#66615f" />
          <stop offset="0.45" stopColor="#8b8684" />
          <stop offset="1" stopColor="#9a9593" />
        </linearGradient>
        {/* Seam and lip exist only along the bottom: the plate has L84 then L217 at
            y445/447 and nothing at all up top. Vertical by construction (x1 === x2)
            so the sides fall outside the ramp and pad to the transparent first stop
            -- confining them by geometry rather than by tuning offsets. */}
        <linearGradient id="tvRingSeam" gradientUnits="userSpaceOnUse" x1="220" y1="428" x2="220" y2="441">
          <stop offset="0" stopColor="#55504e" stopOpacity="0" />
          <stop offset="0.35" stopColor="#55504e" stopOpacity="0" />
          <stop offset="0.62" stopColor="#55504e" stopOpacity="0.95" />
          <stop offset="1" stopColor="#55504e" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="tvRingLip" gradientUnits="userSpaceOnUse" x1="220" y1="428" x2="220" y2="443">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.72" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
        </linearGradient>
        <filter id="tvLift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="3.5" stdDeviation="3.2" floodColor="#4c4542" floodOpacity="0.22" />
        </filter>
        <path id="tvShellBody" d={SHELL} />
        <path id="tvScreenBody" d={SCREEN} />
        <clipPath id="tvShellClip">
          <use href="#tvShellBody" />
        </clipPath>
        <clipPath id="tvScreenClip" clipPathUnits="objectBoundingBox">
          <path d={SCREEN_CLIP} />
        </clipPath>
        {/* Channel separation for the broadcast bust, referenced from the stylesheet
            by two HTML img copies that are screen-blended back together. One keeps
            red, the other keeps green and blue; alpha passes through both so the
            portrait's own cutout survives. Together they are the source image
            exactly, which is what lets the split rest at zero and be invisible.

            colorInterpolationFilters="sRGB" is not optional. The default is
            linearRGB, and filtering in linear light makes the screen of the two
            copies come back brighter than the single image it replaced -- the bust
            would then sit lit differently from the caption beside it, at rest, with
            nothing animating. */}
        <filter id="tvChanR" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="tvChanC" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />
        </filter>
      </defs>

      {/* The set standing off the wall. The painted one casts nothing at all, which
          is most of why it reads as wallpaper rather than as hardware. */}
      <use href="#tvShellBody" fill="url(#tvPanel)" filter="url(#tvLift)" />

      <g clipPath="url(#tvShellClip)">
        {/* Widths chosen so the visible rings match the plate: band 5-19 inward
            (the plate's is 16px wide at y340, the previous w32 gave only 10 and read
            as a thin outline round a large flat face), seam 19-20.5, bevel 20.5-23.
            Each stroke covers w/2 inward from the shared edge, so a ring survives
            from its own half-width to the next one's -- widest first. */}
        <use href="#tvShellBody" fill="none" stroke="url(#tvPanelBevel)" strokeWidth="46" />
        <use href="#tvShellBody" fill="none" stroke="#211d1b" strokeWidth="41" strokeOpacity="0.7" />
        <use href="#tvShellBody" fill="none" stroke="url(#tvBand)" strokeWidth="38" />
        <use href="#tvShellBody" fill="none" stroke="#c6c1c0" strokeWidth="10" strokeOpacity="0.4" />
        <use href="#tvShellBody" fill="none" stroke="#1f1b19" strokeWidth="6" strokeOpacity="0.8" />
      </g>

      {/* The steel well around the glass, another inner-stroke ladder -- but this one
          reads outward, since .tv covers everything inside SCREEN. Each stroke is
          centred on the aperture, so what survives of it is the band from its own
          half-width in to the next stroke's, widest drawn first. Measured off the
          plate outward from the glass: 0-1.6 dark contour, 1.6-7 wall, 7-9 seam,
          9-11 lip. */}
      <use href="#tvScreenBody" fill="none" stroke="url(#tvRingLip)" strokeWidth="22" />
      <use href="#tvScreenBody" fill="none" stroke="url(#tvRingSeam)" strokeWidth="18" />
      <use href="#tvScreenBody" fill="none" stroke="url(#tvRingFace)" strokeWidth="14" />
      <use href="#tvScreenBody" fill="none" stroke="#10171f" strokeWidth="3.2" strokeOpacity="0.85" />
    </svg>
  );
}
