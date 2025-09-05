"use client";

import { useRef, useEffect } from "react";

interface TextParticleProps {
  text?: string;
}

export default function TextParticle({
  text = "hello.world",
}: TextParticleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const headline = headlineRef.current;

    if (!canvas || !headline) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 定义 Particle 类型
    type Particle = {
      x: number;
      y: number;
      dest: { x: number; y: number };
      r: number;
      vx: number;
      vy: number;
      accy: number;
      accx: number;
      friction: number;
      color: string;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    let particles: Particle[] = [];
    let amount = 0;
    const mouse = {
      x: -1999,
      y: -9999,
    };

    const radius = 1;
    const colors = [
      "rgba(239,51,51,0.85)",
      "rgba(239,219,51,0.75)",
      "rgba(51,51,239,0.85)",
      "rgba(192,213,255,0.85)",
      "rgba(244,223,254,0.75)",
    ];

    let ww = window.innerWidth;
    let wh = window.innerHeight;

    // Particle 工厂函数替代传统的类
    const createParticle = (x: number, y: number) => {
      let particle = {
        x: Math.random() * ww,
        y: Math.random() * wh,
        dest: { x, y },
        r: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 25,
        vy: (Math.random() - 0.5) * 25,
        accy: 0,
        accx: 0,
        friction: Math.random() * 0.025 + 0.94,
        color: colors[Math.floor(Math.random() * colors.length)],

        render: function (ctx: CanvasRenderingContext2D) {
          this.accx = (this.dest.x - this.x) / 1000;
          this.accy = (this.dest.y - this.y) / 1000;
          this.vx += this.accx;
          this.vy += this.accy;
          this.vx *= this.friction;
          this.vy *= this.friction;
          this.x += this.vx;
          this.y += this.vy;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fill();
          const a = this.x - mouse.x;
          const b = this.y - mouse.y;
          const distance = Math.sqrt(a * a + b * b);
          if (distance < radius * 75) {
            this.accx = (this.x - mouse.x) / 100;
            this.accy = (this.y - mouse.y) / 100;
            this.vx += this.accx;
            this.vy += this.accy;
          }
        },
      };

      return particle;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const initScene = () => {
      if (!canvas || !ctx || !headline) return;
      ww = canvas.width = window.innerWidth;
      wh = canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'normal 14vw "microsoft yahei"';
      ctx.textAlign = "center";
      ctx.fillText(headline.innerHTML, ww / 2, wh / 1.6);
      var data = ctx.getImageData(0, 0, ww, wh).data;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "screen";
      particles = [];
      for (let i = 0; i < ww; i += Math.round(ww / 200)) {
        for (let j = 0; j < wh; j += Math.round(ww / 200)) {
          if (data[(i + j * ww) * 4 + 3] > 200) {
            particles.push(createParticle(i, j));
          }
        }
      }
      amount = particles.length;
    };

    const render = (a: number) => {
      requestAnimationFrame(render);
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < amount; i++) {
        particles[i].render(ctx);
      }
    };

    const handleKeyup = () => initScene();
    const handleResize = () => initScene();

    headline.addEventListener("keyup", handleKeyup);
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    initScene();
    requestAnimationFrame(render);

    return () => {
      headline.removeEventListener("keyup", handleKeyup);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [text]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute inset-0 w-full h-full"
      />
      <h1
        ref={headlineRef}
        id="headline"
        className="opacity-0 pointer-events-none"
      >
        {text}
      </h1>
    </div>
  );
}
