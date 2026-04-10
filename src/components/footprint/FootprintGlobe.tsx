"use client";

import React, { FC, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import GlobeScene from "@/components/footprint/GlobeScene";
import { FootprintLocationId } from "@/components/footprint/footprint.data";

interface FootprintGlobeProps {
  selectedLocationId: FootprintLocationId;
  onSelect: (locationId: FootprintLocationId) => void;
}

const CAMERA_POSITION: [number, number, number] = [0, 0.18, 6.2];
const CAMERA_FOV = 30;
const CONTROL_ROTATE_SPEED = 0.32;
const CONTROL_MIN_POLAR = Math.PI / 2.18;
const CONTROL_MAX_POLAR = Math.PI / 1.88;

const FootprintGlobe: FC<FootprintGlobeProps> = ({
  selectedLocationId,
  onSelect,
}) => {
  return (
    <div className="h-full min-h-dvh w-full">
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#111722"]} />
        <fog attach="fog" args={["#111722", 6.4, 11.4]} />
        <ambientLight intensity={0.75} color="#ffffff" />
        <directionalLight
          position={[6.8, 5.8, 8.5]}
          intensity={1.55}
          color="#ffffff"
        />

        <Suspense fallback={null}>
          <GlobeScene
            selectedLocationId={selectedLocationId}
            onSelect={onSelect}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={CONTROL_MIN_POLAR}
          maxPolarAngle={CONTROL_MAX_POLAR}
          rotateSpeed={CONTROL_ROTATE_SPEED}
        />
      </Canvas>
    </div>
  );
};

export default FootprintGlobe;
