import type { ReactNode } from "react";
import { AmbientBackground, StatusPill } from "@/components/ui/AmbientBackground";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      <AmbientBackground />
      <main
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        {children}
      </main>
      <StatusPill />
    </>
  );
}

