"use client";
import React, { FC, useEffect } from "react";
import ParticleMatrix from "@/components/particleMatrix";
import Typed from "typed.js";
// import TextParticleBackground from "../textParticle";
import ImageParticles from "../imageParticle";

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
    <section className="relative flex w-[100%] h-screen items-center justify-between px-[10%] pt-[70px] pointer-events-auto">
      <ParticleMatrix />
      <div className="max-w-[600px]">
        <div className="mt-5 flex ">
          <div className="mt-5 flex flex-col items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-[#915EFF]"></div>
            <div className="violet-gradient h-40 w-1 sm:h-80"></div>
          </div>
          <div className="ml-[20px] mt-[20px]">
            <h3 className="text-[56px] font-bold opacity-0 animate-slideBottom animation-delay-700">
              Hi,This is <span className="text-[#915EFF]">Derwyn</span>
            </h3>
            <h3 className="text-[32px] font-bold opacity-0 animate-slideTop animation-delay-700">
              And I'm a <span className="text-[#f4a443] multiple-text"></span>
            </h3>
          </div>
        </div>
      </div>

      {/* <div className="opacity-0 animate-[zoomIn_1s_ease_forwards] animation-delay-1000">
          <img
            src="assets/avatars.jpg"
            alt=""
            className="max-w-[450px] rounded-full shadow-[0_0_20px_#b7b2a9] animate-[floatImage_4s_ease-in-out_infinite] animation-delay-2000"
          />
        </div> */}

      {/* <TextParticleBackground /> */}
      <ImageParticles />
    </section>
  );
};

export default Home;
