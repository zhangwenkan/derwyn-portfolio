"use client";
import React, { FC, useState, useEffect, useRef } from "react";
import Header from "@/components/header/page";
import Home from "@/components/sections/home";
import Skills from "@/components/sections/skills";
import Work from "@/components/sections/work";
import Contact from "@/components/sections/contact";
import lottie, { AnimationItem } from "lottie-web";

const Index: FC = () => {
  const [loading, setLoading] = useState(true);
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (lottieRef.current && !animationRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: lottieRef.current!,
        path: "/assets/loading.json",
        loop: true,
        autoplay: true,
      });
    }
    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // 模拟加载过程，2秒后隐藏loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Loading Screen */}
      <div
        className={`fixed inset-0 bg-[#1f242d] text-white flex items-center justify-center z-50 transition-all duration-700 ease-in-out ${
          !loading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div ref={lottieRef} className="w-[600px] h-[600px]"></div>
      </div>

      {/* Main Content Container - 只在loading结束后渲染内容 */}
      <div className="bg-[#1f242d] text-white w-[100%] min-h-dvh relative">
        {/* 上半部分遮罩 */}
        <div
          className={`fixed top-0 left-0 w-full h-1/2 bg-[#1f242d] z-40 transition-transform duration-700 ease-in-out delay-300 ${
            loading ? "" : "-translate-y-full"
          }`}
        ></div>

        {/* 下半部分遮罩 */}
        <div
          className={`fixed bottom-0 left-0 w-full h-1/2 bg-[#1f242d] z-40 transition-transform duration-700 ease-in-out delay-300 ${
            loading ? "" : "translate-y-full"
          }`}
        ></div>

        {/* 主内容 - 只在loading结束后渲染 */}
        {!loading && (
          <div>
            <Header />
            <Home />
            <Skills />
            <Work />
            <Contact />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
