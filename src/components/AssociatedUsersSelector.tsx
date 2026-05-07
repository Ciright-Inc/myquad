import type { OrgUser } from "@/lib/api";

type AssociatedUsersSelectorProps = {
  users: OrgUser[];
  leadUserId: string | null;
  associatedUserIds: string[];
  value: string;
  onChange: (value: string) => void;
};

export function AssociatedUsersSelector({
  users,
  leadUserId,
  associatedUserIds,
  value,
  onChange,
}: AssociatedUsersSelectorProps) {
  return (
    <select className="mq-input mq-input-with-icon" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Associate user...</option>
      {users
        .filter((u) => u.id !== leadUserId && !associatedUserIds.includes(u.id))
        .map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
    </select>
  );
}
