export function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-blush/60 px-4 py-3 text-sm font-bold">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading({ text = "Loading…" }) {
  return <p className="animate-pulse py-8 text-center font-bold text-deep/60">🫧 {text}</p>;
}

export function Empty({ children }) {
  return <p className="rounded-2xl bg-sky/40 px-4 py-6 text-center text-sm font-semibold text-deep/70">{children}</p>;
}

export function PageHeader({ title, subtitle }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 font-semibold text-deep/70">{subtitle}</p>}
    </header>
  );
}
