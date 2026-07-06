import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export type ChatMsg = { role: "user" | "assistant"; content: string };

function buildContext(report: any): string {
  if (!report) return "Sem contexto de relatório.";
  const kpis = (report.kpis ?? []).map((k: any) => `- ${k.label}: ${k.value}`).join("\n");
  const insights = (report.insights ?? []).slice(0, 10).map((i: string, n: number) => `${n + 1}. ${i}`).join("\n");
  const alerts = (report.alerts ?? []).map((a: any) => `- [${a.severity}] ${a.text}`).join("\n");
  const trends = (report.trends ?? []).map((t: any) => `- ${t.text}`).join("\n");
  const corr = (report.correlations ?? []).map((c: any) => `- ${c.text}`).join("\n");
  const anom = (report.anomalies ?? []).map((a: any) => `- ${a.text}`).join("\n");
  const recs = (report.recommendations ?? []).map((r: string) => `- ${r}`).join("\n");
  const stats = (report.numericStats ?? []).slice(0, 15).map((s: any) =>
    `- ${s.column}: min=${s.min?.toFixed?.(2)} max=${s.max?.toFixed?.(2)} média=${s.mean?.toFixed?.(2)} soma=${s.sum?.toFixed?.(2)} crescimento=${s.growthPct == null ? "—" : s.growthPct.toFixed(1) + "%"}`
  ).join("\n");
  const cats = (report.categoricalTop ?? []).map((c: any) =>
    `- ${c.column}: ${c.values.slice(0, 5).map((v: any) => `${v.name}(${v.count})`).join(", ")}`
  ).join("\n");
  return [
    `Arquivo: ${report.fileName}`,
    `Nicho detectado: ${report.niche ?? "genérico"}`,
    `Score RelataAI: ${report.score}/100 (${report.scoreLabel})`,
    `Resumo: ${report.summary}`,
    `Conclusão: ${report.conclusion}`,
    `\nKPIs:\n${kpis}`,
    `\nTendências:\n${trends}`,
    `\nInsights:\n${insights}`,
    `\nAlertas:\n${alerts}`,
    `\nCorrelações:\n${corr}`,
    `\nAnomalias:\n${anom}`,
    `\nRecomendações:\n${recs}`,
    `\nEstatísticas numéricas:\n${stats}`,
    `\nCategorias:\n${cats}`,
    `\nQualidade dos dados: score ${report.dataQuality?.score}, ${report.dataQuality?.missing} campos vazios, ${report.dataQuality?.duplicates} duplicados.`,
    `\nTotal de linhas: ${report.rowCount}, colunas: ${report.columnCount}.`,
  ].join("\n");
}

export const chatWithReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { reportId?: string; messages?: ChatMsg[] };
    if (!i?.reportId || !Array.isArray(i.messages)) throw new Error("Invalid payload");
    return { reportId: i.reportId, messages: i.messages.slice(-20) };
  })
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: report, error } = await context.supabase
      .from("reports")
      .select("data,file_name,user_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Relatório não encontrado");
    if (report.user_id !== context.userId) throw new Error("Sem permissão");

    const ctxText = buildContext(report.data);
    const system = `Você é o RelataAI, um consultor de dados sênior. Responda de forma profissional, objetiva e em português.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE os dados do relatório fornecido abaixo. NUNCA invente números, categorias, tendências ou fatos.
2. Se a informação não estiver no relatório, diga claramente: "Isto não está no relatório enviado."
3. Seja conciso (2–6 parágrafos curtos ou lista objetiva). Use markdown quando ajudar.
4. Traga interpretação estratégica (causas prováveis, riscos, oportunidades) SEMPRE ancorada nos números do relatório.
5. Não repita o relatório inteiro — responda à pergunta.

=== RELATÓRIO ===
${ctxText}
=== FIM DO RELATÓRIO ===`;

    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return { text: result.text };
  });
