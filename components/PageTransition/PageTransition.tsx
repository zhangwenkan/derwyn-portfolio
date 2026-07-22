"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import styles from "./PageTransition.module.css";

type NavigateOptions = {
  href: string;
};

type PageTransitionContextValue = {
  navigate: (options: NavigateOptions) => void;
  isTransitioning: () => boolean;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(
  null,
);

export function usePageTransition() {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used within PageTransition");
  }
  return ctx;
}

// Approx. Cuberto leave ease cubic-bezier(.76, 0, .2, 1)
const LEAVE_EASE = "power3.inOut";

type PageTransitionProps = {
  children: ReactNode;
  overlay?: ReactNode;
};

export default function PageTransition({
  children,
  overlay,
}: PageTransitionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const loaderRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const firstMountRef = useRef(true);

  const showLoader = useCallback(() => {
    const loader = loaderRef.current;
    const backdrop = backdropRef.current;
    const fill = fillRef.current;
    if (!loader || !backdrop || !fill) return Promise.resolve();

    const tl = gsap.timeline();
    tl.set(loader, { display: "block", pointerEvents: "auto" });
    tl.set(fill, { opacity: 1, scaleY: 0, transformOrigin: "bottom center" });
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.7 }, 0);
    tl.fromTo(
      fill,
      { scaleY: 0 },
      {
        scaleY: 1,
        transformOrigin: "bottom center",
        duration: 0.7,
        ease: "power4.inOut",
      },
      0,
    );
    return tl.then();
  }, []);

  const hideLoader = useCallback(() => {
    const loader = loaderRef.current;
    const backdrop = backdropRef.current;
    const fill = fillRef.current;
    if (!loader || !backdrop || !fill) return Promise.resolve();

    const tl = gsap.timeline();
    tl.set(loader, { pointerEvents: "none" }, 0);
    tl.set(backdrop, { opacity: 0 }, 0);
    tl.to(fill, { opacity: 0, duration: 0.4 }, 0);
    tl.set(loader, { display: "none" });
    return tl.then();
  }, []);

  const leaveView = useCallback(() => {
    const view = viewRef.current;
    if (!view) return Promise.resolve();

    const y = window.innerWidth > window.innerHeight ? "-10vh" : "-5vh";

    return gsap
      .to(view, {
        y,
        duration: 0.9,
        ease: LEAVE_EASE,
      })
      .then();
  }, []);

  const resetView = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    gsap.set(view, { y: 0, clearProps: "transform" });
  }, []);

  const navigate = useCallback(
    ({ href }: NavigateOptions) => {
      if (runningRef.current) return;

      const url = new URL(href, window.location.origin);
      const nextPath = url.pathname;
      if (nextPath === window.location.pathname && !url.hash) return;

      if (nextPath === window.location.pathname && url.hash) {
        window.location.hash = url.hash;
        return;
      }

      runningRef.current = true;
      pendingHrefRef.current = nextPath;

      // Parallel leave: white curtain + current view drifts up (Cuberto ajax leave).
      Promise.all([showLoader(), leaveView()])
        .then(() => {
          router.push(nextPath);
        })
        .catch(() => {
          runningRef.current = false;
          pendingHrefRef.current = null;
          resetView();
          void hideLoader();
        });
    },
    [hideLoader, leaveView, resetView, router, showLoader],
  );

  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      gsap.set(loaderRef.current, { display: "none" });
      return;
    }

    if (!pendingHrefRef.current) return;
    if (pathname !== pendingHrefRef.current) return;

    pendingHrefRef.current = null;
    resetView();
    window.scrollTo(0, 0);

    hideLoader().finally(() => {
      runningRef.current = false;
    });
  }, [hideLoader, pathname, resetView]);

  const value = useMemo<PageTransitionContextValue>(
    () => ({
      navigate,
      isTransitioning: () => runningRef.current,
    }),
    [navigate],
  );

  return (
    <PageTransitionContext.Provider value={value}>
      <div ref={loaderRef} className={styles.loader} aria-hidden="true">
        <div ref={backdropRef} className={styles.backdrop} />
        <div ref={fillRef} className={styles.fill} />
      </div>
      <div ref={viewRef} className={styles.view} id="view-main">
        {children}
      </div>
      {overlay}
    </PageTransitionContext.Provider>
  );
}
