"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Delaunay } from "d3-delaunay";
import * as THREE from "three";

/**
 * Glass panes + text attachment — same pattern as /contacts TraceCard:
 * each pane is a 3D group; Html transform is a child of that group so
 * text tilts/pushes with the plate (not a screen overlay, not deacal).
 */

const PARAMS = {
  pieceCount: 5,
  relaxIterations: 6,
  minEdgeLength: 0.08,
  gap: 0.028,
  cornerRadius: 0.045,
  cornerSmoothness: 0,
  paneDepth: 0.04,
  panePadding: 0.12,
  seed: 11,
  hoverTilt: 0.36,
  hoverRadius: 1.95,
  hoverCellPush: 0.18,
  hoverEase: 4,
  parallax: 1.9,
  matcapStrength: 0.18,
  // Base distanceFactor matches /contacts (world = cssPx/100 when df=4).
  // Effective df = distanceFactor / textSharpness so we can supersample DOM text.
  distanceFactor: 4,
  /** Render Html at N× CSS size then map smaller → crisper glyphs under 3D transform */
  textSharpness: 2,
  glass: {
    ior: 1.5,
    thickness: 0.6,
    roughness: 0.28,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.35,
    color: "#121218",
  },
};

type PaneBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type PaneLayout = {
  seeds: [number, number][];
  geometries: THREE.BufferGeometry[];
  bounds: PaneBounds[];
};

function mulberry32(seed: number) {
  return function next() {
    let t = (seed = (seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lineIntersect(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): [number, number] | null {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(den) < 1e-9) return null;
  const t =
    ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

function insetPolygon(poly: [number, number][], amount: number) {
  if (amount <= 0) return poly;
  if (poly.length < 3) return null;
  const edges: { p1: [number, number]; p2: [number, number] }[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const nx = -dy / len;
    const ny = dx / len;
    edges.push({
      p1: [a[0] + nx * amount, a[1] + ny * amount],
      p2: [b[0] + nx * amount, b[1] + ny * amount],
    });
  }
  if (edges.length < 3) return null;
  const out: [number, number][] = [];
  for (let i = 0; i < edges.length; i += 1) {
    const prev = edges[(i + edges.length - 1) % edges.length];
    const cur = edges[i];
    out.push(lineIntersect(prev.p1, prev.p2, cur.p1, cur.p2) ?? cur.p1);
  }
  return out.length >= 3 ? out : null;
}

function softMin3(a: number, b: number, c: number, k: number) {
  if (k <= 0) return Math.min(a, b, c);
  const m = Math.min(a, b, c);
  return (
    m -
    k *
      Math.log(
        Math.exp(-(a - m) / k) +
          Math.exp(-(b - m) / k) +
          Math.exp(-(c - m) / k),
      )
  );
}

function extrudeRounded(
  points: [number, number][],
  radius: number,
  depth: number,
  smoothness = 0,
) {
  const shape = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const vx0 = cur[0] - prev[0];
    const vy0 = cur[1] - prev[1];
    const vx1 = next[0] - cur[0];
    const vy1 = next[1] - cur[1];
    const len0 = Math.hypot(vx0, vy0);
    const len1 = Math.hypot(vx1, vy1);
    if (len0 < 1e-6 || len1 < 1e-6) continue;
    const ux0 = vx0 / len0;
    const uy0 = vy0 / len0;
    const ux1 = vx1 / len1;
    const uy1 = vy1 / len1;
    const cos = Math.max(-1, Math.min(1, -ux0 * ux1 - uy0 * uy1));
    const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const tanHalf = 1 + cos;
    const k = tanHalf > 1e-6 ? sin / tanHalf : 0;
    let cut = 0;
    if (k > 1e-4) {
      cut = Math.max(
        0,
        softMin3(radius / k, 0.49 * len0, 0.49 * len1, smoothness),
      );
    }
    const sx = cur[0] - ux0 * cut;
    const sy = cur[1] - uy0 * cut;
    const ex = cur[0] + ux1 * cut;
    const ey = cur[1] + uy1 * cut;
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
    if (cut > 1e-4) {
      shape.bezierCurveTo(
        sx + ux0 * cut * 0.5523,
        sy + uy0 * cut * 0.5523,
        ex - ux1 * cut * 0.5523,
        ey - uy1 * cut * 0.5523,
        ex,
        ey,
      );
    } else {
      shape.lineTo(cur[0], cur[1]);
    }
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.2 * depth,
    bevelSize: 0.2 * depth,
    bevelSegments: 2,
    curveSegments: 12,
  });
}

function buildPaneLayout(worldW: number, worldH: number): PaneLayout | null {
  if (worldW <= 0.2 || worldH <= 0.2) return null;
  const {
    pieceCount,
    relaxIterations,
    minEdgeLength,
    gap,
    cornerRadius,
    cornerSmoothness,
    paneDepth,
    panePadding,
    seed,
  } = PARAMS;

  const padX = Math.min(panePadding, worldW * 0.08);
  const padY = Math.min(panePadding, worldH * 0.1);
  const w = Math.max(0.8, worldW - 2 * padX);
  const h = Math.max(0.6, worldH - 2 * padY);
  const bounds: [number, number, number, number] = [
    -w / 2,
    -h / 2,
    w / 2,
    h / 2,
  ];

  const makeSeeds = (salt: number) => {
    const rand = mulberry32(seed + salt);
    const cols = Math.ceil(Math.sqrt(pieceCount));
    const rows = Math.ceil(pieceCount / cols);
    const pts: [number, number][] = [];
    for (let i = 0; i < pieceCount; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jx = (rand() - 0.5) * 0.35;
      const jy = (rand() - 0.5) * 0.35;
      const x = ((col + 0.5 + jx) / cols - 0.5) * w;
      const y = ((row + 0.5 + jy) / rows - 0.5) * h;
      pts.push([
        Math.max(-w / 2 + 0.02, Math.min(w / 2 - 0.02, x)),
        Math.max(-h / 2 + 0.02, Math.min(h / 2 - 0.02, y)),
      ]);
    }
    for (let iter = 0; iter < Math.max(1, relaxIterations); iter += 1) {
      const vor = Delaunay.from(pts).voronoi(bounds);
      for (let i = 0; i < pts.length; i += 1) {
        const cell = vor.cellPolygon(i);
        if (!cell || cell.length < 3) continue;
        let sx = 0;
        let sy = 0;
        for (const [x, y] of cell) {
          sx += x;
          sy += y;
        }
        pts[i] = [sx / cell.length, sy / cell.length];
      }
    }
    return pts;
  };

  const seedsValid = (pts: [number, number][]) => {
    const vor = Delaunay.from(pts).voronoi(bounds);
    for (let i = 0; i < pts.length; i += 1) {
      const cell = vor.cellPolygon(i);
      if (!cell || cell.length < 4) return false;
      for (let t = 0; t < cell.length - 1; t += 1) {
        const a = cell[t];
        const b = cell[t + 1];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < minEdgeLength) return false;
      }
    }
    return true;
  };

  let seeds = makeSeeds(0);
  if (!seedsValid(seeds)) {
    for (let tryN = 1; tryN < 40; tryN += 1) {
      const next = makeSeeds(1009 * tryN);
      if (seedsValid(next)) {
        seeds = next;
        break;
      }
    }
  }

  const vor = Delaunay.from(seeds).voronoi(bounds);
  const halfGap = gap / 2;
  const accepted: [number, number][] = [];
  const polys: [number, number][][] = [];
  let minEdge = Infinity;

  for (let i = 0; i < seeds.length; i += 1) {
    const cell = vor.cellPolygon(i);
    if (!cell) continue;
    const open = cell.slice(0, -1) as [number, number][];
    const inset = insetPolygon(open, halfGap);
    if (!inset || inset.length < 3) continue;
    let shortest = Infinity;
    for (let j = 0; j < inset.length; j += 1) {
      const a = inset[j];
      const b = inset[(j + 1) % inset.length];
      shortest = Math.min(shortest, Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    if (shortest < 0.01) continue;
    accepted.push(seeds[i]);
    polys.push(inset);
    minEdge = Math.min(minEdge, shortest);
  }

  if (accepted.length < pieceCount) {
    accepted.length = 0;
    polys.length = 0;
    minEdge = Infinity;
    const tinyGap = Math.min(halfGap, 0.012);
    for (let i = 0; i < seeds.length; i += 1) {
      const cell = vor.cellPolygon(i);
      if (!cell) continue;
      const open = cell.slice(0, -1) as [number, number][];
      const inset = insetPolygon(open, tinyGap) ?? open;
      if (inset.length < 3) continue;
      accepted.push(seeds[i]);
      polys.push(inset);
      for (let j = 0; j < inset.length; j += 1) {
        const a = inset[j];
        const b = inset[(j + 1) % inset.length];
        minEdge = Math.min(minEdge, Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
    }
  }

  if (accepted.length === 0) return null;

  const paired = accepted.map((seedPt, i) => ({ seed: seedPt, poly: polys[i] }));
  paired.sort((a, b) => a.seed[0] - b.seed[0]);
  const orderedSeeds = paired.map((p) => p.seed);
  const orderedPolys = paired.map((p) => p.poly);

  const radius = Math.min(cornerRadius, 0.45 * minEdge);
  const geometries: THREE.BufferGeometry[] = [];
  const paneBounds: PaneBounds[] = [];

  for (let i = 0; i < orderedSeeds.length; i += 1) {
    const seedPt = orderedSeeds[i];
    const poly = orderedPolys[i];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of poly) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    paneBounds.push({ minX, maxX, minY, maxY });

    const geo = extrudeRounded(poly, radius, paneDepth, cornerSmoothness);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v += 1) {
      pos.setXY(v, pos.getX(v) - seedPt[0], pos.getY(v) - seedPt[1]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geometries.push(geo);
  }

  return { seeds: orderedSeeds, geometries, bounds: paneBounds };
}

function createMatcapTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const g = ctx.createRadialGradient(
    size * 0.35,
    size * 0.35,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.55,
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, "#d8e8ff");
  g.addColorStop(0.7, "#6a7a99");
  g.addColorStop(1, "#101018");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function GlassScene({ paneContents }: { paneContents: ReactNode[] }) {
  const { viewport, gl } = useThree();
  const matcap = useMemo(() => createMatcapTexture(), []);
  const groupRef = useRef<THREE.Group>(null);
  const paneRefs = useRef<(THREE.Group | null)[]>([]);
  const liveSeeds = useRef<[number, number][]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const baseDelaunay = useRef<Delaunay<[number, number]> | null>(null);

  const layout = useMemo(
    () => buildPaneLayout(viewport.width, viewport.height),
    [viewport.width, viewport.height],
  );

  const glassMat = useMemo(() => {
    const g = PARAMS.glass;
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(g.color),
      roughness: g.roughness,
      metalness: g.metalness,
      clearcoat: g.clearcoat,
      clearcoatRoughness: g.clearcoatRoughness,
      ior: g.ior,
      thickness: g.thickness,
      specularIntensity: 1,
      specularColor: new THREE.Color("#ffffff"),
      side: THREE.DoubleSide,
    });
  }, []);

  const matcapMat = useMemo(
    () =>
      new THREE.MeshMatcapMaterial({
        matcap,
        transparent: true,
        opacity: PARAMS.matcapStrength,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [matcap],
  );

  useEffect(
    () => () => {
      glassMat.dispose();
      matcapMat.dispose();
      matcap.dispose();
      layout?.geometries.forEach((g) => g.dispose());
    },
    [glassMat, matcapMat, matcap, layout],
  );

  useEffect(() => {
    if (!layout) return;
    liveSeeds.current = layout.seeds.map(([x, y]) => [x, y]);
    baseDelaunay.current = Delaunay.from(layout.seeds);
  }, [layout]);

  useEffect(() => {
    const el = gl.domElement;
    if (!el) return;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (group) {
      const parallax = -0.06 * PARAMS.parallax;
      group.rotation.x +=
        (pointer.current.y * parallax - group.rotation.x) * 0.08;
      group.rotation.y +=
        (-pointer.current.x * parallax * 1.4 - group.rotation.y) * 0.08;
      group.position.z = 0.02 * Math.sin(0.5 * state.clock.elapsedTime);
    }

    if (!layout || liveSeeds.current.length !== layout.seeds.length) return;

    const px = pointer.current.x * viewport.width * 0.5;
    const py = pointer.current.y * viewport.height * 0.5;
    const ease = 1 - Math.exp(-delta * Math.max(0.05, PARAMS.hoverEase));
    const focus = baseDelaunay.current
      ? baseDelaunay.current.find(px, py)
      : -1;
    const r2 = PARAMS.hoverRadius * PARAMS.hoverRadius;

    for (let i = 0; i < layout.seeds.length; i += 1) {
      const base = layout.seeds[i];
      let tx = base[0];
      let ty = base[1];
      if (focus >= 0 && i !== focus) {
        const f = layout.seeds[focus];
        const dx = base[0] - f[0];
        const dy = base[1] - f[1];
        const dist = Math.hypot(dx, dy);
        if (dist > 1e-6) {
          const dCursor = Math.hypot(px - base[0], py - base[1]);
          const push =
            PARAMS.hoverCellPush * Math.exp(-(dCursor * dCursor) / (2 * r2));
          tx = base[0] + (dx / dist) * push;
          ty = base[1] + (dy / dist) * push;
        }
      }
      const live = liveSeeds.current[i];
      live[0] += (tx - live[0]) * ease;
      live[1] += (ty - live[1]) * ease;
      const pane = paneRefs.current[i];
      if (!pane) continue;
      pane.position.set(live[0], live[1], 0);
      const dx = live[0] - px;
      const dy = live[1] - py;
      const d2 = dx * dx + dy * dy;
      const influence = Math.exp(-d2 / (2 * r2));
      pane.rotation.x +=
        (dy * PARAMS.hoverTilt * influence * 0.12 - pane.rotation.x) * 0.14;
      pane.rotation.y +=
        (-dx * PARAMS.hoverTilt * influence * 0.12 - pane.rotation.y) * 0.14;
      pane.rotation.z = 0;
    }
  });

  // Pick 3 largest panes, then assign content L→R among them
  const contentByPane = useMemo(() => {
    const map = new Map<number, ReactNode>();
    if (!layout || paneContents.length === 0) return map;
    const ranked = layout.bounds
      .map((b, index) => ({
        index,
        area: Math.max(0.01, b.maxX - b.minX) * Math.max(0.01, b.maxY - b.minY),
        x: layout.seeds[index][0],
      }))
      .sort((a, b) => b.area - a.area)
      .slice(0, Math.min(3, paneContents.length))
      .sort((a, b) => a.x - b.x);
    ranked.forEach((item, slot) => {
      if (paneContents[slot] != null) map.set(item.index, paneContents[slot]);
    });
    return map;
  }, [layout, paneContents]);

  if (!layout) return null;

  // Supersample: larger CSS + smaller df → same world size, sharper glyphs
  const sharp = Math.max(1, PARAMS.textSharpness);
  const df = PARAMS.distanceFactor / sharp;

  return (
    <>
      <ambientLight intensity={0.55} />
      <spotLight
        position={[0, 7.1, 2]}
        intensity={6}
        angle={Math.PI / 4}
        penumbra={0.5}
        decay={1}
        color="#ffffff"
      />
      <pointLight position={[0, -3, 1]} intensity={3.5} color="#ccddff" decay={1} />

      <group ref={groupRef} position={[0, 0, 0.55]}>
        {layout.geometries.map((geometry, index) => {
          const b = layout.bounds[index];
          const worldW = Math.max(0.2, b.maxX - b.minX);
          const worldH = Math.max(0.2, b.maxY - b.minY);
          // AABB overestimates irregular polys — keep content inset (~55%)
          // Base (sharp=1): world = cssPx/100 with df=4. With sharp=N, css×N & df/N.
          const boxScale = 0.55;
          const cssW = Math.max(
            96 * sharp,
            Math.round(worldW * 100 * boxScale * sharp),
          );
          const cssH = Math.max(
            96 * sharp,
            Math.round(worldH * 100 * boxScale * sharp),
          );
          // Base font tracks pane width (in pre-supersample units) then × sharp
          const logicalW = cssW / sharp;
          const baseFont =
            Math.max(10, Math.min(12.5, logicalW * 0.048)) * sharp;
          const content = contentByPane.get(index) ?? null;

          return (
            <group
              key={index}
              ref={(node) => {
                paneRefs.current[index] = node;
              }}
              position={[layout.seeds[index][0], layout.seeds[index][1], 0]}
            >
              <mesh geometry={geometry} material={glassMat} />
              <mesh geometry={geometry} material={matcapMat} />

              {content ? (
                <Html
                  transform
                  center
                  distanceFactor={df}
                  position={[0, 0, PARAMS.paneDepth + 0.01]}
                  zIndexRange={[30, 0]}
                  pointerEvents="none"
                  style={{
                    pointerEvents: "none",
                    overflow: "visible",
                    // Keep text sharp under CSS 3D matrix scaling
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    textRendering: "geometricPrecision",
                  }}
                >
                  <div
                    style={{
                      width: `${cssW}px`,
                      height: `${cssH}px`,
                      position: "relative",
                      pointerEvents: "none",
                      overflow: "hidden",
                      boxSizing: "border-box",
                      fontSize: `${baseFont}px`,
                      WebkitFontSmoothing: "antialiased",
                      MozOsxFontSmoothing: "grayscale",
                      textRendering: "geometricPrecision",
                      // Promote to own layer; avoid subpixel paint blur
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    {content}
                  </div>
                </Html>
              ) : null}
            </group>
          );
        })}
      </group>
    </>
  );
}

type GlassHeroCanvasProps = {
  className?: string;
  /** Up to 3 content cards (Work / Socials / Location), placed on largest panes L→R */
  paneContents?: ReactNode[];
};

export default function GlassHeroCanvas({
  className,
  paneContents = [],
}: GlassHeroCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) setReady(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {ready ? (
        <Canvas
          dpr={[1, 1.5]}
          gl={{
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1,
          }}
          camera={{
            position: [0, 0, 4],
            fov: 35,
            near: 0.01,
            far: 50,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            background: "transparent",
            pointerEvents: "auto",
          }}
        >
          <GlassScene paneContents={paneContents} />
        </Canvas>
      ) : null}
    </div>
  );
}
