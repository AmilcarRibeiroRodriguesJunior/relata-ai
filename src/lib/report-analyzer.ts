import * as XLSX from "xlsx";
import { detectNiche, NICHES, type Niche } from "@/lib/niche";
import { classifyColumns, isMeaningfulCorrelationPair, type ColumnProfile } from "@/lib/analysis/column-types";
import { generateNicheKpis } from "@/lib/analysis/niche-kpis";

/* ============================================================
 * RelataAI — Executive Analysis Engine
 * Heuristic, deterministic, business-grade analytics from
 * tabular files (CSV / XLS / XLSX). Produces score, trends,
 * insights, alerts, recommendations, anomalies, correlations
 * and data-quality assessment.
 * ============================================================ */

export type NumericStat = {
  column: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  sum: number;
  count: number;
  growthPct: number | null; // first vs last
  trend: "up" | "down" | "flat";
};

export type CategoricalStat = {
  column: string;
  values: { name: string; count: number }[];
  unique: number;
};

export type ChartPoint = { label: string; value: number };
export type ChartSeries = {
  kind: "line" | "bar" | "pie";
  title: string;
  column: string;
  data: ChartPoint[];
};

export type Kpi = { label: string; value: string; hint?: string; tone?: "neutral" | "positive" | "negative" };
export type Trend = { icon: "up" | "down" | "flat" | "spark"; text: string };
export type Alert = { severity: "green" | "yellow" | "red"; text: string };
export type Correlation = { a: string; b: string; r: number; strength: string; direction: "positive" | "negative"; text: string };
export type Anomaly = { column: string; type: string; text: string };

export type ScoreBreakdown = {
  growth: number;
  consistency: number;
  stability: number;
  performance: number;
  dataQuality: number;
};

export type DiagnosisFinding = {
  level: "red" | "yellow" | "green";
  title: string;
  impact: "Alto" | "Médio" | "Baixo";
  detail: string;
};

export type ExecutiveDiagnosis = {
  situation: string;
  findings: DiagnosisFinding[];
  summary: {
    criticalIssues: number;
    anomalies: number;
    correlations: number;
    opportunities: number;
    recommendations: number;
  };
};

export type ActionItem = {
  priority: number;
  title: string;
  description: string;
  impact: "Alto" | "Médio" | "Baixo";
  urgency: 1 | 2 | 3 | 4 | 5;
  complexity: "Baixa" | "Média" | "Alta";
  deadline: string;
};

export type ReportData = {
  kind: "tabular" | "unsupported";
  generatedAt: string;
  docId: string;
  fileName: string;
  niche: Niche;

  // Executive layer
  score: number;
  scoreLabel: string;
  scoreBreakdown: ScoreBreakdown;
  summary: string;
  conclusion: string;
  conclusionFree: string;

  kpis: Kpi[];
  trends: Trend[];
  insights: string[];
  insightsFree: string[];
  alerts: Alert[];
  recommendations: string[];
  correlations: Correlation[];
  anomalies: Anomaly[];
  charts: ChartSeries[];

  diagnosis: ExecutiveDiagnosis;
  actionPlan: ActionItem[];

  dataQuality: {
    score: number;
    missing: number;
    duplicates: number;
    issues: string[];
  };

  // Raw (for tables in UI/PDF)
  rowCount: number;
  columnCount: number;
  columns: string[];
  numericStats: NumericStat[];
  categoricalTop: CategoricalStat[];
  sampleRows: Record<string, unknown>[];

  // Pipeline v2 — classificação inteligente
  columnProfiles?: Record<string, ColumnProfile>;
};

/* -------------------- helpers -------------------- */


const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return fmt(n);
};

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[R$\s.]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    if (Number.isFinite(n) && /\d/.test(v)) return n;
  }
  return null;
};

const isDateLike = (v: unknown): boolean => {
  if (v instanceof Date) return true;
  if (typeof v === "string" && /\d{4}-\d{2}|\d{2}\/\d{2}/.test(v)) {
    const t = Date.parse(v);
    return !isNaN(t);
  }
  return false;
};

const median = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const stddev = (arr: number[], mean: number) => {
  if (arr.length < 2) return 0;
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
};

const pearson = (xs: number[], ys: number[]): number => {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i];
    sxx += xs[i] * xs[i]; syy += ys[i] * ys[i];
    sxy += xs[i] * ys[i];
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (!den) return 0;
  return num / den;
};

const docId = (): string => {
  const d = new Date();
  const dt = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RA-${dt}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

const classify = (s: number): string => {
  if (s >= 90) return "Excelente";
  if (s >= 75) return "Muito bom";
  if (s >= 60) return "Bom";
  if (s >= 40) return "Regular";
  return "Crítico";
};

const guessMonetary = (col: string): boolean =>
  /(receita|faturamento|venda|valor|preco|preço|revenue|sales|amount|total|ticket|lucro|custo|despesa)/i.test(col);

const guessSatisfaction = (col: string): boolean =>
  /(satisf|nps|csat|rating|nota|score)/i.test(col);

const guessClient = (col: string): boolean =>
  /(client|customer|usuari|user|conta)/i.test(col);

/* -------------------- main -------------------- */

export async function analyzeFile(file: File): Promise<ReportData> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const now = new Date().toISOString();
  const id = docId();

  if (ext === "pdf") {
    return emptyReport(file.name, now, id, "unsupported", [
      `O arquivo PDF "${file.name}" foi recebido com sucesso.`,
      "A extração estruturada de dados de PDF está em evolução.",
    ]);
  }

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) {
    return emptyReport(file.name, now, id, "tabular", ["Arquivo sem dados estruturados para análise."]);
  }

  const columns = Object.keys(rows[0]);

  /* -------- Etapa 1: classificação inteligente de colunas -------- */
  const columnProfiles = classifyColumns(rows);

  const numericStats: NumericStat[] = [];
  const categoricalTop: CategoricalStat[] = [];
  const numericSeries: Record<string, number[]> = {};
  let dateColumn: string | null = null;

  let totalCells = 0;
  let missingCells = 0;
  const rowKeys = new Set<string>();
  let duplicateRows = 0;

  for (const r of rows) {
    const key = JSON.stringify(r);
    if (rowKeys.has(key)) duplicateRows++;
    else rowKeys.add(key);
    for (const c of columns) {
      totalCells++;
      const v = r[c];
      if (v === null || v === undefined || v === "") missingCells++;
    }
  }

  for (const col of columns) {
    const nums: number[] = [];
    const buckets = new Map<string, number>();
    let nonNull = 0;
    let dateLike = 0;
    for (const r of rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      nonNull++;
      if (isDateLike(v)) dateLike++;
      const n = toNumber(v);
      if (n !== null) nums.push(n);
      const key = String(v).slice(0, 40);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    if (!dateColumn && dateLike >= nonNull * 0.6 && dateLike >= 3) {
      dateColumn = col;
    }

    if (nums.length >= Math.max(3, nonNull * 0.6)) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const first = nums[0];
      const last = nums[nums.length - 1];
      const growthPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;
      const trend: NumericStat["trend"] =
        growthPct === null ? "flat" : growthPct > 3 ? "up" : growthPct < -3 ? "down" : "flat";
      numericStats.push({
        column: col,
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean,
        median: median(nums),
        stddev: stddev(nums, mean),
        sum,
        count: nums.length,
        growthPct,
        trend,
      });
      numericSeries[col] = nums;
    } else if (buckets.size > 1 && buckets.size <= Math.max(20, nonNull * 0.9)) {
      const top = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
      categoricalTop.push({ column: col, values: top, unique: buckets.size });
    }
  }

  /* -------- Etapa 2: filtrar stats de colunas onde tendência/agregação não faz sentido
   * (IDs, datas, demográficas — ex.: crescimento de idade / de data de admissão) -------- */
  const trendableStats = numericStats.filter((s) => {
    const p = columnProfiles[s.column];
    if (!p) return true;
    return p.allow.trend && p.allow.aggregation;
  });
  // Preferir dateColumn detectado pelo classificador
  if (!dateColumn) {
    const dateProfile = Object.values(columnProfiles).find((p) => p.type === "date");
    if (dateProfile) dateColumn = dateProfile.name;
  }

  const kpis: Kpi[] = [];
  const moneyCol =
    trendableStats.find((s) => columnProfiles[s.column]?.type === "monetary") ??
    trendableStats.find((s) => guessMonetary(s.column));
  const satCol =
    trendableStats.find((s) => columnProfiles[s.column]?.type === "kpi") ??
    trendableStats.find((s) => guessSatisfaction(s.column));
  const clientCol = trendableStats.find((s) => guessClient(s.column));
  const headline = moneyCol ?? trendableStats.slice().sort((a, b) => b.sum - a.sum)[0];

  if (headline) {
    const isMoney = columnProfiles[headline.column]?.type === "monetary" || guessMonetary(headline.column);
    const prefix = isMoney ? "R$ " : "";
    kpis.push({ label: `Total · ${headline.column}`, value: `${prefix}${fmtCompact(headline.sum)}` });
    kpis.push({ label: `Média · ${headline.column}`, value: `${prefix}${fmtCompact(headline.mean)}` });
    kpis.push({ label: `Melhor resultado`, value: `${prefix}${fmtCompact(headline.max)}`, tone: "positive" });
    if (headline.growthPct !== null) {
      const tone: Kpi["tone"] = headline.growthPct >= 0 ? "positive" : "negative";
      kpis.push({
        label: "Crescimento no período",
        value: `${headline.growthPct >= 0 ? "+" : ""}${headline.growthPct.toFixed(1)}%`,
        tone,
      });
    }
  }
  if (clientCol) {
    kpis.push({ label: `Total · ${clientCol.column}`, value: fmtCompact(clientCol.sum) });
  }
  if (satCol) {
    kpis.push({ label: `Satisfação média`, value: satCol.mean.toFixed(2), tone: satCol.mean >= 4 ? "positive" : "neutral" });
  }

  /* -------- Etapa 3: KPIs específicos por nicho (Hospital, RH, E-commerce, etc.) -------- */
  const detectedNiche = detectNiche(columns, rows.slice(0, 20));
  const nicheKpis = generateNicheKpis(detectedNiche, {
    numericStats: trendableStats,
    categoricalTop,
    profiles: columnProfiles,
    rowCount: rows.length,
  });
  // Mescla evitando duplicar rótulos
  const seenLabels = new Set(kpis.map((k) => k.label));
  for (const k of nicheKpis) {
    if (!seenLabels.has(k.label)) { kpis.push(k); seenLabels.add(k.label); }
  }
  const finalKpis = kpis.slice(0, 8);


  /* -------- Trends -------- (apenas colunas que aceitam tendência) */
  const trends: Trend[] = [];
  for (const s of trendableStats) {
    if (s.growthPct === null) continue;
    const abs = Math.abs(s.growthPct);
    if (abs < 5) {
      trends.push({ icon: "flat", text: `${s.column} manteve-se estável ao longo do período (variação de ${s.growthPct.toFixed(1)}%).` });
    } else if (s.growthPct > 0) {
      trends.push({ icon: "up", text: `Crescimento de ${s.growthPct.toFixed(1)}% em ${s.column} entre o início e o fim do período analisado.` });
    } else {
      trends.push({ icon: "down", text: `Retração de ${Math.abs(s.growthPct).toFixed(1)}% em ${s.column} ao longo do período.` });
    }
  }
  const topTrend = trends.slice(0, 5);

  /* -------- Correlations -------- (filtradas: sem id×id, sem data×data, sem mesma raiz) */
  const correlations: Correlation[] = [];
  const numCols = Object.keys(numericSeries).filter((c) => {
    const p = columnProfiles[c];
    return !p || p.allow.correlation;
  });
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const pa = columnProfiles[numCols[i]];
      const pb = columnProfiles[numCols[j]];
      if (pa && pb && !isMeaningfulCorrelationPair(pa, pb)) continue;

      const r = pearson(numericSeries[numCols[i]], numericSeries[numCols[j]]);
      if (Math.abs(r) >= 0.6) {
        const strength = Math.abs(r) >= 0.85 ? "muito forte" : Math.abs(r) >= 0.7 ? "forte" : "moderada";
        const direction: Correlation["direction"] = r > 0 ? "positive" : "negative";
        // Interpretação: sempre explicar o significado, não só o número.
        const meaning = direction === "positive"
          ? `Quando ${numCols[i]} varia, ${numCols[j]} tende a variar no mesmo sentido — indica uma alavanca conjunta que pode ser explorada estrategicamente.`
          : `Quando ${numCols[i]} sobe, ${numCols[j]} tende a recuar — sugere um trade-off que exige decisão estratégica, não apenas operacional.`;
        correlations.push({
          a: numCols[i],
          b: numCols[j],
          r,
          strength,
          direction,
          text: `Correlação ${strength} ${direction === "positive" ? "positiva" : "negativa"} entre ${numCols[i]} e ${numCols[j]} (r=${r.toFixed(2)}). ${meaning}`,
        });
      }
    }
  }
  correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));


  /* -------- Anomalies -------- (apenas colunas onde queda/pico faz sentido) */
  const anomalies: Anomaly[] = [];
  for (const s of trendableStats) {
    if (s.stddev === 0) continue;
    const series = numericSeries[s.column];
    const outliers = series.filter((v) => Math.abs(v - s.mean) > 2.5 * s.stddev);
    if (outliers.length > 0) {
      anomalies.push({
        column: s.column,
        type: "Valores extremos",
        text: `${outliers.length} valor(es) atípico(s) em ${s.column}, distantes mais de 2,5 desvios da média.`,
      });
    }
    // Sharp drops
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      if (prev === 0) continue;
      const delta = ((series[i] - prev) / Math.abs(prev)) * 100;
      if (delta <= -30) {
        anomalies.push({
          column: s.column,
          type: "Queda abrupta",
          text: `Queda de ${delta.toFixed(1)}% em ${s.column} em um único intervalo.`,
        });
        break;
      }
      if (delta >= 80) {
        anomalies.push({
          column: s.column,
          type: "Pico atípico",
          text: `Pico de ${delta.toFixed(1)}% em ${s.column} em um único intervalo.`,
        });
        break;
      }
    }
  }

  /* -------- Insights (Premium: interpretativos, causais, estratégicos) -------- */
  const insights: string[] = [];
  const totalMoney = moneyCol?.sum ?? 0;
  const topCatTotalShare = (() => {
    const c = categoricalTop[0];
    if (!c) return null;
    const total = c.values.reduce((a, b) => a + b.count, 0);
    return { col: c.column, dom: c.values[0], share: (c.values[0].count / total) * 100, total };
  })();

  if (headline) {
    const g = headline.growthPct;
    if (g !== null && g >= 10) {
      const driver = topCatTotalShare ? ` impulsionado principalmente por "${topCatTotalShare.dom.name}" em ${topCatTotalShare.col}, responsável por ${topCatTotalShare.share.toFixed(0)}% do volume.` : ".";
      insights.push(`${headline.column} cresceu ${g.toFixed(1)}% no período,${driver} O ritmo indica que as ações vigentes estão gerando tração real e devem ser mantidas para sustentar o resultado.`);
    } else if (g !== null && g <= -10) {
      insights.push(`${headline.column} recuou ${Math.abs(g).toFixed(1)}% no período, um sinal amarelo que sugere queda de demanda, perda de eficiência ou mudança no comportamento dos clientes. Recomenda-se uma investigação de raiz antes do próximo ciclo.`);
    } else if (g !== null) {
      insights.push(`${headline.column} manteve-se estável (${g.toFixed(1)}%), o que indica um platô. Estabilidade é boa em cenários maduros, mas se o objetivo é crescer, o platô é um sinal de que novas alavancas precisam entrar em jogo.`);
    }
    const cv = headline.mean !== 0 ? (headline.stddev / Math.abs(headline.mean)) * 100 : 0;
    if (cv > 60) {
      insights.push(`Há alta variabilidade em ${headline.column} (dispersão de ${cv.toFixed(0)}%), o que sugere processos pouco padronizados ou dependência de poucos eventos grandes. Reduzir essa oscilação torna o resultado mais previsível e o planejamento mais confiável.`);
    } else if (cv < 25 && cv > 0) {
      insights.push(`A baixa dispersão em ${headline.column} (${cv.toFixed(0)}%) mostra um resultado consistente — é uma base sólida para escalar, pois o comportamento é previsível.`);
    }
  }

  if (clientCol && moneyCol) {
    const clientG = clientCol.growthPct, moneyG = moneyCol.growthPct;
    if (clientG !== null && moneyG !== null) {
      if (clientG > 5 && moneyG < clientG - 3) {
        insights.push(`A base de ${clientCol.column} cresceu ${clientG.toFixed(1)}%, mas ${moneyCol.column} cresceu apenas ${moneyG.toFixed(1)}%. Isso indica expansão por volume, não por valor — o ticket médio pode estar caindo. Explorar upsell e cross-sell nesta base tende a destravar receita adicional sem novo custo de aquisição.`);
      } else if (moneyG > clientG + 5) {
        insights.push(`${moneyCol.column} cresceu mais rápido (${moneyG.toFixed(1)}%) do que a base de ${clientCol.column} (${clientG.toFixed(1)}%), o que sinaliza aumento do ticket médio — os clientes atuais estão consumindo mais. Vale mapear os fatores desse ganho e replicá-los.`);
      }
    }
  }

  if (topCatTotalShare && topCatTotalShare.share > 50) {
    insights.push(`"${topCatTotalShare.dom.name}" concentra ${topCatTotalShare.share.toFixed(0)}% em ${topCatTotalShare.col}. Essa concentração é uma força hoje, mas também um risco de dependência — uma diversificação gradual reduz a exposição a mudanças de mercado nessa categoria.`);
  } else if (topCatTotalShare && topCatTotalShare.share < 25) {
    insights.push(`A distribuição em ${topCatTotalShare.col} é bastante fragmentada (líder com apenas ${topCatTotalShare.share.toFixed(0)}%). Isso reduz risco de dependência, mas pode indicar que nenhum segmento está sendo trabalhado com foco suficiente para se destacar.`);
  }

  if (satCol && moneyCol) {
    if (satCol.mean >= 4 && (moneyCol.growthPct ?? 0) > 0) {
      insights.push(`A satisfação em ${satCol.column} (${satCol.mean.toFixed(2)}) acompanha o crescimento de ${moneyCol.column} — sinal saudável de que os clientes que geram receita também estão satisfeitos, reduzindo risco de churn no médio prazo.`);
    } else if (satCol.mean < 3.5) {
      insights.push(`A satisfação está em ${satCol.mean.toFixed(2)}, abaixo do patamar seguro (4,0). Mesmo com números atuais estáveis, satisfação baixa costuma preceder queda de retenção — deve ser tratada como prioridade tática.`);
    }
  }

  for (const c of correlations.slice(0, 2)) {
    if (c.direction === "positive") {
      insights.push(`Existe correlação ${c.strength} positiva entre ${c.a} e ${c.b} (r=${c.r.toFixed(2)}) — mover uma alavanca tende a mover a outra na mesma direção, o que abre oportunidade para construir um indicador composto e agir sobre ambas simultaneamente.`);
    } else {
      insights.push(`${c.a} e ${c.b} apresentam correlação ${c.strength} negativa (r=${c.r.toFixed(2)}). Isso sugere um trade-off: crescer em um lado tende a pressionar o outro; a decisão passa a ser estratégica, não operacional.`);
    }
  }

  for (const a of anomalies.slice(0, 2)) {
    insights.push(`Anomalia relevante detectada em ${a.column}: ${a.text.toLowerCase().replace(/\.$/, "")}. Vale investigar se foi um evento pontual (campanha, sazonalidade, erro de registro) ou uma mudança estrutural — a leitura correta muda a decisão a tomar.`);
  }

  if (missingCells / Math.max(1, totalCells) > 0.1) {
    insights.push(`Cerca de ${((missingCells / totalCells) * 100).toFixed(0)}% dos campos estão vazios. Antes de tomar decisões críticas com estes dados, considere um esforço de higienização — insights construídos sobre dados incompletos podem enviesar prioridades.`);
  }

  if (insights.length === 0) {
    insights.push("Os dados estão consistentes, sem oscilações materiais ou anomalias relevantes. Este é um bom momento para definir metas mais ambiciosas e novas alavancas de crescimento, já que a base atual é previsível.");
  }
  const finalInsights = insights.slice(0, 10);

  /* -------- Alerts -------- */
  const alerts: Alert[] = [];
  for (const s of numericStats) {
    if (s.growthPct !== null && s.growthPct <= -15) {
      alerts.push({ severity: "red", text: `Queda superior a 15% em ${s.column} ao longo do período.` });
    } else if (s.stddev !== 0 && s.mean !== 0 && (s.stddev / Math.abs(s.mean)) > 0.7) {
      alerts.push({ severity: "yellow", text: `Oscilação acima da média em ${s.column}, com alta variabilidade.` });
    }
  }
  for (const a of anomalies.slice(0, 2)) {
    if (a.type === "Queda abrupta") alerts.push({ severity: "red", text: a.text });
    else alerts.push({ severity: "yellow", text: a.text });
  }
  if (missingCells / Math.max(1, totalCells) > 0.15) {
    alerts.push({ severity: "yellow", text: `Aproximadamente ${((missingCells / totalCells) * 100).toFixed(0)}% dos campos estão vazios — qualidade dos dados pode comprometer a análise.` });
  }
  if (alerts.length === 0) alerts.push({ severity: "green", text: "Nenhum alerta crítico identificado nos indicadores analisados." });

  /* -------- Recommendations -------- */
  const recommendations: string[] = [];
  if (headline && headline.growthPct !== null && headline.growthPct > 0) {
    recommendations.push(`Manter as estratégias que sustentaram o crescimento de ${headline.column} no período e replicar os fatores de sucesso para outras frentes.`);
  }
  if (headline && headline.growthPct !== null && headline.growthPct < 0) {
    recommendations.push(`Mapear as causas da retração em ${headline.column} e priorizar ações corretivas nos próximos ciclos.`);
  }
  if (clientCol) {
    recommendations.push(`Investir em retenção e expansão da base de ${clientCol.column}, dada a relação direta com o resultado.`);
  }
  if (satCol && satCol.mean < 4) {
    recommendations.push(`Atuar no nível de satisfação (${satCol.mean.toFixed(2)}) com programas de pós-venda, suporte e melhoria de experiência.`);
  }
  if (correlations.length > 0) {
    recommendations.push(`Aproveitar a relação entre ${correlations[0].a} e ${correlations[0].b} para construir indicadores compostos de acompanhamento.`);
  }
  if (anomalies.length > 0) {
    recommendations.push(`Investigar os pontos de oscilação identificados e implementar controles de monitoramento mensal.`);
  }
  if (alerts.some((a) => a.severity === "red")) {
    recommendations.push(`Tratar como prioridade os alertas vermelhos do relatório antes do próximo ciclo de planejamento.`);
  }
  if (recommendations.length < 3) {
    recommendations.push(`Estabelecer rotina mensal de geração de relatórios para acompanhar a evolução dos indicadores ao longo do tempo.`);
  }
  const finalRecs = recommendations.slice(0, 6);

  /* -------- Score -------- */
  let growthScore = 70;
  if (headline?.growthPct !== null && headline?.growthPct !== undefined) {
    growthScore = Math.max(0, Math.min(100, 60 + headline.growthPct * 1.2));
  }
  const meanCv = numericStats.length
    ? numericStats.reduce((a, s) => a + (s.mean !== 0 ? Math.abs(s.stddev / s.mean) : 0), 0) / numericStats.length
    : 0.3;
  const consistencyScore = Math.max(0, Math.min(100, 100 - meanCv * 80));
  const stabilityScore = Math.max(0, Math.min(100, 100 - anomalies.length * 12));
  const performanceScore = headline && headline.mean > 0
    ? Math.max(40, Math.min(100, 60 + (headline.max - headline.mean) / Math.max(1, headline.mean) * 25))
    : 70;
  const missingPct = totalCells ? (missingCells / totalCells) * 100 : 0;
  const dupPct = rows.length ? (duplicateRows / rows.length) * 100 : 0;
  const dataQualityScore = Math.max(0, Math.min(100, 100 - missingPct * 1.5 - dupPct * 2));

  const score = Math.round(
    growthScore * 0.25 +
    consistencyScore * 0.2 +
    stabilityScore * 0.2 +
    performanceScore * 0.15 +
    dataQualityScore * 0.2,
  );

  /* -------- Charts -------- */
  const charts: ChartSeries[] = [];
  if (dateColumn && headline) {
    const points: ChartPoint[] = [];
    for (const r of rows) {
      const lbl = String(r[dateColumn] ?? "");
      const v = toNumber(r[headline.column]);
      if (lbl && v !== null) points.push({ label: lbl, value: v });
    }
    if (points.length >= 3) charts.push({ kind: "line", title: `Evolução · ${headline.column}`, column: headline.column, data: points.slice(-24) });
  }
  if (trendableStats.length > 0) {
    charts.push({
      kind: "bar",
      title: "Totais por métrica",
      column: "_totals",
      data: [...trendableStats]
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 6)
        .map((s) => ({ label: s.column, value: s.sum })),
    });
  }
  if (categoricalTop[0]) {
    const c = categoricalTop[0];
    charts.push({
      kind: "pie",
      title: `Composição · ${c.column}`,
      column: c.column,
      data: c.values.map((v) => ({ label: v.name, value: v.count })),
    });
  }

  /* -------- Executive summary -------- */
  const direction =
    headline?.growthPct === null || headline?.growthPct === undefined
      ? "estável"
      : headline.growthPct > 5
        ? "positiva"
        : headline.growthPct < -5
          ? "negativa"
          : "estável";
  // Resumo executivo humanizado — escrito como um consultor sênior.
  const nicheLabel = NICHES[detectedNiche]?.label?.toLowerCase() ?? "";
  const sectorPhrase = detectedNiche !== "generic" ? ` no contexto ${nicheLabel}` : "";
  const dqPhrase =
    missingCells / Math.max(1, totalCells) > 0.15
      ? " Vale destacar que a qualidade dos dados apresenta lacunas relevantes, o que pede prudência na leitura dos números."
      : "";
  const summary = headline
    ? (direction === "positiva"
        ? `Os dados analisados indicam um cenário${sectorPhrase} de expansão consistente, com ${headline.column} apresentando evolução sustentada ao longo do período e alcançando ${fmtCompact(headline.max)} como pico. O comportamento observado sugere que as iniciativas em curso estão gerando tração real, sem sinais de perda de eficiência.${satCol ? ` A satisfação (${satCol.mean.toFixed(2)}) acompanha o crescimento, reduzindo o risco de churn no curto prazo.` : ""}${correlations[0] ? ` Chama atenção a relação ${correlations[0].strength} entre ${correlations[0].a} e ${correlations[0].b}, que abre uma alavanca estratégica clara.` : ""}${dqPhrase}`
        : direction === "negativa"
          ? `A análise identificou um cenário${sectorPhrase} de desaceleração, com ${headline.column} apresentando retração relevante no período. O movimento não parece pontual e recomenda diagnóstico de raiz antes do próximo ciclo, sob risco de comprometer o resultado do trimestre.${satCol ? ` O nível de satisfação (${satCol.mean.toFixed(2)}) reforça a leitura de que há espaço para revisão da experiência entregue.` : ""}${correlations[0] ? ` A relação ${correlations[0].strength} entre ${correlations[0].a} e ${correlations[0].b} deve ser considerada ao desenhar as ações corretivas.` : ""}${dqPhrase}`
          : `Os indicadores${sectorPhrase} apresentam comportamento estável, sem oscilações materiais em ${headline.column}. Estabilidade é positiva em cenários maduros, mas indica que o resultado atingiu um platô — sustentar crescimento no próximo ciclo exigirá novas alavancas.${satCol ? ` A satisfação em ${satCol.mean.toFixed(2)} é um bom ponto de partida para explorar iniciativas de expansão.` : ""}${correlations[0] ? ` A leitura integrada com a correlação entre ${correlations[0].a} e ${correlations[0].b} pode apoiar as próximas decisões.` : ""}${dqPhrase}`)
    : `Os dados foram organizados em uma visão executiva${sectorPhrase}. Não foram identificados desvios materiais nas dimensões analisadas, o que sugere um cenário operacional estável e coerente com o padrão esperado.${dqPhrase}`;


  /* -------- Conclusion (unique per report, data-driven) -------- */
  const criticalCount = alerts.filter((a) => a.severity === "red").length;
  const yellowCount = alerts.filter((a) => a.severity === "yellow").length;
  const oppCount = correlations.length + (headline && (headline.growthPct ?? 0) > 5 ? 1 : 0) + (satCol && satCol.mean >= 4 ? 1 : 0);
  const dqLabel = dataQualityScore >= 90 ? "excelente" : dataQualityScore >= 70 ? "adequada" : "limitada";
  const scoreLabelText = score >= 85 ? "excelente" : score >= 70 ? "sólido" : score >= 55 ? "razoável" : "abaixo do esperado";
  const sectorTxt = detectedNiche !== "generic" ? ` no segmento ${nicheLabel}` : "";
  const headlineTxt = headline
    ? `${headline.column} ${
        direction === "positiva"
          ? `avançou ${(headline.growthPct ?? 0).toFixed(1)}% no período, atingindo pico de ${fmtCompact(headline.max)}`
          : direction === "negativa"
            ? `recuou ${Math.abs(headline.growthPct ?? 0).toFixed(1)}% no período, com média de ${fmtCompact(headline.mean)}`
            : `permaneceu estável em torno de ${fmtCompact(headline.mean)}`
      }`
    : "os indicadores analisados permaneceram dentro do padrão esperado";
  const corrTxt = correlations[0]
    ? ` A relação ${correlations[0].strength} ${correlations[0].direction === "positive" ? "positiva" : "negativa"} entre ${correlations[0].a} e ${correlations[0].b} (r=${correlations[0].r.toFixed(2)}) é a alavanca mais relevante identificada e deve orientar a priorização das próximas iniciativas.`
    : "";
  const concentrationTxt = topCatTotalShare && topCatTotalShare.share > 40
    ? ` A concentração de ${topCatTotalShare.share.toFixed(0)}% em "${topCatTotalShare.dom.name}" dentro de ${topCatTotalShare.col} configura ${topCatTotalShare.share > 60 ? "um risco material de dependência" : "uma dependência que merece monitoramento"}.`
    : "";
  const satTxt = satCol
    ? ` A satisfação média de ${satCol.mean.toFixed(2)} ${satCol.mean >= 4 ? "sustenta o cenário e reduz risco de churn no curto prazo" : satCol.mean < 3.5 ? "é um sinal de alerta antecipado sobre retenção" : "está em patamar limítrofe e deve ser acompanhada"}.`
    : "";
  const anomalyTxt = anomalies.length > 0
    ? ` Foram identificadas ${anomalies.length} anomalia(s) relevante(s) que exigem investigação de causa-raiz antes de generalizar conclusões.`
    : "";
  const dqTxt = missingPct > 15
    ? ` A qualidade dos dados é ${dqLabel} (${missingPct.toFixed(0)}% de campos vazios), o que pede prudência na leitura dos números.`
    : ` A qualidade dos dados é ${dqLabel}, o que dá confiança às conclusões deste diagnóstico.`;

  const outlookPro = direction === "positiva"
    ? `Recomenda-se preservar as alavancas que sustentaram a evolução observada${headline ? ` em ${headline.column}` : ""}, mapear os fatores replicáveis para outras frentes e reinvestir parte do ganho em iniciativas de expansão. O próximo ciclo deve focar em consolidar o crescimento e testar novas hipóteses de escala, sem comprometer a base atual.`
    : direction === "negativa"
      ? `A prioridade do próximo ciclo é conter a retração${headline ? ` observada em ${headline.column}` : ""}: revisar processos, isolar as causas de perda de eficiência e agir sobre os pontos críticos antes do fechamento do trimestre. As recomendações listadas neste relatório foram ordenadas por impacto — atacar as três primeiras deve reverter parte relevante do movimento observado.`
      : `Com o cenário em platô, a expansão exigirá novas alavancas — apenas repetir o que já é feito tende a manter o mesmo resultado. Recomenda-se definir 2 ou 3 hipóteses claras de crescimento${correlations[0] ? `, começando pela relação identificada entre ${correlations[0].a} e ${correlations[0].b}` : ""}, com metas mensais e checkpoints de leitura.`;

  const conclusion =
    `O RelataAI concluiu a análise${sectorTxt} atribuindo um score global de ${score}/100 (${scoreLabelText}). ${headlineTxt.charAt(0).toUpperCase() + headlineTxt.slice(1)}, o que sinaliza um cenário ${
      direction === "positiva" ? "de tração positiva" : direction === "negativa" ? "que exige intervenção" : "de estabilidade operacional"
    }.` +
    `${corrTxt}${concentrationTxt}${satTxt}${anomalyTxt}${dqTxt}` +
    ` No consolidado, foram mapeados ${finalInsights.length} insight(s) estratégico(s), ${oppCount} oportunidade(s) e ${criticalCount + yellowCount} ponto(s) de atenção (${criticalCount} crítico(s) e ${yellowCount} moderado(s)). ` +
    outlookPro +
    ` As ${finalRecs.length} recomendações listadas foram desenhadas especificamente a partir do comportamento dos dados enviados — trate-as como um plano de ação priorizado para o próximo ciclo, não como sugestões genéricas.`;

  /* -------- FREE tier: shallow insights + partial conclusion -------- */
  const insightsFree: string[] = [];
  const shallowStats = [...numericStats]
    .filter((s) => s.growthPct !== null)
    .sort((a, b) => Math.abs((b.growthPct ?? 0)) - Math.abs((a.growthPct ?? 0)))
    .slice(0, 3);
  for (const s of shallowStats) {
    const g = s.growthPct ?? 0;
    if (g <= -10) insightsFree.push(`${s.column} apresentou queda significativa durante o período.`);
    else if (g >= 10) insightsFree.push(`${s.column} apresentou crescimento relevante no período.`);
    else insightsFree.push(`${s.column} manteve-se em patamar estável durante o período.`);
  }
  if (insightsFree.length < 3 && topCatTotalShare) {
    insightsFree.push(`Foi identificada uma concentração em "${topCatTotalShare.dom.name}" dentro de ${topCatTotalShare.col}.`);
  }
  while (insightsFree.length < 3) {
    insightsFree.push("A IA identificou padrões adicionais nos seus dados.");
  }
  insightsFree.push("🔒 A IA identificou outros padrões importantes disponíveis apenas no Plano PRO.");

  // Conclusão gratuita: enxuta, específica ao arquivo, sem entregar o plano de ação.
  const freeHeadline = headline
    ? `${headline.column} ${
        direction === "positiva"
          ? `apresentou tendência de crescimento`
          : direction === "negativa"
            ? `apresentou tendência de queda`
            : `manteve-se estável`
      }`
    : "os principais indicadores permaneceram dentro do padrão";
  const freeSignal = criticalCount > 0
    ? ` Foram detectados ${criticalCount} ponto(s) crítico(s) que merecem atenção.`
    : oppCount > 0
      ? ` Foram detectadas oportunidades relevantes de melhoria.`
      : "";
  const conclusionFree =
    `Diagnóstico inicial${sectorTxt}: ${freeHeadline}, com score global de ${score}/100.${freeSignal} ` +
    `Este é um resumo introdutório — as correlações completas, anomalias detalhadas, plano de ação priorizado e a análise executiva aprofundada estão disponíveis no Plano PRO.`;

  /* -------- PRO tier: Executive Diagnosis -------- */
  const criticalIssues = alerts.filter((a) => a.severity === "red").length;
  const opportunities = correlations.length + (headline && (headline.growthPct ?? 0) > 5 ? 1 : 0) + (satCol && satCol.mean >= 4 ? 1 : 0);

  const situation = headline
    ? `A IA identificou ${
        direction === "negativa"
          ? "desaceleração"
          : direction === "positiva"
            ? "evolução consistente"
            : "comportamento estável"
      } nos indicadores financeiros e operacionais${
        correlations[0] ? `, acompanhada de ${correlations[0].strength} correlação entre ${correlations[0].a} e ${correlations[0].b}` : ""
      }. A qualidade dos dados é ${dataQualityScore >= 90 ? "excelente" : dataQualityScore >= 70 ? "adequada" : "limitada"}, ${
        criticalIssues > 0
          ? `porém existem ${criticalIssues} ponto(s) crítico(s) que exigem intervenção para evitar redução de desempenho nos próximos ciclos.`
          : anomalies.length > 0
            ? `e ${anomalies.length} anomalia(s) merecem monitoramento nos próximos ciclos.`
            : "e o cenário atual é favorável à continuidade das estratégias vigentes."
      }`
    : "A IA processou o dataset e organizou uma visão executiva a partir dos padrões observados.";

  const findings: DiagnosisFinding[] = [];
  if (headline && (headline.growthPct ?? 0) <= -10) {
    findings.push({
      level: "red",
      title: `${headline.column} em queda`,
      impact: "Alto",
      detail: `Retração de ${Math.abs(headline.growthPct ?? 0).toFixed(1)}% exige intervenção prioritária.`,
    });
  } else if (headline && (headline.growthPct ?? 0) >= 10) {
    findings.push({
      level: "green",
      title: `${headline.column} em crescimento`,
      impact: "Alto",
      detail: `Evolução de ${(headline.growthPct ?? 0).toFixed(1)}% sustenta o resultado do período.`,
    });
  }
  const volatile = numericStats.find((s) => s.mean !== 0 && Math.abs(s.stddev / s.mean) > 0.6);
  if (volatile) {
    findings.push({
      level: "yellow",
      title: `Oscilação elevada em ${volatile.column}`,
      impact: "Médio",
      detail: "Alta variabilidade — necessita monitoramento contínuo.",
    });
  }
  findings.push({
    level: dataQualityScore >= 90 ? "green" : dataQualityScore >= 70 ? "yellow" : "red",
    title: "Qualidade dos dados",
    impact: dataQualityScore >= 90 ? "Baixo" : "Médio",
    detail: dataQualityScore >= 90
      ? `${Math.round(dataQualityScore)}% — nenhuma inconsistência relevante encontrada.`
      : `${Math.round(dataQualityScore)}% — foram detectados campos vazios ou duplicidades.`,
  });
  if (anomalies.length > 0 && findings.length < 4) {
    findings.push({
      level: "yellow",
      title: `${anomalies.length} anomalia(s) detectada(s)`,
      impact: "Médio",
      detail: anomalies[0].text,
    });
  }

  const diagnosis: ExecutiveDiagnosis = {
    situation,
    findings: findings.slice(0, 4),
    summary: {
      criticalIssues,
      anomalies: anomalies.length,
      correlations: correlations.length,
      opportunities,
      recommendations: finalRecs.length,
    },
  };

  /* -------- PRO tier: Action Plan -------- */
  const actionPlan: ActionItem[] = [];
  const pushAction = (a: Omit<ActionItem, "priority">) => {
    actionPlan.push({ priority: actionPlan.length + 1, ...a });
  };
  if (headline && (headline.growthPct ?? 0) < 0) {
    pushAction({
      title: `Investigar a causa da queda em ${headline.column}`,
      description: `Realizar diagnóstico de raiz para identificar os fatores que causaram a retração de ${Math.abs(headline.growthPct ?? 0).toFixed(1)}% e desenhar plano de recuperação.`,
      impact: "Alto",
      urgency: 5,
      complexity: "Média",
      deadline: "15 dias",
    });
  }
  if (alerts.some((a) => a.severity === "red")) {
    pushAction({
      title: "Tratar alertas críticos identificados",
      description: "Priorizar os alertas vermelhos deste relatório e definir responsáveis e prazos para cada ação corretiva.",
      impact: "Alto",
      urgency: 5,
      complexity: "Média",
      deadline: "30 dias",
    });
  }
  if (volatile) {
    pushAction({
      title: `Reduzir a variabilidade em ${volatile.column}`,
      description: "Padronizar processos e implementar controles para reduzir a dispersão do indicador ao longo do tempo.",
      impact: "Médio",
      urgency: 3,
      complexity: "Média",
      deadline: "60 dias",
    });
  }
  if (correlations[0]) {
    pushAction({
      title: `Explorar a relação entre ${correlations[0].a} e ${correlations[0].b}`,
      description: "Utilizar a correlação identificada para construir indicadores compostos e apoiar decisões integradas.",
      impact: "Médio",
      urgency: 3,
      complexity: "Baixa",
      deadline: "45 dias",
    });
  }
  if (dataQualityScore < 90) {
    pushAction({
      title: "Melhorar a qualidade dos dados",
      description: "Corrigir campos vazios e duplicidades detectados para elevar a confiabilidade das próximas análises.",
      impact: "Médio",
      urgency: 3,
      complexity: "Baixa",
      deadline: "30 dias",
    });
  }
  if (actionPlan.length < 3) {
    pushAction({
      title: "Estabelecer rotina mensal de análise",
      description: "Definir cadência mensal de geração de relatórios executivos para acompanhar a evolução dos KPIs.",
      impact: "Médio",
      urgency: 2,
      complexity: "Baixa",
      deadline: "Contínuo",
    });
  }
  const finalActionPlan = actionPlan.slice(0, 5).map((a, i) => ({ ...a, priority: i + 1 }));

  const niche = detectedNiche;

  return {
    kind: "tabular",
    generatedAt: now,
    docId: id,
    fileName: file.name,
    niche,

    score,
    scoreLabel: classify(score),
    scoreBreakdown: {
      growth: Math.round(growthScore),
      consistency: Math.round(consistencyScore),
      stability: Math.round(stabilityScore),
      performance: Math.round(performanceScore),
      dataQuality: Math.round(dataQualityScore),
    },
    summary,
    conclusion,
    conclusionFree,
    kpis: finalKpis,
    trends: topTrend,
    insights: finalInsights,
    insightsFree,
    alerts,
    recommendations: finalRecs,
    correlations: correlations.slice(0, 5),
    anomalies: anomalies.slice(0, 6),
    charts,
    diagnosis,
    actionPlan: finalActionPlan,

    dataQuality: {
      score: Math.round(dataQualityScore),
      missing: missingCells,
      duplicates: duplicateRows,
      issues: [
        ...(missingPct > 5 ? [`${missingPct.toFixed(1)}% dos campos estão vazios.`] : []),
        ...(dupPct > 2 ? [`${dupPct.toFixed(1)}% das linhas são duplicadas.`] : []),
        ...(missingPct <= 5 && dupPct <= 2 ? ["Dados consistentes, sem falhas relevantes detectadas."] : []),
      ],
    },

    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    numericStats,
    categoricalTop: categoricalTop.slice(0, 4),
    sampleRows: rows.slice(0, 5),
    columnProfiles,
  };
}

function emptyReport(
  fileName: string,
  generatedAt: string,
  id: string,
  kind: ReportData["kind"],
  insights: string[],
): ReportData {
  return {
    kind,
    generatedAt,
    docId: id,
    fileName,
    niche: "generic",
    score: 0,
    scoreLabel: "Indisponível",
    scoreBreakdown: { growth: 0, consistency: 0, stability: 0, performance: 0, dataQuality: 0 },
    summary: insights[0] ?? "",
    conclusion: "Relatório executivo indisponível para este arquivo.",
    conclusionFree: "Relatório executivo indisponível para este arquivo. Faça upgrade para o Plano PRO para análises completas.",
    kpis: [],
    trends: [],
    insights,
    insightsFree: insights.slice(0, 3),
    alerts: [{ severity: "yellow", text: "Sem dados estruturados suficientes para análise executiva." }],
    recommendations: ["Reenvie o arquivo em formato XLSX, XLS ou CSV com dados estruturados."],
    correlations: [],
    anomalies: [],
    charts: [],
    diagnosis: { situation: "Sem dados suficientes.", findings: [], summary: { criticalIssues: 0, anomalies: 0, correlations: 0, opportunities: 0, recommendations: 0 } },
    actionPlan: [],
    dataQuality: { score: 0, missing: 0, duplicates: 0, issues: [] },
    rowCount: 0,
    columnCount: 0,
    columns: [],
    numericStats: [],
    categoricalTop: [],
    sampleRows: [],
  };
}
