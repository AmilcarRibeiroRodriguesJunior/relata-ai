/**
 * Classificador semântico de colunas.
 * Determina o tipo de cada coluna e quais análises são permitidas nela.
 * Etapa 1 do pipeline de análise do RelataAI.
 */

export type ColumnType =
  | "date"          // Datas / eixo temporal
  | "monetary"      // Valores financeiros (R$, receita, custo, lucro)
  | "percent"       // Percentuais / taxas
  | "quantity"      // Quantidades / contagens numéricas
  | "operational"   // Indicadores operacionais (dias, tempo, ocupação)
  | "kpi"           // KPIs (nps, satisfação, score, rating)
  | "demographic"   // Idade, gênero, faixa etária
  | "category"      // Categorias / dimensões
  | "identifier"    // IDs, códigos, sequenciais
  | "text"          // Texto livre
  | "unknown";

export type ColumnProfile = {
  name: string;
  type: ColumnType;
  allow: {
    trend: boolean;         // pode calcular crescimento/queda
    correlation: boolean;   // faz sentido correlacionar
    aggregation: boolean;   // soma/média/total fazem sentido
    ranking: boolean;       // pode virar ranking/pizza
    distribution: boolean;  // histograma/faixas
    timeAxis: boolean;      // pode ser eixo do tempo
  };
  cardinality: number;
  nonNull: number;
  numericRatio: number;
  dateRatio: number;
};

const RX = {
  date:        /(data|date|dt_|dia|mes|mês|ano|year|month|periodo|período|admiss|desligamento|entrada|saida|saída|check[- ]?in|check[- ]?out|alta|nascim)/i,
  monetary:    /(receita|faturamento|venda|vendas|valor|preco|preço|revenue|sales|amount|ticket|lucro|profit|custo|cost|despesa|expense|margem|margin|salario|salário|folha|r\$|brl|usd|eur)/i,
  percent:     /(%|perc|percent|taxa|rate|ratio|conversao|conversão|churn|retencao|retenção|ocupacao|ocupação)/i,
  quantity:    /(qtd|quantidade|total|count|numero|número|volume|pedidos|matriculas|matrículas|cancelamentos|admiss|desligamentos|consultas|atendimentos|clientes|pacientes|alunos|funcionarios|funcionários|hospedes|hóspedes|produtos|unidades|estoque)/i,
  operational: /(tempo|duracao|duração|dias|horas|internacao|internação|permanencia|permanência|espera|atendimento|frequencia|frequência|absenteismo|absenteísmo|turnover)/i,
  kpi:         /(nps|csat|satisf|rating|nota|score|indice|índice|kpi|sla)/i,
  demographic: /(idade|age|genero|gênero|sexo|faixa|etnia|cidade|estado|regiao|região|pais|país|cep|bairro|escolaridade|estado[_ ]?civil)/i,
  identifier:  /^(id|cod|codigo|código|matricula|matrícula|cpf|cnpj|rg|prontuario|prontuário|numero|número|seq|sequencial|_id|uuid|hash|sku)$/i,
  identifierLoose: /(\bid\b|codigo|código|matricula|matrícula|prontuario|prontuário|sku|hash|uuid)/i,
};

const isDateVal = (v: unknown): boolean => {
  if (v instanceof Date) return true;
  if (typeof v === "string" && /\d{4}-\d{2}|\d{2}\/\d{2}/.test(v)) {
    return !isNaN(Date.parse(v));
  }
  return false;
};

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const c = v.replace(/[R$\s.]/g, "").replace(",", ".");
    const n = parseFloat(c);
    if (Number.isFinite(n) && /\d/.test(v)) return n;
  }
  return null;
};

/**
 * Classifica uma única coluna combinando nome + amostras dos dados.
 * Precedência: identificador > data > percentual > monetário > kpi > demográfico > operacional > quantidade > categoria > texto.
 */
export function classifyColumn(name: string, values: unknown[]): ColumnProfile {
  const nonNullVals = values.filter((v) => v !== null && v !== undefined && v !== "");
  const nonNull = nonNullVals.length;
  const nums = nonNullVals.map(toNum).filter((n): n is number => n !== null);
  const dates = nonNullVals.filter(isDateVal).length;
  const numericRatio = nonNull ? nums.length / nonNull : 0;
  const dateRatio = nonNull ? dates / nonNull : 0;
  const unique = new Set(nonNullVals.map((v) => String(v))).size;
  const cardinality = unique;

  let type: ColumnType = "unknown";

  const looksSequentialId =
    numericRatio > 0.9 &&
    unique === nonNull &&
    nums.length > 5 &&
    (() => {
      const sorted = [...nums].sort((a, b) => a - b);
      let seq = 0;
      for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] === 1) seq++;
      return seq / sorted.length > 0.7;
    })();

  if (RX.identifier.test(name) || looksSequentialId || (RX.identifierLoose.test(name) && unique === nonNull && nonNull > 3)) {
    type = "identifier";
  } else if (dateRatio >= 0.6 || RX.date.test(name)) {
    type = "date";
  } else if (RX.percent.test(name) && numericRatio > 0.6) {
    type = "percent";
  } else if (RX.monetary.test(name) && numericRatio > 0.5) {
    type = "monetary";
  } else if (RX.kpi.test(name) && numericRatio > 0.5) {
    type = "kpi";
  } else if (RX.demographic.test(name)) {
    // idade numérica ainda é demográfica (não gera trend)
    type = "demographic";
  } else if (RX.operational.test(name) && numericRatio > 0.5) {
    type = "operational";
  } else if (RX.quantity.test(name) && numericRatio > 0.5) {
    type = "quantity";
  } else if (numericRatio > 0.8) {
    type = "quantity"; // fallback numérico
  } else if (unique > 1 && unique <= Math.max(20, nonNull * 0.9)) {
    type = "category";
  } else if (nonNull > 0) {
    type = "text";
  }

  const allow = permissions(type);
  return { name, type, allow, cardinality, nonNull, numericRatio, dateRatio };
}

/**
 * Regras: quais análises são permitidas para cada tipo.
 * Impede insights sem sentido (ex.: crescimento de idade, média de texto, correlação data-data).
 */
export function permissions(type: ColumnType): ColumnProfile["allow"] {
  switch (type) {
    case "date":
      return { trend: false, correlation: false, aggregation: false, ranking: false, distribution: true, timeAxis: true };
    case "monetary":
      return { trend: true, correlation: true, aggregation: true, ranking: true, distribution: true, timeAxis: false };
    case "quantity":
      return { trend: true, correlation: true, aggregation: true, ranking: true, distribution: true, timeAxis: false };
    case "operational":
      return { trend: true, correlation: true, aggregation: true, ranking: false, distribution: true, timeAxis: false };
    case "kpi":
      return { trend: true, correlation: true, aggregation: false, ranking: false, distribution: true, timeAxis: false };
    case "percent":
      return { trend: true, correlation: true, aggregation: false, ranking: false, distribution: true, timeAxis: false };
    case "demographic":
      return { trend: false, correlation: false, aggregation: false, ranking: true, distribution: true, timeAxis: false };
    case "category":
      return { trend: false, correlation: false, aggregation: false, ranking: true, distribution: true, timeAxis: false };
    case "identifier":
      return { trend: false, correlation: false, aggregation: false, ranking: false, distribution: false, timeAxis: false };
    case "text":
      return { trend: false, correlation: false, aggregation: false, ranking: false, distribution: false, timeAxis: false };
    default:
      return { trend: false, correlation: false, aggregation: false, ranking: false, distribution: false, timeAxis: false };
  }
}

/** Classifica todas as colunas de uma vez. */
export function classifyColumns(rows: Record<string, unknown>[]): Record<string, ColumnProfile> {
  const out: Record<string, ColumnProfile> = {};
  if (rows.length === 0) return out;
  for (const col of Object.keys(rows[0])) {
    out[col] = classifyColumn(col, rows.map((r) => r[col]));
  }
  return out;
}

/**
 * Determina se um par de colunas gera uma correlação útil.
 * Evita: id×id, data×data, mesma raiz de nome, cardinalidade baixa demais.
 */
export function isMeaningfulCorrelationPair(a: ColumnProfile, b: ColumnProfile): boolean {
  if (!a.allow.correlation || !b.allow.correlation) return false;
  if (a.type === "identifier" || b.type === "identifier") return false;
  if (a.type === "date" || b.type === "date") return false;
  if (a.type === "demographic" && b.type === "demographic") return false;
  // Cardinalidade — se um dos lados é praticamente constante, ignora
  if (a.cardinality < 5 || b.cardinality < 5) return false;
  // Nomes com raiz idêntica (Data Admissão vs Data Alta, Valor vs Valor Total)
  const rootA = a.name.toLowerCase().replace(/[_\s].*/, "").slice(0, 4);
  const rootB = b.name.toLowerCase().replace(/[_\s].*/, "").slice(0, 4);
  if (rootA && rootA === rootB) return false;
  return true;
}
