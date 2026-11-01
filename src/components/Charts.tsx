import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" } };

export function SimpleBar({ data, dataKey, color = "var(--chart-1)", height = 220 }: { data: Record<string, unknown>[]; dataKey: string; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GroupedBar({ data, keys, height = 300 }: { data: Record<string, unknown>[]; keys: string[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        <Legend />
        {keys.map((k, i) => <Bar key={k} dataKey={k} fill={`var(--chart-${(i % 5) + 1})`} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
