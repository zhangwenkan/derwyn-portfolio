"use client";
import { useEffect } from "react";
import gsap from "gsap";
export default function Index() {
  useEffect(() => {
    gsap.to(".box", { x: 100 });
  }, []);

  return <div className="box w-[200px] h-[200px] bg-[forestgreen]"></div>;
}
