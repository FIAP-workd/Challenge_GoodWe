-- Helpers read-only para o chat RAG. Acesso apenas pelo backend privilegiado.

create table if not exists public.rag_rate_limits (
  key_hash text not null,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (key_hash, window_kind)
);

alter table public.rag_rate_limits enable row level security;
revoke all on public.rag_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.rag_rate_limits to service_role;

create or replace function public.rag_consume_rate_limit(p_key_hash text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_minute timestamptz := date_trunc('minute', v_now);
  v_day timestamptz := date_trunc('day', v_now);
  v_minute_count integer;
  v_day_count integer;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then
    return false;
  end if;

  delete from public.rag_rate_limits
  where window_start < v_now - interval '2 days';

  insert into public.rag_rate_limits (key_hash, window_kind, window_start, request_count)
  values (p_key_hash, 'minute', v_minute, 1)
  on conflict (key_hash, window_kind) do update
  set request_count = case
        when public.rag_rate_limits.window_start < excluded.window_start then 1
        else public.rag_rate_limits.request_count + 1
      end,
      window_start = greatest(public.rag_rate_limits.window_start, excluded.window_start)
  returning request_count into v_minute_count;

  insert into public.rag_rate_limits (key_hash, window_kind, window_start, request_count)
  values (p_key_hash, 'day', v_day, 1)
  on conflict (key_hash, window_kind) do update
  set request_count = case
        when public.rag_rate_limits.window_start < excluded.window_start then 1
        else public.rag_rate_limits.request_count + 1
      end,
      window_start = greatest(public.rag_rate_limits.window_start, excluded.window_start)
  returning request_count into v_day_count;

  return v_minute_count <= 10 and v_day_count <= 100;
end;
$$;

create or replace function public.rag_read_records(
  p_category text,
  p_start date default null,
  p_end date default null,
  p_status text default null,
  p_search text default null,
  p_limit integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
  v_search text := nullif(left(trim(coalesce(p_search, '')), 80), '');
  v_status text := nullif(left(trim(coalesce(p_status, '')), 40), '');
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 25);
begin
  if p_start is not null and p_end is not null and p_start > p_end then
    raise exception 'Intervalo de datas inválido';
  end if;

  case p_category
    when 'unidades' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select unidade_id, bloco, apartamento, pavimento, observacoes, created_at
        from public.unidades
        where (v_search is null or concat_ws(' ', bloco, apartamento, pavimento, observacoes) ilike '%' || v_search || '%')
        order by bloco, apartamento
        limit v_limit
      ) r;
    when 'usuarios' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select u.usuario_id, u.nome, u.unidade_id, un.bloco, un.apartamento, u.data_cadastro, u.ativo
        from public.usuarios u
        left join public.unidades un on un.unidade_id = u.unidade_id
        where (v_search is null or u.nome ilike '%' || v_search || '%')
          and (v_status is null or lower(u.ativo::text) = lower(v_status) or (lower(v_status) = 'ativo' and u.ativo) or (lower(v_status) = 'inativo' and not u.ativo))
        order by u.nome
        limit v_limit
      ) r;
    when 'carregadores' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select charger_id, modelo, serial_number, localizacao, status, potencia_max_kw, firmware_version
        from public.carregadores
        where (v_status is null or lower(status) = lower(v_status))
          and (v_search is null or concat_ws(' ', modelo, localizacao, serial_number, status) ilike '%' || v_search || '%')
        order by localizacao
        limit v_limit
      ) r;
    when 'sessoes' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select s.sessao_id, s.charger_id, c.localizacao as carregador_localizacao,
               s.usuario_id, u.nome as usuario_nome, s.inicio, s.fim,
               s.duracao_min, s.energia_kwh, s.status, s.motivo_fim
        from public.sessoes s
        join public.usuarios u on u.usuario_id = s.usuario_id
        join public.carregadores c on c.charger_id = s.charger_id
        where (p_start is null or s.inicio::date >= p_start)
          and (p_end is null or s.inicio < (p_end + 1)::timestamptz)
          and (v_status is null or lower(s.status) = lower(v_status))
          and (v_search is null or concat_ws(' ', u.nome, c.localizacao, s.status, s.motivo_fim) ilike '%' || v_search || '%')
        order by s.inicio desc
        limit v_limit
      ) r;
    when 'medicoes' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select medicao_id, sessao_id, timestamp, potencia_kw, corrente_a, tensao_v, frequencia_hz, temperatura_c, fp
        from public.medicoes
        where (p_start is null or timestamp::date >= p_start)
          and (p_end is null or timestamp < (p_end + 1)::timestamptz)
        order by timestamp desc
        limit v_limit
      ) r;
    when 'eventos' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select evento_id, sessao_id, timestamp, tipo_evento, descricao
        from public.eventos
        where (p_start is null or timestamp::date >= p_start)
          and (p_end is null or timestamp < (p_end + 1)::timestamptz)
          and (v_status is null or lower(tipo_evento) = lower(v_status))
          and (v_search is null or concat_ws(' ', tipo_evento, descricao) ilike '%' || v_search || '%')
        order by timestamp desc
        limit v_limit
      ) r;
    when 'tarifas' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select tarifa_id, descricao, valor_kwh, vigencia_inicio, vigencia_fim, ativo
        from public.tarifas
        where (v_status is null or lower(ativo::text) = lower(v_status) or (lower(v_status) = 'ativo' and ativo) or (lower(v_status) = 'inativo' and not ativo))
          and (v_search is null or descricao ilike '%' || v_search || '%')
          and (p_start is null or vigencia_inicio >= p_start)
          and (p_end is null or vigencia_inicio <= p_end)
        order by vigencia_inicio desc
        limit v_limit
      ) r;
    when 'regras_rateio' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select regra_id, tarifa_id, descricao, tipo_tarifa, valor_fixo, percentual_taxa,
               vigencia_inicio, vigencia_fim, ativo
        from public.regras_rateio
        where (v_status is null or lower(ativo::text) = lower(v_status) or (lower(v_status) = 'ativo' and ativo) or (lower(v_status) = 'inativo' and not ativo))
          and (v_search is null or concat_ws(' ', descricao, tipo_tarifa) ilike '%' || v_search || '%')
          and (p_start is null or vigencia_inicio >= p_start)
          and (p_end is null or vigencia_inicio <= p_end)
        order by vigencia_inicio desc
        limit v_limit
      ) r;
    when 'faturas' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select f.fatura_id, f.usuario_id, u.nome as usuario_nome, f.unidade_id,
               un.bloco, un.apartamento, f.referencia, f.energia_total_kwh,
               f.valor_energia, f.valor_taxa_adm, f.valor_total, f.status_pagamento,
               f.vencimento, f.data_pagamento
        from public.faturas f
        join public.usuarios u on u.usuario_id = f.usuario_id
        left join public.unidades un on un.unidade_id = f.unidade_id
        where (v_status is null or lower(f.status_pagamento) = lower(v_status))
          and (v_search is null or concat_ws(' ', u.nome, f.status_pagamento) ilike '%' || v_search || '%')
          and (p_start is null or f.referencia >= date_trunc('month', p_start::timestamp)::date)
          and (p_end is null or f.referencia <= date_trunc('month', p_end::timestamp)::date)
        order by f.referencia desc, u.nome
        limit v_limit
      ) r;
    when 'fato_uso_cargas' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select fato_id, timestamp, unidade_id, charger_id, usuario_id, sessao_id,
               energia_kwh, potencia_media_kw, custo_estimado, tarifa_id
        from public.fato_uso_cargas
        where (p_start is null or timestamp::date >= p_start)
          and (p_end is null or timestamp < (p_end + 1)::timestamptz)
        order by timestamp desc
        limit v_limit
      ) r;
    when 'vw_consumo_mensal' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select usuario_id, nome, unidade_id, referencia, energia_total_kwh, quantidade_sessoes, tempo_total_min
        from public.vw_consumo_mensal
        where (p_start is null or referencia >= date_trunc('month', p_start::timestamp)::date)
          and (p_end is null or referencia <= date_trunc('month', p_end::timestamp)::date)
          and (v_search is null or nome ilike '%' || v_search || '%')
        order by referencia desc, nome
        limit v_limit
      ) r;
    when 'vw_calculo_fatura' then
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
      from (
        select usuario_id, nome, unidade_id, referencia, energia_total_kwh, quantidade_sessoes,
               tempo_total_min, descricao_tarifa, valor_kwh, descricao_regra,
               valor_energia, valor_taxa_adm, valor_total
        from public.vw_calculo_fatura
        where (p_start is null or referencia >= date_trunc('month', p_start::timestamp)::date)
          and (p_end is null or referencia <= date_trunc('month', p_end::timestamp)::date)
          and (v_search is null or nome ilike '%' || v_search || '%')
        order by referencia desc, nome
        limit v_limit
      ) r;
    else
      raise exception 'Categoria de consulta não permitida';
  end case;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

create or replace function public.rag_read_summary(p_start date default null, p_end date default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_start, 'fim', p_end),
    'sessoes', (
      select jsonb_build_object(
        'quantidade', count(*),
        'energia_kwh', coalesce(sum(s.energia_kwh), 0),
        'duracao_media_min', coalesce(round(avg(s.duracao_min)::numeric, 2), 0)
      )
      from public.sessoes s
      where (p_start is null or s.inicio::date >= p_start)
        and (p_end is null or s.inicio < (p_end + 1)::timestamptz)
    ),
    'carregadores_por_status', (
      select coalesce(jsonb_object_agg(t.status, t.quantidade), '{}'::jsonb)
      from (
        select status, count(*) as quantidade
        from public.carregadores
        group by status
      ) t
    ),
    'faturas', (
      select jsonb_build_object(
        'quantidade', count(*),
        'valor_total', coalesce(sum(f.valor_total), 0),
        'energia_kwh', coalesce(sum(f.energia_total_kwh), 0)
      )
      from public.faturas f
      where (p_start is null or f.referencia >= date_trunc('month', p_start::timestamp)::date)
        and (p_end is null or f.referencia <= date_trunc('month', p_end::timestamp)::date)
    ),
    'consumo_calculado_por_mes', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select referencia, sum(energia_total_kwh) as energia_total_kwh,
               sum(quantidade_sessoes) as quantidade_sessoes,
               sum(tempo_total_min) as tempo_total_min
        from public.vw_consumo_mensal
        where (p_start is null or referencia >= date_trunc('month', p_start::timestamp)::date)
          and (p_end is null or referencia <= date_trunc('month', p_end::timestamp)::date)
        group by referencia
        order by referencia desc
        limit 24
      ) m
    ),
    'valor_calculado_por_mes', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select referencia, sum(energia_total_kwh) as energia_total_kwh,
               sum(valor_energia) as valor_energia,
               sum(valor_taxa_adm) as valor_taxa_adm,
               sum(valor_total) as valor_total
        from public.vw_calculo_fatura
        where (p_start is null or referencia >= date_trunc('month', p_start::timestamp)::date)
          and (p_end is null or referencia <= date_trunc('month', p_end::timestamp)::date)
        group by referencia
        order by referencia desc
        limit 24
      ) m
    )
  );
$$;

revoke all on function public.rag_consume_rate_limit(text) from public, anon, authenticated;
revoke all on function public.rag_read_records(text, date, date, text, text, integer) from public, anon, authenticated;
revoke all on function public.rag_read_summary(date, date) from public, anon, authenticated;

grant execute on function public.rag_consume_rate_limit(text) to service_role;
grant execute on function public.rag_read_records(text, date, date, text, text, integer) to service_role;
grant execute on function public.rag_read_summary(date, date) to service_role;
