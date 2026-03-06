type AvatarProps = {
  alt: string;
  src?: string | null;
  size?: number;
};

export function Avatar({ alt, src, size = 36 }: AvatarProps) {
  return (
    <img
      src={src ?? "https://placehold.co/64x64?text=HP"}
      alt={alt}
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  );
}
