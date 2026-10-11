import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const ragTools = [
  {
    type: "function",
    function: {
      name: "buscar_registros",
      description:
        "Busca registros de uma categoria permitida. Use filtros de data/status quando a pergunta pedir um período ou estado. Nunca solicite senhas, RFID, e-mails ou telefones.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          categoria: {
            type: "string",
            enum: [
              "unidades",
              "usuarios",
              "carregadores",
              "sessoes",
              "medicoes",
              "eventos",
              "tarifas",
              "regras_rateio",
              "faturas",
              "fato_uso_cargas",
              "vw_consumo_mensal",
              "vw_calculo_fatura",
            ],
          },
          inicio: { type: ["string", "null"], description: "Data inicial AAAA-MM-DD" },
          fim: { type: ["string", "null"], description: "Data final AAAA-MM-DD" },
          status: { type: ["string", "null"] },
          busca: { type: ["string", "null"], description: "Busca textual curta" },
          limite: { type: "integer", minimum: 1, maximum: 25 },
        },
        required: ["categoria", "inicio", "fim", "status", "busca", "limite"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_operacional_financeiro",
      description:
        "Retorna quantidades e totais calculados no banco, incluindo consumo e valores agregados por mês. Use para perguntas sobre totais, médias e tendências por período.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          inicio: { type: ["string", "null"], description: "Data inicial AAAA-MM-DD" },
          fim: { type: ["string", "null"], description: "Data final AAAA-MM-DD" },
        },
        required: ["inicio", "fim"],
      },
    },
  },
] as const;

const allowedCategories = new Set([
  "unidades",
  "usuarios",
  "carregadores",
  "sessoes",
  "medicoes",
  "eventos",
  "tarifas",
  "regras_rateio",
  "faturas",
  "fato_uso_cargas",
  "vw_consumo_mensal",
  "vw_calculo_fatura",
]);

type RecordArguments = {
  categoria: string;
  inicio: string | null;
  fim: string | null;
  status: string | null;
  busca: string | null;
  limite: number;
};

type SummaryArguments = { inicio: string | null; fim: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Data inválida.");
  }
  const parsed = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Data inválida.");
  }
  return value;
}

function validateRange(start: string | null, end: string | null) {
  if (start && end && start > end) {
    throw new Error("Período inválido.");
  }
}

function parseRecordArguments(value: unknown): RecordArguments {
  if (!isRecord(value)) throw new Error("Parâmetros inválidos.");
  const { categoria, inicio, fim, status, busca, limite } = value;

  if (typeof categoria !== "string" || !allowedCategories.has(categoria)) {
    throw new Error("Categoria não permitida.");
  }
  const start = validateDate(inicio);
  const end = validateDate(fim);
  validateRange(start, end);

  if (status !== null && (typeof status !== "string" || status.length > 40)) {
    throw new Error("Filtro inválido.");
  }
  if (busca !== null && (typeof busca !== "string" || busca.length > 80)) {
    throw new Error("Busca inválida.");
  }
  if (!Number.isInteger(limite) || (limite as number) < 1 || (limite as number) > 25) {
    throw new Error("Limite inválido.");
  }

  return {
    categoria,
    inicio: start,
    fim: end,
    status: status as string | null,
    busca: busca as string | null,
    limite: limite as number,
  };
}

function parseSummaryArguments(value: unknown): SummaryArguments {
  if (!isRecord(value)) throw new Error("Parâmetros inválidos.");
  const start = validateDate(value.inicio);
  const end = validateDate(value.fim);
  validateRange(start, end);
  return { inicio: start, fim: end };
}

export async function runRagTool(
  supabase: SupabaseClient,
  toolName: string,
  rawArguments: unknown,
): Promise<{ source: string; data: unknown }> {
  if (toolName === "buscar_registros") {
    const args = parseRecordArguments(rawArguments);
    const { data, error } = await supabase.rpc("rag_read_records", {
      p_category: args.categoria,
      p_start: args.inicio,
      p_end: args.fim,
      p_status: args.status,
      p_search: args.busca,
      p_limit: args.limite,
    });
    if (error) {
      console.error("rag_read_records failed", error.code);
      throw new Error("Não foi possível consultar os dados.");
    }
    return { source: args.categoria, data: data ?? [] };
  }

  if (toolName === "resumo_operacional_financeiro") {
    const args = parseSummaryArguments(rawArguments);
    const { data, error } = await supabase.rpc("rag_read_summary", {
      p_start: args.inicio,
      p_end: args.fim,
    });
    if (error) {
      console.error("rag_read_summary failed", error.code);
      throw new Error("Não foi possível calcular o resumo.");
    }
    return { source: "resumo_operacional_financeiro", data };
  }

  throw new Error("Ferramenta não permitida.");
}
