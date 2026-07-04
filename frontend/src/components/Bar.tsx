type Props = {
  label: string;
  value: number;
  max: number;
  display: string;
};

export function Bar({ label, value, max, display }: Props) {
  const width = Math.max(4, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div className="grid grid-cols-[minmax(120px,220px)_1fr_90px] items-center gap-3 text-sm">
      <span className="truncate text-graphite" title={label}>{label}</span>
      <div className="h-2 rounded-full bg-[#E7ECEF]">
        <div className="h-2 rounded-full bg-teal" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-medium text-ink">{display}</span>
    </div>
  );
}
