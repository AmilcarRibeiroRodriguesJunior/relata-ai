import * as XLSX from "xlsx";

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

export type ReportData = {
  kind: "tabular" | "unsupported";
  generatedAt: string;
  docId: string;
  fileName: string;

  // Executive layer
  score: number;
  scoreLabel: string;
  scoreBreakdown: ScoreBreakdown;
  summary: string;
  conclusion: string;

  kpis: Kpi[];
  trends: Trend[];
  insights: string[];
  alerts: Alert[];
  recommendations: string[];
  correlations: Correlation[];
  anomalies: Anomaly[];
  charts: ChartSeries[];

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

  /* -------- KPIs -------- */
  const kpis: Kpi[] = [];
  const moneyCol = numericStats.find((s) => guessMonetary(s.column));
  const satCol = numericStats.find((s) => guessSatisfaction(s.column));
  const clientCol = numericStats.find((s) => guessClient(s.column));
  const headline = moneyCol ?? numericStats.slice().sort((a, b) => b.sum - a.sum)[0];

  if (headline) {
    const prefix = guessMonetary(headline.column) ? "R$ " : "";
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
  // Always cap at 6
  const finalKpis = kpis.slice(0, 6);

  /* -------- Trends -------- */
  const trends: Trend[] = [];
  for (const s of numericStats) {
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

  /* -------- Correlations -------- */
  const correlations: Correlation[] = [];
  const numCols = Object.keys(numericSeries);
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const r = pearson(numericSeries[numCols[i]], numericSeries[numCols[j]]);
      if (Math.abs(r) >= 0.6) {
        const strength = Math.abs(r) >= 0.85 ? "muito forte" : Math.abs(r) >= 0.7 ? "forte" : "moderada";
        const direction: Correlation["direction"] = r > 0 ? "positive" : "negative";
        correlations.push({
          a: numCols[i],
          b: numCols[j],
          r,
          strength,
          direction,
          text:
            direction === "positive"
              ? `Identificada correlação ${strength} positiva entre ${numCols[i]} e ${numCols[j]} — quando um cresce, o outro tende a crescer junto.`
              : `Identificada correlação ${strength} negativa entre ${numCols[i]} e ${numCols[j]} — quando um cresce, o outro tende a recuar.`,
        });
      }
    }
  }
  correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  /* -------- Anomalies -------- */
  const anomalies: Anomaly[] = [];
  for (const s of numericStats) {
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

  /* -------- Insights -------- */
  const insights: string[] = [];
  if (headline) {
    if (headline.growthPct !== null && headline.growthPct > 10) {
      insights.push(`Os resultados de ${headline.column} apresentam evolução consistente, com crescimento de ${headline.growthPct.toFixed(1)}% no período avaliado.`);
    } else if (headline.growthPct !== null && headline.growthPct < -10) {
      insights.push(`${headline.column} apresenta retração relevante (${headline.growthPct.toFixed(1)}%), indicando necessidade de revisão estratégica.`);
    } else {
      insights.push(`${headline.column} manteve desempenho estável ao longo do período, sem oscilações materiais.`);
    }
    const cv = headline.mean !== 0 ? (headline.stddev / Math.abs(headline.mean)) * 100 : 0;
    if (cv < 25) {
      insights.push(`A baixa dispersão observada em ${headline.column} reforça a previsibilidade do indicador e dá segurança ao planejamento.`);
    } else if (cv > 60) {
      insights.push(`A alta variabilidade em ${headline.column} sugere oportunidade de padronização e controle de processos.`);
    }
  }
  if (satCol) {
    if (satCol.mean >= 4) insights.push(`A satisfação média (${satCol.mean.toFixed(2)}) está em patamar saudável e sustenta a base de clientes ativa.`);
    else insights.push(`A satisfação média (${satCol.mean.toFixed(2)}) está abaixo do esperado e deve ser tratada como prioridade.`);
  }
  for (const c of correlations.slice(0, 3)) insights.push(c.text);
  if (clientCol && moneyCol) {
    insights.push(`Há sincronia entre evolução de clientes e ${moneyCol.column}, indicando que o crescimento da base sustenta o resultado financeiro.`);
  }
  const topCat = categoricalTop[0];
  if (topCat && topCat.values[0]) {
    const dom = topCat.values[0];
    const totalCat = topCat.values.reduce((a, b) => a + b.count, 0);
    const share = (dom.count / totalCat) * 100;
    if (share > 50) insights.push(`O segmento "${dom.name}" concentra ${share.toFixed(0)}% do total — concentração relevante a ser monitorada do ponto de vista de risco.`);
    else insights.push(`Distribuição equilibrada entre os principais segmentos de ${topCat.column}, indicando diversidade saudável.`);
  }
  if (anomalies.length === 0) insights.push(`Não foram detectadas anomalias relevantes nos indicadores numéricos analisados.`);
  // limit
  const finalInsights = insights.slice(0, 8);

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
  if (numericStats.length > 0) {
    charts.push({
      kind: "bar",
      title: "Totais por métrica",
      column: "_totals",
      data: [...numericStats]
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
  const summary =
    headline
      ? `A análise identificou tendência ${direction} no comportamento dos principais indicadores. ${headline.column} ${
          direction === "positiva"
            ? `apresentou evolução consistente, alcançando ${fmtCompact(headline.max)} como melhor resultado.`
            : direction === "negativa"
              ? `apresentou retração ao longo do período, exigindo atenção estratégica.`
              : `manteve-se em patamar estável, sem oscilações materiais.`
        } ${
          satCol ? `O indicador de satisfação ficou em ${satCol.mean.toFixed(2)}.` : ""
        } ${
          correlations[0] ? `Foi observada relação ${correlations[0].strength} entre ${correlations[0].a} e ${correlations[0].b}, reforçando a leitura integrada dos resultados.` : ""
        }`.trim()
      : `Os dados foram processados e organizados em uma visão estratégica. As principais dimensões analisadas indicam comportamento condizente com o padrão esperado, sem desvios materiais identificados de forma evidente.`;

  const conclusion =
    direction === "positiva"
      ? "Os dados analisados indicam desempenho positivo e evolução consistente dos principais indicadores. Recomenda-se manter as estratégias atualmente adotadas e acompanhar continuamente os indicadores de crescimento para sustentar os resultados observados."
      : direction === "negativa"
        ? "Os indicadores apresentam sinais de desaceleração que demandam atenção imediata. Recomenda-se priorizar as recomendações deste relatório no próximo ciclo de planejamento e monitorar mensalmente a evolução dos KPIs críticos."
        : "Os indicadores apresentam comportamento estável. Recomenda-se aprofundar a leitura combinada entre dimensões e definir metas claras para o próximo período de avaliação.";

  return {
    kind: "tabular",
    generatedAt: now,
    docId: id,
    fileName: file.name,

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
    kpis: finalKpis,
    trends: topTrend,
    insights: finalInsights,
    alerts,
    recommendations: finalRecs,
    correlations: correlations.slice(0, 5),
    anomalies: anomalies.slice(0, 6),
    charts,

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
    score: 0,
    scoreLabel: "Indisponível",
    scoreBreakdown: { growth: 0, consistency: 0, stability: 0, performance: 0, dataQuality: 0 },
    summary: insights[0] ?? "",
    conclusion: "Relatório executivo indisponível para este arquivo.",
    kpis: [],
    trends: [],
    insights,
    alerts: [{ severity: "yellow", text: "Sem dados estruturados suficientes para análise executiva." }],
    recommendations: ["Reenvie o arquivo em formato XLSX, XLS ou CSV com dados estruturados."],
    correlations: [],
    anomalies: [],
    charts: [],
    dataQuality: { score: 0, missing: 0, duplicates: 0, issues: [] },
    rowCount: 0,
    columnCount: 0,
    columns: [],
    numericStats: [],
    categoricalTop: [],
    sampleRows: [],
  };
}
