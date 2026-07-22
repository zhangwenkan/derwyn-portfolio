"use client";

import { useEffect, useRef, type MouseEventHandler } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { usePageTransition } from "@/components/PageTransition/PageTransition";
import styles from "./ContactIntouch.module.css";

// True circle on letter mid-height. tspan y=9.51; mid ≈ baseline − ½ Arial x-height.
const RING_R = 68.1706;
const RING_STROKE = 1.25;
// pathLength=1: dash ON only in centered inter-phrase gaps (perfect circular arcs).
const RING_DASH = [
  0, 0.061778, 0.034228, 0.115081, 0.034228, 0.113769, 0.034228, 0.164527,
  0.034228, 0.127333, 0.034228, 0.137397, 0.034228, 0.074744,
] as const;

// Glyph origins on R=75 (tracking +0.04em) —
// contact / get in touch / let's talk / reach out / hit me up / say hey
const LETTERS: { char: string; matrix: string }[] = [
  { char: "c", matrix: "-0.997185 -0.074979 0.074979 -0.997185 69.376595 149.788885" },
  { char: "o", matrix: "-0.988878 -0.148727 0.148727 -0.988878 63.84545 149.165868" },
  { char: "n", matrix: "-0.972628 -0.232367 0.232367 -0.972628 57.572482 147.947115" },
  { char: "t", matrix: "-0.949317 -0.31432 0.31432 -0.949317 51.426031 146.198792" },
  { char: "a", matrix: "-0.930608 -0.366018 0.366018 -0.930608 47.548649 144.795582" },
  { char: "c", matrix: "-0.897289 -0.441443 0.441443 -0.897289 41.891756 142.296688" },
  { char: "t", matrix: "-0.862079 -0.506774 0.506774 -0.862079 36.991953 139.655923" },
  { char: "g", matrix: "-0.536137 -0.844131 0.844131 -0.536137 11.690192 115.210299" },
  { char: "e", matrix: "-0.462334 -0.886706 0.886706 -0.462334 8.497045 109.67502" },
  { char: "t", matrix: "-0.387709 -0.921782 0.921782 -0.387709 5.866371 104.078194" },
  { char: " ", matrix: "-0.336463 -0.941697 0.941697 -0.336463 4.372752 100.234734" },
  { char: "i", matrix: "-0.292098 -0.956388 0.956388 -0.292098 3.270872 96.907354" },
  { char: "n", matrix: "-0.249758 -0.968308 0.968308 -0.249758 2.376882 93.731863" },
  { char: " ", matrix: "-0.166423 -0.986054 0.986054 -0.166423 1.045919 87.48174" },
  { char: "t", matrix: "-0.120171 -0.992753 0.992753 -0.120171 0.543513 84.012853" },
  { char: "o", matrix: "-0.065429 -0.997857 0.997857 -0.065429 0.160708 79.90718" },
  { char: "u", matrix: "0.019752 -0.999805 0.999805 0.019752 0.014632 73.518584" },
  { char: "c", matrix: "0.10479 -0.994494 0.994494 0.10479 0.412923 67.140743" },
  { char: "h", matrix: "0.178257 -0.983984 0.983984 0.178257 1.201203 61.630722" },
  { char: "l", matrix: "0.631093 -0.775708 0.775708 0.631093 16.821933 27.668061" },
  { char: "e", matrix: "0.664594 -0.747205 0.747205 0.664594 18.959642 25.155459" },
  { char: "t", matrix: "0.723894 -0.689911 0.689911 0.723894 23.256671 20.707938" },
  { char: "'", matrix: "0.760717 -0.649084 0.649084 0.760717 26.318711 17.946235" },
  { char: "s", matrix: "0.783425 -0.621486 0.621486 0.783425 28.388545 16.243109" },
  { char: " ", matrix: "0.82736 -0.561673 0.561673 0.82736 32.874547 12.948037" },
  { char: "t", matrix: "0.852698 -0.522404 0.522404 0.852698 35.81972 11.04763" },
  { char: "a", matrix: "0.88012 -0.474751 0.474751 0.88012 39.393692 8.990979" },
  { char: "l", matrix: "0.916241 -0.400627 0.400627 0.916241 44.952991 6.2819" },
  { char: "k", matrix: "0.932973 -0.359947 0.359947 0.932973 48.003946 5.027055" },
  { char: "r", matrix: "0.99191 0.126943 -0.126943 0.99191 84.52073 0.60675" },
  { char: "e", matrix: "0.981906 0.189371 -0.189371 0.981906 89.202799 1.357074" },
  { char: "a", matrix: "0.962966 0.269623 -0.269623 0.962966 95.2217 2.777546" },
  { char: "c", matrix: "0.937479 0.348041 -0.348041 0.937479 101.103112 4.689065" },
  { char: "h", matrix: "0.909085 0.41661 -0.41661 0.909085 106.245755 6.818604" },
  { char: " ", matrix: "0.870321 0.492485 -0.492485 0.870321 111.93636 9.725922" },
  { char: "o", matrix: "0.846361 0.53261 -0.53261 0.846361 114.945737 11.522932" },
  { char: "u", matrix: "0.79795 0.602724 -0.602724 0.79795 120.204301 15.153771" },
  { char: "t", matrix: "0.743746 0.668463 -0.668463 0.743746 125.134699 19.219072" },
  { char: "h", matrix: "0.357092 0.934069 -0.934069 0.357092 145.055181 48.218072" },
  { char: "i", matrix: "0.276282 0.961076 -0.961076 0.276282 147.080736 54.278816" },
  { char: "t", matrix: "0.233752 0.972296 -0.972296 0.233752 147.922224 57.468623" },
  { char: " ", matrix: "0.179962 0.983674 -0.983674 0.179962 148.775517 61.502849" },
  { char: "m", matrix: "0.133807 0.991007 -0.991007 0.133807 149.325559 64.964503" },
  { char: "e", matrix: "0.010489 0.999945 -0.999945 0.010489 149.995874 74.213327" },
  { char: " ", matrix: "-0.071929 0.99741 -0.99741 -0.071929 149.805733 80.39465" },
  { char: "u", matrix: "-0.118451 0.99296 -0.99296 -0.118451 149.471995 83.883806" },
  { char: "p", matrix: "-0.202548 0.979272 -0.979272 -0.202548 148.44543 90.191076" },
  { char: "s", matrix: "-0.650091 0.759856 -0.759856 -0.650091 131.989196 123.756861" },
  { char: "a", matrix: "-0.704655 0.70955 -0.70955 -0.704655 128.216256 127.849126" },
  { char: "y", matrix: "-0.760717 0.649084 -0.649084 -0.760717 123.681289 132.053765" },
  { char: " ", matrix: "-0.80676 0.590879 -0.590879 -0.80676 119.315898 135.507034" },
  { char: "h", matrix: "-0.833486 0.55254 -0.55254 -0.833486 116.440514 137.511469" },
  { char: "e", matrix: "-0.877496 0.479583 -0.479583 -0.877496 110.968729 140.812237" },
  { char: "y", matrix: "-0.914025 0.405659 -0.405659 -0.914025 105.424411 143.551843" },
];

function isTouchDevice() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

type ContactIntouchProps = {
  href?: string;
  label?: string;
  videoSrc?: string;
};

export default function ContactIntouch({
  href = "/contacts",
  label = "Get in touch",
  videoSrc = "/assets/contact-emoji.mp4",
}: ContactIntouchProps) {
  const pathname = usePathname();
  const { navigate, isTransitioning } = usePageTransition();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const mediaWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hidden =
    pathname === "/contacts" || pathname === "/contacts-glass";

  const onClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (isTransitioning()) return;
    navigate({ href });
  };

  useEffect(() => {
    if (hidden) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const play = video.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {});
    }
  }, [hidden, videoSrc]);

  useEffect(() => {
    if (hidden) return;
    const root = rootRef.current;
    const mediaWrap = mediaWrapRef.current;
    if (!root || !mediaWrap) return;
    if (window.matchMedia("(max-width: 1199px)").matches) return;

    const enterTween = gsap.fromTo(
      root,
      { scale: 0 },
      { scale: 1, duration: 2, ease: "expo.out", delay: 0.15 },
    );

    if (isTouchDevice()) {
      return () => {
        enterTween.kill();
      };
    }

    let box = root.getBoundingClientRect();
    const bodyXDelta = 0.08;
    const bodyYDelta = 0.08;
    const tiltMax = 10;

    const onEnter = () => {
      box = root.getBoundingClientRect();
    };

    const onMove = (event: MouseEvent) => {
      const offsetX = event.clientX - box.left - box.width / 2;
      const offsetY = event.clientY - box.top - box.height / 2;
      const nx = offsetX / (box.width / 2);
      const ny = offsetY / (box.height / 2);

      gsap.to(mediaWrap, {
        x: offsetX * bodyXDelta,
        y: offsetY * bodyYDelta,
        rotateY: nx * tiltMax,
        rotateX: -ny * tiltMax,
        duration: 0.3,
        ease: "power1.out",
        overwrite: true,
      });
    };

    const onLeave = () => {
      gsap.to(mediaWrap, {
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 2,
        ease: "elastic.out(1, 0.25)",
        overwrite: true,
      });
    };

    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);

    return () => {
      enterTween.kill();
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(mediaWrap);
      gsap.set(mediaWrap, { clearProps: "transform" });
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <a
      ref={rootRef}
      className={styles.intouch}
      href={href}
      aria-label={label}
      tabIndex={-1}
      onClick={onClick}
    >
      <div className={styles.outline} aria-hidden="true">
        <svg
          className={styles.outlineSvg}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 150 150"
        >
          <circle
            className={styles.ring}
            cx="75"
            cy="75"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={RING_DASH.join(" ")}
            strokeDashoffset={0}
          />
          <g
            fill="currentColor"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="10.31"
            letterSpacing="0em"
          >
            {LETTERS.map((item, index) => (
              <text
                key={`${item.char}-${index}`}
                xmlSpace="preserve"
                style={{ whiteSpace: "pre" }}
                transform={`matrix(${item.matrix})`}
              >
                <tspan x="0" y="9.51">
                  {item.char}
                </tspan>
              </text>
            ))}
          </g>
        </svg>
      </div>

      <div ref={mediaWrapRef} className={styles.mediaWrap}>
        <div className={styles.stage}>
          <video
            ref={videoRef}
            className={styles.video}
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            controls={false}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
    </a>
  );
}
