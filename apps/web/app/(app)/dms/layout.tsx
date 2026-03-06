import type { ReactNode } from "react";

type DmsLayoutProps = {
  children: ReactNode;
};

export default function DmsLayout({ children }: DmsLayoutProps) {
  return (
    <section>
      <h2>DMs</h2>
      {children}
    </section>
  );
}
