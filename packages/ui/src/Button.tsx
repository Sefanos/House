import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button(props: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        border: "1px solid #3a4457",
        borderRadius: 8,
        padding: "8px 12px",
        background: "#1f2633",
        color: "#f7f8fa",
        cursor: "pointer",
        ...(props.style ?? {})
      }}
    />
  );
}
