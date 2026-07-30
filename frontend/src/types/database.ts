export interface Unidade {
  unidade_id: string;
  bloco: string;
  apartamento: string;
  pavimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnidadeInsert {
  bloco: string;
  apartamento: string;
  pavimento: string | null;
  observacoes: string | null;
}

// senha e rfid_uid existem no banco, mas não são lidos pelo frontend.
export interface Usuario {
  usuario_id: string;
  unidade_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  data_cadastro: string;
  ativo: boolean;
  created_at: string;
}

export interface UsuarioInsert {
  unidade_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
}

export const CARREGADOR_STATUS = [
  "offline",
  "disponivel",
  "veiculo_conectado",
  "carregando",
  "indisponivel",
  "falha",
  "erro",
  "manutencao",
] as const;

export type CarregadorStatus = (typeof CARREGADOR_STATUS)[number];

export interface Carregador {
  charger_id: string;
  modelo: string;
  serial_number: string;
  localizacao: string;
  status: CarregadorStatus;
  potencia_max_kw: number;
  firmware_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarregadorInsert {
  modelo: string;
  serial_number: string;
  localizacao: string;
  status: CarregadorStatus;
  potencia_max_kw: number;
  firmware_version: string | null;
}

export interface Tarifa {
  tarifa_id: string;
  descricao: string;
  valor_kwh: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TarifaInsert {
  descricao: string;
  valor_kwh: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
}
