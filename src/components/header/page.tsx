"use client";
import React, { FC, useEffect, useRef } from "react";
import lottie, { AnimationItem } from "lottie-web";

const Header: FC = () => {
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    // 确保不会重复加载动画
    if (lottieRef.current && !animationRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: lottieRef.current!,
        path: "/assets/logo.json",
        loop: false,
        autoplay: true,
      });
    }

    // 清理函数
    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <header className="fixed flex top-0 left-0 w-[100%] px-[10%] bg-[#1f242dcc] backdrop-blur-[8px] justify-between items-center z-[200] pointer-events-auto">
      {/* <a
        href="#"
        className="text-[25px] no-underline font-semibold cursor-default  animate-slideRight"
      >
        Derwyn&apos;s Portfolio
      </a> */}
      <div className="flex items-center">
        <div
          ref={lottieRef}
          className="w-[50px] h-[50px] mr-[5px] cursor-pointer hover:animate-slight-sway"
        ></div>
        <img
          src="/assets/logotext.svg"
          alt=""
          className="w-[100px] h-[20px] opacity-0 animate-dropAndFocus"
        />
      </div>
      <nav className="flex items-center space-x-8 special-font">
        <a
          href="#"
          className="font-medium text-[#b7b2a9] opacity-0 animate-slideTop"
        >
          Home
        </a>
        <a
          href="#"
          className="text-white font-medium opacity-0 animate-slideTop animation-delay-200"
        >
          Skills
        </a>
        <a
          href="#"
          className="text-white font-medium opacity-0  animate-slideTop animation-delay-400"
        >
          Work
        </a>
        <a
          href="#"
          className="text-white font-medium opacity-0 animate-slideTop animation-delay-600"
        >
          Demo
        </a>
        <a
          href="#"
          className="text-white font-medium opacity-0 animate-slideTop animation-delay-800"
        >
          Footprint
        </a>
        <a
          href="#"
          className="text-white font-medium opacity-0 animate-slideTop animation-delay-1000"
        >
          Contact
        </a>
      </nav>
      <nav className="flex items-center">
        <a href="#" className="text-white font-medium active:text-gray-400">
          EN
        </a>
        |
        <a href="#" className="text-white font-medium">
          中
        </a>
      </nav>
    </header>
  );
};

export default Header;
