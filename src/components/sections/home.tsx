"use client";
import React, { FC, useEffect } from "react";
import Typed from "typed.js";

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
    <section className="relative flex w-[100%] h-screen items-center justify-between px-[10%] pt-[70px]">
      <div className="max-w-[600px]">
        <h3 className="text-[56px] font-bold opacity-0 animate-slideBottom animation-delay-700">
          Hello,This is Derwyn
        </h3>
        <h3 className="text-[32px] font-bold opacity-0 animate-slideTop animation-delay-700">
          And I'm a <span className="text-[#b7b2a9] multiple-text"></span>
        </h3>
        {/* <p className="text-gray-600  animate-slideLeft delay-0.7s">
            Lorem ipsum dolor sit amet consectetur adipisicing elit...
          </p> */}

        {/* <div className="flex items-center space-x-4">
            <a href="#" className="text-gray-400  animate-slideLeft delay-1.4s">
              <i className="bx bxl-tiktok"></i>
            </a>
            <a href="#" className="text-gray-400  animate-slideLeft delay-1.6s">
              <i className="bx bxl-facebook-circle"></i>
            </a>
            <a href="#" className="text-gray-400  animate-slideLeft delay-1.8s">
              <i className="bx bxl-google"></i>
            </a>
            <a href="#" className="text-gray-400  animate-slideLeft delay-2s">
              <i className="bx bxl-linkedin-square"></i>
            </a>
          </div>

          <a
            href="#"
            className="bg-gray-400 text-black px-6 py-3 rounded-full shadow-md  animate-slideTop delay-2s"
          >
            Download CV
          </a> */}
      </div>

      <div className="opacity-0  animate-[zoomIn_1s_ease_forwards] animation-delay-1000">
        <img
          src="assets/avatars.jpg"
          alt=""
          className="max-w-[450px] rounded-full shadow-[0_0_20px_#b7b2a9] animate-[floatImage_4s_ease-in-out_infinite] animation-delay-2000"
        />
      </div>
    </section>
  );
};

export default Home;
