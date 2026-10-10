CREATE OR REPLACE VIEW public.vw_consumo_mensal AS

SELECT
    u.usuario_id,
    u.nome,
    u.unidade_id,

    DATE_TRUNC('month', s.inicio)::date AS referencia,

    SUM(s.energia_kwh)::numeric(12, 3)
        AS energia_total_kwh,

    COUNT(s.sessao_id)
        AS quantidade_sessoes,

    SUM(s.duracao_min)
        AS tempo_total_min

FROM public.usuarios u

INNER JOIN public.sessoes s
    ON s.usuario_id = u.usuario_id

WHERE
    s.status IN ('finalizada', 'interrompida')
    AND s.fim IS NOT NULL

GROUP BY
    u.usuario_id,
    u.nome,
    u.unidade_id,
    DATE_TRUNC('month', s.inicio)::date;

CREATE OR REPLACE VIEW public.vw_calculo_fatura AS

SELECT
    c.usuario_id,
    c.nome,
    c.unidade_id,
    c.referencia,

    c.energia_total_kwh,
    c.quantidade_sessoes,
    c.tempo_total_min,

    t.tarifa_id,
    t.descricao AS descricao_tarifa,
    t.valor_kwh,

    r.regra_id,
    r.descricao AS descricao_regra,
    r.tipo_tarifa,
    r.valor_fixo,
    r.percentual_taxa,

    ROUND(
        c.energia_total_kwh * t.valor_kwh,
        2
    ) AS valor_energia,

    ROUND(
        (
            c.energia_total_kwh * t.valor_kwh
        ) * (r.percentual_taxa / 100.0),
        2
    ) AS valor_taxa_percentual,

    ROUND(
        r.valor_fixo
        +
        (
            c.energia_total_kwh
            * t.valor_kwh
            * r.percentual_taxa / 100.0
        ),
        2
    ) AS valor_taxa_adm,

    ROUND(
        (
            c.energia_total_kwh * t.valor_kwh
        )
        +
        r.valor_fixo
        +
        (
            c.energia_total_kwh
            * t.valor_kwh
            * r.percentual_taxa / 100.0
        ),
        2
    ) AS valor_total

FROM public.vw_consumo_mensal c

INNER JOIN LATERAL (
    SELECT
        tarifa_id,
        descricao,
        valor_kwh
    FROM public.tarifas
    WHERE
        ativo = TRUE
        AND vigencia_inicio <= c.referencia
        AND (
            vigencia_fim IS NULL
            OR vigencia_fim >= c.referencia
        )
    ORDER BY vigencia_inicio DESC
    LIMIT 1
) t ON TRUE

INNER JOIN LATERAL (
    SELECT
        regra_id,
        descricao,
        tipo_tarifa,
        valor_fixo,
        percentual_taxa
    FROM public.regras_rateio
    WHERE
        tarifa_id = t.tarifa_id
        AND ativo = TRUE
        AND tipo_tarifa IN ('kwh', 'mista')
        AND vigencia_inicio <= c.referencia
        AND (
            vigencia_fim IS NULL
            OR vigencia_fim >= c.referencia
        )
    ORDER BY vigencia_inicio DESC
    LIMIT 1
) r ON TRUE;