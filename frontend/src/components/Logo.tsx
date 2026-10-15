// The brand glyph (dark rounded square with the orange share arrow).
// /img/logo.png can be replaced from Admin > Configuration > General.
const Logo = ({ height, width }: { height: number; width: number }) => {
  return (
    <img
      src="/img/logo.png"
      alt=""
      height={height}
      width={width}
      style={{ display: "block", borderRadius: Math.round(width * 0.24) }}
    />
  );
};
export default Logo;
