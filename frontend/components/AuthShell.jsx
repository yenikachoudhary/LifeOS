import { Flower, Sparkle } from "./Decor";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-peri p-4">
      <Flower className="absolute -left-10 top-10 h-40 w-40 animate-float opacity-90" />
      <Flower className="absolute -right-8 bottom-10 h-48 w-48 animate-float" petal="#E3FC87" center="#FFB2F7" />
      <Sparkle className="absolute right-1/4 top-16 h-8 w-8" />
      <div className="card relative w-full max-w-md">
        <p className="font-display text-lg font-black text-lav">LifeOS · Plan less. Do more.</p>
        <h1 className="text-3xl">{title}</h1>
        <p className="mb-5 font-semibold text-deep/70">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
