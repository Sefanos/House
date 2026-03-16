"use client";

import { formatDebugErrorDetails, normalizeClientErrorMessage } from "@/lib/errors";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const message = normalizeClientErrorMessage(error, "Unexpected global error.", "runtime");
  const debugDetails = formatDebugErrorDetails(error);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-4 px-6 py-10">
          <h1 className="text-2xl font-semibold">Application error</h1>
          <p className="text-sm text-slate-300">{message}</p>
          {error.digest ? <p className="text-xs text-slate-500">Digest: {error.digest}</p> : null}

          {process.env.NODE_ENV !== "production" ? (
            <details className="w-full rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <summary className="cursor-pointer text-sm text-slate-300">Technical details</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">{debugDetails}</pre>
            </details>
          ) : null}

          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
