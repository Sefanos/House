type BadgeProps = {
  label: string;
};

export function Badge({ label }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        border: "1px solid #3a4457",
        borderRadius: 9999,
        padding: "2px 8px",
        fontSize: 12
      }}
    >
      {label}
    </span>
  );
}
