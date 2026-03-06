import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps) {
  return (
    <input
      {...props}
      style={{
        border: "1px solid #3a4457",
        borderRadius: 8,
        padding: "8px 10px",
        background: "#121721",
        color: "#f7f8fa",
        ...(props.style ?? {})
      }}
    />
  );
}
