import type { ReactNode } from "react";
import { Header } from "@/components/header";

/** Every screen except the home page gets the app header. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
