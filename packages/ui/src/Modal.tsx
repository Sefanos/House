import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
};

export function Modal({ open, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "grid",
        placeItems: "center"
      }}
    >
      <div style={{ minWidth: 320, background: "#141a22", borderRadius: 12, padding: 16 }}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
