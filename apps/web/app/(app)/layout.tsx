import type { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <main style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ borderRight: "1px solid #242b38", padding: 16 }}>
        <h2>Houseplan</h2>
        <p>App shell placeholder</p>
      </aside>
      <section style={{ padding: 24 }}>{children}</section>
    </main>
  );
}
