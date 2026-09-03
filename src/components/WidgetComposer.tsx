export function WidgetComposer({
  title,
  span,
  onMove,
  onResize,
}: {
  title: string;
  span: number;
  onMove: (amount: number) => void;
  onResize: (span: number) => void;
}) {
  return (
    <div className="composer">
      <button className="secondary" onClick={() => onMove(-1)}>
        ← Earlier
      </button>
      <button className="secondary" onClick={() => onMove(1)}>
        Later →
      </button>
      <select
        aria-label={`Width for ${title}`}
        value={span}
        onChange={(event) => onResize(+event.target.value)}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <option key={index} value={index + 1}>
            {index + 1} columns
          </option>
        ))}
      </select>
    </div>
  );
}
