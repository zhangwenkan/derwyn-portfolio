"use client";
import React, { useEffect, useState } from "react";

// 常量定义
const CIRCLE_RADIUS = 20;
const SCROLL_THRESHOLD = 100;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const ScrollIndicator: React.FC = () => {
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      setScrollPercentage(scrollPercent);
      setIsVisible(scrollTop > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const strokeDashoffset =
    CIRCUMFERENCE - (scrollPercentage / 100) * CIRCUMFERENCE;

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 ease-out transform pointer-events-auto ${
        isVisible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-75 translate-y-4 pointer-events-none"
      }`}
    >
      <div
        onClick={handleScrollToTop}
        className="relative w-14 h-14 cursor-pointer group"
      >
        {/* SVG 进度环 */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 rounded-full"
          viewBox="0 0 44 44"
        >
          <defs>
            {/* 进度环渐变 */}
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            {/* 火箭渐变 */}
            <linearGradient
              id="rocketGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient
              id="windowGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* 背景轨道 */}
          <circle
            cx="22"
            cy="22"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
          />

          {/* 进度圆环 */}
          <circle
            cx="22"
            cy="22"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
            style={{ filter: "drop-shadow(0 0 6px rgba(96, 165, 250, 0.4))" }}
          />
        </svg>

        {/* 中央火箭图标 */}
        <div
          className="absolute inset-0 flex items-center justify-center translate-y-0.5 rounded-full overflow-hidden"
          style={{ clipPath: "circle(24px at center)" }}
        >
          <div className="group-hover:animate-rocket-fly">
            <svg
              className="w-8 h-8 transition-all duration-500 ease-out group-hover:scale-110"
              viewBox="0 0 24 24"
            >
              {/* 火箭主体 */}
              <path
                d="M12 2 L8.5 6 L8.5 13 L12 16 L15.5 13 L15.5 6 Z"
                fill="url(#rocketGradient)"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="0.5"
              />

              {/* 火箭窗口 */}
              <circle
                cx="12"
                cy="7"
                r="2"
                fill="url(#windowGradient)"
                className="group-hover:fill-blue-300 transition-all duration-300"
              />
              <circle
                cx="12"
                cy="7"
                r="1"
                fill="rgba(255, 255, 255, 0.6)"
                className="group-hover:fill-white transition-all duration-300"
              />

              {/* 火箭尾翅 */}
              <path
                d="M8.5 13 L6 15 L6 17 L8.5 15 Z"
                fill="rgba(239, 68, 68, 0.8)"
                className="group-hover:fill-red-400 transition-all duration-300"
              />
              <path
                d="M15.5 13 L18 15 L18 17 L15.5 15 Z"
                fill="rgba(239, 68, 68, 0.8)"
                className="group-hover:fill-red-400 transition-all duration-300"
              />

              {/* 火箭喷射火焰 */}
              <g className="group-hover:animate-pulse">
                <path
                  d="M9.5 16 L8 22 L9.5 20 L11 24 L12 20 L13 24 L14.5 20 L16 22 L14.5 16"
                  fill="rgba(249, 115, 22, 0.6)"
                  className="group-hover:fill-orange-500 transition-all duration-300"
                />
                <path
                  d="M10 16 L9 21 L10.5 18.5 L12 23 L13.5 18.5 L15 21 L14 16"
                  fill="rgba(251, 191, 36, 0.8)"
                  className="group-hover:fill-yellow-400 transition-all duration-300"
                />
                <path
                  d="M10.5 16 L10 20 L11 18 L12 22 L13 18 L14 20 L13.5 16"
                  fill="rgba(255, 255, 255, 0.9)"
                  className="group-hover:fill-white transition-all duration-300"
                />
                <path
                  d="M11 16 L10.5 19 L11.5 17.5 L12 21 L12.5 17.5 L13.5 19 L13 16"
                  fill="rgba(59, 130, 246, 0.8)"
                  className="group-hover:fill-blue-400 transition-all duration-300"
                />
              </g>

              {/* 装饰线条 */}
              <line
                x1="9"
                y1="10"
                x2="15"
                y2="10"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="0.8"
              />
              <line
                x1="9.5"
                y1="11.5"
                x2="14.5"
                y2="11.5"
                stroke="rgba(99, 102, 241, 0.8)"
                strokeWidth="0.8"
              />
              <line
                x1="10"
                y1="13"
                x2="14"
                y2="13"
                stroke="rgba(139, 92, 246, 0.8)"
                strokeWidth="0.8"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollIndicator;
