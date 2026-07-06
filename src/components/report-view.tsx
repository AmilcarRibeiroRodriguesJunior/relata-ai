import { useState } from "react";
import type { ReportData } from "@/lib/report-analyzer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Download, Loader2, CheckCircle2,
  AlertTriangle, AlertCircle, Lightbulb, Target, Sparkles, Activity,
  ShieldCheck, Lock, Briefcase, ListChecks, Star, Share2, MessageCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NICHES } from "@/lib/niche";
import { ShareDialog } from "@/components/share-dialog";
import { ReportChat } from "@/components/report-chat";

const PIE_COLORS = ["#1E40AF", "#3B82F6", "#60A5FA", "#93C5FD", "#0EA5E9", "#14B8A6", "#F59E0B", "#EF4444"];

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/* ============================================================
 *  PREMIUM EXECUTIVE PDF — McKinsey / Power BI inspired
 * ============================================================ */
function buildPdf(data: ReportData, plan: "free" | "pro" = "pro") {
  const isPro = plan === "pro";
  const pdf = new jsPDF("p", "mm", "a4");
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 16;
  const baseName = data.fileName.replace(/\.[^.]+$/, "");
  const dateStr = new Date(data.generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Premium consultancy palette
  const NAVY: [number, number, number] = [11, 27, 61];
  const NAVY_SOFT: [number, number, number] = [30, 64, 124];
  const BLUE: [number, number, number] = [59, 130, 246];
  const INK: [number, number, number] = [15, 23, 42];
  const MUTED: [number, number, number] = [100, 116, 139];
  const HAIR: [number, number, number] = [226, 232, 240];
  const BG: [number, number, number] = [248, 250, 252];
  const GREEN: [number, number, number] = [16, 185, 129];
  const YELLOW: [number, number, number] = [245, 158, 11];
  const RED: [number, number, number] = [239, 68, 68];
  const SERIES: [number, number, number][] = [
    [30, 64, 175], [59, 130, 246], [14, 165, 233],
    [20, 184, 166], [245, 158, 11], [239, 68, 68], [139, 92, 246], [236, 72, 153],
  ];

  let pageNum = 0;
  const chrome = (cover = false) => {
    pageNum++;
    if (cover) return;
    // Top bar
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, W, 8, "F");
    pdf.setFillColor(...BLUE);
    pdf.rect(0, 8, W, 0.6, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text("RELATAAI", M, 5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("Relatório Executivo Inteligente", M + 22, 5.5);
    pdf.text(dateStr, W - M, 5.5, { align: "right" });

    // Footer
    pdf.setDrawColor(...HAIR);
    pdf.setLineWidth(0.2);
    pdf.line(M, H - 11, W - M, H - 11);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text(data.docId, M, H - 6);
    pdf.text(baseName, W / 2, H - 6, { align: "center" });
    pdf.text(`Página ${pageNum - 1}`, W - M, H - 6, { align: "right" });
    pdf.setTextColor(...INK);
  };

  const newPage = () => { pdf.addPage(); chrome(false); return 22; };
  const ensure = (y: number, need: number) => (y + need > H - 16 ? newPage() : y);

  const section = (num: string, title: string, y: number) => {
    pdf.setFillColor(...BLUE);
    pdf.rect(M, y, 2.5, 9, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...BLUE);
    pdf.text(num, M + 6, y + 3.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...NAVY);
    pdf.text(title, M + 6, y + 8.5);
    pdf.setDrawColor(...HAIR);
    pdf.setLineWidth(0.2);
    pdf.line(M, y + 12, W - M, y + 12);
    return y + 18;
  };

  /* ========== COVER ========== */
  chrome(true);
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W, H, "F");
  // Decorative gradient bar
  for (let i = 0; i < 60; i++) {
    const alpha = i / 60;
    pdf.setFillColor(Math.round(11 + (59 - 11) * alpha), Math.round(27 + (130 - 27) * alpha), Math.round(61 + (246 - 61) * alpha));
    pdf.rect(0, H - 4 - i * 0.5, W, 0.5, "F");
  }
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, 4, H, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BLUE);
  pdf.text("RELATAAI", M, 28);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(180, 200, 230);
  pdf.text("INTELLIGENCE  ·  CONSULTING  ·  ANALYTICS", M + 22, 28);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(38);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Relatório", M, 90);
  pdf.text("Executivo", M, 105);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(...BLUE);
  pdf.text("Inteligente gerado por IA", M, 117);

  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.6);
  pdf.line(M, 125, M + 50, 125);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(220, 230, 245);
  const summary = pdf.splitTextToSize(data.summary, W - M * 2 - 20);
  pdf.text(summary.slice(0, 5), M, 140);

  // Score badge on cover
  const sx = W - M - 60, sy = 175;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(sx, sy, 60, 38, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("SCORE RELATAAI", sx + 30, sy + 7, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  pdf.setTextColor(...NAVY);
  pdf.text(`${data.score}`, sx + 22, sy + 24, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text("/ 100", sx + 24, sy + 24);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const scoreColor = data.score >= 75 ? GREEN : data.score >= 60 ? BLUE : data.score >= 40 ? YELLOW : RED;
  pdf.setTextColor(...scoreColor);
  pdf.text(data.scoreLabel.toUpperCase(), sx + 30, sy + 33, { align: "center" });

  // Meta block
  const my = H - 50;
  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.2);
  pdf.line(M, my, W - M, my);
  const meta = [
    ["ARQUIVO", baseName.slice(0, 28)],
    ["DATA", dateStr],
    ["DOCUMENTO", data.docId],
  ];
  const cw = (W - M * 2) / 3;
  meta.forEach(([k, v], i) => {
    const x = M + i * cw;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...BLUE);
    pdf.text(k, x, my + 7);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(v, x, my + 14);
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(180, 200, 230);
  pdf.text("CONFIDENCIAL  ·  Gerado automaticamente por RelataAI", M, H - 10);

  /* ========== PAGE 2: SCORE + SUMMARY ========== */
  let y = newPage();
  y = section("01", "Score RelataAI", y);

  // Big score card
  pdf.setFillColor(...BG);
  pdf.roundedRect(M, y, W - M * 2, 50, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(56);
  pdf.setTextColor(...NAVY);
  pdf.text(`${data.score}`, M + 10, y + 35);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(...MUTED);
  pdf.text("/ 100", M + 50, y + 35);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...scoreColor);
  pdf.text(data.scoreLabel.toUpperCase(), M + 10, y + 44);

  // Progress bar
  const bx = M + 75, by = y + 14, bw = W - M - bx - 10, bh = 8;
  pdf.setFillColor(...HAIR);
  pdf.roundedRect(bx, by, bw, bh, 2, 2, "F");
  pdf.setFillColor(...scoreColor);
  pdf.roundedRect(bx, by, (bw * data.score) / 100, bh, 2, 2, "F");

  // Breakdown bars
  const bd = data.scoreBreakdown;
  const items = [
    ["Crescimento", bd.growth],
    ["Consistência", bd.consistency],
    ["Estabilidade", bd.stability],
    ["Desempenho", bd.performance],
    ["Qualidade", bd.dataQuality],
  ] as const;
  let iy = y + 28;
  items.forEach(([lbl, val]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text(lbl, bx, iy);
    pdf.setFillColor(...HAIR);
    pdf.rect(bx + 22, iy - 2, 60, 1.6, "F");
    pdf.setFillColor(...BLUE);
    pdf.rect(bx + 22, iy - 2, (60 * val) / 100, 1.6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...NAVY);
    pdf.text(`${val}`, bx + 86, iy);
    iy += 4;
  });
  y += 58;

  // Summary
  y = ensure(y, 40);
  y = section("02", "Resumo Executivo", y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  const sumLines = pdf.splitTextToSize(data.summary, W - M * 2 - 4);
  pdf.text(sumLines, M + 2, y + 2);
  y += sumLines.length * 5 + 8;

  /* ========== KPIs (free: 4, pro: all) ========== */
  const pdfKpis = isPro ? data.kpis : data.kpis.slice(0, 4);
  if (pdfKpis.length > 0) {
    y = ensure(y, 45);
    y = section("03", "KPIs Principais", y);
    const cols = Math.min(4, pdfKpis.length);
    const kw = (W - M * 2 - (cols - 1) * 3) / cols;
    const kh = 26;
    pdfKpis.forEach((k, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      if (col === 0 && row > 0) y += kh + 3;
      const x = M + col * (kw + 3);
      pdf.setFillColor(...BG);
      pdf.roundedRect(x, y, kw, kh, 1.5, 1.5, "F");
      const tone = k.tone === "positive" ? GREEN : k.tone === "negative" ? RED : BLUE;
      pdf.setFillColor(...tone);
      pdf.rect(x, y, 1.5, kh, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...MUTED);
      pdf.text(k.label.toUpperCase().slice(0, 32), x + 4, y + 6);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...NAVY);
      pdf.text(k.value, x + 4, y + 18);
    });
    y += kh + 8;
  }

  /* ========== TRENDS — PRO ========== */
  if (isPro && data.trends.length > 0) {
    y = ensure(y, 30);
    y = section("04", "Tendências Identificadas", y);
    data.trends.forEach((t) => {
      const lines = pdf.splitTextToSize(t.text, W - M * 2 - 14);
      y = ensure(y, lines.length * 5 + 5);
      const col = t.icon === "up" ? GREEN : t.icon === "down" ? RED : MUTED;
      pdf.setFillColor(...col);
      pdf.circle(M + 3, y + 1, 1.5, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 9, y + 2);
      y += lines.length * 5 + 3;
    });
    y += 5;
  }

  /* ========== INSIGHTS (free: shallow insightsFree, pro: all) ========== */
  const pdfInsights = isPro ? data.insights : (data.insightsFree ?? data.insights.slice(0, 3));
  if (pdfInsights.length > 0) {
    y = ensure(y, 30);
    y = section("05", "Insights Inteligentes", y);
    pdfInsights.forEach((ins, i) => {
      const lines = pdf.splitTextToSize(ins, W - M * 2 - 16);
      const block = lines.length * 5 + 6;
      y = ensure(y, block);
      pdf.setFillColor(...BG);
      pdf.roundedRect(M, y - 2, W - M * 2, block, 1.5, 1.5, "F");
      pdf.setFillColor(...BLUE);
      pdf.circle(M + 5, y + 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(i + 1), M + 5, y + 3, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 11, y + 2);
      y += block + 2;
    });
    y += 5;
  }

  /* ========== ALERTS (free: 2, pro: all) ========== */
  const pdfAlerts = isPro ? data.alerts : data.alerts.slice(0, 2);
  if (pdfAlerts.length > 0) {
    y = ensure(y, 30);
    y = section("06", "Alertas Automáticos", y);
    pdfAlerts.forEach((a) => {
      const col = a.severity === "red" ? RED : a.severity === "yellow" ? YELLOW : GREEN;
      const lines = pdf.splitTextToSize(a.text, W - M * 2 - 14);
      const block = lines.length * 5 + 5;
      y = ensure(y, block);
      pdf.setFillColor(...col);
      pdf.rect(M, y - 2, 2, block - 2, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 6, y + 2);
      y += block;
    });
    y += 5;
  }

  /* ========== CHARTS (free: 1, pro: all) ========== */
  const pdfCharts = isPro ? data.charts : data.charts.slice(0, 1);
  for (const ch of pdfCharts) {
    if (ch.kind === "bar" || ch.kind === "line") {
      y = ensure(y, 95);
      y = section(ch.kind === "line" ? "07" : "08", ch.title, y);
      const cX = M, cY = y, cW = W - M * 2, cH = 75;
      const padL = 18, padR = 6, padT = 6, padB = 14;
      const pX = cX + padL, pY = cY + padT;
      const pW = cW - padL - padR, pH = cH - padT - padB;
      const maxV = Math.max(...ch.data.map((d) => d.value));
      const minV = Math.min(0, ...ch.data.map((d) => d.value));

      // Grid + axis labels
      pdf.setDrawColor(...HAIR);
      pdf.setLineWidth(0.15);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...MUTED);
      for (let s = 0; s <= 4; s++) {
        const yy = pY + pH - (pH * s) / 4;
        pdf.line(pX, yy, pX + pW, yy);
        const v = minV + ((maxV - minV) * s) / 4;
        const lbl = Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : fmt(v);
        pdf.text(lbl, pX - 1.5, yy + 1.3, { align: "right" });
      }

      if (ch.kind === "bar") {
        const slot = pW / ch.data.length;
        const bw = slot * 0.6;
        ch.data.forEach((d, i) => {
          const bh = ((d.value - minV) / (maxV - minV || 1)) * pH;
          const bxp = pX + slot * i + (slot - bw) / 2;
          const byp = pY + pH - bh;
          // Gradient simulation: dark bottom, lighter top
          pdf.setFillColor(...NAVY_SOFT);
          pdf.rect(bxp, byp, bw, bh, "F");
          pdf.setFillColor(...BLUE);
          pdf.rect(bxp, byp, bw, Math.min(2, bh), "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          pdf.setTextColor(...NAVY);
          pdf.text(d.value >= 1000 ? (d.value / 1000).toFixed(1) + "k" : fmt(d.value), bxp + bw / 2, byp - 1.5, { align: "center" });
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.5);
          pdf.setTextColor(...MUTED);
          const lbl = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
          pdf.text(lbl, bxp + bw / 2, pY + pH + 4, { align: "center" });
        });
      } else {
        // Line
        const slot = pW / Math.max(1, ch.data.length - 1);
        pdf.setDrawColor(...BLUE);
        pdf.setLineWidth(0.6);
        for (let i = 1; i < ch.data.length; i++) {
          const x1 = pX + slot * (i - 1);
          const y1 = pY + pH - ((ch.data[i - 1].value - minV) / (maxV - minV || 1)) * pH;
          const x2 = pX + slot * i;
          const y2 = pY + pH - ((ch.data[i].value - minV) / (maxV - minV || 1)) * pH;
          pdf.line(x1, y1, x2, y2);
        }
        // Points
        ch.data.forEach((d, i) => {
          const xp = pX + slot * i;
          const yp = pY + pH - ((d.value - minV) / (maxV - minV || 1)) * pH;
          pdf.setFillColor(...NAVY);
          pdf.circle(xp, yp, 0.9, "F");
        });
        // X labels (sparse)
        const step = Math.max(1, Math.floor(ch.data.length / 6));
        ch.data.forEach((d, i) => {
          if (i % step !== 0 && i !== ch.data.length - 1) return;
          const xp = pX + slot * i;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6);
          pdf.setTextColor(...MUTED);
          const lbl = d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label;
          pdf.text(lbl, xp, pY + pH + 4, { align: "center" });
        });
      }
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.25);
      pdf.line(pX, pY + pH, pX + pW, pY + pH);
      y += cH + 8;
    } else if (ch.kind === "pie") {
      y = ensure(y, 90);
      y = section("09", ch.title, y);
      const cx = M + 32, cy = y + 32, r = 28, rIn = r * 0.6;
      const total = ch.data.reduce((a, b) => a + b.value, 0) || 1;
      let start = -Math.PI / 2;
      ch.data.forEach((v, i) => {
        const angle = (v.value / total) * Math.PI * 2;
        const steps = Math.max(16, Math.ceil(angle * 28));
        const col = SERIES[i % SERIES.length];
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
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...NAVY);
      pdf.text(fmt(total), cx, cy + 4, { align: "center" });

      const lx = cx + r + 14;
      let ly = y + 6;
      ch.data.slice(0, 8).forEach((v, i) => {
        const col = SERIES[i % SERIES.length];
        pdf.setFillColor(...col);
        pdf.rect(lx, ly - 2.5, 3, 3, "F");
        const pct = ((v.value / total) * 100).toFixed(1);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...INK);
        const name = v.label.length > 22 ? v.label.slice(0, 21) + "…" : v.label;
        pdf.text(name, lx + 6, ly);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...MUTED);
        pdf.setFontSize(8);
        pdf.text(`${fmt(v.value)}  ·  ${pct}%`, W - M, ly, { align: "right" });
        ly += 6.5;
      });
      y += 78;
    }
  }

  /* ========== CORRELATIONS — PRO ========== */
  if (isPro && data.correlations.length > 0) {
    y = ensure(y, 30);
    y = section("10", "Análise de Correlação", y);
    data.correlations.forEach((c) => {
      const lines = pdf.splitTextToSize(c.text, W - M * 2 - 24);
      const block = lines.length * 5 + 5;
      y = ensure(y, block);
      const col = c.direction === "positive" ? GREEN : RED;
      pdf.setFillColor(...col);
      pdf.roundedRect(M, y - 1, 18, 6, 1, 1, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`r = ${c.r.toFixed(2)}`, M + 9, y + 3, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 22, y + 2);
      y += block;
    });
    y += 4;
  }

  /* ========== ANOMALIES — PRO ========== */
  if (isPro && data.anomalies.length > 0) {
    y = ensure(y, 30);
    y = section("11", "Detecção de Anomalias", y);
    data.anomalies.forEach((a) => {
      const lines = pdf.splitTextToSize(`${a.type} em ${a.column}: ${a.text}`, W - M * 2 - 8);
      const block = lines.length * 5 + 4;
      y = ensure(y, block);
      pdf.setFillColor(...YELLOW);
      pdf.circle(M + 2, y + 1, 1.2, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 7, y + 2);
      y += block;
    });
    y += 4;
  }

  /* ========== DATA QUALITY — PRO ========== */
  if (isPro) {
    y = ensure(y, 40);
    y = section("12", "Qualidade dos Dados", y);
    pdf.setFillColor(...BG);
    pdf.roundedRect(M, y, W - M * 2, 28, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.setTextColor(...NAVY);
    pdf.text(`${data.dataQuality.score}%`, M + 8, y + 22);
    const qx = M + 60;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(`Campos vazios detectados: ${data.dataQuality.missing}`, qx, y + 10);
    pdf.text(`Linhas duplicadas: ${data.dataQuality.duplicates}`, qx, y + 17);
    data.dataQuality.issues.slice(0, 2).forEach((iss, idx) => {
      pdf.setTextColor(...INK);
      pdf.text(`• ${iss}`, qx, y + 24 + idx * 4);
    });
    y += 34;
  }

  /* ========== EXECUTIVE DIAGNOSIS — PRO ========== */
  if (isPro && data.diagnosis) {
    y = newPage();
    y = section("D1", "Diagnóstico Executivo", y);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text("Situação Geral", M, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    const sit = pdf.splitTextToSize(data.diagnosis.situation, W - M * 2);
    pdf.text(sit, M, y + 4);
    y += sit.length * 5 + 10;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text("Principais Descobertas", M, y);
    y += 6;
    const findings = data.diagnosis.findings;
    const fCols = 2;
    const fw = (W - M * 2 - 4) / fCols;
    const fh = 26;
    findings.forEach((f, i) => {
      const col = i % fCols;
      const row = Math.floor(i / fCols);
      if (col === 0 && row > 0) y += fh + 3;
      const x = M + col * (fw + 4);
      const c = f.level === "red" ? RED : f.level === "yellow" ? YELLOW : GREEN;
      pdf.setFillColor(...BG);
      pdf.roundedRect(x, y, fw, fh, 1.5, 1.5, "F");
      pdf.setFillColor(...c);
      pdf.rect(x, y, 2, fh, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...NAVY);
      pdf.text(f.title.slice(0, 40), x + 5, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      pdf.text(`Impacto: ${f.impact}`, x + 5, y + 11);
      pdf.setFontSize(8);
      pdf.setTextColor(...INK);
      const dt = pdf.splitTextToSize(f.detail, fw - 8);
      pdf.text(dt.slice(0, 2), x + 5, y + 16);
    });
    y += fh + 10;

    y = ensure(y, 40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text("Resumo Executivo", M, y);
    y += 5;
    const sumItems = [
      ["Críticos", data.diagnosis.summary.criticalIssues],
      ["Anomalias", data.diagnosis.summary.anomalies],
      ["Correlações", data.diagnosis.summary.correlations],
      ["Oportunidades", data.diagnosis.summary.opportunities],
      ["Recomendações", data.diagnosis.summary.recommendations],
    ] as const;
    const sw = (W - M * 2 - 4 * 3) / 5;
    sumItems.forEach(([lbl, v], i) => {
      const x = M + i * (sw + 3);
      pdf.setFillColor(...BG);
      pdf.roundedRect(x, y, sw, 22, 1.5, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(...BLUE);
      pdf.text(String(v), x + sw / 2, y + 12, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...MUTED);
      pdf.text(lbl.toUpperCase(), x + sw / 2, y + 18, { align: "center" });
    });
    y += 30;
  }

  /* ========== ACTION PLAN — PRO ========== */
  if (isPro && data.actionPlan && data.actionPlan.length > 0) {
    y = newPage();
    y = section("D2", "Plano de Ação Estratégico", y);
    data.actionPlan.forEach((a) => {
      const descLines = pdf.splitTextToSize(a.description, W - M * 2 - 10);
      const block = 22 + descLines.length * 4;
      y = ensure(y, block + 4);
      pdf.setFillColor(...BG);
      pdf.roundedRect(M, y, W - M * 2, block, 2, 2, "F");
      pdf.setFillColor(...NAVY);
      pdf.rect(M, y, 3, block, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...BLUE);
      pdf.text(`PRIORIDADE ${a.priority}`, M + 6, y + 6);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...NAVY);
      pdf.text(a.title, M + 6, y + 12);
      // stars for urgency
      const starStr = "★".repeat(a.urgency) + "☆".repeat(5 - a.urgency);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...YELLOW);
      pdf.text(starStr, W - M - 4, y + 8, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...INK);
      pdf.text(descLines, M + 6, y + 18);
      const metaY = y + block - 4;
      pdf.setFontSize(8);
      pdf.setTextColor(...MUTED);
      pdf.text(`Impacto: ${a.impact}   ·   Complexidade: ${a.complexity}   ·   Prazo: ${a.deadline}`, M + 6, metaY);
      y += block + 4;
    });
  }

  /* ========== RECOMMENDATIONS — PRO ========== */
  if (isPro && data.recommendations.length > 0) {
    y = ensure(y, 30);
    y = section("13", "Recomendações Estratégicas", y);
    data.recommendations.forEach((r, i) => {
      const lines = pdf.splitTextToSize(r, W - M * 2 - 14);
      const block = lines.length * 5 + 5;
      y = ensure(y, block);
      pdf.setFillColor(...NAVY);
      pdf.roundedRect(M, y - 1, 6, 6, 1, 1, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(i + 1), M + 3, y + 3, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...INK);
      pdf.text(lines, M + 10, y + 2);
      y += block;
    });
    y += 5;
  }

  /* ========== STATS TABLE — PRO ========== */
  if (isPro && data.numericStats.length > 0) {
    y = ensure(y, 30);
    y = section("14", "Detalhamento de Métricas", y);
    autoTable(pdf, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Métrica", "Mín", "Média", "Máx", "Total", "Tendência"]],
      body: data.numericStats.map((s) => [
        s.column,
        fmt(s.min),
        fmt(s.mean),
        fmt(s.max),
        fmt(s.sum),
        s.growthPct === null ? "—" : `${s.growthPct >= 0 ? "+" : ""}${s.growthPct.toFixed(1)}%`,
      ]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: INK, lineColor: HAIR, lineWidth: 0.1 },
      headStyles: { fontStyle: "bold", fontSize: 8, textColor: [255, 255, 255], fillColor: NAVY, lineWidth: 0 },
      alternateRowStyles: { fillColor: BG },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" }, 5: { halign: "right" } },
      didDrawPage: () => chrome(false),
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  /* ========== UPGRADE PAGE — FREE ONLY ========== */
  if (!isPro) {
    pdf.addPage();
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, W, H, "F");
    pdf.setFillColor(...BLUE);
    pdf.rect(0, 0, 4, H, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...BLUE);
    pdf.text("RELATAAI  ·  UPGRADE", M, 28);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Desbloqueie o", M, 62);
    pdf.text("Relatório Completo", M, 76);

    pdf.setDrawColor(...BLUE);
    pdf.setLineWidth(0.6);
    pdf.line(M, 84, M + 45, 84);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(220, 230, 245);
    pdf.text("Este é apenas um resumo da sua análise. No Plano PRO você recebe:", M, 96);

    const benefits = [
      "Dashboard Executivo completo",
      "Todos os KPIs (sem limite)",
      "Insights ilimitados",
      "Tendências completas",
      "Correlações entre métricas (Pearson)",
      "Detecção automática de anomalias",
      "Recomendações estratégicas geradas por IA",
      "Plano de ação priorizado",
      "Ranking e heatmaps das métricas",
      "Tabela estatística completa (mín, máx, média, total, tendência)",
      "Todos os gráficos disponíveis",
      "Qualidade dos dados detalhada",
      "Exportação PDF Premium (estilo consultoria)",
    ];
    let by2 = 108;
    const colW = (W - M * 2 - 6) / 2;
    benefits.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = M + col * (colW + 6);
      const byy = by2 + row * 9;
      pdf.setFillColor(...BLUE);
      pdf.circle(bx + 2, byy - 1.2, 1.4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text("✓", bx + 2, byy - 0.2, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(230, 238, 250);
      pdf.text(b, bx + 7, byy);
    });

    // CTA card
    const cy2 = H - 60;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(M, cy2, W - M * 2, 38, 3, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...BLUE);
    pdf.text("PLANO PRO", M + 8, cy2 + 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(...NAVY);
    pdf.text("R$ 12,90 / mês", M + 8, cy2 + 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text("Cancele quando quiser · Uploads ilimitados · Análise executiva completa", M + 8, cy2 + 30);

    pdf.setFillColor(...BLUE);
    pdf.roundedRect(W - M - 62, cy2 + 10, 54, 18, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Fazer Upgrade", W - M - 35, cy2 + 21, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(180, 200, 230);
    pdf.text("Acesse relataai.lovable.app para assinar o Plano PRO", M, H - 12);
  }

  /* ========== CLOSING ========== */
  pdf.addPage();
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W, H, "F");
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, 4, H, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text(isPro ? "CONCLUSÃO EXECUTIVA" : "CONCLUSÃO PARCIAL", M, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  pdf.setTextColor(255, 255, 255);
  pdf.text(isPro ? "Conclusão" : "Conclusão Parcial", M, 60);
  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.5);
  pdf.line(M, 66, M + 40, 66);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(220, 230, 245);
  const conclText = isPro ? data.conclusion : (data.conclusionFree ?? data.conclusion);
  const concl = pdf.splitTextToSize(conclText, W - M * 2 - 10);
  pdf.text(concl, M, 82);

  pdf.setDrawColor(...BLUE);
  pdf.line(M, H - 35, M + 40, H - 35);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("RelataAI", M, H - 26);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(180, 200, 230);
  pdf.text(`${data.docId}  ·  ${dateStr}  ·  Relatório Executivo Inteligente gerado por IA`, M, H - 20);

  pdf.save(`RelataAI-${baseName}-${data.docId}.pdf`);
}

/* ============================================================
 *  ON-SCREEN PREMIUM REPORT
 * ============================================================ */
export function ReportView({
  data,
  fileName,
  plan = "free",
  reportId,
}: {
  data: ReportData;
  fileName: string;
  plan?: "free" | "pro";
  reportId?: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isPro = plan === "pro";
  const nicheMeta = NICHES[data.niche ?? "generic"] ?? NICHES.generic;

  const handleExportPdf = async () => {
    setExporting(true);
    try { buildPdf({ ...data, fileName }, plan); }
    catch (e) { console.error("PDF export failed", e); }
    finally { setExporting(false); }
  };

  if (data.kind === "unsupported") {
    return (
      <div className="space-y-3">
        {data.insights.map((i, idx) => <Card key={idx} className="p-4 text-sm">{i}</Card>)}
      </div>
    );
  }

  const scoreColor =
    data.score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    data.score >= 60 ? "text-blue-600 bg-blue-50 border-blue-200" :
    data.score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-red-600 bg-red-50 border-red-200";

  const scoreBar =
    data.score >= 75 ? "bg-emerald-500" :
    data.score >= 60 ? "bg-blue-500" :
    data.score >= 40 ? "bg-amber-500" : "bg-red-500";

  // Gating: free plan = diagnóstico enxuto e superficial (sem correlações/estatísticas)
  const visibleKpis = isPro ? data.kpis : data.kpis.slice(0, 4);
  const visibleTrends = isPro ? data.trends : [];
  const visibleInsights = isPro ? data.insights : (data.insightsFree ?? []);
  const visibleAlerts = isPro ? data.alerts : data.alerts.slice(0, 2);
  const visibleCharts = isPro ? data.charts : data.charts.slice(0, 1);
  const displayConclusion = isPro ? data.conclusion : (data.conclusionFree ?? data.conclusion);
  const hiddenPremiumCount =
    Math.max(0, data.kpis.length - visibleKpis.length) +
    Math.max(0, data.trends.length - 0) +
    Math.max(0, data.alerts.length - visibleAlerts.length) +
    Math.max(0, data.charts.length - visibleCharts.length) +
    data.correlations.length + data.anomalies.length + data.recommendations.length + (data.actionPlan?.length ?? 0);

  const reportBody = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 flex-wrap">
          <Badge className={`${nicheMeta.color} border font-medium`}>{nicheMeta.emoji} {nicheMeta.reportTitle}</Badge>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Documento {data.docId}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link to="/upload" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4 mr-2" /> Gerar novo
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={async () => {
              if (reportId) { setShareOpen(true); return; }
              const text = `${fileName} — Score RelataAI ${data.score}/100 (${data.scoreLabel})\n\n${data.summary}`;
              try {
                if (navigator.share) await navigator.share({ title: `RelataAI — ${fileName}`, text });
                else {
                  await navigator.clipboard.writeText(text);
                  const { toast } = await import("sonner");
                  toast.success("Resumo copiado");
                }
              } catch { /* cancelled */ }
            }}
          >
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar
          </Button>
          <Button onClick={handleExportPdf} disabled={exporting} className="bg-gradient-primary shadow-elegant flex-1 sm:flex-none">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Hero / Score */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-secondary via-secondary to-primary text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_50%)]" />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Score RelataAI</div>
            <div className="flex items-baseline justify-center gap-1">
              <div className="text-6xl font-bold">{data.score}</div>
              <div className="text-xl opacity-70">/100</div>
            </div>
            <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold border ${scoreColor}`}>
              {data.scoreLabel}
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Relatório Executivo Inteligente</h2>
            <p className="text-sm opacity-90 leading-relaxed">{data.summary}</p>
            <div className="grid grid-cols-5 gap-2 text-[10px] uppercase tracking-wider opacity-90">
              {[
                ["Crescimento", data.scoreBreakdown.growth],
                ["Consistência", data.scoreBreakdown.consistency],
                ["Estabilidade", data.scoreBreakdown.stability],
                ["Desempenho", data.scoreBreakdown.performance],
                ["Qualidade", data.scoreBreakdown.dataQuality],
              ].map(([lbl, val]) => (
                <div key={String(lbl)} className="space-y-1">
                  <div>{lbl}</div>
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreBar}`} style={{ width: `${val}%` }} />
                  </div>
                  <div className="font-bold text-sm normal-case">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      {visibleKpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleKpis.map((k) => {
            const tone =
              k.tone === "positive" ? "border-l-emerald-500" :
              k.tone === "negative" ? "border-l-red-500" :
              "border-l-blue-500";
            return (
              <Card key={k.label} className={`p-4 border-l-4 ${tone}`}>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{k.value}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trends */}
      {visibleTrends.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Tendências Identificadas</h3>
          </div>
          <ul className="space-y-2">
            {visibleTrends.map((t, i) => {
              const Icon = t.icon === "up" ? TrendingUp : t.icon === "down" ? TrendingDown : Minus;
              const color = t.icon === "up" ? "text-emerald-600" : t.icon === "down" ? "text-red-600" : "text-muted-foreground";
              return (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                  <span className="text-foreground">{t.text}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Insights */}
      {visibleInsights.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Insights Inteligentes {!isPro && <span className="text-xs text-muted-foreground font-normal">(prévia)</span>}</h3>
          </div>
          <div className="space-y-2">
            {visibleInsights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-muted/40">
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Locked insights — FREE only */}
      {!isPro && (
        <Card className="p-5 border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">🔒 Mais insights encontrados pela IA</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A inteligência do RelataAI identificou análises adicionais que estão disponíveis apenas para usuários PRO.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
            {[
              "🔒 Correlações entre métricas",
              "🔒 Principais fatores que impactam os resultados",
              "🔒 Oportunidades de melhoria",
              "🔒 Recomendações estratégicas",
              "🔒 Diagnóstico executivo completo",
              "🔒 Plano de ação priorizado por IA",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-muted-foreground">
                <Lock className="h-3 w-3 shrink-0" /> <span>{t.replace("🔒 ", "")}</span>
              </li>
            ))}
          </ul>
          <Link to="/plans">
            <Button className="bg-gradient-primary shadow-elegant">
              <Sparkles className="h-4 w-4 mr-2" /> Desbloquear Relatório Completo
            </Button>
          </Link>
        </Card>
      )}

      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Alertas Automáticos</h3>
          </div>
          <div className="space-y-2">
            {visibleAlerts.map((a, i) => {
              const Icon = a.severity === "green" ? CheckCircle2 : a.severity === "yellow" ? AlertTriangle : AlertCircle;
              const cls =
                a.severity === "green" ? "border-l-emerald-500 bg-emerald-50/50 text-emerald-900 dark:text-emerald-100" :
                a.severity === "yellow" ? "border-l-amber-500 bg-amber-50/50 text-amber-900 dark:text-amber-100" :
                "border-l-red-500 bg-red-50/50 text-red-900 dark:text-red-100";
              const iconCls = a.severity === "green" ? "text-emerald-600" : a.severity === "yellow" ? "text-amber-600" : "text-red-600";
              return (
                <div key={i} className={`flex items-start gap-3 text-sm p-3 rounded-md border-l-4 ${cls}`}>
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`} />
                  <span>{a.text}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Charts */}
      {visibleCharts.map((ch, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{ch.title}</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {ch.kind === "line" ? (
                <LineChart data={ch.data}>
                  <defs>
                    <linearGradient id={`lg-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1E40AF" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="value" stroke={`url(#lg-${i})`} strokeWidth={3} dot={{ r: 3 }} animationDuration={1200} />
                </LineChart>
              ) : ch.kind === "bar" ? (
                <BarChart data={ch.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`bg-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="value" fill={`url(#bg-${i})`} radius={[8, 8, 0, 0]} animationDuration={1100} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie data={ch.data} dataKey="value" nameKey="label" outerRadius={100} innerRadius={55} paddingAngle={3} animationDuration={1100}
                       label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                    {ch.data.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      ))}

      {/* Correlations — PRO */}
      {isPro && data.correlations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Análise de Correlação</h3>
          </div>
          <div className="space-y-2">
            {data.correlations.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-bold text-white ${c.direction === "positive" ? "bg-emerald-600" : "bg-red-600"}`}>
                  r = {c.r.toFixed(2)}
                </span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Anomalies — PRO */}
      {isPro && data.anomalies.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Detecção de Anomalias</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {data.anomalies.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">{a.type}</span>
                <span><strong>{a.column}:</strong> {a.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Data quality — PRO */}
      {isPro && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Qualidade dos Dados</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{data.dataQuality.score}%</div>
            </div>
            <div className="flex-1 text-sm space-y-1 text-muted-foreground">
              <div>Campos vazios: <strong className="text-foreground">{data.dataQuality.missing}</strong></div>
              <div>Linhas duplicadas: <strong className="text-foreground">{data.dataQuality.duplicates}</strong></div>
              {data.dataQuality.issues.map((iss, i) => <div key={i}>• {iss}</div>)}
            </div>
          </div>
        </Card>
      )}

      {/* Executive Diagnosis — PRO */}
      {isPro && data.diagnosis && (
        <Card className="p-0 overflow-hidden border-2 border-secondary/20">
          <div className="bg-gradient-to-br from-secondary via-secondary to-primary text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80 mb-2">
              <Briefcase className="h-4 w-4" /> Diagnóstico Executivo
            </div>
            <h3 className="text-2xl font-bold mb-3">Situação Geral</h3>
            <p className="text-sm leading-relaxed opacity-95">{data.diagnosis.situation}</p>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Principais Descobertas</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.diagnosis.findings.map((f, i) => {
                  const dot = f.level === "red" ? "bg-red-500" : f.level === "yellow" ? "bg-amber-500" : "bg-emerald-500";
                  const emoji = f.level === "red" ? "🔴" : f.level === "yellow" ? "🟡" : "🟢";
                  return (
                    <div key={i} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        <span className="font-semibold text-sm">{emoji} {f.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">Impacto: <span className="font-semibold text-foreground">{f.impact}</span></div>
                      <p className="text-xs">{f.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Resumo Executivo</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  ["Problemas críticos", data.diagnosis.summary.criticalIssues],
                  ["Anomalias", data.diagnosis.summary.anomalies],
                  ["Correlações", data.diagnosis.summary.correlations],
                  ["Oportunidades", data.diagnosis.summary.opportunities],
                  ["Recomendações", data.diagnosis.summary.recommendations],
                ].map(([label, val]) => (
                  <div key={String(label)} className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-2xl font-bold text-primary">{val}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Plan — PRO */}
      {isPro && data.actionPlan && data.actionPlan.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Plano de Ação Estratégico</h3>
          </div>
          <div className="space-y-3">
            {data.actionPlan.map((a) => (
              <div key={a.priority} className="p-4 rounded-lg border bg-gradient-to-br from-muted/20 to-transparent">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-primary font-bold">Prioridade {a.priority}</div>
                    <h4 className="font-semibold text-sm mt-0.5">{a.title}</h4>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < a.urgency ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{a.description}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Impacto:</span> <span className="font-semibold">{a.impact}</span></div>
                  <div><span className="text-muted-foreground">Complexidade:</span> <span className="font-semibold">{a.complexity}</span></div>
                  <div><span className="text-muted-foreground">Prazo:</span> <span className="font-semibold">{a.deadline}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations — PRO */}
      {isPro && data.recommendations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Recomendações Estratégicas</h3>
          </div>
          <ol className="space-y-3">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="h-6 w-6 rounded-md bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Upgrade CTA for free users */}
      {!isPro && (
        <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">Pro</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-bold text-lg">Você está vendo uma prévia do relatório</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {hiddenPremiumCount > 0
                    ? `Mais ${hiddenPremiumCount} bloco(s) de análise estão bloqueados no plano Pro.`
                    : "Desbloqueie a análise executiva completa no plano Pro."}
                </p>
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Uploads ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Diagnóstico executivo completo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Plano de ação priorizado por IA</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Análise de correlação (Pearson)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Detecção de anomalias</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Recomendações estratégicas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> PDF executivo (consultoria)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Histórico completo</li>
              </ul>
              <Link to="/plans">
                <Button className="bg-gradient-primary shadow-elegant mt-1">
                  <Sparkles className="h-4 w-4 mr-2" /> Desbloquear Relatório Completo
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Conclusion */}
      <Card className="p-6 bg-secondary text-secondary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-70 mb-2">
          {isPro ? "Conclusão Executiva" : "Conclusão Parcial"}
        </div>
        <p className="text-base leading-relaxed">{displayConclusion}</p>
      </Card>
    </div>
  );
}
