"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Port of experiments.thisiswhitespace.com/trace-cards (Pyramid card).
 * Geometry/logic extracted from production chunk 17cj_ezdooau4.js.
 */
export const TRACE = {
  cardSize: 480,
  aspect: 0.8882978723404256,
  corner: 0.044326241134751775,
  surface: {
    color: "#101010",
    roughness: 0.66,
    metalness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.45,
    reflectivity: 0.4,
  },
  lighting: {
    ambientIntensity: 0.31,
    ambientColor: "#ffffff",
    keyIntensity: 3,
    keyColor: "#fff5eb",
    key: [2.5, 7.5, 6] as [number, number, number],
    fillIntensity: 2.4,
    fillColor: "#c7e4ff",
    fill: [-3.5, 3.4, 3.6] as [number, number, number],
  },
  camera: { fov: 49, distance: 9.4 },
  tilt: {
    pointerTilt: 48,
    tiltLerp: 0.14,
    hoverLerp: 0.12,
    hitPadRatio: 0.22,
  },
  motion: {
    // dial defaults from reference: structureDuration=1.2, overallSpeed=2.7
    orbitRadius: 80,
    orbitDepth: 18,
    structureDuration: 1.2,
    overallSpeed: 2.7,
    elementCount: 4,
    flowSpeed: 122,
    layerTravel: 1.82,
  },
  planes: {
    opacity: 0.45,
    lineOpacity: 0.92,
    shapeOpacity: 0.3,
    sculptOpacity: 0.3,
  },
  pyramid: {
    shapeColor: "#00a8a5",
  },
};

type PointerNorm = { x: number; y: number } | null;

type CardState = {
  hover: number;
  targetHover: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
  targetTiltX: number;
  targetTiltY: number;
  targetTiltZ: number;
  pointer: PointerNorm;
  structureProgress: number;
  structureComplete: boolean;
  /** Snapshot apex travel along cardZ, in card pixels (reference offsetY). */
  snapshotOffsetPx: number;
};

type TraceCardApi = {
  setPointer: (p: PointerNorm) => void;
  cardSize: number;
};

const TraceCardContext = createContext<TraceCardApi | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function cardHeight(size: number) {
  return Math.round(TRACE.aspect * size);
}

function roundedRectGeometry(sizePx: number) {
  const width = sizePx / 100;
  const height = cardHeight(sizePx) / 100;
  const radius = Math.min(
    (sizePx * TRACE.corner) / 100,
    width / 2,
    height / 2,
  );
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

  return new THREE.ShapeGeometry(shape);
}

/**
 * Reference pyramidTrace at progress q:
 * sidePx = (orbitRadius * q) / sqrt(2)
 * zPx = (0.5 - q) * orbitDepth
 * world = { x: xPx/100, y: -yPx/100, z: zPx/100 }
 */
function pyramidPoints(
  progress: number,
  target: THREE.Vector3[] = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ],
) {
  const q = clamp(progress, 0, 1);
  const sidePx = (TRACE.motion.orbitRadius * q) / Math.SQRT2;
  const z = ((0.5 - q) * TRACE.motion.orbitDepth) / 100;
  const x = sidePx / 100;
  const y = sidePx / 100;

  target[0].set(+x, -y, z);
  target[1].set(-x, -y, z);
  target[2].set(-x, +y, z);
  target[3].set(+x, +y, z);
  return target;
}

function pointsCoincident(points: THREE.Vector3[], epsilon = 0.002) {
  if (points.length < 2) return true;
  const first = points[0];
  return points.every(
    (point) =>
      Math.hypot(point.x - first.x, point.y - first.y, point.z - first.z) <
      epsilon,
  );
}

function writePositions(
  geometry: THREE.BufferGeometry,
  positions: number[],
  minCapacity = 36,
) {
  const count = positions.length / 3;
  let attr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const needed = Math.max(positions.length, minCapacity);

  if (!attr || attr.array.length < needed) {
    attr = new THREE.BufferAttribute(new Float32Array(needed), 3);
    geometry.setAttribute("position", attr);
  }

  const array = attr.array as Float32Array;
  array.set(positions);
  for (let i = positions.length; i < array.length; i += 1) {
    array[i] = 0;
  }
  attr.needsUpdate = true;
  geometry.setDrawRange(0, count);
  if (count > 0) {
    geometry.computeBoundingSphere();
  }
}

function CardSurface({ size }: { size: number }) {
  const geometry = useMemo(() => roundedRectGeometry(size), [size]);
  const { surface } = TRACE;

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      position={[0, 0, -0.08]}
      receiveShadow
      renderOrder={-8}
    >
      <meshPhysicalMaterial
        color={surface.color}
        roughness={surface.roughness}
        metalness={surface.metalness}
        clearcoat={surface.clearcoat}
        clearcoatRoughness={surface.clearcoatRoughness}
        reflectivity={surface.reflectivity}
      />
    </mesh>
  );
}

function PyramidSculpture({
  stateRef,
}: {
  stateRef: MutableRefObject<CardState>;
}) {
  const sculptRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const strutsRef = useRef<THREE.LineSegments>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);

  const basePoints = useRef(pyramidPoints(0));
  const apexPoint = useRef(new THREE.Vector3());
  const sculptPos = useRef<number[]>([]);
  const fillPos = useRef<number[]>([]);
  const strutPos = useRef<number[]>([]);
  const outlinePos = useRef<number[]>([]);

  useEffect(
    () => () => {
      sculptRef.current?.geometry.dispose();
      fillRef.current?.geometry.dispose();
      strutsRef.current?.geometry.dispose();
      outlineRef.current?.geometry.dispose();
    },
    [],
  );

  useFrame(() => {
    const state = stateRef.current;
    // structureProgress advanced in CardRig
    const { motion } = TRACE;
    const progress =
      state.targetHover > 0.02 && state.structureComplete
        ? 1
        : state.structureProgress;
    const isFlat =
      Math.abs(state.tiltX) < 0.5 && Math.abs(state.tiltY) < 0.5;
    const visible =
      progress > 0.001 ||
      state.snapshotOffsetPx > 0.001 ||
      state.hover > 0.02;
    const fade = Math.max(state.hover, progress);

    const base = pyramidPoints(progress, basePoints.current);

    const apex = apexPoint.current;
    apex.set(
      0,
      0,
      (0.5 * motion.orbitDepth) / 100 + state.snapshotOffsetPx / 100,
    );

    const degenerate = pointsCoincident(base);

    // Sculpt: 4 triangles (base edge → apex) — reference tw/tf
    const sculpt = sculptRef.current;
    if (sculpt) {
      const positions = sculptPos.current;
      positions.length = 0;
      if (visible && !isFlat && !degenerate && progress > 0.001) {
        for (let i = 0; i < 4; i += 1) {
          const a = base[i];
          const b = base[(i + 1) % 4];
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z, apex.x, apex.y, apex.z);
        }
      }
      writePositions(sculpt.geometry, positions, 36);
      sculpt.visible = positions.length >= 9;
      (sculpt.material as THREE.MeshBasicMaterial).opacity =
        TRACE.planes.sculptOpacity * fade;
    }

    // Live base fill (reference tb shape mesh)
    const fill = fillRef.current;
    if (fill) {
      const positions = fillPos.current;
      positions.length = 0;
      if (visible && !isFlat && !degenerate && progress > 0.001) {
        const c = new THREE.Vector3(
          (base[0].x + base[1].x + base[2].x + base[3].x) / 4,
          (base[0].y + base[1].y + base[2].y + base[3].y) / 4,
          (base[0].z + base[1].z + base[2].z + base[3].z) / 4,
        );
        for (let i = 0; i < 4; i += 1) {
          const a = base[i];
          const b = base[(i + 1) % 4];
          positions.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
      writePositions(fill.geometry, positions, 36);
      if (positions.length >= 9) {
        fill.geometry.computeVertexNormals();
      }
      fill.visible = positions.length >= 9;
      (fill.material as THREE.MeshStandardMaterial).opacity =
        TRACE.planes.shapeOpacity * TRACE.planes.opacity * fade;
    }

    // Struts: 4 apex → corner lines (reference tC)
    const struts = strutsRef.current;
    if (struts) {
      const positions = strutPos.current;
      positions.length = 0;
      if (visible && progress > 0.001) {
        for (const corner of base) {
          positions.push(apex.x, apex.y, apex.z, corner.x, corner.y, corner.z);
        }
      }
      writePositions(struts.geometry, positions, 24);
      struts.visible = positions.length >= 6;
      (struts.material as THREE.LineBasicMaterial).opacity =
        TRACE.planes.lineOpacity * fade * 0.85;
    }

    // Base outline
    const outline = outlineRef.current;
    if (outline) {
      const positions = outlinePos.current;
      positions.length = 0;
      if (visible && !degenerate && progress > 0.001) {
        for (let i = 0; i < 4; i += 1) {
          const a = base[i];
          const b = base[(i + 1) % 4];
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
      writePositions(outline.geometry, positions, 24);
      outline.visible = positions.length >= 6;
      (outline.material as THREE.LineBasicMaterial).opacity =
        TRACE.planes.lineOpacity * TRACE.planes.opacity * 0.85 * fade;
    }

    // Nodes: apex + 4 base corners
    const nodePoints = [apex, base[0], base[1], base[2], base[3]];
    nodeRefs.current.forEach((node, index) => {
      if (!node) return;
      const point = nodePoints[index];
      if (!point || !visible) {
        node.visible = false;
        return;
      }
      // hide duplicate base nodes when degenerate at apex
      if (index > 0 && degenerate) {
        node.visible = index === 1;
        if (index === 1) node.position.copy(apex);
        return;
      }
      node.position.copy(point);
      node.visible = true;
      (node.material as THREE.MeshBasicMaterial).opacity =
        TRACE.planes.lineOpacity * fade;
    });
  });

  return (
    <group position={[0, 0, 0.02]} renderOrder={50}>
      <mesh ref={sculptRef} renderOrder={6} castShadow frustumCulled={false}>
        <bufferGeometry />
        <meshBasicMaterial
          color={TRACE.pyramid.shapeColor}
          transparent
          opacity={TRACE.planes.sculptOpacity}
          side={THREE.DoubleSide}
          depthWrite
        />
      </mesh>
      <mesh ref={fillRef} renderOrder={-1} frustumCulled={false}>
        <bufferGeometry />
        <meshStandardMaterial
          color={TRACE.pyramid.shapeColor}
          transparent
          opacity={TRACE.planes.shapeOpacity * TRACE.planes.opacity}
          side={THREE.DoubleSide}
          roughness={0.42}
          metalness={0.4}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={strutsRef} renderOrder={12} frustumCulled={false}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={TRACE.planes.lineOpacity}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments ref={outlineRef} renderOrder={10} frustumCulled={false}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={TRACE.planes.lineOpacity}
          depthWrite={false}
        />
      </lineSegments>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            nodeRefs.current[index] = node;
          }}
          renderOrder={20}
        >
          <sphereGeometry args={[0.0275, 10, 10]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={TRACE.planes.lineOpacity}
            depthWrite={false}
            depthTest
          />
        </mesh>
      ))}
    </group>
  );
}

function CardRig({
  stateRef,
  children,
}: {
  stateRef: MutableRefObject<CardState>;
  children: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, rawDelta) => {
    const state = stateRef.current;
    const { tilt, motion } = TRACE;
    const delta = Math.min(0.05, rawDelta);

    if (state.targetHover > 0.02 && state.pointer) {
      state.targetTiltX = state.pointer.y * tilt.pointerTilt;
      state.targetTiltY = state.pointer.x * tilt.pointerTilt;
      state.targetTiltZ = 0;
    } else {
      state.targetTiltX = 0;
      state.targetTiltY = 0;
      state.targetTiltZ = 0;
    }

    state.hover = lerp(state.hover, state.targetHover, TRACE.tilt.hoverLerp);
    state.tiltX = lerp(state.tiltX, state.targetTiltX, tilt.tiltLerp);
    state.tiltY = lerp(state.tiltY, state.targetTiltY, tilt.tiltLerp);
    state.tiltZ = lerp(state.tiltZ, state.targetTiltZ, tilt.tiltLerp);

    // Shared structure progress for pyramid sculpture
    const speed = Math.max(0.05, motion.overallSpeed);
    const duration = Math.max(0.05, motion.structureDuration / speed);
    const maxOffsetPx = motion.layerTravel * TRACE.cardSize;
    const flowPx = motion.flowSpeed * speed * delta;
    const building = state.targetHover > 0.02;
    const hasStructure =
      state.structureProgress > 0.001 ||
      state.snapshotOffsetPx > 0.001 ||
      state.structureComplete;

    if (building) {
      if (!state.structureComplete) {
        const rate = Math.max(state.hover, 0.0001);
        state.structureProgress = Math.min(
          1,
          state.structureProgress + (delta / duration) * rate,
        );
        state.snapshotOffsetPx = Math.min(
          maxOffsetPx,
          state.snapshotOffsetPx + flowPx * rate,
        );
        if (state.structureProgress >= 1) {
          state.structureProgress = 1;
          state.structureComplete = true;
        }
      }
    } else if (hasStructure) {
      state.structureComplete = false;
      state.structureProgress = Math.max(
        0,
        state.structureProgress - delta / duration,
      );
      state.snapshotOffsetPx = Math.max(0, state.snapshotOffsetPx - flowPx);
      if (state.structureProgress <= 0 && state.snapshotOffsetPx <= 0) {
        state.structureProgress = 0;
        state.snapshotOffsetPx = 0;
      }
    }

    const group = groupRef.current;
    if (!group) return;

    group.rotation.set(
      (state.tiltX * Math.PI) / 180,
      (state.tiltY * Math.PI) / 180,
      (state.tiltZ * Math.PI) / 180,
    );
    group.scale.setScalar(1 + 0.03 * state.hover);
  });

  return <group ref={groupRef}>{children}</group>;
}

function Scene({
  size,
  stateRef,
  overlay,
  onPointer,
}: {
  size: number;
  stateRef: MutableRefObject<CardState>;
  overlay?: ReactNode;
  onPointer: (pointer: PointerNorm) => void;
}) {
  const { lighting } = TRACE;

  return (
    <>
      <ambientLight
        intensity={lighting.ambientIntensity}
        color={lighting.ambientColor}
      />
      <directionalLight
        castShadow
        intensity={lighting.keyIntensity}
        color={lighting.keyColor}
        position={lighting.key}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.002}
        shadow-normalBias={0.02}
        shadow-radius={18}
        shadow-blurSamples={32}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <directionalLight
        intensity={lighting.fillIntensity}
        color={lighting.fillColor}
        position={lighting.fill}
      />
      <CardRig stateRef={stateRef}>
        <CardSurface size={size} />
        <Html
          transform
          center
          distanceFactor={4}
          position={[0, 0, -0.01]}
          zIndexRange={[20, 20]}
          pointerEvents="none"
          style={{ pointerEvents: "none", overflow: "visible" }}
        >
          <div
            style={{
              width: `${size}px`,
              height: `${cardHeight(size)}px`,
              position: "relative",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {overlay}
          </div>
        </Html>
        <PyramidSculpture stateRef={stateRef} />
      </CardRig>
      <Html
        center
        distanceFactor={4}
        position={[0, 0, 0.05]}
        zIndexRange={[50, 50]}
        pointerEvents="none"
        style={{ pointerEvents: "none", overflow: "visible" }}
      >
        <PointerHitPad size={size} onPointer={onPointer} />
      </Html>
    </>
  );
}

function PointerHitPad({
  size,
  onPointer,
}: {
  size: number;
  onPointer: (pointer: PointerNorm) => void;
}) {
  const pad = TRACE.tilt.hitPadRatio;
  const width = size * (1 + pad * 2);
  const height = cardHeight(size) * (1 + pad * 2);

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      onPointer({ x: 0, y: 0 });
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    onPointer({
      x: clamp((event.clientX - centerX) / (size / 2), -1, 1),
      y: clamp((event.clientY - centerY) / (cardHeight(size) / 2), -1, 1),
    });
  };

  return (
    <div
      style={{ width, height, pointerEvents: "auto", cursor: "default" }}
      onPointerEnter={handlePointer}
      onPointerMove={handlePointer}
      onPointerLeave={() => onPointer(null)}
    />
  );
}

type TraceCardCanvasProps = {
  className?: string;
  children?: ReactNode;
};

export default function TraceCardCanvas({
  className,
  children,
}: TraceCardCanvasProps) {
  const size = TRACE.cardSize;
  const stateRef = useRef<CardState>({
    hover: 0,
    targetHover: 0,
    tiltX: 0,
    tiltY: 0,
    tiltZ: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    targetTiltZ: 0,
    pointer: null,
    structureProgress: 0,
    structureComplete: false,
    snapshotOffsetPx: 0,
  });

  const setPointer = (pointer: PointerNorm) => {
    stateRef.current.pointer = pointer;
    stateRef.current.targetHover = pointer ? 1 : 0;
  };

  const api = useMemo<TraceCardApi>(
    () => ({ setPointer, cardSize: size }),
    [size],
  );

  return (
    <TraceCardContext.Provider value={api}>
      <div className={className} style={{ position: "relative" }}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            alpha: true,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          camera={{
            fov: TRACE.camera.fov,
            position: [0, 0, TRACE.camera.distance],
            near: 0.1,
            far: 100,
          }}
          shadows
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            overflow: "visible",
            background: "transparent",
            pointerEvents: "none",
          }}
        >
          <Scene
            size={size}
            stateRef={stateRef}
            overlay={children}
            onPointer={setPointer}
          />
        </Canvas>
      </div>
    </TraceCardContext.Provider>
  );
}

export function useTraceCard() {
  return useContext(TraceCardContext);
}
