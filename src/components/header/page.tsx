"use client";
import React, { FC, useEffect, useRef, useState } from "react";
import Image from "next/image";
import lottie, { AnimationItem } from "lottie-web";

const Header: FC = () => {
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [activeSection, setActiveSection] = useState<string>("home");

  // 导航菜单项配置
  const navItems = [
    { id: "home", label: "Home", href: "#home" },
    { id: "skills", label: "Skills", href: "#skills" },
    { id: "work", label: "Work", href: "#work" },
    { id: "footprint", label: "Footprint", href: "#footprint" },
    { id: "contact", label: "Contact", href: "#contact" },
  ];

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

  // 监听滚动事件，检测当前显示的section
  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.map((item) => document.getElementById(item.id));
      const scrollPostion = window.scrollY + 200; //偏移量，让切换更灵敏

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPostion) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    };

    // 初始化检测
    handleScroll();

    // 添加滚动监听
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 平滑滚动到指定section
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <header className="fixed flex top-0 left-0 w-[100%] px-[10%] bg-[#1f242dcc] backdrop-blur-[6px] justify-between items-center z-[200] pointer-events-auto">
      {/* <a
        href="#"
        className="text-[25px] no-underline font-semibold cursor-default  animate-slideRight"
      >
        Derwyn&apos;s Portfolio
      </a> */}
      {/* <div className="flex items-center">
        <div
          ref={lottieRef}
          className="w-[50px] h-[50px] mr-[5px] cursor-pointer hover:animate-slight-sway"
        ></div>
        <img
          src="/assets/logotext.svg"
          alt=""
          className="w-[100px] h-[20px] opacity-0 animate-dropAndFocus"
        />
      </div> */}
      <Image
        src="/assets/logo.svg"
        alt="Logo"
        width={120}
        height={120}
        className="opacity-0 animate-dropAndFocus"
        priority
      />
      <nav className="flex items-center space-x-8 special-font">
        {navItems.map((item, index) => (
          <a
            key={item.id}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(item.id);
            }}
            className={`font-medium text-[1.5rem] transition-colors duration-300 opacity-0 animate-slideTop ${
              activeSection === item.id
                ? "text-[#b7b2a9]"
                : "text-white hover:text-[#b7b2a9]"
            }`}
            style={{
              animationDelay: `${index * 200}ms`,
            }}
          >
            {item.label}
          </a>
        ))}
        <a
          href="#"
          className="text-white font-medium text-[1.5rem] opacity-0 animate-slideTop animation-delay-800"
        >
          Demo
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
