import Footprint from "@/components/Footprint/Footprint";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-label="Portfolio introduction">
        <h1>Derwyn Portfolio</h1>
      </section>
      <Footprint />
    </main>
  );
}
