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
import autoTable from "jspdf-autotable";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#14b8a6"];
const HEX_RGB = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function ReportView({ data, fileName }: { data: ReportData; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 14;
      const baseName = fileName.replace(/\.[^.]+$/, "");
      const today = new Date().toLocaleDateString("pt-BR");

      const drawHeader = (pageNum: number) => {
        pdf.setFillColor(...HEX_RGB("#6366f1"));
        pdf.rect(0, 0, W, 22, "F");
        pdf.setFillColor(...HEX_RGB("#8b5cf6"));
        pdf.rect(0, 18, W, 4, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("RelatAÍ", M, 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Relatório · ${today}`, W - M, 13, { align: "right" });
        pdf.setTextColor(20, 20, 20);
        // footer
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`${baseName} · página ${pageNum}`, W / 2, H - 6, { align: "center" });
        pdf.setTextColor(20, 20, 20);
      };

      let page = 1;
      drawHeader(page);
      const newPage = () => {
        pdf.addPage();
        page++;
        drawHeader(page);
        return 32;
      };
      const ensure = (y: number, need: number) => (y + need > H - 14 ? newPage() : y);

      let y = 32;

      // Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Relatório executivo", M, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(110, 110, 110);
      pdf.text(`Arquivo analisado: ${fileName}`, M, y);
      y += 8;
      pdf.setTextColor(20, 20, 20);

      // Summary box
      pdf.setFillColor(245, 244, 255);
      pdf.setDrawColor(...HEX_RGB("#6366f1"));
      const summaryLines = pdf.splitTextToSize(data.summary || "—", W - M * 2 - 8);
      const sumH = summaryLines.length * 5 + 8;
      pdf.roundedRect(M, y, W - M * 2, sumH, 2, 2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Resumo", M + 4, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(summaryLines, M + 4, y + 12);
      y += sumH + 8;

      if (data.kind === "tabular") {
        // KPIs
        const kpis = [
          { label: "Linhas", value: fmt(data.rowCount), color: "#6366f1" },
          { label: "Colunas", value: fmt(data.columnCount), color: "#8b5cf6" },
          { label: "Numéricas", value: fmt(data.numericStats.length), color: "#06b6d4" },
          { label: "Categóricas", value: fmt(data.categoricalTop.length), color: "#f59e0b" },
        ];
        const kpiW = (W - M * 2 - 9) / 4;
        const kpiH = 22;
        y = ensure(y, kpiH);
        kpis.forEach((k, i) => {
          const x = M + i * (kpiW + 3);
          pdf.setFillColor(250, 250, 252);
          pdf.setDrawColor(230, 230, 240);
          pdf.roundedRect(x, y, kpiW, kpiH, 2, 2, "FD");
          pdf.setFillColor(...HEX_RGB(k.color));
          pdf.rect(x, y, 2, kpiH, "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 120);
          pdf.text(k.label.toUpperCase(), x + 5, y + 7);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(20, 20, 20);
          pdf.text(k.value, x + 5, y + 16);
        });
        y += kpiH + 10;
      }

      // Insights
      if (data.insights.length > 0) {
        y = ensure(y, 14);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("Insights principais", M, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        data.insights.forEach((ins) => {
          const lines = pdf.splitTextToSize(`• ${ins}`, W - M * 2);
          y = ensure(y, lines.length * 5 + 2);
          pdf.text(lines, M, y);
          y += lines.length * 5 + 1;
        });
        y += 4;
      }

      if (data.kind === "tabular") {
        // Bar chart: totals per numeric column
        const topNumeric = [...data.numericStats].sort((a, b) => b.sum - a.sum).slice(0, 6);
        if (topNumeric.length > 0) {
          const need = 70;
          y = ensure(y, need);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text("Totais por coluna numérica", M, y);
          y += 4;
          const chartX = M, chartY = y, chartW = W - M * 2, chartH = 55;
          pdf.setDrawColor(230, 230, 240);
          pdf.setFillColor(252, 252, 254);
          pdf.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "FD");
          const maxV = Math.max(...topNumeric.map((n) => n.sum));
          const barArea = chartW - 20;
          const barH = (chartH - 18) / topNumeric.length - 2;
          topNumeric.forEach((n, i) => {
            const by = chartY + 6 + i * (barH + 2);
            const bw = (n.sum / maxV) * (barArea - 60);
            pdf.setFillColor(...HEX_RGB(COLORS[i % COLORS.length]));
            pdf.roundedRect(chartX + 60, by, Math.max(bw, 0.5), barH, 1, 1, "F");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            const label = n.column.length > 18 ? n.column.slice(0, 17) + "…" : n.column;
            pdf.text(label, chartX + 56, by + barH / 2 + 2, { align: "right" });
            pdf.setFont("helvetica", "bold");
            pdf.text(fmt(n.sum), chartX + 62 + bw + 2, by + barH / 2 + 2);
            pdf.setTextColor(20, 20, 20);
          });
          y += chartH + 8;
        }

        // Pie chart: first categorical distribution
        const firstCat = data.categoricalTop[0];
        if (firstCat) {
          const need = 80;
          y = ensure(y, need);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text(`Distribuição de "${firstCat.column}"`, M, y);
          y += 4;
          const boxX = M, boxY = y, boxW = W - M * 2, boxH = 65;
          pdf.setDrawColor(230, 230, 240);
          pdf.setFillColor(252, 252, 254);
          pdf.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

          const cx = boxX + 32;
          const cy = boxY + boxH / 2;
          const r = 24;
          const total = firstCat.values.reduce((a, b) => a + b.count, 0);
          let start = -Math.PI / 2;
          firstCat.values.forEach((v, i) => {
            const angle = (v.count / total) * Math.PI * 2;
            const end = start + angle;
            // approximate slice with triangles
            const steps = Math.max(6, Math.ceil(angle * 12));
            pdf.setFillColor(...HEX_RGB(COLORS[i % COLORS.length]));
            for (let s = 0; s < steps; s++) {
              const a1 = start + (angle * s) / steps;
              const a2 = start + (angle * (s + 1)) / steps;
              pdf.triangle(
                cx, cy,
                cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
                cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
                "F",
              );
            }
            start = end;
          });
          // donut hole
          pdf.setFillColor(252, 252, 254);
          pdf.circle(cx, cy, r * 0.55, "F");

          // legend
          const lx = boxX + 70;
          let ly = boxY + 10;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          firstCat.values.forEach((v, i) => {
            pdf.setFillColor(...HEX_RGB(COLORS[i % COLORS.length]));
            pdf.roundedRect(lx, ly - 3, 4, 4, 0.5, 0.5, "F");
            pdf.setTextColor(40, 40, 40);
            const pct = ((v.count / total) * 100).toFixed(1);
            const label = v.name.length > 28 ? v.name.slice(0, 27) + "…" : v.name;
            pdf.text(`${label}  —  ${fmt(v.count)} (${pct}%)`, lx + 7, ly);
            ly += 6;
          });
          y += boxH + 8;
        }

        // Numeric stats table
        if (data.numericStats.length > 0) {
          y = ensure(y, 20);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text("Estatísticas numéricas", M, y);
          y += 3;
          autoTable(pdf, {
            startY: y + 2,
            margin: { left: M, right: M },
            head: [["Coluna", "Mín", "Média", "Máx", "Total"]],
            body: data.numericStats.map((s) => [s.column, fmt(s.min), fmt(s.mean), fmt(s.max), fmt(s.sum)]),
            styles: { fontSize: 9, cellPadding: 2.5 },
            headStyles: { fillColor: HEX_RGB("#6366f1"), textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 252] },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } },
            didDrawPage: () => drawHeader(pdf.getNumberOfPages()),
          });
          y = (pdf as any).lastAutoTable.finalY + 8;
        }

        // Sample rows
        if (data.sampleRows.length > 0) {
          y = ensure(y, 20);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text("Amostra de dados", M, y);
          y += 3;
          const cols = data.columns.slice(0, 6);
          autoTable(pdf, {
            startY: y + 2,
            margin: { left: M, right: M },
            head: [cols],
            body: data.sampleRows.map((r) => cols.map((c) => String((r as any)[c] ?? "—").slice(0, 30))),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: HEX_RGB("#8b5cf6"), textColor: 255 },
            alternateRowStyles: { fillColor: [248, 248, 252] },
            didDrawPage: () => drawHeader(pdf.getNumberOfPages()),
          });
        }
      }

      pdf.save(`${baseName}-relatorio.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
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
