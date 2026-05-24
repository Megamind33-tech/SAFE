export default function BottomScrollSpacer({ height = 180 }) {
  return (
    <div
      aria-hidden="true"
      className="bottom-scroll-spacer"
      style={{ height: `${height}px` }}
    />
  );
}
