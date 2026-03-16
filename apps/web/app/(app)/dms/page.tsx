export default function DmsPage() {
  return (
    <section className="grid h-[calc(100vh-2rem)] place-items-center rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.96))] p-6">
      <div className="max-w-xl rounded-[28px] border border-slate-800 bg-slate-950/70 p-8 text-center shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Direct Messages</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-100">Pick someone and start talking</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Open a conversation from the left sidebar. You can send text, quick emojis, and GIF links from the new composer.
        </p>
      </div>
    </section>
  );
}
