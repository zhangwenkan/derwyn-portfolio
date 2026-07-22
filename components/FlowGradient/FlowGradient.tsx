"use client";

import { useEffect, useRef } from "react";
import {
  OPAL,
  advanceClock,
  grainAlpha,
  makeNoiseTile,
  paintFlow,
  type FlowParams,
  type OpalPreset,
} from "./flowMath";
import styles from "./FlowGradient.module.css";

// feralui animates FLOW at a low internal resolution then upscales.
const RENDER_W = 240;
const RENDER_H = 160;

type FlowGradientProps = {
  preset?: OpalPreset;
  className?: string;
  /** Pause animation (e.g. tab hidden). Default true = animate. */
  animate?: boolean;
};

export default function FlowGradient({
  preset = OPAL,
  className,
  animate = true,
}: FlowGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    canvas.width = RENDER_W;
    canvas.height = RENDER_H;

    const image = ctx.createImageData(RENDER_W, RENDER_H);
    const noise = makeNoiseTile(128);
    const stops = preset.stops;
    const flow: FlowParams = { ...preset.flow };
    const speed = preset.speed;
    const grain = preset.grain;

    let clock = 20.75;
    let raf = 0;
    let last = 0;
    let alive = true;

    const draw = (t: number) => {
      paintFlow(image, RENDER_W, RENDER_H, stops, flow, t);
      ctx.putImageData(image, 0, 0);

      const ga = grainAlpha(grain);
      if (ga > 0) {
        ctx.save();
        ctx.globalAlpha = ga;
        ctx.globalCompositeOperation = "overlay";
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(noise, 0, 0, RENDER_W, RENDER_H);
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    };

    const tick = (now: number) => {
      if (!alive) return;
      if (last) {
        clock = advanceClock(clock, speed, (now - last) / 1000);
      }
      last = now;
      draw(clock);
      if (animate) raf = requestAnimationFrame(tick);
    };

    if (animate) {
      raf = requestAnimationFrame(tick);
    } else {
      draw(clock);
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        last = 0;
      } else if (animate && alive) {
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [preset, animate]);

  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ""}`} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
