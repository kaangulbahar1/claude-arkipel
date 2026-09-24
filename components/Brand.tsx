import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Arkipel ana sayfa">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <ellipse cx="11" cy="15" rx="8" ry="6.5" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
        <ellipse cx="22" cy="7" rx="4" ry="3.2" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
        <ellipse cx="22" cy="22" rx="3" ry="2.5" fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
        <circle cx="11" cy="15" r="2.4" fill="var(--accent)" />
      </svg>
      Arkipel
    </Link>
  );
}
