/**
 * Geração de KPIs específicos por nicho.
 * Etapa do pipeline: recebe stats numéricos, categóricos e perfis de coluna,
 * e devolve KPIs contextualizados àquele setor.
 */
import type { Niche } from "@/lib/niche";
import type { NumericStat, CategoricalStat, Kpi } from "@/lib/report-analyzer";
import type { ColumnProfile } from "./column-types";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return fmt(n);
};

type Ctx = {
  numericStats: NumericStat[];
  categoricalTop: CategoricalStat[];
  profiles: Record<string, ColumnProfile>;
  rowCount: number;
};

const findStat = (ctx: Ctx, rx: RegExp): NumericStat | undefined =>
  ctx.numericStats.find((s) => rx.test(s.column));

const findCat = (ctx: Ctx, rx: RegExp): CategoricalStat | undefined =>
  ctx.categoricalTop.find((c) => rx.test(c.column));

export function generateNicheKpis(niche: Niche, ctx: Ctx): Kpi[] {
  switch (niche) {
    case "hospital":     return hospitalKpis(ctx);
    case "restaurant":   return restaurantKpis(ctx);
    case "fitness":      return fitnessKpis(ctx);
    case "hr":           return hrKpis(ctx);
    case "ecommerce":    return ecommerceKpis(ctx);
    case "hotel":        return hotelKpis(ctx);
    case "finance":      return financeKpis(ctx);
    case "education":    return educationKpis(ctx);
    default:             return [];
  }
}

function hospitalKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const days = findStat(ctx, /(dias|permanencia|permanência|internacao|internação|tempo)/i);
  const cost = findStat(ctx, /(custo|valor|despesa)/i);
  const pacientes = findStat(ctx, /(pacient|atendimento|consult)/i);
  const especialidade = findCat(ctx, /(especialidade|setor|departamento|clinica|clínica)/i);
  const satisf = findStat(ctx, /(satisf|nps|nota)/i);
  if (days)   out.push({ label: "Tempo médio de internação", value: `${days.mean.toFixed(1)} dias` });
  if (cost)   out.push({ label: "Custo médio por paciente", value: `R$ ${compact(cost.mean)}` });
  if (pacientes) out.push({ label: "Pacientes atendidos", value: compact(pacientes.sum) });
  if (especialidade) {
    const top = especialidade.values[0];
    out.push({ label: "Especialidade com maior volume", value: top.name, hint: `${top.count} registros` });
  }
  if (satisf) out.push({ label: "Índice de satisfação", value: satisf.mean.toFixed(2), tone: satisf.mean >= 4 ? "positive" : "neutral" });
  return out;
}

function restaurantKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const ticket = findStat(ctx, /(ticket|valor|receita|faturamento|total)/i);
  const clientes = findStat(ctx, /(client|pedido|mesa)/i);
  const delivery = findCat(ctx, /(canal|delivery|origem|tipo)/i);
  const prato = findCat(ctx, /(prato|item|produto|cardapio|cardápio)/i);
  if (ticket && clientes && clientes.sum > 0) out.push({ label: "Ticket médio", value: `R$ ${compact(ticket.sum / clientes.sum)}` });
  else if (ticket) out.push({ label: "Ticket médio", value: `R$ ${compact(ticket.mean)}` });
  if (clientes) out.push({ label: "Clientes atendidos", value: compact(clientes.sum) });
  if (ticket)   out.push({ label: "Receita total", value: `R$ ${compact(ticket.sum)}`, tone: "positive" });
  if (delivery) out.push({ label: "Canal principal", value: delivery.values[0].name });
  if (prato)    out.push({ label: "Prato mais vendido", value: prato.values[0].name });
  return out;
}

function fitnessKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const matr  = findStat(ctx, /(matricul|inscri|novo)/i);
  const canc  = findStat(ctx, /(cancel|desist|churn)/i);
  const rec   = findStat(ctx, /(receita|mensalidade|valor|plano)/i);
  const freq  = findStat(ctx, /(frequencia|frequência|presenca|presença|check)/i);
  if (matr)  out.push({ label: "Matrículas", value: compact(matr.sum), tone: "positive" });
  if (canc)  out.push({ label: "Cancelamentos", value: compact(canc.sum), tone: "negative" });
  if (matr && canc && matr.sum > 0) {
    const ret = (1 - canc.sum / matr.sum) * 100;
    out.push({ label: "Retenção estimada", value: `${ret.toFixed(1)}%`, tone: ret >= 70 ? "positive" : "negative" });
  }
  if (rec)   out.push({ label: "Receita recorrente", value: `R$ ${compact(rec.sum)}` });
  if (freq)  out.push({ label: "Frequência média", value: freq.mean.toFixed(1) });
  return out;
}

function hrKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const ativos = findStat(ctx, /(ativo|funcionari|colaborador|headcount)/i);
  const deslig = findStat(ctx, /(deslig|demiss|saida|saída)/i);
  const admiss = findStat(ctx, /(admiss|contrat|entrada)/i);
  const abs    = findStat(ctx, /(absent|falta)/i);
  const tempo  = findStat(ctx, /(tempo|permanencia|permanência|antiguidade)/i);
  if (ativos) out.push({ label: "Funcionários ativos", value: compact(ativos.sum ? ativos.sum : ativos.count) });
  if (deslig && admiss && admiss.sum > 0) {
    const turnover = (deslig.sum / admiss.sum) * 100;
    out.push({ label: "Turnover", value: `${turnover.toFixed(1)}%`, tone: turnover > 20 ? "negative" : "positive" });
  } else if (deslig) out.push({ label: "Desligamentos", value: compact(deslig.sum), tone: "negative" });
  if (abs)   out.push({ label: "Absenteísmo médio", value: `${abs.mean.toFixed(2)}` });
  if (tempo) out.push({ label: "Tempo médio na empresa", value: `${tempo.mean.toFixed(1)}` });
  return out;
}

function ecommerceKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const receita = findStat(ctx, /(receita|faturamento|valor|total)/i);
  const pedidos = findStat(ctx, /(pedido|order|venda)/i);
  const lucro   = findStat(ctx, /(lucro|margem|profit)/i);
  const dev     = findStat(ctx, /(devoluc|devolução|retorn|refund)/i);
  const conv    = findStat(ctx, /(conversao|conversão|taxa)/i);
  const prod    = findCat(ctx, /(produto|sku|item)/i);
  if (receita && pedidos && pedidos.sum > 0) out.push({ label: "Ticket médio", value: `R$ ${compact(receita.sum / pedidos.sum)}` });
  if (receita) out.push({ label: "Receita total", value: `R$ ${compact(receita.sum)}`, tone: "positive" });
  if (lucro)   out.push({ label: "Lucro", value: `R$ ${compact(lucro.sum)}`, tone: lucro.sum >= 0 ? "positive" : "negative" });
  if (dev)     out.push({ label: "Devoluções", value: compact(dev.sum), tone: "negative" });
  if (conv)    out.push({ label: "Conversão média", value: `${conv.mean.toFixed(2)}%` });
  if (prod)    out.push({ label: "Produto mais vendido", value: prod.values[0].name });
  return out;
}

function hotelKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const diaria = findStat(ctx, /(diaria|diária|valor|receita)/i);
  const ocup   = findStat(ctx, /(ocupa|occup)/i);
  const nights = findStat(ctx, /(noite|noites|permanencia|permanência)/i);
  const satisf = findStat(ctx, /(satisf|nota|nps)/i);
  if (diaria) out.push({ label: "Diária média", value: `R$ ${compact(diaria.mean)}` });
  if (ocup)   out.push({ label: "Ocupação média", value: `${ocup.mean.toFixed(1)}%`, tone: ocup.mean >= 70 ? "positive" : "neutral" });
  if (diaria && ocup) out.push({ label: "RevPAR estimado", value: `R$ ${compact(diaria.mean * (ocup.mean / 100))}` });
  if (nights) out.push({ label: "Permanência média", value: `${nights.mean.toFixed(1)} noites` });
  if (satisf) out.push({ label: "Satisfação", value: satisf.mean.toFixed(2), tone: satisf.mean >= 4 ? "positive" : "neutral" });
  return out;
}

function financeKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const receita = findStat(ctx, /(receita|revenue|faturamento)/i);
  const despesa = findStat(ctx, /(despesa|expense|custo)/i);
  const lucro   = findStat(ctx, /(lucro|margem|profit)/i);
  if (receita) out.push({ label: "Receita total", value: `R$ ${compact(receita.sum)}`, tone: "positive" });
  if (despesa) out.push({ label: "Despesa total", value: `R$ ${compact(despesa.sum)}`, tone: "negative" });
  if (receita && despesa) {
    const margem = ((receita.sum - despesa.sum) / receita.sum) * 100;
    out.push({ label: "Margem estimada", value: `${margem.toFixed(1)}%`, tone: margem >= 0 ? "positive" : "negative" });
  }
  if (lucro)   out.push({ label: "Lucro", value: `R$ ${compact(lucro.sum)}`, tone: lucro.sum >= 0 ? "positive" : "negative" });
  return out;
}

function educationKpis(ctx: Ctx): Kpi[] {
  const out: Kpi[] = [];
  const matr   = findStat(ctx, /(matricul|aluno|inscri)/i);
  const evas   = findStat(ctx, /(evas|desist|cancel)/i);
  const nota   = findStat(ctx, /(nota|media|média|score|desempenho)/i);
  const aprov  = findStat(ctx, /(aprov|conclus)/i);
  if (matr) out.push({ label: "Matrículas", value: compact(matr.sum) });
  if (evas) out.push({ label: "Evasão", value: compact(evas.sum), tone: "negative" });
  if (matr && evas && matr.sum > 0) {
    const t = (evas.sum / matr.sum) * 100;
    out.push({ label: "Taxa de evasão", value: `${t.toFixed(1)}%`, tone: t > 15 ? "negative" : "positive" });
  }
  if (aprov) out.push({ label: "Aprovações", value: compact(aprov.sum), tone: "positive" });
  if (nota)  out.push({ label: "Média geral", value: nota.mean.toFixed(2) });
  return out;
}
