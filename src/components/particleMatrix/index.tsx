"use client";
import React, { FC, useEffect, useRef } from "react";

const MouseParticleBackground: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let handleMouseMove: (e: MouseEvent) => void;
    let handleResize: () => void;

    const background = {
      line: 15,
      row: 25,
      distance_x: 0,
      distance_y: 0,
      mouse_radius: 250,
      width: 0,
      height: 0,
      points: [] as {
        x: number;
        y: number;
        type: "circle" | "digit";
        content?: string;
      }[],
      mouse: { x: 0, y: 0 },

      init() {
        this.resize();
        // 设置初始鼠标位置为屏幕中心
        this.mouse.x = this.width / 2;
        this.mouse.y = this.height / 2;

        handleResize = this.resize.bind(this);
        handleMouseMove = (e: MouseEvent) => {
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          this.mouse.x = e.clientX - rect.left;
          this.mouse.y = e.clientY - rect.top;
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);
        this.animate();
      },

      resize() {
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        this.width = container.clientWidth;
        this.height = container.clientHeight;
        canvas.width = this.width * window.devicePixelRatio;
        canvas.height = this.height * window.devicePixelRatio;
        canvas.style.width = this.width + "px";
        canvas.style.height = this.height + "px";
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.distance_x = this.width / (this.row - 1);
        this.distance_y = this.height / (this.line - 1);
        this.create_points();

        // 如果鼠标位置还是初始值，设置为屏幕中心
        if (this.mouse.x === 0 && this.mouse.y === 0) {
          this.mouse.x = this.width / 2;
          this.mouse.y = this.height / 2;
        }
      },

      create_points() {
        this.points = [];
        for (let l = 0; l < this.line; l++) {
          for (let r = 0; r < this.row; r++) {
            // 随机决定粒子类型：70% 概率显示圆点，30% 概率显示数字
            const isCircle = Math.random() < 0.7;
            this.points.push({
              x: r * this.distance_x,
              y: l * this.distance_y,
              type: isCircle ? "circle" : "digit",
              content: isCircle ? undefined : Math.random() < 0.5 ? "0" : "1",
            });
          }
        }
      },

      animate() {
        if (!ctx) return;
        ctx.clearRect(0, 0, this.width, this.height);

        this.points.forEach((p) => {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let opacity = 0;
          let radius = 0;
          let fontSize = 0;

          if (dist < this.mouse_radius) {
            const t = 1 - dist / this.mouse_radius;
            opacity = t;
            radius = 5; // 圆点大小
            fontSize = 18; // 字体大小18px
          }

          ctx.globalAlpha = opacity;

          if (p.type === "circle") {
            // 绘制圆点
            ctx.fillStyle = "rgba(184, 134, 11, 1)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 绘制数字文本
            ctx.font = `${fontSize}px 'Consolas', monospace`;
            ctx.fillStyle = `rgba(100, 100, 100)`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.content || "0", p.x, p.y);
          }
        });

        requestAnimationFrame(this.animate.bind(this));
      },
    };

    // 初始化背景效果
    background.init();

    // 清理函数
    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (handleMouseMove) {
        window.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="mouseParticleCanvas"
      className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
    />
  );
};

export default MouseParticleBackground;
