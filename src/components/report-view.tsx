import { useRef, useState } from "react";
import type { ReportData } from "@/lib/report-analyzer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, AreaChart, Area,
} from "recharts";
import { TrendingUp, Database, Hash, Layers, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#14b8a6"];

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function ReportView({ data, fileName }: { data: ReportData; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save(`${fileName.replace(/\.[^.]+$/, "")}-relatorio.pdf`);
    } finally {
      setExporting(false);
    }
  };

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
    { label: "Linhas", value: fmt(data.rowCount), icon: Database, color: "from-indigo-500/20 to-indigo-500/5" },
    { label: "Colunas", value: fmt(data.columnCount), icon: Layers, color: "from-violet-500/20 to-violet-500/5" },
    { label: "Numéricas", value: fmt(data.numericStats.length), icon: Hash, color: "from-cyan-500/20 to-cyan-500/5" },
    { label: "Categóricas", value: fmt(data.categoricalTop.length), icon: TrendingUp, color: "from-amber-500/20 to-amber-500/5" },
  ];

  const topNumeric = [...data.numericStats].sort((a, b) => b.sum - a.sum).slice(0, 6);
  const firstCat = data.categoricalTop[0];
  const areaData = topNumeric.map((n) => ({ name: n.column, min: n.min, média: n.mean, máx: n.max }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportPdf} disabled={exporting} className="bg-gradient-primary shadow-elegant">
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar PDF
        </Button>
      </div>

      <div ref={containerRef} className="space-y-6 bg-background p-2">
        <div>
          <h3 className="font-semibold mb-2 text-lg">Resumo executivo</h3>
          <p className="text-sm text-muted-foreground">{data.summary}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className={`p-4 bg-gradient-to-br ${k.color} border-border/50`}>
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topNumeric.map((n) => ({ name: n.column, total: n.sum }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  />
                  <Bar dataKey="total" fill="url(#barGrad)" radius={[8, 8, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {topNumeric.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Faixa de valores (mín / média / máx)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaMean" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="máx" stroke="#06b6d4" strokeWidth={2} fill="url(#areaMax)" animationDuration={1400} />
                  <Area type="monotone" dataKey="média" stroke="#8b5cf6" strokeWidth={2} fill="url(#areaMean)" animationDuration={1400} />
                  <Area type="monotone" dataKey="min" stroke="#6366f1" strokeWidth={2} fill="transparent" animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {firstCat && (
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Distribuição de "{firstCat.column}"</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={firstCat.values}
                    dataKey="count"
                    nameKey="name"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={3}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {firstCat.values.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
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
    </div>
  );
}
