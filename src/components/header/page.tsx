"use client";
import React, { FC } from "react";

const Header: FC = () => {
  return (
    <header className="fixed flex top-0 left-0 w-[100%] pt-[20px] pb-[40px] px-[10%] bg-[#1f242dcc] backdrop-blur-[8px] justify-between items-center z-[100] pointer-events-auto">
      {/* <a
        href="#"
        className="text-[25px] no-underline font-semibold cursor-default  animate-slideRight"
      >
        Derwyn&apos;s Portfolio
      </a> */}
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
      <a href="#" className="w-[100px] h-[70px] ml-[-300px] mt-[-10px]">
        <img src="/assets/logo.webp" alt="" className="animate-slight-sway" />
      </a>
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
