import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <main style={{ padding: 24, maxWidth: 560 }}>{children}</main>;
}
