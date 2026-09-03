// The real Stretchy S-mark (organic blob shape, from the brand asset), recolourable
// via currentColor using a CSS mask — matches the technique the design file itself uses.
// Use: <SMark size={180} className="text-purple" />
export default function SMark({
  size = 180,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const height = Math.round(size * (2084 / 1787));
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/images/logo/stretchy-s.png')",
        maskImage: "url('/images/logo/stretchy-s.png')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
