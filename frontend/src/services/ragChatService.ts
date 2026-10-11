import { supabase } from "../lib/supabase";

export type RagChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RagChatResult = {
  answer: string;
  sources: string[];
};

function isRagChatResult(value: unknown): value is RagChatResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "answer" in value &&
    typeof value.answer === "string" &&
    "sources" in value &&
    Array.isArray(value.sources) &&
    value.sources.every((source) => typeof source === "string")
  );
}

async function readFunctionError(error: { context?: unknown }): Promise<string | null> {
  if (!(error.context instanceof Response)) return null;
  try {
    const payload: unknown = await error.context.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    return null;
  }
  return null;
}

export async function askRagChat(
  question: string,
  history: RagChatMessage[],
): Promise<RagChatResult> {
  if (!supabase) {
    throw new Error("O chat precisa da conexão configurada com o Supabase.");
  }

  const { data, error } = await supabase.functions.invoke("rag-chat", {
    body: { question, history: history.slice(-8) },
  });

  if (error) {
    const functionError = await readFunctionError(error);
    throw new Error(
      functionError ?? "Não foi possível conectar ao chat. Tente novamente.",
    );
  }

  if (!isRagChatResult(data)) {
    throw new Error("O chat retornou uma resposta inválida.");
  }

  return {
    answer: data.answer,
    sources: data.sources.slice(0, 8),
  };
}
