import type { ReportData } from "@/lib/report-analyzer";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Database, Hash, Layers } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#6366f1"];

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function ReportView({ data, fileName }: { data: ReportData; fileName: string }) {
  if (data.kind === "unsupported") {
    return (
      <div className="space-y-3">
        {data.insights.map((i, idx) => (
          <Card key={idx} className="p-4 text-sm">{i}</Card>
        ))}
      </div>
    );
  }

  const kpis = [
    { label: "Linhas", value: fmt(data.rowCount), icon: Database },
    { label: "Colunas", value: fmt(data.columnCount), icon: Layers },
    { label: "Numéricas", value: fmt(data.numericStats.length), icon: Hash },
    { label: "Categóricas", value: fmt(data.categoricalTop.length), icon: TrendingUp },
  ];

  const topNumeric = [...data.numericStats].sort((a, b) => b.sum - a.sum).slice(0, 6);
  const firstCat = data.categoricalTop[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Resumo executivo</h3>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </div>
            <div className="text-2xl font-bold mt-1">{k.value}</div>
          </Card>
        ))}
      </div>

      {data.insights.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">💡 Insights</div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {data.insights.map((i, idx) => <li key={idx}>• {i}</li>)}
          </ul>
        </Card>
      )}

      {topNumeric.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Totais por coluna numérica</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topNumeric.map((n) => ({ name: n.column, total: n.sum }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {firstCat && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Distribuição de "{firstCat.column}"</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={firstCat.values} dataKey="count" nameKey="name" outerRadius={90} label>
                  {firstCat.values.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {data.numericStats.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <div className="text-sm font-semibold mb-3">Estatísticas numéricas</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Coluna</th>
                <th className="text-right">Mín</th>
                <th className="text-right">Média</th>
                <th className="text-right">Máx</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.numericStats.map((s) => (
                <tr key={s.column} className="border-b last:border-0">
                  <td className="py-2 font-medium">{s.column}</td>
                  <td className="text-right">{fmt(s.min)}</td>
                  <td className="text-right">{fmt(s.mean)}</td>
                  <td className="text-right">{fmt(s.max)}</td>
                  <td className="text-right font-semibold">{fmt(s.sum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data.sampleRows.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <div className="text-sm font-semibold mb-3">Amostra de dados ({fileName})</div>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>{data.columns.map((c) => <th key={c} className="text-left py-2 px-2">{c}</th>)}</tr>
            </thead>
            <tbody>
              {data.sampleRows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {data.columns.map((c) => (
                    <td key={c} className="py-2 px-2">{String((r as any)[c] ?? "—").slice(0, 40)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
