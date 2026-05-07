import type { OrgUser } from "@/lib/api";

type LeadSelectorProps = {
  users: OrgUser[];
  value: string;
  includeUnassigned?: boolean;
  onChange: (value: string) => void;
};

export function LeadSelector({ users, value, includeUnassigned = true, onChange }: LeadSelectorProps) {
  return (
    <select className="mq-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {includeUnassigned ? <option value="">Unassigned</option> : null}
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
