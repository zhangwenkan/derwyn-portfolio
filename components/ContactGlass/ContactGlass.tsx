"use client";

import { useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { usePageTransition } from "@/components/PageTransition/PageTransition";
import styles from "./ContactGlass.module.css";

const GlassHeroCanvas = dynamic(() => import("./GlassHeroCanvas"), {
  ssr: false,
});

type ContactGlassProps = {
  email?: string;
  socials?: { label: string; href: string }[];
  locationLines?: { primary: string; secondary?: string }[];
};

const DEFAULT_SOCIALS = [
  { label: "x/nebrob_", href: "https://x.com/nebrob_" },
  {
    label: "ig/benjamin_rbnt",
    href: "https://www.instagram.com/benjamin_rbnt",
  },
  {
    label: "in/benjaminrobinet",
    href: "https://linkedin.com/in/benjaminrobinet",
  },
];

const DEFAULT_LOCATION = [
  { primary: "France", secondary: "Paris" },
  { primary: "Worldwide" },
];

export default function ContactGlass({
  email = "benjamin@benrbnt.com",
  socials = DEFAULT_SOCIALS,
  locationLines = DEFAULT_LOCATION,
}: ContactGlassProps) {
  const { navigate, isTransitioning } = usePageTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const close = closeRef.current;
    if (!root || !close) return;
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" });
    gsap.fromTo(
      close,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, delay: 0.15, ease: "none" },
    );
  }, []);

  const closeAndHome = () => {
    if (closingRef.current || isTransitioning()) return;
    closingRef.current = true;
    const root = rootRef.current;
    if (!root) {
      navigate({ href: "/" });
      return;
    }
    gsap.to(root, {
      opacity: 0,
      duration: 0.28,
      ease: "none",
      onComplete: () => navigate({ href: "/" }),
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L→R slots: each is Html-transform child of its glass pane (same pattern as /contacts)
  const paneContents: ReactNode[] = [
    <div key="work" className={styles.paneCard}>
      <div className={styles.eyebrow}>Work with me</div>
      <h1 className={styles.headline}>
        <a href={`mailto:${email}`}>{email}</a>
      </h1>
    </div>,
    <div key="socials" className={styles.paneCard}>
      <div className={styles.blockTitle}>Socials</div>
      <ul className={styles.list}>
        {socials.map((item) => (
          <li key={item.href}>
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>,
    <div key="location" className={styles.paneCard}>
      <div className={styles.blockTitle}>Location</div>
      <address className={styles.address}>
        {locationLines.map((line) => (
          <p key={line.primary + (line.secondary ?? "")}>
            {line.primary}
            {line.secondary ? (
              <>
                <br />
                <span className={styles.muted}>{line.secondary}</span>
              </>
            ) : null}
          </p>
        ))}
      </address>
    </div>,
  ];

  return (
    <div ref={rootRef} className={styles.page}>
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close"
        onClick={closeAndHome}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect
            width="16.0011"
            height="3"
            transform="matrix(0.698641 0.715472 -0.698641 0.715472 2.09595 0)"
          />
          <rect
            width="16.0011"
            height="3"
            transform="matrix(-0.698641 0.715472 -0.698641 -0.715472 13.2749 2.14642)"
          />
        </svg>
      </button>

      <div className={styles.stage}>
        <GlassHeroCanvas className={styles.canvas} paneContents={paneContents} />
      </div>
    </div>
  );
}
