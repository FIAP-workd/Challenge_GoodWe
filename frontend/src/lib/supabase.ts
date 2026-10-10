import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

function validateSupabaseConfig(): string | null {
  const missingVariables: string[] = [];

  if (!supabaseUrl) {
    missingVariables.push("SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    missingVariables.push("SUPABASE_PUBLISHABLE_KEY");
  }

  if (missingVariables.length > 0) {
    return `Configuração ausente: ${missingVariables.join(" e ")}.`;
  }

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "SUPABASE_URL precisa ser uma URL HTTP ou HTTPS válida.";
    }
  } catch {
    return "SUPABASE_URL precisa ser uma URL válida.";
  }

  return null;
}

export const supabaseConfigError = validateSupabaseConfig();

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
