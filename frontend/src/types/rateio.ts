// Tipos usados pelas telas de Sessões e de Rateio/Faturas.
// Espelham as tabelas `sessoes`, `regras_rateio` e `faturas` da migration.

export const SESSAO_STATUS = [
  "iniciada",
  "em_andamento",
  "pausada",
  "finalizada",
  "interrompida",
  "cancelada",
  "erro",
] as const;

export type SessaoStatus = (typeof SESSAO_STATUS)[number];

export interface Sessao {
  sessao_id: string;
  charger_id: string;
  usuario_id: string;
  inicio: string;
  fim: string | null;
  duracao_min: number | null;
  energia_kwh: number;
  status: SessaoStatus;
  motivo_fim: string | null;
}

export interface SessaoInsert {
  charger_id: string;
  usuario_id: string;
  inicio: string;
  fim: string | null;
  energia_kwh: number;
  status: SessaoStatus;
  motivo_fim: string | null;
}

export interface RegraRateio {
  regra_id: string;
  tarifa_id: string | null;
  descricao: string;
  tipo_tarifa: string;
  valor_fixo: number;
  percentual_taxa: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
}

export interface Fatura {
  fatura_id: string;
  usuario_id: string;
  unidade_id: string | null;
  referencia: string;
  energia_total_kwh: number;
  valor_energia: number;
  valor_taxa_adm: number;
  valor_total: number;
  status_pagamento: string;
  vencimento: string;
}

export interface FaturaInsert {
  usuario_id: string;
  unidade_id: string | null;
  regra_id: string | null;
  tarifa_id: string | null;
  referencia: string;
  energia_total_kwh: number;
  valor_energia: number;
  valor_taxa_adm: number;
  status_pagamento: "pendente";
  vencimento: string;
}

// Sessão reduzida: só o que a conta precisa.
export interface SessaoParaRateio {
  usuario_id: string;
  energia_kwh: number;
}

// Uma linha do resultado da conta = uma fatura de um usuário.
export interface LinhaRateio {
  usuario_id: string;
  sessoes: number;
  energiaKwh: number;
  valorEnergia: number;
  valorTaxa: number;
  valorTotal: number;
}
