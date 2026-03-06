import type { ReactNode } from "react";

type HouseLayoutProps = {
  children: ReactNode;
  params: {
    houseId: string;
  };
};

export default function HouseLayout({ children, params }: HouseLayoutProps) {
  return (
    <section>
      <h2>House {params.houseId}</h2>
      {children}
    </section>
  );
}
