
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  due: { label: "Thẻ đến hạn", color: "var(--chart-1)" },
} satisfies ChartConfig;

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayLabel(day: string, index: number) {
  if (index === 0) return "Hôm nay";
  if (index === 1) return "Mai";
  const [y, m, d] = day.split("-").map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${m}`;
}

export function ForecastChart({ data }: { data: { day: string; due: number }[] }) {
  const rows = data.map((row, index) => ({ ...row, label: dayLabel(row.day, index) }));

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={rows} margin={{ top: 20, left: 0, right: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={11} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} />} />
        <Bar dataKey="due" fill="var(--color-due)" radius={6} maxBarSize={48}>
          <LabelList dataKey="due" position="top" className="fill-foreground" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
