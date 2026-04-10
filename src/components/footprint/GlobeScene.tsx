"use client";

import React, { FC, useEffect, useMemo, useRef } from "react";
import { Html, Line, Stars, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  footprintConnections,
  footprintLocations,
  type FootprintConnection,
  type FootprintLocation,
  type FootprintLocationId,
} from "@/components/footprint/footprint.data";
import pointTextureImage from "@/assets/image/point.png";
import rippleTextureImage from "@/assets/image/scatter.png";
import glowTextureImage from "@/assets/image/sprite.png";

interface GlobeSceneProps {
  selectedLocationId: FootprintLocationId;
  onSelect: (locationId: FootprintLocationId) => void;
}

const GLOBE_RADIUS = 1.7;
const MARKER_RADIUS = GLOBE_RADIUS * 1.02;
const EARTH_TEXTURE_URL = "/assets/earth/mixed/Earth_DiffuseMap_2.jpg";
const POINT_TEXTURE_URL =
  typeof pointTextureImage === "string" ? pointTextureImage : pointTextureImage.src;
const RIPPLE_TEXTURE_URL =
  typeof rippleTextureImage === "string" ? rippleTextureImage : rippleTextureImage.src;
const GLOW_TEXTURE_URL =
  typeof glowTextureImage === "string" ? glowTextureImage : glowTextureImage.src;

type MarkerInstance = {
  location: FootprintLocation;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

type ArcConfig = {
  key: string;
  from: FootprintLocationId;
  to: FootprintLocationId;
  points: THREE.Vector3[];
  color: string;
};

const lon2xyz = (
  radius: number,
  longitude: number,
  latitude: number,
  offset = 1
) => {
  let lon = (longitude * Math.PI) / 180;
  let lat = (latitude * Math.PI) / 180;
  lon = -lon;

  return new THREE.Vector3(
    radius * offset * Math.cos(lat) * Math.cos(lon),
    radius * offset * Math.sin(lat),
    radius * offset * Math.cos(lat) * Math.sin(lon)
  );
};

const radianAOB = (a: THREE.Vector3, b: THREE.Vector3, o: THREE.Vector3) => {
  const dir1 = a.clone().sub(o).normalize();
  const dir2 = b.clone().sub(o).normalize();
  const cosAngle = THREE.MathUtils.clamp(dir1.dot(dir2), -1, 1);
  return Math.acos(cosAngle);
};

const threePointCenter = (
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
) => {
  const l1 = p1.lengthSq();
  const l2 = p2.lengthSq();
  const l3 = p3.lengthSq();
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;
  const x3 = p3.x;
  const y3 = p3.y;
  const s = x1 * y2 + x2 * y3 + x3 * y1 - x1 * y3 - x2 * y1 - x3 * y2;

  return new THREE.Vector3(
    (l2 * y3 + l1 * y2 + l3 * y1 - l2 * y1 - l3 * y2 - l1 * y3) / (s * 2),
    (l3 * x2 + l2 * x1 + l1 * x3 - l1 * x2 - l2 * x3 - l3 * x1) / (s * 2),
    0
  );
};

const projectArcPlane = (start: THREE.Vector3, end: THREE.Vector3) => {
  const origin = new THREE.Vector3(0, 0, 0);
  const startDir = start.clone().sub(origin);
  const endDir = end.clone().sub(origin);
  const normal = new THREE.Vector3().crossVectors(startDir, endDir).normalize();
  const toXOY = new THREE.Quaternion().setFromUnitVectors(
    normal,
    new THREE.Vector3(0, 0, 1)
  );
  const startXOY = start.clone().applyQuaternion(toXOY);
  const endXOY = end.clone().applyQuaternion(toXOY);
  const middleXOY = new THREE.Vector3()
    .addVectors(startXOY, endXOY)
    .multiplyScalar(0.5)
    .normalize();
  const middleToYAxis = new THREE.Quaternion().setFromUnitVectors(
    middleXOY,
    new THREE.Vector3(0, 1, 0)
  );

  const startPoint3D = startXOY.clone().applyQuaternion(middleToYAxis);
  const endPoint3D = endXOY.clone().applyQuaternion(middleToYAxis);
  const quaternion = toXOY.clone().invert().multiply(middleToYAxis.clone().invert());

  return {
    quaternion,
    startPoint3D,
    endPoint3D,
  };
};

const buildArcPoints = (start: THREE.Vector3, end: THREE.Vector3) => {
  const { quaternion, startPoint3D, endPoint3D } = projectArcPlane(start, end);
  const middleVector = new THREE.Vector3()
    .addVectors(startPoint3D, endPoint3D)
    .multiplyScalar(0.5);
  const direction = middleVector.clone().normalize();
  const angle = radianAOB(startPoint3D, endPoint3D, new THREE.Vector3(0, 0, 0));
  const middlePos = direction.multiplyScalar(
    GLOBE_RADIUS + angle * GLOBE_RADIUS * 0.22
  );
  const centerPosition = threePointCenter(startPoint3D, endPoint3D, middlePos);
  const radius = middlePos.clone().sub(centerPosition).length();
  const c = radianAOB(
    startPoint3D,
    new THREE.Vector3(0, -1, 0),
    centerPosition
  );
  const startDeg = -Math.PI / 2 + c;
  const endDeg = Math.PI - startDeg;
  const curve = new THREE.ArcCurve(
    centerPosition.x,
    centerPosition.y,
    radius,
    startDeg,
    endDeg,
    false
  );

  return curve.getSpacedPoints(180).map((point: THREE.Vector2) =>
    new THREE.Vector3(point.x, point.y, 0).applyQuaternion(quaternion)
  );
};

const shortestAngleDelta = (from: number, to: number) => {
  let delta = to - from;

  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  return delta;
};

const FLOW_POINT_COUNT = 240;
const FLOW_SEGMENT_RATIO = 1 / 7.4;
const FLOW_SPEED = 0.215;
const FLOW_HEAD_COLOR = "#f6fbff";
const FLOW_SIZE = 0.079;
const FLOW_LINE_OPACITY = 0.38;
const FLOW_PULSE_OPACITY = 0.92;
const FLOW_LINE_WIDTH = 0.9;
const ARC_ACTIVE_BOOST = 1.12;
const HALO_SCALE = GLOBE_RADIUS * 2.92;
const POINT_BASE_SCALE = 0.128;
const POINT_ACTIVE_SCALE = 0.182;
const RIPPLE_BASE_SCALE = 0.205;
const RIPPLE_ACTIVE_SCALE = 0.275;
const RIPPLE_MIN_OPACITY = 0.08;
const RIPPLE_MAX_OPACITY = 0.92;
const GLOBE_SHELL_SCALE = 1.006;
const GLOBE_SHELL_OPACITY = 0.05;
const GLOBE_BASE_COLOR = "#edf7ff";
const GLOBE_EMISSIVE_COLOR = "#214f73";
const GLOBE_EMISSIVE_INTENSITY = 0.11;
const GLOBE_SHININESS = 9;
const GLOBE_ROTATION_LERP = 0.02;
const GLOBE_TILT_LERP = 0.018;
const STAR_RADIUS = 28;
const STAR_DEPTH = 10;
const STAR_COUNT = 180;
const STAR_FACTOR = 1.12;
const STAR_SPEED = 0.06;
const AMBIENT_RING_SCALE = GLOBE_RADIUS * 4.15;
const AMBIENT_RING_OPACITY = 0.055;

const ArcPulse: FC<{
  arc: ArcConfig;
  offset: number;
  pointTexture: THREE.Texture | null;
  active: boolean;
}> = ({ arc, offset, pointTexture, active }) => {
  const geometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(FLOW_POINT_COUNT * 3);
    const percents = new Float32Array(FLOW_POINT_COUNT);
    const colors = new Float32Array(FLOW_POINT_COUNT * 3);
    const startIndex = 0;
    const endIndex = Math.max(1, Math.floor((arc.points.length - 1) * FLOW_SEGMENT_RATIO));
    const tailColor = new THREE.Color(arc.color);
    const headColor = new THREE.Color(FLOW_HEAD_COLOR);
    const boost = active ? ARC_ACTIVE_BOOST : 1;

    for (let index = 0; index < FLOW_POINT_COUNT; index += 1) {
      const progress = index / FLOW_POINT_COUNT;
      const sourceIndex = Math.min(
        arc.points.length - 1,
        Math.floor(startIndex + (endIndex - startIndex) * progress)
      );
      const point = arc.points[sourceIndex];
      const gradientColor = tailColor.clone().lerp(headColor, progress).multiplyScalar(boost);
      const baseIndex = index * 3;

      positions[baseIndex] = point.x;
      positions[baseIndex + 1] = point.y;
      positions[baseIndex + 2] = point.z;
      percents[index] = progress;
      colors[baseIndex] = gradientColor.r;
      colors[baseIndex + 1] = gradientColor.g;
      colors[baseIndex + 2] = gradientColor.b;
    }

    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute("percent", new THREE.BufferAttribute(percents, 1));
    bufferGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return bufferGeometry;
  }, [active, arc.color, arc.points]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state) => {
    const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const baseProgress = (state.clock.elapsedTime * FLOW_SPEED + offset) % 1;

    for (let index = 0; index < FLOW_POINT_COUNT; index += 1) {
      const progress = index / FLOW_POINT_COUNT;
      const sampleProgress = (baseProgress + progress * FLOW_SEGMENT_RATIO) % 1;
      const pointIndex = Math.min(
        arc.points.length - 1,
        Math.floor(sampleProgress * (arc.points.length - 1))
      );
      const point = arc.points[pointIndex];
      const baseIndex = index * 3;

      positions[baseIndex] = point.x;
      positions[baseIndex + 1] = point.y;
      positions[baseIndex + 2] = point.z;
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={pointTexture ?? undefined}
        alphaMap={pointTexture ?? undefined}
        alphaTest={0.08}
        vertexColors
        transparent
        opacity={FLOW_PULSE_OPACITY}
        size={FLOW_SIZE}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            ["attribute float percent;", "void main() {"].join("\n")
          );
          shader.vertexShader = shader.vertexShader.replace(
            "gl_PointSize = size;",
            ["gl_PointSize = percent * size;"].join("\n")
          );
        }}
      />
    </points>
  );
};

const RippleMarker: FC<{
  marker: MarkerInstance;
  active: boolean;
  onSelect: (locationId: FootprintLocationId) => void;
  pointTexture: THREE.Texture | null;
  rippleTexture: THREE.Texture | null;
}> = ({ marker, active, onSelect, pointTexture, rippleTexture }) => {
  const rippleRef = useRef<THREE.Mesh>(null);
  const pointRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (rippleRef.current) {
      const wave = (state.clock.elapsedTime * 0.55 + marker.location.lat * 0.01) % 1;
      const scale =
        (active ? RIPPLE_ACTIVE_SCALE : RIPPLE_BASE_SCALE) + wave * 0.22;
      const material = rippleRef.current.material as THREE.MeshBasicMaterial;

      rippleRef.current.scale.set(scale, scale, scale);
      material.opacity = THREE.MathUtils.lerp(
        RIPPLE_MAX_OPACITY,
        RIPPLE_MIN_OPACITY,
        wave
      );
    }

    if (pointRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4 + marker.location.lng) * 0.08;
      pointRef.current.scale.setScalar(
        (active ? POINT_ACTIVE_SCALE : POINT_BASE_SCALE) * pulse
      );
    }
  });

  return (
    <group position={marker.position} quaternion={marker.quaternion}>
      <mesh ref={rippleRef} onClick={() => onSelect(marker.location.id)}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={rippleTexture ?? undefined}
          color={marker.location.accent}
          transparent
          opacity={RIPPLE_MAX_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        ref={pointRef}
        onPointerEnter={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          document.body.style.cursor = "auto";
        }}
        onClick={() => onSelect(marker.location.id)}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={pointTexture ?? undefined}
          color={marker.location.accent}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const GlobeScene: FC<GlobeSceneProps> = ({ selectedLocationId, onSelect }) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const [rawGlobeTexture, rawPointTexture, rawRippleTexture, rawGlowTexture] = useTexture([
    EARTH_TEXTURE_URL,
    POINT_TEXTURE_URL,
    RIPPLE_TEXTURE_URL,
    GLOW_TEXTURE_URL,
  ]);
  const globeTexture = useMemo(() => {
    rawGlobeTexture.colorSpace = THREE.SRGBColorSpace;
    rawGlobeTexture.wrapS = THREE.ClampToEdgeWrapping;
    rawGlobeTexture.wrapT = THREE.ClampToEdgeWrapping;
    rawGlobeTexture.flipY = false;
    rawGlobeTexture.generateMipmaps = true;
    rawGlobeTexture.needsUpdate = true;
    return rawGlobeTexture;
  }, [rawGlobeTexture]);

  const pointTexture = useMemo(() => {
    rawPointTexture.colorSpace = THREE.SRGBColorSpace;
    rawPointTexture.needsUpdate = true;
    return rawPointTexture;
  }, [rawPointTexture]);

  const rippleTexture = useMemo(() => {
    rawRippleTexture.colorSpace = THREE.SRGBColorSpace;
    rawRippleTexture.needsUpdate = true;
    return rawRippleTexture;
  }, [rawRippleTexture]);

  const glowTexture = useMemo(() => {
    rawGlowTexture.colorSpace = THREE.SRGBColorSpace;
    rawGlowTexture.needsUpdate = true;
    return rawGlowTexture;
  }, [rawGlowTexture]);

  const markerData = useMemo<MarkerInstance[]>(() => {
    return footprintLocations.map((location) => {
      const position = lon2xyz(MARKER_RADIUS, location.lng, location.lat);
      const normal = position.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      );

      return {
        location,
        position,
        normal,
        quaternion,
      };
    });
  }, []);

  const selectedMarker = useMemo(
    () => markerData.find((item) => item.location.id === selectedLocationId) ?? markerData[0],
    [markerData, selectedLocationId]
  );

  const arcConfigs = useMemo<ArcConfig[]>(() => {
    const markerMap = new Map(markerData.map((marker) => [marker.location.id, marker]));

    return footprintConnections.flatMap((connection) => {
      const fromMarker = markerMap.get(connection.from);
      const toMarker = markerMap.get(connection.to);

      if (!fromMarker || !toMarker) {
        return [];
      }

      const key = [connection.from, connection.to].sort().join("-");

      return [
        {
          key,
          from: connection.from,
          to: connection.to,
          points: buildArcPoints(fromMarker.position, toMarker.position),
          color: connection.color ?? fromMarker.location.accent,
        },
      ];
    });
  }, [markerData]);

  const activeArcKeys = useMemo(
    () =>
      new Set(
        arcConfigs
          .filter(
            (arc) =>
              arc.from === selectedLocationId || arc.to === selectedLocationId
          )
          .map((arc) => arc.key)
      ),
    [arcConfigs, selectedLocationId]
  );

  useFrame(() => {
    if (!globeGroupRef.current) return;

    const targetRotationY = -Math.atan2(
      selectedMarker.position.x,
      selectedMarker.position.z
    );
    const horizontalRadius = Math.sqrt(
      selectedMarker.position.x * selectedMarker.position.x +
        selectedMarker.position.z * selectedMarker.position.z
    );
    const targetRotationX = Math.atan2(
      selectedMarker.position.y,
      horizontalRadius
    );
    const rotationDelta = shortestAngleDelta(
      globeGroupRef.current.rotation.y,
      targetRotationY
    );

    globeGroupRef.current.rotation.y += rotationDelta * GLOBE_ROTATION_LERP;
    globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
      globeGroupRef.current.rotation.x,
      targetRotationX,
      GLOBE_TILT_LERP
    );
    globeGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      globeGroupRef.current.rotation.z,
      0,
      GLOBE_TILT_LERP
    );
  });

  return (
    <group>
      <Stars
        radius={STAR_RADIUS}
        depth={STAR_DEPTH}
        count={STAR_COUNT}
        factor={STAR_FACTOR}
        saturation={0}
        fade
        speed={STAR_SPEED}
      />

      <group ref={globeGroupRef}>
        <sprite scale={[AMBIENT_RING_SCALE, AMBIENT_RING_SCALE, 1]}>
          <spriteMaterial
            map={glowTexture ?? undefined}
            color="#7ed1ff"
            transparent
            opacity={AMBIENT_RING_OPACITY}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>

        <sprite scale={[HALO_SCALE, HALO_SCALE, 1]}>
          <spriteMaterial
            map={glowTexture ?? undefined}
            color="#7ed1ff"
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>

        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
          <meshPhongMaterial
            map={globeTexture ?? undefined}
            color={globeTexture ? GLOBE_BASE_COLOR : "#244d74"}
            emissive={globeTexture ? GLOBE_EMISSIVE_COLOR : "#347fb8"}
            emissiveIntensity={globeTexture ? GLOBE_EMISSIVE_INTENSITY : 0.4}
            shininess={globeTexture ? GLOBE_SHININESS : 28}
            transparent={false}
          />
        </mesh>

        <mesh scale={GLOBE_SHELL_SCALE}>
          <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
          <meshBasicMaterial
            color="#9ddcff"
            transparent
            opacity={GLOBE_SHELL_OPACITY}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {arcConfigs.map((arc, index) => {
          const isActive = activeArcKeys.has(arc.key);

          return (
            <group key={arc.key}>
              <Line
                points={arc.points}
                color={arc.color}
                lineWidth={FLOW_LINE_WIDTH}
                transparent
                opacity={isActive ? FLOW_LINE_OPACITY * ARC_ACTIVE_BOOST : FLOW_LINE_OPACITY}
              />
              <ArcPulse
                arc={arc}
                offset={index * 0.24}
                pointTexture={pointTexture}
                active={isActive}
              />
            </group>
          );
        })}

        {markerData.map((marker) => (
          <RippleMarker
            key={marker.location.id}
            marker={marker}
            active={marker.location.id === selectedLocationId}
            onSelect={onSelect}
            pointTexture={pointTexture}
            rippleTexture={rippleTexture}
          />
        ))}
      </group>

      <Html position={[0, -2.68, 0]} center>
        <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[12px] uppercase tracking-[0.28em] text-white/55 backdrop-blur-md">
          Click a country to open travel snapshots
        </div>
      </Html>
    </group>
  );
};

export default GlobeScene;
