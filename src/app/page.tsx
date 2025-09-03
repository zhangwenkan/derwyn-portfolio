"use client";
import React, { FC } from "react";
import Header from "@/components/header/page";
import Home from "@/components/sections/home";
import Skills from "@/components/sections/skills";
import Work from "@/components/sections/work";

const Index: FC = () => {
  return (
    <div className="bg-[#1f242d] text-white">
      <Header />
      <Home />
      <Skills />
      <Work />
    </div>
  );
};

export default Index;
