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