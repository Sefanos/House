"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ThemeRuntime } from "@/components/theme/ThemeRuntime";
import { createQueryClient } from "@/lib/queryClient";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRuntime />
      {children}
    </QueryClientProvider>
  );
}
