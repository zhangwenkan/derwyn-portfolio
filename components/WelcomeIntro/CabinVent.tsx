/* Vent and indicator panel on the starboard wall, redrawn over the one painted into
   layer-middle.webp. Every number here was measured off that plate, so treat them as
   traced rather than chosen.

   Everything is drawn in a frame rotated -5deg about plate (1788.7, 355.4), so each
   shape is a plain <rect rx>. The painted assembly is not a rotated rectangle -- its
   horizontals sit at -3.85deg and its verticals at -6.2deg -- and tracing that
   faithfully reads as a skewed rectangle rather than a tilted object. -5deg is the
   mean of the two, and is already what --lamp-tilt uses for the three lamps below.

   The collar is two rects, not one path with a uniform inner stroke, because the band
   is deliberately wider along the bottom and right (20 and 15) than along the top and
   left (12 and 14). That asymmetry is the whole reason it reads as a raised ring seen
   from above-left: those are the inner walls you would actually see. A uniform inner
   stroke would flatten it back into an outline.

   The outer rect is larger than the painted one along its bottom and left, since the
   painted outline shears 8px to the right over its width. A rect that matched the
   average would let the painted contour show below its own on the right, which is the
   doubled line the monitor rebuild ran into. */

const CX = 1788.7;
const CY = 355.4;

export function CabinVent() {
  return (
    <svg viewBox="1640 200 296 320" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* Plate coordinates on every gradient, never bounding-box fractions: two of
            these are painted onto strokes, whose bbox is the stroke's own, so
            fractional stops would land at a different t on each side of the ring. */}
        <linearGradient id="ventPanelFace" gradientUnits="userSpaceOnUse" x1="-106" y1="-120" x2="102" y2="116">
          <stop offset="0" stopColor="#cdc6c4" />
          <stop offset="0.5" stopColor="#cac3c1" />
          <stop offset="1" stopColor="#c6bfbd" />
        </linearGradient>
        {/* The panel's bevel. Vertical, not diagonal: the plate's lip is L211 across
            the whole top edge and only L199-206 down the left, so it is depth into the
            recess that dims it, not distance from a corner. Padding to transparent by
            v=10 is what keeps the bottom edge clear -- the plate has no lip there. */}
        <linearGradient id="ventPanelLip" gradientUnits="userSpaceOnUse" x1="0" y1="-121" x2="0" y2="10">
          <stop offset="0" stopColor="#e2dddb" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#e2dddb" stopOpacity="0.22" />
          <stop offset="1" stopColor="#e2dddb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ventGrilleFace" gradientUnits="userSpaceOnUse" x1="-87" y1="0" x2="79" y2="0">
          <stop offset="0" stopColor="#999393" />
          <stop offset="1" stopColor="#9e9998" />
        </linearGradient>
        {/* Why the grille reads as a hole rather than a tile: the plate's contour is
            4px along its top edge and 1px along its bottom. Thickening the top with a
            clipped inner stroke rather than by widening the whole outline keeps the
            other three sides at the 2px they measure. */}
        <linearGradient id="ventGrilleTop" gradientUnits="userSpaceOnUse" x1="0" y1="-73" x2="0" y2="-58">
          <stop offset="0" stopColor="#454140" stopOpacity="0.8" />
          <stop offset="1" stopColor="#454140" stopOpacity="0" />
        </linearGradient>
        <filter id="ventLift" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="1.6" floodColor="#4c4542" floodOpacity="0.4" />
        </filter>
        <rect id="ventPanel" x="-106" y="-120.5" width="208" height="236.5" rx="22" />
        <rect id="ventGrille" x="-87.5" y="-73" width="166.5" height="128.5" rx="17" />
        <clipPath id="ventPanelClip">
          <use href="#ventPanel" />
        </clipPath>
        <clipPath id="ventGrilleClip">
          <use href="#ventGrille" />
        </clipPath>
      </defs>

      <g transform={`translate(${CX} ${CY}) rotate(-5)`}>
        {/* The collar standing off the wall. The plate's shadow falls straight down and
            only below, so no dx -- and it is a hard band about 6px deep that returns to
            clean wall abruptly, not a long soft falloff, hence the small stdDeviation. */}
        <rect
          x="-123"
          y="-135"
          width="244"
          height="274"
          rx="34"
          fill="#979291"
          stroke="#3b3734"
          strokeWidth="2.4"
          filter="url(#ventLift)"
        />

        <use href="#ventPanel" fill="url(#ventPanelFace)" stroke="#4b4745" strokeWidth="2.2" />
        {/* Clipped so the bevel stays inside the panel instead of climbing over the
            contour onto the band. */}
        <use
          href="#ventPanel"
          fill="none"
          stroke="url(#ventPanelLip)"
          strokeWidth="13"
          clipPath="url(#ventPanelClip)"
        />

        {/* The lit inner wall at the bottom of the recess, drawn as the grille's own
            outline pushed 3px down showing under it: light enters from above, so it is
            the upward-facing wall that catches it. */}
        <use href="#ventGrille" y="3" fill="#cfc9c7" />
        <use href="#ventGrille" fill="url(#ventGrilleFace)" stroke="#5c5754" strokeWidth="2" />
        <use
          href="#ventGrille"
          fill="none"
          stroke="url(#ventGrilleTop)"
          strokeWidth="8"
          clipPath="url(#ventGrilleClip)"
        />

        {/* Fully rounded ends -- the plate's louvers are capsules, rx is half the
            height. Flat fill: the plate's cores hold L70-80 the whole way across, and
            the left-to-right ramp a row scan seems to show is the sheared edge
            crossing the row, not shading. */}
        <g fill="#4c4a48" stroke="#302e2c" strokeWidth="1.8">
          <rect x="-66" y="-51" width="124" height="13" rx="6.5" />
          <rect x="-66" y="-20.5" width="124" height="13" rx="6.5" />
          <rect x="-66" y="10" width="124" height="13" rx="6.5" />
        </g>
      </g>
    </svg>
  );
}
