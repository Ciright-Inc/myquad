type PhaseFilterProps = {
  phases: string[];
  value: string;
  onChange: (value: string) => void;
};

export function PhaseFilter({ phases, value, onChange }: PhaseFilterProps) {
  return (
    <select className="mq-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All phases</option>
      {phases.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
