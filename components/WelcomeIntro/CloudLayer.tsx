"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export const CLOUD_IDLE_SPEED = 18;
export const CLOUD_FLIGHT_SPEED = 267;

const CLOUD_COUNT = 800;
const CLOUD_SPAN = 800;
const SKY_COLOR = "#8ebedb";

const CLOUD_VERTEX_SHADER = `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 viewPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDepth = -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const CLOUD_FRAGMENT_SHADER = `
varying vec2 vUv;
varying float vDepth;
uniform sampler2D map;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

void main() {
  vec4 cloud = texture2D(map, vUv);
  float fog = smoothstep(fogNear, fogFar, vDepth);
  float nearFade = smoothstep(0.0, 30.0, vDepth);
  gl_FragColor = vec4(mix(cloud.rgb, fogColor, fog), cloud.a * (1.0 - fog) * nearFade);
  #include <colorspace_fragment>
}
`;

interface CloudLayerProps {
  onReady?: (controls: CloudLayerControls | null) => void;
  onFrame?: (canvas: HTMLCanvasElement) => void;
}

export interface CloudLayerControls {
  canvas: HTMLCanvasElement;
  play: () => void;
  pause: () => void;
  setProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  dispose: () => void;
}

export function CloudLayer({ onReady, onFrame }: CloudLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch {
      return;
    }
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const backgroundCanvas = document.createElement("canvas");
    backgroundCanvas.width = 2;
    backgroundCanvas.height = 256;
    const context = backgroundCanvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, backgroundCanvas.height);
    gradient.addColorStop(0, "#6090b5");
    gradient.addColorStop(0.5, SKY_COLOR);
    context.fillStyle = gradient;
    context.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    const background = new THREE.CanvasTexture(backgroundCanvas);
    background.colorSpace = THREE.SRGBColorSpace;
    scene.background = background;

    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 1, CLOUD_SPAN * 3);
    camera.rotation.x = THREE.MathUtils.degToRad(-1.84);

    let disposed = false;
    let playing = false;
    let textureReady = false;
    let frame: number | null = null;
    let previousTime = 0;
    let distance = 0;
    let speed = CLOUD_IDLE_SPEED;

    const draw = () => {
      if (disposed) return;
      camera.position.z = CLOUD_SPAN - (distance % CLOUD_SPAN);
      renderer.render(scene, camera);
      onFrame?.(renderer.domElement);
    };

    const cloudTexture = new THREE.TextureLoader().load("/assets/cloud.png", () => {
      if (disposed) return;
      textureReady = true;
      draw();
    });
    cloudTexture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.PlaneGeometry(64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: cloudTexture },
        fogColor: { value: new THREE.Color(SKY_COLOR) },
        fogNear: { value: 150 },
        fogFar: { value: CLOUD_SPAN * 2 - 100 },
      },
      vertexShader: CLOUD_VERTEX_SHADER,
      fragmentShader: CLOUD_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const meshes = Array.from({ length: 3 }, (_, index) => {
      const mesh = new THREE.InstancedMesh(geometry, material, CLOUD_COUNT);
      mesh.position.z = -index * CLOUD_SPAN;
      mesh.renderOrder = -index;
      scene.add(mesh);
      return mesh;
    });
    const sprite = new THREE.Object3D();
    let seed = 7419;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let index = 0; index < CLOUD_COUNT; index++) {
      sprite.position.set(
        random() * 1000 - 500,
        -random() * random() * 200 - 15,
        (index / CLOUD_COUNT) * CLOUD_SPAN,
      );
      sprite.rotation.z = random() * Math.PI;
      const scale = random() * random() * 1.5 + 0.5;
      sprite.scale.set(scale, scale, 1);
      sprite.updateMatrix();
      meshes.forEach((mesh) => mesh.setMatrixAt(index, sprite.matrix));
    }
    meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height || disposed) return;
      const resolution = Math.min(window.devicePixelRatio || 1, 1.5, 2048 / width);
      renderer.setPixelRatio(resolution);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
      frame = null;
      if (!playing || disposed || document.hidden) return;
      const elapsed = Math.min(Math.max(0, now - previousTime), 50) / 1000;
      previousTime = now;
      if (textureReady) distance += speed * elapsed;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (disposed || !playing || document.hidden || frame !== null) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const cancelFrame = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) cancelFrame();
      else schedule();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const controls: CloudLayerControls = {
      canvas: renderer.domElement,
      play: () => {
        if (disposed) return;
        playing = true;
        schedule();
      },
      pause: () => {
        playing = false;
        cancelFrame();
      },
      setProgress: (progress) => {
        distance = THREE.MathUtils.clamp(progress, 0, 1) * CLOUD_SPAN;
        previousTime = performance.now();
        draw();
      },
      setSpeed: (nextSpeed) => {
        speed = Math.max(0, nextSpeed);
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        playing = false;
        cancelFrame();
        observer.disconnect();
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        meshes.forEach((mesh) => mesh.dispose());
        geometry.dispose();
        material.dispose();
        cloudTexture.dispose();
        background.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      },
    };

    resize();
    onReady?.(controls);

    return () => {
      controls.dispose();
      onReady?.(null);
    };
  }, [onReady, onFrame]);

  return (
    <div
      ref={containerRef}
      data-cloud-layer
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
