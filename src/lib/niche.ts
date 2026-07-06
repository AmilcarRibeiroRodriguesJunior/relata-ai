export type Niche =
  | "hospital" | "fitness" | "restaurant" | "hotel"
  | "ecommerce" | "hr" | "finance" | "education" | "generic";

export type NicheMeta = {
  key: Niche;
  label: string;
  emoji: string;
  color: string; // tailwind class
  reportTitle: string;
  kpiHints: string[]; // suggested KPI dimensions
};

export const NICHES: Record<Niche, NicheMeta> = {
  hospital:   { key: "hospital",   label: "Hospitalar",     emoji: "🏥", color: "bg-red-50 text-red-700 border-red-200",       reportTitle: "Relatório Hospitalar",     kpiHints: ["ocupação","consultas","receita","satisfação"] },
  fitness:    { key: "fitness",    label: "Fitness",        emoji: "💪", color: "bg-orange-50 text-orange-700 border-orange-200", reportTitle: "Relatório Fitness",        kpiHints: ["matrículas","cancelamentos","retenção","receita"] },
  restaurant: { key: "restaurant", label: "Restaurante",    emoji: "🍽️", color: "bg-amber-50 text-amber-700 border-amber-200",   reportTitle: "Relatório Restaurante",    kpiHints: ["ticket médio","delivery","clientes","faturamento"] },
  hotel:      { key: "hotel",      label: "Hotelaria",      emoji: "🏨", color: "bg-indigo-50 text-indigo-700 border-indigo-200", reportTitle: "Relatório Hotelaria",      kpiHints: ["ocupação","diária média","RevPAR","satisfação"] },
  ecommerce:  { key: "ecommerce",  label: "E-commerce",     emoji: "🛒", color: "bg-emerald-50 text-emerald-700 border-emerald-200", reportTitle: "Relatório Comercial",  kpiHints: ["pedidos","ticket médio","conversão","devoluções"] },
  hr:         { key: "hr",         label: "Recursos Humanos", emoji: "👥", color: "bg-violet-50 text-violet-700 border-violet-200", reportTitle: "Relatório de RH",        kpiHints: ["turnover","absenteísmo","ativos","desligamentos"] },
  finance:    { key: "finance",    label: "Financeiro",     emoji: "💰", color: "bg-blue-50 text-blue-700 border-blue-200",    reportTitle: "Relatório Financeiro",     kpiHints: ["receita","despesa","margem","lucro"] },
  education:  { key: "education",  label: "Educação",       emoji: "🎓", color: "bg-sky-50 text-sky-700 border-sky-200",       reportTitle: "Relatório Educacional",    kpiHints: ["matrículas","evasão","aprovação","média"] },
  generic:    { key: "generic",    label: "Executivo",      emoji: "📊", color: "bg-slate-50 text-slate-700 border-slate-200", reportTitle: "Relatório Executivo",      kpiHints: [] },
};

const RULES: { niche: Niche; patterns: RegExp[] }[] = [
  { niche: "hospital",   patterns: [/paciente/i, /consult/i, /internaç/i, /leito/i, /hospital/i, /médic/i, /clinic/i, /diagn[oó]stico/i] },
  { niche: "fitness",    patterns: [/aluno/i, /matr[ií]cula/i, /academia/i, /treino/i, /personal/i, /cancelamento.*plano/i] },
  { niche: "restaurant", patterns: [/prato/i, /card[aá]pio/i, /delivery/i, /gar[cç]om/i, /mesa/i, /restaurante/i, /ifood/i, /rappi/i] },
  { niche: "hotel",      patterns: [/hosped/i, /di[aá]ria/i, /reserva/i, /check[- ]?in/i, /check[- ]?out/i, /hotel/i, /pousada/i, /quarto/i] },
  { niche: "ecommerce",  patterns: [/pedido/i, /produto/i, /sku/i, /devoluç/i, /carrinho/i, /convers[aã]o/i, /estoque/i, /frete/i] },
  { niche: "hr",         patterns: [/funcion[aá]rio/i, /colaborador/i, /turnover/i, /absente/i, /admiss/i, /desligamento/i, /folha/i, /rh\b/i] },
  { niche: "finance",    patterns: [/receita/i, /despesa/i, /lucro/i, /margem/i, /faturamento/i, /custo/i, /cash|caixa/i, /d[eé]bito|cr[eé]dito/i] },
  { niche: "education",  patterns: [/aluno/i, /turma/i, /nota/i, /disciplin/i, /matr[ií]cula/i, /evas/i, /escola|colégio|faculdade/i] },
];

export function detectNiche(columns: string[], sampleRows: Record<string, unknown>[] = []): Niche {
  const haystack = [
    ...columns,
    ...sampleRows.flatMap((r) => Object.values(r).map((v) => String(v ?? "")).slice(0, 30)),
  ].join(" | ");
  const scores: Record<string, number> = {};
  for (const { niche, patterns } of RULES) {
    scores[niche] = patterns.reduce((a, p) => a + (p.test(haystack) ? 1 : 0), 0);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? (best[0] as Niche) : "generic";
}
