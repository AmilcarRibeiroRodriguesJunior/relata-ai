import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Sparkles, TrendingUp, TrendingDown, Minus, Lightbulb, AlertCircle, Download } from "lucide-react";
import { useState } from "react";
import type { ReportData } from "@/lib/report-analyzer";
import { NICHES } from "@/lib/niche";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/r/$shareId")({
  component: PublicReport,
});

const PIE_COLORS = ["#1E40AF", "#3B82F6", "#60A5FA", "#93C5FD", "#0EA5E9", "#14B8A6", "#F59E0B", "#EF4444"];

function PublicReport() {
  const { shareId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-report", shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("file_name,summary,data,created_at,is_public,share_id,niche")
        .eq("share_id", shareId)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error || !data || !data.data) return <NotFound />;

  const report = data.data as ReportData;
  const nicheMeta = NICHES[(data.niche as keyof typeof NICHES) ?? report.niche ?? "generic"] ?? NICHES.generic;
  const kpis = report.kpis.slice(0, 4);
  const insights = report.insights.slice(0, 3);
  const mainChart = report.charts[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">RelataAI</span>
          </Link>
          <Link to="/">
            <Button size="sm" variant="outline">Criar meu relatório</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${nicheMeta.color} border`}>{nicheMeta.emoji} {nicheMeta.reportTitle}</Badge>
            <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> Público</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-balance">{data.file_name}</h1>
          <div className="text-sm text-muted-foreground">
            Publicado em {new Date(data.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Score */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-secondary via-secondary to-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_50%)]" />
          <div className="relative grid md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Score RelataAI</div>
              <div className="text-6xl font-bold">{report.score}<span className="text-2xl opacity-70">/100</span></div>
              <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/15">{report.scoreLabel}</div>
            </div>
            <p className="text-base opacity-95 leading-relaxed">{report.summary}</p>
          </div>
        </Card>

        {/* KPIs */}
        {kpis.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">KPIs principais</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.map((k) => {
                const tone = k.tone === "positive" ? "border-l-emerald-500" : k.tone === "negative" ? "border-l-red-500" : "border-l-blue-500";
                return (
                  <Card key={k.label} className={`p-4 border-l-4 ${tone}`}>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</div>
                    <div className="text-2xl font-bold mt-1">{k.value}</div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Chart */}
        {mainChart && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{mainChart.title}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {mainChart.kind === "line" ? (
                  <LineChart data={mainChart.data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line dataKey="value" stroke="#3B82F6" strokeWidth={2} dot />
                  </LineChart>
                ) : mainChart.kind === "bar" ? (
                  <BarChart data={mainChart.data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={mainChart.data} dataKey="value" nameKey="label" outerRadius={90} label>
                      {mainChart.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Principais insights</h2>
            <div className="space-y-3">
              {insights.map((i, n) => (
                <Card key={n} className="p-4 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{n + 1}</div>
                  <p className="text-sm leading-relaxed">{i}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold">Gere seu próprio relatório executivo</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Transforme planilhas em análises estratégicas com IA em segundos.</p>
          <Link to="/">
            <Button className="bg-gradient-primary shadow-elegant">Criar relatório grátis</Button>
          </Link>
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-6">
          Gerado por RelataAI · Consultoria executiva inteligente
        </footer>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Relatório não disponível</h1>
        <p className="text-sm text-muted-foreground mt-2">Este link expirou ou o relatório não está mais público.</p>
        <Link to="/"><Button className="mt-6">Ir para o RelataAI</Button></Link>
      </div>
    </div>
  );
}
