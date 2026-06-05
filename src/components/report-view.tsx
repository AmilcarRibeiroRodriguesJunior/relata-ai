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
      const M = 18;
      const baseName = fileName.replace(/\.[^.]+$/, "");
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const docId = `RA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      // Editorial palette — premium, restrained
      const INK: [number, number, number] = [11, 15, 26];
      const MUTED: [number, number, number] = [110, 116, 130];
      const HAIR: [number, number, number] = [220, 218, 210];
      const PAPER: [number, number, number] = [250, 248, 243];
      const ACCENT: [number, number, number] = [184, 146, 61];
      const CHART_SERIES: [number, number, number][] = [
        [11, 15, 26], [184, 146, 61], [70, 90, 120],
        [156, 70, 60], [90, 110, 90], [120, 80, 130], [60, 100, 110], [180, 120, 70],
      ];

      let page = 0;
      const drawChrome = (isCover = false) => {
        page++;
        if (isCover) return;
        pdf.setDrawColor(...HAIR);
        pdf.setLineWidth(0.2);
        pdf.line(M, 14, W - M, 14);
        pdf.setFont("times", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(...INK);
        pdf.text("RelataAI", M, 11);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...MUTED);
        pdf.text("Relatório executivo", M + 22, 11);
        pdf.text(dateStr, W - M, 11, { align: "right" });
        pdf.setDrawColor(...HAIR);
        pdf.line(M, H - 12, W - M, H - 12);
        pdf.setFontSize(8);
        pdf.setTextColor(...MUTED);
        pdf.text(docId, M, H - 7);
        pdf.text(baseName, W / 2, H - 7, { align: "center" });
        pdf.text(String(page - 1).padStart(2, "0"), W - M, H - 7, { align: "right" });
        pdf.setTextColor(...INK);
      };

      const newPage = () => { pdf.addPage(); drawChrome(false); return 26; };
      const ensure = (y: number, need: number) => (y + need > H - 18 ? newPage() : y);

      // ========== COVER ==========
      drawChrome(true);
      pdf.setFillColor(...PAPER);
      pdf.rect(0, 0, W, H, "F");
      pdf.setFillColor(...ACCENT);
      pdf.rect(0, 0, 6, H, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...ACCENT);
      pdf.text("RELATAAI  ·  INTELLIGENCE REPORT", M, 28);
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.4);
      pdf.line(M, 32, M + 30, 32);

      pdf.setFont("times", "normal");
      pdf.setTextColor(...INK);
      pdf.setFontSize(56);
      pdf.text("Relatório", M, 78);
      pdf.setFont("times", "italic");
      pdf.text("executivo.", M, 100);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(...MUTED);
      const subLines = pdf.splitTextToSize(
        data.summary || "Análise estruturada dos dados fornecidos, com indicadores-chave, distribuições e insights gerados automaticamente.",
        W - M * 2 - 20,
      );
      pdf.text(subLines.slice(0, 4), M, 118);

      const metaY = H - 50;
      pdf.setDrawColor(...HAIR);
      pdf.line(M, metaY - 8, W - M, metaY - 8);
      const metas = [
        ["PREPARADO PARA", baseName.slice(0, 30)],
        ["DATA", dateStr],
        ["DOCUMENTO", docId],
      ];
      const colW = (W - M * 2) / 3;
      metas.forEach(([k, v], i) => {
        const x = M + i * colW;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...MUTED);
        pdf.text(k, x, metaY);
        pdf.setFont("times", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(...INK);
        pdf.text(v, x, metaY + 7);
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      pdf.text("CONFIDENCIAL  ·  Gerado por RelataAI", M, H - 14);
      pdf.text("relataai.com", W - M, H - 14, { align: "right" });

      // ========== CONTENT ==========
      let y = newPage();

      const sectionHeader = (num: string, label: string, yPos: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...ACCENT);
        pdf.text(num, M, yPos);
        pdf.setFont("times", "normal");
        pdf.setFontSize(22);
        pdf.setTextColor(...INK);
        pdf.text(label, M, yPos + 9);
        pdf.setDrawColor(...INK);
        pdf.setLineWidth(0.3);
        pdf.line(M, yPos + 13, W - M, yPos + 13);
        return yPos + 20;
      };

      y = sectionHeader("01 — SÍNTESE", "Visão geral", y);

      pdf.setFont("times", "italic");
      pdf.setFontSize(14);
      pdf.setTextColor(...INK);
      const quoteLines = pdf.splitTextToSize(`"${data.summary || "—"}"`, W - M * 2 - 10);
      pdf.text(quoteLines, M + 4, y + 2);
      pdf.setDrawColor(...ACCENT);
      pdf.setLineWidth(1.2);
      pdf.line(M, y - 2, M, y + quoteLines.length * 6 + 2);
      y += quoteLines.length * 6 + 12;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...MUTED);
      pdf.text(`Fonte · ${fileName}`, M, y);
      y += 10;

      if (data.kind === "tabular") {
        const kpis = [
          { label: "LINHAS", value: fmt(data.rowCount) },
          { label: "COLUNAS", value: fmt(data.columnCount) },
          { label: "MÉTRICAS NUMÉRICAS", value: fmt(data.numericStats.length) },
          { label: "DIMENSÕES CATEGÓRICAS", value: fmt(data.categoricalTop.length) },
        ];
        y = ensure(y, 38);
        const kpiW = (W - M * 2) / 4;
        pdf.setDrawColor(...HAIR);
        pdf.setLineWidth(0.2);
        pdf.line(M, y, W - M, y);
        kpis.forEach((k, i) => {
          const x = M + i * kpiW;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          pdf.setTextColor(...MUTED);
          pdf.text(k.label, x, y + 7);
          pdf.setFont("times", "normal");
          pdf.setFontSize(30);
          pdf.setTextColor(...INK);
          pdf.text(k.value, x, y + 26);
          if (i > 0) {
            pdf.setDrawColor(...HAIR);
            pdf.line(x - 2, y + 4, x - 2, y + 30);
          }
        });
        pdf.setDrawColor(...HAIR);
        pdf.line(M, y + 32, W - M, y + 32);
        y += 42;
      }

      if (data.insights.length > 0) {
        y = ensure(y, 30);
        y = sectionHeader("02 — INSIGHTS", "Pontos-chave", y);
        data.insights.forEach((ins, i) => {
          const num = String(i + 1).padStart(2, "0");
          const lines = pdf.splitTextToSize(ins, W - M * 2 - 14);
          y = ensure(y, lines.length * 6 + 6);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(...ACCENT);
          pdf.text(num, M, y + 4);
          pdf.setFont("times", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(...INK);
          pdf.text(lines, M + 10, y + 4);
          y += lines.length * 6 + 5;
          pdf.setDrawColor(...HAIR);
          pdf.setLineWidth(0.15);
          pdf.line(M, y, W - M, y);
          y += 4;
        });
        y += 6;
      }

      if (data.kind === "tabular") {
        const topNumeric = [...data.numericStats].sort((a, b) => b.sum - a.sum).slice(0, 6);
        if (topNumeric.length > 0) {
          y = ensure(y, 115);
          y = sectionHeader("03 — DISTRIBUIÇÃO", "Totais por métrica", y);

          const chartX = M, chartY = y, chartW = W - M * 2, chartH = 80;
          const padL = 20, padR = 8, padT = 10, padB = 18;
          const plotX = chartX + padL, plotY = chartY + padT;
          const plotW = chartW - padL - padR, plotH = chartH - padT - padB;

          const maxV = Math.max(...topNumeric.map((n) => n.sum));
          pdf.setDrawColor(...HAIR);
          pdf.setLineWidth(0.15);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          for (let s = 0; s <= 4; s++) {
            const yy = plotY + plotH - (plotH * s) / 4;
            pdf.line(plotX, yy, plotX + plotW, yy);
            const v = (maxV * s) / 4;
            const lbl = v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : fmt(v);
            pdf.text(lbl, plotX - 2, yy + 1.5, { align: "right" });
          }
          const slot = plotW / topNumeric.length;
          const barW = slot * 0.55;
          topNumeric.forEach((n, i) => {
            const bh = (n.sum / maxV) * plotH;
            const bx = plotX + slot * i + (slot - barW) / 2;
            const by = plotY + plotH - bh;
            pdf.setFillColor(...INK);
            pdf.rect(bx, by, barW, bh, "F");
            pdf.setFillColor(...ACCENT);
            pdf.rect(bx, by, barW, Math.min(1.6, bh), "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(...INK);
            const vlbl = n.sum >= 1000 ? (n.sum / 1000).toFixed(1) + "k" : fmt(n.sum);
            pdf.text(vlbl, bx + barW / 2, by - 1.5, { align: "center" });
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.setTextColor(...MUTED);
            const lbl = n.column.length > 14 ? n.column.slice(0, 13) + "…" : n.column;
            pdf.text(lbl, bx + barW / 2, plotY + plotH + 5, { align: "center" });
          });
          pdf.setDrawColor(...INK);
          pdf.setLineWidth(0.3);
          pdf.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
          y += chartH + 10;
        }

        const firstCat = data.categoricalTop[0];
        if (firstCat) {
          y = ensure(y, 100);
          y = sectionHeader("04 — COMPOSIÇÃO", `Distribuição: ${firstCat.column}`, y);

          const cx = M + 32, cy = y + 32, r = 28, rIn = r * 0.62;
          const total = firstCat.values.reduce((a, b) => a + b.count, 0);
          let start = -Math.PI / 2;
          firstCat.values.forEach((v, i) => {
            const angle = (v.count / total) * Math.PI * 2;
            const steps = Math.max(12, Math.ceil(angle * 24));
            const col = CHART_SERIES[i % CHART_SERIES.length];
            pdf.setFillColor(...col);
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
            start += angle;
          });
          pdf.setFillColor(255, 255, 255);
          pdf.circle(cx, cy, rIn, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          pdf.text("TOTAL", cx, cy - 2, { align: "center" });
          pdf.setFont("times", "normal");
          pdf.setFontSize(14);
          pdf.setTextColor(...INK);
          pdf.text(fmt(total), cx, cy + 5, { align: "center" });

          const lx = cx + r + 14;
          let ly = y + 6;
          firstCat.values.slice(0, 8).forEach((v, i) => {
            const col = CHART_SERIES[i % CHART_SERIES.length];
            pdf.setFillColor(...col);
            pdf.rect(lx, ly - 2.5, 3, 3, "F");
            const pct = ((v.count / total) * 100).toFixed(1);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(...INK);
            const name = v.name.length > 22 ? v.name.slice(0, 21) + "…" : v.name;
            pdf.text(name, lx + 6, ly);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...MUTED);
            pdf.setFontSize(8);
            pdf.text(`${fmt(v.count)}  ·  ${pct}%`, W - M, ly, { align: "right" });
            ly += 7;
            pdf.setDrawColor(...HAIR);
            pdf.setLineWidth(0.1);
            pdf.line(lx, ly - 3, W - M, ly - 3);
          });
          y += 80;
        }

        if (data.numericStats.length > 0) {
          y = ensure(y, 30);
          y = sectionHeader("05 — ESTATÍSTICAS", "Detalhamento numérico", y);
          autoTable(pdf, {
            startY: y,
            margin: { left: M, right: M },
            head: [["Coluna", "Mín", "Média", "Máx", "Total"]],
            body: data.numericStats.map((s) => [s.column, fmt(s.min), fmt(s.mean), fmt(s.max), fmt(s.sum)]),
            theme: "plain",
            styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 }, textColor: INK, lineColor: HAIR, lineWidth: 0.1 },
            headStyles: { fontStyle: "bold", fontSize: 7, textColor: MUTED, fillColor: PAPER, lineWidth: 0.3, lineColor: INK },
            columnStyles: { 0: { font: "times", fontSize: 10 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } },
            didDrawPage: () => drawChrome(false),
          });
          y = (pdf as any).lastAutoTable.finalY + 10;
        }

        if (data.sampleRows.length > 0) {
          y = ensure(y, 30);
          y = sectionHeader("06 — AMOSTRA", "Primeiras observações", y);
          const cols = data.columns.slice(0, 6);
          autoTable(pdf, {
            startY: y,
            margin: { left: M, right: M },
            head: [cols],
            body: data.sampleRows.map((r) => cols.map((c) => String((r as any)[c] ?? "—").slice(0, 28))),
            theme: "plain",
            styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: INK, lineColor: HAIR, lineWidth: 0.1 },
            headStyles: { fontStyle: "bold", fontSize: 7, textColor: MUTED, fillColor: PAPER, lineWidth: 0.3, lineColor: INK },
            didDrawPage: () => drawChrome(false),
          });
        }
      }

      // ========== CLOSING ==========
      pdf.addPage();
      pdf.setFillColor(...PAPER);
      pdf.rect(0, 0, W, H, "F");
      pdf.setFillColor(...ACCENT);
      pdf.rect(0, 0, 6, H, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...ACCENT);
      pdf.text("FIM DO RELATÓRIO", M, 40);
      pdf.setFont("times", "italic");
      pdf.setFontSize(32);
      pdf.setTextColor(...INK);
      pdf.text("Obrigado.", M, 70);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MUTED);
      const closing = pdf.splitTextToSize(
        "Este relatório foi gerado automaticamente pela RelataAI a partir do arquivo enviado. Os números refletem exclusivamente os dados originais. Para análises personalizadas, entre em contato.",
        W - M * 2 - 20,
      );
      pdf.text(closing, M, 88);
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.4);
      pdf.line(M, H - 30, M + 40, H - 30);
      pdf.setFont("times", "italic");
      pdf.setFontSize(14);
      pdf.setTextColor(...INK);
      pdf.text("RelataAI", M, H - 22);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...MUTED);
      pdf.text(`${docId}  ·  ${dateStr}  ·  relataai.com`, M, H - 16);

      pdf.save(`RelataAI-${baseName}-${docId}.pdf`);
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
