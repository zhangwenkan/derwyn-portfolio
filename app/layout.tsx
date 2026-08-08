import type { Metadata } from "next";
import ContactIntouch from "@/components/ContactIntouch/ContactIntouch";
import PageTransition from "@/components/PageTransition/PageTransition";
import WelcomeIntro from "@/components/WelcomeIntro/WelcomeIntro";
import "./globals.css";

export const metadata: Metadata = {
  title: "Derwyn Portfolio",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <PageTransition overlay={<ContactIntouch href="/contacts" />}>
          {children}
        </PageTransition>
        <WelcomeIntro />
      </body>
    </html>
  );
}
