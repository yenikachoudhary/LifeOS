export function Flower({ className = "", petal = "#FFB2F7", center = "#E3FC87" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="24" cy="12" rx="7" ry="11" fill={petal} transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="6" fill={center} />
    </svg>
  );
}

export function Sparkle({ className = "", color = "#E3FC87" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill={color} />
    </svg>
  );
}
