-- Estrutura do banco de dados da plataforma EV ChargeOps


create extension if not exists "pgcrypto"; --???

-- =========================================================
-- Função utilitária para manter updated_at atualizado
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Tabelas dimensionais / cadastro
-- =========================================================
create table if not exists public.unidades (
  unidade_id uuid primary key default gen_random_uuid(),
  bloco varchar(50) not null,
  apartamento varchar(50) not null,
  pavimento varchar(50),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unidades_bloco_apartamento_unique unique (bloco, apartamento)
);

create table if not exists public.usuarios (
  usuario_id uuid primary key default gen_random_uuid(),
  unidade_id uuid references public.unidades (unidade_id) on update cascade on delete set null,
  nome varchar(150) not null,
  email varchar(255) not null unique,
  senha, --qual o melhor tipo definido aqui utilizando salt?
  telefone varchar(30),
  rfid_uid varchar(100) unique,
  data_cadastro timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- create table if not exists public.veiculos (
--   veiculo_id uuid primary key default gen_random_uuid(),
--   usuario_id uuid not null references public.usuarios (usuario_id) on update cascade on delete cascade,
--   modelo varchar(100) not null,
--   marca varchar(100) not null,
--   placa varchar(20) not null unique,
--   ano integer,
--   observacoes text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now(),
--   constraint veiculos_ano_check check (ano is null or ano between 1900 and 2100)
-- );

create table if not exists public.carregadores (
  charger_id uuid primary key default gen_random_uuid(),
  modelo varchar(100) not null,
  serial_number varchar(100) not null unique,
  localizacao varchar(255) not null,
  status varchar(40) not null default 'disponivel',
  potencia_max_kw numeric(10, 3) not null,
  firmware_version varchar(50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carregadores_status_check check (
    status in ('offline', 'disponivel', 'veiculo_conectado', 'carregando', 'indisponivel', 'falha', 'erro', 'manutencao')
  ),
  constraint carregadores_potencia_max_kw_check check (potencia_max_kw > 0)
);

-- =========================================================
-- Tabelas operacionais
-- =========================================================
create table if not exists public.sessoes (
  sessao_id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.carregadores (charger_id) on update cascade on delete restrict,
  usuario_id uuid not null references public.usuarios (usuario_id) on update cascade on delete restrict,
  -- veiculo_id uuid references public.veiculos (veiculo_id) on update cascade on delete set null,
  inicio timestamptz not null default now(),
  fim timestamptz,
  duracao_min integer generated always as (
    case
      when fim is null then null
      else greatest(0, floor(extract(epoch from (fim - inicio)) / 60)::integer)
    end
  ) stored,
  energia_kwh numeric(12, 3) not null default 0,
  status varchar(40) not null default 'iniciada',
  motivo_fim varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessoes_periodo_check check (fim is null or fim >= inicio),
  constraint sessoes_energia_kwh_check check (energia_kwh >= 0),
  constraint sessoes_status_check check (
    status in ('iniciada', 'em_andamento', 'pausada', 'finalizada', 'interrompida', 'cancelada', 'erro')
  )
);

create table if not exists public.medicoes (
  medicao_id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes (sessao_id) on update cascade on delete cascade,
  timestamp timestamptz not null default now(),
  potencia_kw numeric(12, 3) not null,
  corrente_a numeric(12, 3),
  tensao_v numeric(12, 3),
  frequencia_hz numeric(8, 3),
  temperatura_c numeric(8, 3),
  fp numeric(6, 4),
  created_at timestamptz not null default now(),
  constraint medicoes_potencia_kw_check check (potencia_kw >= 0),
  constraint medicoes_corrente_a_check check (corrente_a is null or corrente_a >= 0),
  constraint medicoes_tensao_v_check check (tensao_v is null or tensao_v >= 0),
  constraint medicoes_frequencia_hz_check check (frequencia_hz is null or frequencia_hz >= 0),
  constraint medicoes_fp_check check (fp is null or fp between 0 and 1)
);

create table if not exists public.eventos (
  evento_id uuid primary key default gen_random_uuid(),
  sessao_id uuid references public.sessoes (sessao_id) on update cascade on delete cascade,
  timestamp timestamptz not null default now(),
  tipo_evento varchar(80) not null,
  descricao text,
  valor jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Tabelas financeiras
-- =========================================================
create table if not exists public.tarifas (
  tarifa_id uuid primary key default gen_random_uuid(),
  descricao varchar(150) not null,
  valor_kwh numeric(12, 4) not null,
  vigencia_inicio date not null,
  vigencia_fim date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tarifas_valor_kwh_check check (valor_kwh >= 0),
  constraint tarifas_vigencia_check check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

create table if not exists public.regras_rateio (
  regra_id uuid primary key default gen_random_uuid(),
  tarifa_id uuid references public.tarifas (tarifa_id) on update cascade on delete set null,
  descricao varchar(150) not null,
  tipo_tarifa varchar(50) not null,
  valor_fixo numeric(12, 2) not null default 0,
  percentual_taxa numeric(7, 4) not null default 0,
  vigencia_inicio date not null,
  vigencia_fim date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regras_rateio_tipo_tarifa_check check (
    tipo_tarifa in ('kwh', 'tempo', 'assinatura', 'rateio_condominial', 'gratuita', 'mista')
  ),
  constraint regras_rateio_valor_fixo_check check (valor_fixo >= 0),
  constraint regras_rateio_percentual_taxa_check check (percentual_taxa >= 0),
  constraint regras_rateio_vigencia_check check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

create table if not exists public.faturas (
  fatura_id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (usuario_id) on update cascade on delete restrict,
  unidade_id uuid references public.unidades (unidade_id) on update cascade on delete set null,
  regra_id uuid references public.regras_rateio (regra_id) on update cascade on delete set null,
  tarifa_id uuid references public.tarifas (tarifa_id) on update cascade on delete set null,
  referencia date not null,
  energia_total_kwh numeric(12, 3) not null default 0,
  valor_energia numeric(12, 2) not null default 0,
  valor_taxa_adm numeric(12, 2) not null default 0,
  valor_total numeric(12, 2) generated always as (valor_energia + valor_taxa_adm) stored,
  status_pagamento varchar(40) not null default 'pendente',
  vencimento date not null,
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faturas_referencia_mes_check check (extract(day from referencia) = 1),
  constraint faturas_energia_total_kwh_check check (energia_total_kwh >= 0),
  constraint faturas_valor_energia_check check (valor_energia >= 0),
  constraint faturas_valor_taxa_adm_check check (valor_taxa_adm >= 0),
  constraint faturas_status_pagamento_check check (
    status_pagamento in ('pendente', 'paga', 'vencida', 'cancelada', 'em_aberto')
  ),
  constraint faturas_usuario_referencia_unique unique (usuario_id, referencia)
);

-- =========================================================
-- Tabela fato / analytics
-- =========================================================
create table if not exists public.fato_uso_cargas (
  fato_id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null,
  unidade_id uuid references public.unidades (unidade_id) on update cascade on delete set null,
  charger_id uuid references public.carregadores (charger_id) on update cascade on delete set null,
  usuario_id uuid references public.usuarios (usuario_id) on update cascade on delete set null,
  sessao_id uuid references public.sessoes (sessao_id) on update cascade on delete set null,
  energia_kwh numeric(12, 3) not null default 0,
  potencia_media_kw numeric(12, 3),
  custo_estimado numeric(12, 2),
  tarifa_id uuid references public.tarifas (tarifa_id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  constraint fato_uso_cargas_energia_kwh_check check (energia_kwh >= 0),
  constraint fato_uso_cargas_potencia_media_kw_check check (potencia_media_kw is null or potencia_media_kw >= 0),
  constraint fato_uso_cargas_custo_estimado_check check (custo_estimado is null or custo_estimado >= 0)
);

-- =========================================================
-- Índices para consultas frequentes, FKs e dashboards
-- =========================================================
create index if not exists idx_usuarios_unidade_id on public.usuarios (unidade_id);
create index if not exists idx_usuarios_rfid_uid on public.usuarios (rfid_uid);
-- create index if not exists idx_veiculos_usuario_id on public.veiculos (usuario_id);
create index if not exists idx_carregadores_status on public.carregadores (status);
create index if not exists idx_sessoes_charger_id on public.sessoes (charger_id);
create index if not exists idx_sessoes_usuario_id on public.sessoes (usuario_id);
-- create index if not exists idx_sessoes_veiculo_id on public.sessoes (veiculo_id);
create index if not exists idx_sessoes_inicio on public.sessoes (inicio);
create index if not exists idx_sessoes_status on public.sessoes (status);
create index if not exists idx_medicoes_sessao_id on public.medicoes (sessao_id);
create index if not exists idx_medicoes_timestamp on public.medicoes (timestamp);
create index if not exists idx_eventos_sessao_id on public.eventos (sessao_id);
create index if not exists idx_eventos_timestamp on public.eventos (timestamp);
create index if not exists idx_eventos_tipo_evento on public.eventos (tipo_evento);
create index if not exists idx_tarifas_ativo_vigencia on public.tarifas (ativo, vigencia_inicio, vigencia_fim);
create index if not exists idx_regras_rateio_tarifa_id on public.regras_rateio (tarifa_id);
create index if not exists idx_regras_rateio_ativo_vigencia on public.regras_rateio (ativo, vigencia_inicio, vigencia_fim);
create index if not exists idx_faturas_usuario_id on public.faturas (usuario_id);
create index if not exists idx_faturas_unidade_id on public.faturas (unidade_id);
create index if not exists idx_faturas_referencia on public.faturas (referencia);
create index if not exists idx_faturas_status_pagamento on public.faturas (status_pagamento);
create index if not exists idx_fato_uso_cargas_timestamp on public.fato_uso_cargas (timestamp);
create index if not exists idx_fato_uso_cargas_unidade_id on public.fato_uso_cargas (unidade_id);
create index if not exists idx_fato_uso_cargas_charger_id on public.fato_uso_cargas (charger_id);
create index if not exists idx_fato_uso_cargas_usuario_id on public.fato_uso_cargas (usuario_id);
create index if not exists idx_fato_uso_cargas_sessao_id on public.fato_uso_cargas (sessao_id);
create index if not exists idx_fato_uso_cargas_tarifa_id on public.fato_uso_cargas (tarifa_id);

-- =========================================================
-- Triggers de updated_at
-- =========================================================
drop trigger if exists trg_unidades_set_updated_at on public.unidades;
create trigger trg_unidades_set_updated_at
before update on public.unidades
for each row execute function public.set_updated_at();

drop trigger if exists trg_usuarios_set_updated_at on public.usuarios;
create trigger trg_usuarios_set_updated_at
before update on public.usuarios
for each row execute function public.set_updated_at();

-- drop trigger if exists trg_veiculos_set_updated_at on public.veiculos;
-- create trigger trg_veiculos_set_updated_at
-- before update on public.veiculos
-- for each row execute function public.set_updated_at();

drop trigger if exists trg_carregadores_set_updated_at on public.carregadores;
create trigger trg_carregadores_set_updated_at
before update on public.carregadores
for each row execute function public.set_updated_at();

drop trigger if exists trg_sessoes_set_updated_at on public.sessoes;
create trigger trg_sessoes_set_updated_at
before update on public.sessoes
for each row execute function public.set_updated_at();

drop trigger if exists trg_tarifas_set_updated_at on public.tarifas;
create trigger trg_tarifas_set_updated_at
before update on public.tarifas
for each row execute function public.set_updated_at();

drop trigger if exists trg_regras_rateio_set_updated_at on public.regras_rateio;
create trigger trg_regras_rateio_set_updated_at
before update on public.regras_rateio
for each row execute function public.set_updated_at();

drop trigger if exists trg_faturas_set_updated_at on public.faturas;
create trigger trg_faturas_set_updated_at
before update on public.faturas
for each row execute function public.set_updated_at();

-- Observação: RLS não foi habilitado nesta migration para não bloquear o desenvolvimento inicial.
-- Quando o backend/autenticação estiver definido, crie policies específicas para anon/authenticated/service_role.
