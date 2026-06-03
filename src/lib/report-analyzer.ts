import * as XLSX from "xlsx";

export type NumericStat = {
  column: string;
  min: number;
  max: number;
  mean: number;
  sum: number;
  count: number;
};

export type CategoricalStat = {
  column: string;
  values: { name: string; count: number }[];
};

export type ReportData = {
  kind: "tabular" | "unsupported";
  rowCount: number;
  columnCount: number;
  columns: string[];
  numericStats: NumericStat[];
  categoricalTop: CategoricalStat[];
  sampleRows: Record<string, unknown>[];
  insights: string[];
  summary: string;
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

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export async function analyzeFile(file: File): Promise<ReportData> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "pdf") {
    return {
      kind: "unsupported",
      rowCount: 0,
      columnCount: 0,
      columns: [],
      numericStats: [],
      categoricalTop: [],
      sampleRows: [],
      insights: [
        `Arquivo PDF "${file.name}" recebido (${(file.size / 1024).toFixed(1)} KB).`,
        "A extração de dados de PDF estará disponível em breve.",
      ],
      summary: `Arquivo PDF "${file.name}" armazenado. Análise tabular completa disponível para CSV e Excel.`,
    };
  }

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  if (rows.length === 0) {
    return {
      kind: "tabular",
      rowCount: 0,
      columnCount: 0,
      columns: [],
      numericStats: [],
      categoricalTop: [],
      sampleRows: [],
      insights: ["O arquivo não contém linhas de dados."],
      summary: "Arquivo vazio.",
    };
  }

  const columns = Object.keys(rows[0]);
  const numericStats: NumericStat[] = [];
  const categoricalTop: CategoricalStat[] = [];

  for (const col of columns) {
    const nums: number[] = [];
    const buckets = new Map<string, number>();
    let nonNull = 0;
    for (const r of rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      nonNull++;
      const n = toNumber(v);
      if (n !== null) nums.push(n);
      const key = String(v).slice(0, 40);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    if (nums.length >= Math.max(3, nonNull * 0.6)) {
      const sum = nums.reduce((a, b) => a + b, 0);
      numericStats.push({
        column: col,
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean: sum / nums.length,
        sum,
        count: nums.length,
      });
    } else if (buckets.size > 1 && buckets.size <= Math.max(20, nonNull * 0.9)) {
      const top = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
      categoricalTop.push({ column: col, values: top });
    }
  }

  const insights: string[] = [];
  insights.push(
    `Arquivo com ${rows.length.toLocaleString("pt-BR")} linhas e ${columns.length} colunas.`,
  );
  const biggest = [...numericStats].sort((a, b) => b.sum - a.sum)[0];
  if (biggest) {
    insights.push(
      `Total de "${biggest.column}": ${fmt(biggest.sum)} · média ${fmt(biggest.mean)} · máx ${fmt(biggest.max)}.`,
    );
  }
  const topCat = categoricalTop[0]?.values[0];
  if (topCat) {
    insights.push(
      `Categoria mais frequente em "${categoricalTop[0].column}": "${topCat.name}" (${topCat.count} ocorrências).`,
    );
  }
  if (numericStats.length >= 2) {
    insights.push(
      `${numericStats.length} colunas numéricas detectadas para análise quantitativa.`,
    );
  }

  const summary =
    `Relatório executivo de "${file.name}": ${rows.length.toLocaleString("pt-BR")} registros analisados em ${columns.length} colunas. ` +
    (biggest
      ? `Destaque para "${biggest.column}" com soma total de ${fmt(biggest.sum)}.`
      : "Dados majoritariamente categóricos.");

  return {
    kind: "tabular",
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    numericStats,
    categoricalTop: categoricalTop.slice(0, 4),
    sampleRows: rows.slice(0, 5),
    insights,
    summary,
  };
}
