"use client";
import React, { FC } from "react";
import Header from "@/components/header/page";
import Home from "@/components/sections/home";
import Skills from "@/components/sections/skills";
import Work from "@/components/sections/work";

const Index: FC = () => {
  return (
    <div>
      <div className="bg-[#1f242d] text-white w-[100%] min-h-dvh pointer-events-none">
        <Header />
        <Home />
        <Skills />
        <Work />
      </div>
    </div>
  );
};

export default Index;
