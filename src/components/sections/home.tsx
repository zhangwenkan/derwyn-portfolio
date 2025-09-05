"use client";
import React, { FC, useEffect } from "react";
import ParticleMatrix from "@/components/particleMatrix";
import Typed from "typed.js";
import TextParticleBackground from "../textParticle";

const Home: FC = () => {
  useEffect(() => {
    const typed = new Typed(".multiple-text", {
      strings: ["Frontend Developer", "Shutterbug", "Backpacker"],
      typeSpeed: 100,
      backSpeed: 100,
      backDelay: 1000,
      loop: true,
    });
  }, []);
  return (
    <>
      <section className="relative flex w-[100%] h-screen items-center justify-between px-[10%] pt-[70px] pointer-events-auto">
        <ParticleMatrix />
        <div className="max-w-[600px]">
          <h3 className="text-[56px] font-bold opacity-0 animate-slideBottom animation-delay-700">
            Hello,This is Derwyn
          </h3>
          <h3 className="text-[32px] font-bold opacity-0 animate-slideTop animation-delay-700">
            And I'm a <span className="text-[#f4a443] multiple-text"></span>
          </h3>
        </div>

        {/* <div className="opacity-0 animate-[zoomIn_1s_ease_forwards] animation-delay-1000">
          <img
            src="assets/avatars.jpg"
            alt=""
            className="max-w-[450px] rounded-full shadow-[0_0_20px_#b7b2a9] animate-[floatImage_4s_ease-in-out_infinite] animation-delay-2000"
          />
        </div> */}

        <TextParticleBackground />
      </section>
    </>
  );
};

export default Home;
