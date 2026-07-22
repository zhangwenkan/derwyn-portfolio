"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { usePageTransition } from "@/components/PageTransition/PageTransition";
import styles from "./ContactPopin.module.css";

const TraceCardCanvas = dynamic(() => import("./TraceCardCanvas"), {
  ssr: false,
});

type ContactPopinProps = {
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

export default function ContactPopin({
  email = "benjamin@benrbnt.com",
  socials = DEFAULT_SOCIALS,
  locationLines = DEFAULT_LOCATION,
}: ContactPopinProps) {
  const { navigate, isTransitioning } = usePageTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const closingRef = useRef(false);
  const enterTlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const close = closeRef.current;
    if (!panel || !close) return;

    const sectionChildren = sectionRefs.current
      .filter(Boolean)
      .flatMap((section) => Array.from(section!.children));

    gsap.set(panel, { opacity: 0, y: 50 });
    gsap.set(sectionChildren, { opacity: 0, y: 20 });
    gsap.set(close, { opacity: 0 });

    const tl = gsap.timeline();
    enterTlRef.current = tl;
    tl.to(panel, { opacity: 1, duration: 0.3, ease: "none" }, 0);
    tl.to(panel, { y: 0, duration: 0.8, ease: "expo.out" }, 0);
    tl.to(
      sectionChildren,
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.08,
      },
      0.1,
    );
    tl.to(close, { opacity: 1, duration: 0.3, ease: "none" }, 0.4);

    return () => {
      tl.kill();
    };
  }, []);

  const closeAndHome = () => {
    if (closingRef.current || isTransitioning()) return;
    closingRef.current = true;
    enterTlRef.current?.kill();

    const panel = panelRef.current;
    if (!panel) {
      navigate({ href: "/" });
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => navigate({ href: "/" }),
    });
    tl.to(panel, { opacity: 0, duration: 0.3, ease: "none" }, 0);
    tl.to(panel, { y: 50, duration: 0.3, ease: "sine.in" }, 0);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.page}>
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

      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Contact"
      >
        <TraceCardCanvas className={styles.stage}>
          <div className={styles.overlay}>
            <div className={styles.inner}>
              <section
                className={styles.section}
                ref={(el) => {
                  sectionRefs.current[0] = el;
                }}
              >
                <h2 className={styles.title}>Work with me</h2>
                <div className={styles.body}>
                  <a href={`mailto:${email}`}>{email}</a>
                </div>
              </section>

              <section
                className={styles.section}
                ref={(el) => {
                  sectionRefs.current[1] = el;
                }}
              >
                <h2 className={styles.title}>Socials</h2>
                <div className={styles.body}>
                  <ul className={styles.list}>
                    {socials.map((item) => (
                      <li key={item.href}>
                        <a href={item.href} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section
                className={styles.section}
                ref={(el) => {
                  sectionRefs.current[2] = el;
                }}
              >
                <h2 className={styles.title}>Location</h2>
                <div className={styles.body}>
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
                </div>
              </section>
            </div>
          </div>
        </TraceCardCanvas>
      </div>
    </div>
  );
}
