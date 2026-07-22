import FlowGradient from "@/components/FlowGradient/FlowGradient";
import ContactPopin from "@/components/ContactPopin/ContactPopin";
import styles from "./contacts.module.css";

export default function ContactsPage() {
  return (
    <main className={styles.page}>
      <FlowGradient />
      <ContactPopin />
    </main>
  );
}
