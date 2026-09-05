"use client";

import dynamic from "next/dynamic";
import styles from "./Footprint.module.css";

const FootprintGlobe = dynamic(() => import("./FootprintGlobe"), { ssr: false });

export default function Footprint() {
  return (
    <section id="footprint" className={styles.section} aria-label="Interactive 3D globe">
      <FootprintGlobe />
    </section>
  );
}
