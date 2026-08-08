"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import styles from "./WelcomeIntro.module.css";

const LAYERS = [
  "/assets/welcome/layer-far.webp",
  "/assets/welcome/layer-middle.webp",
  "/assets/welcome/layer-front.webp",
];

const SEEN_KEY = "derwyn:welcome-seen";
const DURATION = 3.2;
const DEV = process.env.NODE_ENV !== "production";

const preload = (sources: string[]) =>
  Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );

export default function WelcomeIntro() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const loopRef = useRef(false);
  const [looping, setLooping] = useState(false);

  const stop = useCallback(() => {
    tlRef.current?.kill();
    tlRef.current = null;
    const root = rootRef.current;
    if (root) delete root.dataset.playing;
    document.body.style.overflow = "";
  }, []);

  const play = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const far = farRef.current;
    const middle = middleRef.current;
    const front = frontRef.current;
    if (!root || !stage || !far || !middle || !front) return;

    tlRef.current?.kill();
    tlRef.current = null;
    gsap.set([far, middle, front], { clearProps: "all" });
    gsap.set(stage, { opacity: 1 });
    root.dataset.playing = "true";
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    void preload(LAYERS).then(() => {
      if (rootRef.current?.dataset.playing !== "true") return;

      const tl = gsap.timeline({
        repeat: loopRef.current ? -1 : 0,
        repeatDelay: 0.5,
        onComplete: () => {
          if (!loopRef.current) stop();
        },
      });
      tlRef.current = tl;

      // Explicit zero-position state so each loop pass starts from scratch.
      tl.set(stage, { opacity: 1 }, 0);
      tl.set([far, middle, front], { opacity: 1, display: "block" }, 0);
      tl.set([middle, front], { scale: 1, filter: "blur(0px)" }, 0);

      // Three planes share the window centre as their origin; the speed spread
      // between them is what sells the dolly through the glass. The far plane
      // is full frame, so it starts slightly overscanned to keep its own blurred
      // edge outside the viewport.
      tl.to(far, { scale: 1.75, ease: "power1.in", duration: DURATION }, 0);
      tl.fromTo(
        far,
        { scale: 1.06, filter: "blur(7px)" },
        { filter: "blur(0px)", ease: "sine.out", duration: 1.9 },
        0,
      );

      // The wall only has to grow until the window opening clears the viewport,
      // which happens around scale 5.1; the rest of the travel is overshoot so
      // the frame edges are long gone before the plane fades.
      tl.to(middle, { scale: 11, ease: "power2.in", duration: DURATION }, 0);
      tl.to(middle, { filter: "blur(5px)", ease: "power1.in", duration: 0.9 }, 2.0);
      tl.to(
        middle,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.7,
          onComplete: () => gsap.set(middle, { display: "none" }),
        },
        2.4,
      );

      // The window sits dead centre, so the camera flies straight through the
      // boy's seat. Defocusing the plane as it grows makes that read as a
      // foreground blur pass instead of a translucent cutout.
      tl.to(front, { scale: 13, ease: "power2.in", duration: DURATION * 0.9 }, 0);
      tl.to(front, { filter: "blur(14px)", ease: "power2.in", duration: 1.8 }, 0);
      tl.to(
        front,
        {
          opacity: 0,
          ease: "power1.in",
          duration: 0.9,
          onComplete: () => gsap.set(front, { display: "none" }),
        },
        1.2,
      );

      // Fades the stage rather than the root so the controls stay reachable.
      tl.to(stage, { opacity: 0, ease: "power2.inOut", duration: 0.65 }, 2.9);
    });
  }, [stop]);

  const skip = useCallback(() => {
    loopRef.current = false;
    setLooping(false);
    const tl = tlRef.current;
    if (!tl) {
      stop();
      return;
    }
    tl.repeat(0);
    gsap.to(tl, { timeScale: 6, duration: 0.25, ease: "power1.in" });
  }, [stop]);

  const toggleLoop = useCallback(() => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLooping(next);
    tlRef.current?.repeat(next ? -1 : 0);
  }, []);

  useLayoutEffect(() => {
    const seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Stays mounted but hidden; the CSS default keeps it out of paint and hit
    // testing until data-playing flips, which is also what makes replay cheap.
    if (pathname !== "/" || seen || reduced) return;

    window.sessionStorage.setItem(SEEN_KEY, "1");
    play();
    return stop;
  }, [pathname, play, stop]);

  return (
    <>
      <div ref={rootRef} className={styles.root}>
        <div ref={stageRef} className={styles.stage} aria-hidden="true">
          <div ref={farRef} className={`${styles.layer} ${styles.far}`} />
          <div ref={middleRef} className={`${styles.layer} ${styles.middle}`} />
          <div ref={frontRef} className={`${styles.layer} ${styles.front}`} />
        </div>
        <div className={styles.controls}>
          {DEV ? (
            <>
              <button type="button" className={styles.btn} onClick={play}>
                重播
              </button>
              <button
                type="button"
                className={`${styles.btn} ${looping ? styles.btnOn : ""}`}
                onClick={toggleLoop}
                aria-pressed={looping}
              >
                {looping ? "循环中" : "循环"}
              </button>
            </>
          ) : null}
          <button type="button" className={styles.btn} onClick={skip}>
            跳过
          </button>
        </div>
      </div>
      {/* Sibling of the overlay: PageTransition's .view sets will-change, which
          would make a fixed launcher inside the page scroll with it. */}
      {DEV && pathname === "/" ? (
        <button
          type="button"
          className={`${styles.btn} ${styles.replayLauncher}`}
          onClick={play}
        >
          回到欢迎页
        </button>
      ) : null}
    </>
  );
}
