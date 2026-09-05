"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createLittlePlanetModel } from "./planetModel";
import styles from "./Footprint.module.css";

function disposeModel(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  });
}

function LittlePlanet() {
  const pointer = useRef({ id: null as number | null, x: 0, y: 0 });
  const orbit = useRef({ theta: -0.42, phi: 0.9, zoom: 1, lastInteraction: 0 });
  const elapsed = useRef(0);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const model = useMemo(() => createLittlePlanetModel(), []);
  const { gl, camera, size } = useThree();
  const limitingAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) * Math.min(1, size.width / size.height));
  const globeDistance = (14 + 3.8) / Math.sin(limitingAngle) * 1.1;

  useEffect(() => () => {
    disposeModel(model.root);
    disposeModel(model.atmosphere);
  }, [model]);

  useEffect(() => {
    camera.position.setFromSphericalCoords(globeDistance * orbit.current.zoom, orbit.current.phi, orbit.current.theta);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }, [camera, globeDistance]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || pointer.current.id !== null) return;
      canvas.setPointerCapture(event.pointerId);
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      orbit.current.lastInteraction = elapsed.current;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (pointer.current.id !== event.pointerId) return;
      const deltaX = event.clientX - pointer.current.x;
      const deltaY = event.clientY - pointer.current.y;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      orbit.current.theta -= deltaX * 0.006;
      orbit.current.phi = THREE.MathUtils.clamp(orbit.current.phi - deltaY * 0.005, 0.08, Math.PI - 0.08);
      orbit.current.lastInteraction = elapsed.current;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pointer.current.id !== event.pointerId) return;
      pointer.current.id = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      orbit.current.lastInteraction = elapsed.current;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("lostpointercapture", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("lostpointercapture", handlePointerUp);
    };
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    const normalizedPointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let wheelOwner: "page" | "globe" = "page";
    let lastWheel = -Infinity;
    let lastScroll = -Infinity;
    const observeScroll = () => { lastScroll = performance.now(); };
    const observeWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (now - lastWheel > 180) {
        wheelOwner = "page";
        const bounds = canvas.getBoundingClientRect();
        if (
          event.target === canvas && !event.ctrlKey && !event.metaKey && !event.defaultPrevented &&
          Math.abs(event.deltaY) > Math.abs(event.deltaX) && now - lastScroll > 180 &&
          bounds.top >= -2 && bounds.bottom <= window.innerHeight + 2
        ) {
          normalizedPointer.set(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
          );
          camera.updateMatrixWorld();
          raycaster.setFromCamera(normalizedPointer, camera);
          if (raycaster.intersectObjects([model.terrain, model.water], false).length) wheelOwner = "globe";
        }
      }
      lastWheel = now;
    };
    const handleWheel = (event: WheelEvent) => {
      if (wheelOwner !== "globe" || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      orbit.current.zoom = THREE.MathUtils.clamp(
        orbit.current.zoom * Math.exp(THREE.MathUtils.clamp(event.deltaY * units, -120, 120) * 0.0017), 0.72, 1.6,
      );
      orbit.current.lastInteraction = elapsed.current;
    };

    window.addEventListener("wheel", observeWheel, { capture: true, passive: true });
    window.addEventListener("scroll", observeScroll, { passive: true });
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", observeWheel, true);
      window.removeEventListener("scroll", observeScroll);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [camera, gl, model]);

  useFrame((_, delta) => {
    const frameDelta = Math.min(delta, 0.05);
    elapsed.current += frameDelta;
    if (pointer.current.id === null && elapsed.current - orbit.current.lastInteraction > 14) orbit.current.theta += frameDelta * 0.009;
    model.update(elapsed.current);
    targetPosition.setFromSphericalCoords(globeDistance * orbit.current.zoom, orbit.current.phi, orbit.current.theta);
    camera.position.lerp(targetPosition, 1 - Math.exp(-frameDelta * 5.2));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={model.root} dispose={null} />
      <primitive object={model.atmosphere} dispose={null} />
    </>
  );
}

export default function FootprintGlobe() {
  return (
    <div className={styles.canvasWrap}>
      <Canvas
        camera={{ position: [0, 1.5, 55], fov: 42, near: 0.15, far: 240 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        shadows="percentage"
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        aria-label="A rotating low-poly world"
      >
        <ambientLight intensity={0.82} color="#cce8dc" />
        <hemisphereLight args={["#e7f2e0", "#7a9f91", 1.45]} />
        <directionalLight
          position={[-26, 43, 32]}
          intensity={3.2}
          color="#fff1d0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
          shadow-camera-near={1}
          shadow-camera-far={112}
          shadow-normalBias={0.055}
          shadow-bias={-0.00012}
          shadow-radius={4}
          shadow-intensity={0.7}
        />
        <directionalLight position={[25, -18, -31]} intensity={1.1} color="#a8d4d6" />
        <directionalLight position={[-20, -17, -15]} intensity={0.7} color="#cde7d6" />
        <LittlePlanet />
      </Canvas>
    </div>
  );
}
