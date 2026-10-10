import { supabase, supabaseConfigError } from "../lib/supabase";
import type {
  Carregador,
  CarregadorInsert,
  Tarifa,
  TarifaInsert,
  Unidade,
  UnidadeInsert,
  Usuario,
  UsuarioInsert,
} from "../types/database";

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
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("load failed")
  ) {
    throw new Error(
      "Não foi possível conectar ao Supabase. Verifique a internet, SUPABASE_URL e se o projeto está ativo.",
    );
  }

  if (
    databaseError.code === "42501" ||
    lowerMessage.includes("row-level security")
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

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export async function listUnidades(): Promise<Unidade[]> {
  const { data, error } = await getClient()
    .from("unidades")
    .select(
      "unidade_id, bloco, apartamento, pavimento, observacoes, created_at, updated_at",
    )
    .order("bloco", { ascending: true })
    .order("apartamento", { ascending: true });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Unidade[];
}

export async function createUnidade(payload: UnidadeInsert): Promise<void> {
  const { error } = await getClient().from("unidades").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listUsuarios(): Promise<Usuario[]> {
  const { data, error } = await getClient()
    .from("usuarios")
    .select(
      "usuario_id, unidade_id, nome, email, telefone, data_cadastro, ativo, created_at",
    )
    .order("nome", { ascending: true });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Usuario[];
}

export async function createUsuario(payload: UsuarioInsert): Promise<void> {
  const { error } = await getClient().from("usuarios").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listCarregadores(): Promise<Carregador[]> {
  const { data, error } = await getClient()
    .from("carregadores")
    .select(
      "charger_id, modelo, serial_number, localizacao, status, potencia_max_kw, firmware_version, created_at, updated_at",
    )
    .order("localizacao", { ascending: true });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Carregador[];
}

export async function createCarregador(
  payload: CarregadorInsert,
): Promise<void> {
  const { error } = await getClient().from("carregadores").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}

export async function listTarifas(): Promise<Tarifa[]> {
  const { data, error } = await getClient()
    .from("tarifas")
    .select(
      "tarifa_id, descricao, valor_kwh, vigencia_inicio, vigencia_fim, ativo, created_at, updated_at",
    )
    .order("vigencia_inicio", { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }

  return (data ?? []) as Tarifa[];
}

export async function createTarifa(payload: TarifaInsert): Promise<void> {
  const { error } = await getClient().from("tarifas").insert(payload);

  if (error) {
    throwDatabaseError(error);
  }
}
