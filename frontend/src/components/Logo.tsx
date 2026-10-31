// The UCA Share glyph in Nocturne: a dark tile, a blurple tray and the arrow leaving it, with a soft glow.
// Inline SVG so it is always sharp and matches the theme (the PNG in /img stays for icons and emails).
const Logo = ({ height, width }: { height: number; width: number }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: "block", flex: "none", filter: "drop-shadow(0 0 10px rgba(145,132,217,.35))" }}
    >
      <rect x="1" y="1" width="62" height="62" rx="14" fill="#1e2030" stroke="#9184d9" strokeOpacity=".55" strokeWidth="2" />
      <path d="M25 27h-4a4 4 0 0 0-4 4v13a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V31a4 4 0 0 0-4-4h-4" fill="none" stroke="#9184d9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 37V14M24 21.5l8-8 8 8" fill="none" stroke="#d2cefd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
export default Logo;
