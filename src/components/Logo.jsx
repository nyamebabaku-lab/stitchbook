/** StitchBook app mark: a white S on black, a gold needle and thread stitched through it. */
export default function Logo({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0b0b0b" />
      <text x="30" y="47" textAnchor="middle" fontFamily="'Plus Jakarta Sans','Segoe UI',Arial,sans-serif" fontWeight="800" fontSize="42" fill="#fff">S</text>
      <path d="M49 9 L20 57" stroke="#e9c46a" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="47.6" cy="11.4" rx="1" ry="2.6" transform="rotate(31 47.6 11.4)" fill="#0b0b0b" />
      <path d="M9 50 C20 44 28 53 36 48 C41 45 41 40 37.5 40.5 C34 41 36 48 43 49 C49 50 53 47 56 47" fill="none" stroke="#c99227" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Full wordmark: "Stitch | Book" with a needle between the words and a gold thread underneath. `light` = for dark backgrounds. */
export function Wordmark({ className, light }) {
  const ink = light ? '#ffffff' : '#0b0b0b';
  const t = { fontFamily: "'Plus Jakarta Sans','Segoe UI',Arial,sans-serif", fontWeight: 800 };
  return (
    <svg viewBox="40 0 660 260" className={className} role="img" aria-label="StitchBook Pro">
      <defs><linearGradient id="sbgd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b8862b" /><stop offset="1" stopColor="#e9c46a" /></linearGradient></defs>
      <text x="352" y="150" textAnchor="end" style={t} fontSize="96" letterSpacing="-3" fill={ink}>Stitch</text>
      <text x="398" y="150" textAnchor="start" style={t} fontSize="96" letterSpacing="-3" fill={ink}>Book</text>
      <path d="M60 196 C150 176 250 206 330 196 C356 192 372 180 370 168 C368 156 352 158 352 170 C352 186 380 200 420 200 C500 200 580 182 664 190" fill="none" stroke="url(#sbgd)" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M430 22 L318 244" stroke={ink} strokeWidth="8" strokeLinecap="round" />
      <path d="M430 22 L421 40" stroke={ink} strokeWidth="15" strokeLinecap="round" />
      <ellipse cx="427.5" cy="28" rx="2.4" ry="7" transform="rotate(27 427.5 28)" fill={light ? '#0b0b0b' : '#fff'} />
      <text x="664" y="240" textAnchor="end" style={t} fontSize="34" letterSpacing="10" fill="#c99227">PRO</text>
    </svg>
  );
}
