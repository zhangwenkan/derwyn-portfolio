"use client";

import { useRef, useEffect, useState } from "react";

// 定义粒子类型
interface Particle {
  x: number;
  originalX: number;
  y: number;
  originalY: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  draw: () => void;
  update: () => void;
}

const ImageParticle = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const [isFormed, setIsFormed] = useState(false);
  const particlePositionsRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 增加粒子数量以获得更精细的效果
    const numOfParticles = 16000;

    // 直接使用固定图片
    const loadImage = () => {
      const img = new Image();
      // 使用项目中的固定图片
      img.src = "/assets/programmer.svg";
      img.onload = function () {
        const maxSize = 600; // 增大最大尺寸
        let width = img.width;
        let height = img.height;
        let scale = Math.min(maxSize / width, maxSize / height);
        if (scale < 1) {
          width *= scale;
          height *= scale;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.hidden = false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        createParticles(imageData, ctx);
        // 初始时粒子随机分布
        scatterParticles();
        animate(ctx);

        // 0.5秒后开始形成形状
        setTimeout(() => {
          setIsFormed(true);
        }, 500);
      };
    };

    const createParticles = (
      imageData: ImageData,
      ctx: CanvasRenderingContext2D
    ) => {
      particlesRef.current = [];
      particlePositionsRef.current = [];
      const { width, height } = imageData;

      // 使用更密集的采样方式
      const stepX = Math.max(
        1,
        Math.floor(width / Math.sqrt(numOfParticles * 2))
      );
      const stepY = Math.max(
        1,
        Math.floor(height / Math.sqrt(numOfParticles * 2))
      );

      for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
          const index = (~~y * width + ~~x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const a = imageData.data[index + 3];

          // 只创建不透明度大于一定阈值的粒子
          if (a > 50) {
            // 保存有效粒子位置用于后续扩散
            particlePositionsRef.current.push({ x, y });
            particlesRef.current.push(createParticle(x, y, r, g, b, ctx));
          }
        }
      }
    };

    // 创建粒子工厂函数
    const createParticle = (
      x: number,
      y: number,
      r: number,
      g: number,
      b: number,
      ctx: CanvasRenderingContext2D
    ): Particle => {
      // 固定粒子大小 - 减小尺寸以获得更精细效果
      const size = 1;

      // 基于原图片颜色创建粒子颜色
      // 通过更精细的颜色分析来突出原图细节
      const avg = (r + g + b) / 3;

      let particleR, particleG, particleB;

      // 对于接近白色或非常亮的区域（如线条、空隙），使用背景色#1f242d
      if (avg > 220 || (r > 240 && g > 240 && b > 240)) {
        particleR = 31;
        particleG = 36;
        particleB = 45;
      }
      // 对于中等亮度区域，使用明亮的金色
      else if (avg > 80) {
        particleR = 218;
        particleG = 165;
        particleB = 32;
      }
      // 对于较暗区域，使用较亮的金色调以增加层次感
      else {
        particleR = 184;
        particleG = 134;
        particleB = 11;
      }

      return {
        x: x,
        originalX: x,
        y: y,
        originalY: y,
        targetX: x,
        targetY: y,
        // 根据原图片颜色创建区分度更高的粒子颜色
        color: `rgba(${particleR}, ${particleG}, ${particleB}, 1)`,
        size: size,
        draw: function () {
          ctx.fillStyle = this.color;
          // 使用圆形绘制，比矩形更自然
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        },
        update: function () {
          // 根据是否形成形状来更新粒子位置
          if (isFormed) {
            // 逐渐移向目标位置（原图片位置）
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            this.x += dx * 0.05;
            this.y += dy * 0.05;
          } else {
            // 随机移动效果（扩散效果）
            this.x += (Math.random() - 0.5) * 2;
            this.y += (Math.random() - 0.5) * 2;
          }
          this.draw();
        },
      };
    };

    // 将粒子随机分布限制在图片轮廓内（扩散效果）
    const scatterParticles = () => {
      const positions = particlePositionsRef.current;
      if (positions.length === 0) return;

      particlesRef.current.forEach((particle, index) => {
        // 从有效粒子位置中随机选择一个位置作为起点
        const randomPos =
          positions[Math.floor(Math.random() * positions.length)];
        // 在选中位置附近添加一些随机偏移，使粒子分布更自然
        particle.x = randomPos.x + (Math.random() - 0.5) * 20;
        particle.y = randomPos.y + (Math.random() - 0.5) * 20;
      });
    };

    const animate = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((particle) => particle.update());
      animationFrameRef.current = requestAnimationFrame(() => animate(ctx));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      particlesRef.current.forEach((particle) => {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 增加影响范围和强度
        if (dist < 80) {
          const angle = Math.atan2(dy, dx);
          const force = (1 - dist / 80) * 3;
          particle.x -= Math.cos(angle) * force;
          particle.y -= Math.sin(angle) * force;
        }
      });
    };

    // 组件加载时直接加载固定图片
    loadImage();

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isFormed]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen overflow-hidden relative z-10 bg-[#1f242d]">
      <canvas ref={canvasRef} className="block mx-auto" />
    </div>
  );
};

export default ImageParticle;
