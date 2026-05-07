import type { Subscription } from "@/lib/api";

type SubscriptionFilterProps = {
  subs: Subscription[];
  value: string;
  onChange: (value: string) => void;
};

export function SubscriptionFilter({ subs, value, onChange }: SubscriptionFilterProps) {
  return (
    <select className="mq-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All subscriptions</option>
      {subs.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
