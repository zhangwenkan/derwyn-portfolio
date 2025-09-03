"use client";
import React, { FC, Suspense, useEffect, useRef, useState } from "react";
import { Application, SPEObject, SplineEvent } from "@splinetool/runtime";
import gsap from "gsap";
import { Skill, SkillNames, SKILLS } from "@/data/constants";
const Spline = React.lazy(() => import("@splinetool/react-spline"));

const Skills: FC = () => {
  const splineContainer = useRef<HTMLDivElement>(null);
  const [splineApp, setSplineApp] = useState<Application>();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  useEffect(() => {
    if (!selectedSkill || !splineApp) return;
    splineApp.setVariable("heading", selectedSkill.label);
    splineApp.setVariable("desc", selectedSkill.shortDescription);
  }, [selectedSkill]);

  useEffect(() => {
    handleSplineInteractions();
  }, [splineApp]);
  const handleSplineInteractions = () => {
    if (!splineApp) return;
    splineApp.addEventListener("mouseHover", handleMouseHover);
  };

  useEffect(() => {
    if (!splineApp) return;
    const textDesktopDark = splineApp.findObjectByName("text-desktop-dark");
    const textDesktopLight = splineApp.findObjectByName("text-desktop");
    const textMobileDark = splineApp.findObjectByName("text-mobile-dark");
    const textMobileLight = splineApp.findObjectByName("text-mobile");
    if (
      !textDesktopDark ||
      !textDesktopLight ||
      !textMobileDark ||
      !textMobileLight
    )
      return;
    textDesktopLight.visible = true;
  }, [splineApp]);

  useEffect(() => {
    if (!splineApp) return;
    revealKeyCaps();
  }, [splineApp]);
  const revealKeyCaps = async () => {
    if (!splineApp) return;
    const kbd = splineApp.findObjectByName("keyboard");
    if (!kbd) return;
    kbd.visible = false;
    await sleep(400);
    kbd.visible = true;
    // setKeyboardRevealed(true);
    gsap.fromTo(
      kbd?.scale,
      { x: 0.01, y: 0.01, z: 0.01 },
      {
        x: 0.3,
        y: 0.3,
        z: 0.3,
        duration: 1.5,
        ease: "elastic.out(1, 0.6)",
      }
    );

    const allObjects = splineApp.getAllObjects();
    const keycaps = allObjects.filter((obj) => obj.name === "keycap");
    await sleep(900);
    //每一个键帽立体的样式
    const desktopKeyCaps = allObjects.filter(
      (obj) => obj.name === "keycap-desktop"
    );
    desktopKeyCaps.forEach(async (keycap, idx) => {
      await sleep(idx * 70);
      keycap.visible = true;
    });

    //每一个键帽平面的样式
    keycaps.forEach(async (keycap, idx) => {
      keycap.visible = false;
      await sleep(idx * 70);
      keycap.visible = true;
      gsap.fromTo(
        keycap.position,
        { y: 200 },
        { y: 50, duration: 0.5, delay: 0.1, ease: "bounce.out" }
      );
    });
  };

  //鼠标经过键帽
  const handleMouseHover = (e: SplineEvent) => {
    if (!splineApp || selectedSkill?.name === e.target.name) return;

    if (e.target.name === "body" || e.target.name === "platform") {
      setSelectedSkill(null);
      if (splineApp.getVariable("heading") && splineApp.getVariable("desc")) {
        splineApp.setVariable("heading", "");
        splineApp.setVariable("desc", "");
      }
    } else {
      if (!selectedSkill || selectedSkill.name !== e.target.name) {
        const skill = SKILLS[e.target.name as SkillNames];
        setSelectedSkill(skill);
      }
    }
  };
  return (
    <div className="h-dvh">
      <Suspense fallback={<div>Loading...</div>}>
        <Spline
          ref={splineContainer}
          onLoad={(app: Application) => {
            setSplineApp(app);
          }}
          scene="assets/skills-keyboard.spline"
        />
      </Suspense>
    </div>
  );
};

export default Skills;
