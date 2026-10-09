import { supabase, supabaseConfigError } from "../lib/supabase";
import { STATUS_COBRAVEIS } from "../lib/rateio";
import type {
  Fatura,
  FaturaInsert,
  RegraRateio,
  Sessao,
  SessaoInsert,
  SessaoParaRateio,
} from "../types/rateio";

function getClient() {
  if (!supabase) {
    throw new Error(
      supabaseConfigError ?? "A conexão com o Supabase não foi configurada.",
    );
  }

  return supabase;
}

function throwDatabaseError(error: unknown): never {
  const databaseError = error as {
    code?: string;
    message?: string;
    details?: string;
  };
  const message = databaseError.message ?? "Erro desconhecido no banco de dados.";

  if (
    databaseError.code === "42501" ||
    message.toLowerCase().includes("row-level security")
  ) {
    throw new Error(
      "Operação bloqueada pelas políticas de acesso (RLS). Solicite o ajuste à equipe responsável pelo banco de dados.",
    );
  }

  if (databaseError.code === "23505") {
    throw new Error(
      "Já existe um registro com os mesmos dados em um campo que deve ser único.",
    );
  }

  if (databaseError.code === "23503") {
    throw new Error(
      "O registro relacionado não existe mais. Atualize a página e tente novamente.",
    );
  }

  if (databaseError.code === "23514") {
    throw new Error(
      "Um valor informado não respeita as regras definidas no banco de dados.",
    );
  }

  throw new Error(databaseError.details ? `${message} ${databaseError.details}` : message);
}

// ---------- Sessões ----------

const SESSAO_COLUNAS =
  "sessao_id, charger_id, usuario_id, inicio, fim, duracao_min, energia_kwh, status, motivo_fim";

export async function listSessoes(limite = 100): Promise<Sessao[]> {
  const { data, error } = await getClient()
    .from("sessoes")
    .select(SESSAO_COLUNAS)
    .order("inicio", { ascending: false })
    .limit(limite);

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Sessao[];
}

export async function createSessao(payload: SessaoInsert): Promise<void> {
  const { error } = await getClient().from("sessoes").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}

// Sessões cobráveis que COMEÇARAM dentro do período [inicioISO, fimISO).
export async function listSessoesCobraveis(
  inicioISO: string,
  fimISO: string,
): Promise<SessaoParaRateio[]> {
  const { data, error } = await getClient()
    .from("sessoes")
    .select("usuario_id, energia_kwh")
    .gte("inicio", inicioISO)
    .lt("inicio", fimISO)
    .in("status", [...STATUS_COBRAVEIS]);

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as SessaoParaRateio[];
}

// ---------- Regras de rateio ----------

export async function listRegras(): Promise<RegraRateio[]> {
  const { data, error } = await getClient()
    .from("regras_rateio")
    .select(
      "regra_id, tarifa_id, descricao, tipo_tarifa, valor_fixo, percentual_taxa, vigencia_inicio, vigencia_fim, ativo",
    )
    .eq("ativo", true)
    .order("vigencia_inicio", { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as RegraRateio[];
}

// ---------- Faturas ----------

export async function listFaturas(referencia: string): Promise<Fatura[]> {
  const { data, error } = await getClient()
    .from("faturas")
    .select(
      "fatura_id, usuario_id, unidade_id, referencia, energia_total_kwh, valor_energia, valor_taxa_adm, valor_total, status_pagamento, vencimento",
    )
    .eq("referencia", referencia)
    .order("valor_total", { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Fatura[];
}

export async function createFaturas(payload: FaturaInsert[]): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const { error } = await getClient().from("faturas").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}
