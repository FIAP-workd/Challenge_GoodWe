import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import { calcularRateio } from "../lib/rateio";
import {
  createFaturas,
  listFaturas,
  listRegras,
  listSessoesCobraveis,
} from "../services/rateioService";
import {
  getErrorMessage,
  listTarifas,
  listUsuarios,
} from "../services/supabaseService";
import type { Tarifa, Usuario } from "../types/database";
import type {
  Fatura,
  FaturaInsert,
  LinhaRateio,
  RegraRateio,
} from "../types/rateio";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatKwh(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kWh`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function pad(numero: number) {
  return String(numero).padStart(2, "0");
}

// "2026-09" -> { referencia: "2026-09-01", inicio, fim } (mês inteiro)
function periodoDoMes(mes: string) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  return {
    referencia: `${mes}-01`,
    inicio: new Date(ano, numeroMes - 1, 1),
    fim: new Date(ano, numeroMes, 1),
    vencimentoPadrao: `${numeroMes === 12 ? ano + 1 : ano}-${pad(
      numeroMes === 12 ? 1 : numeroMes + 1,
    )}-10`,
  };
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`;
}

// Tarifa ativa que vale em algum dia do mês escolhido.
function tarifaVigente(tarifas: Tarifa[], mes: string) {
  const { referencia, fim } = periodoDoMes(mes);
  const primeiroDiaProximoMes = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(
    fim.getDate(),
  )}`;

  return tarifas.find(
    (tarifa) =>
      tarifa.ativo &&
      tarifa.vigencia_inicio < primeiroDiaProximoMes &&
      (!tarifa.vigencia_fim || tarifa.vigencia_fim >= referencia),
  );
}

export function RateioPage() {
  const [mes, setMes] = useState(mesAtual());
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [regras, setRegras] = useState<RegraRateio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);

  const [tarifaId, setTarifaId] = useState("");
  const [regraId, setRegraId] = useState("");
  const [valorFixo, setValorFixo] = useState("0");
  const [percentual, setPercentual] = useState("0");
  const [vencimento, setVencimento] = useState(periodoDoMes(mesAtual()).vencimentoPadrao);

  const [linhas, setLinhas] = useState<LinhaRateio[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.usuario_id, usuario])),
    [usuarios],
  );

  // Carrega tarifas, regras e usuários uma vez.
  useEffect(() => {
    async function load() {
      try {
        const [tarifasData, regrasData, usuariosData] = await Promise.all([
          listTarifas(),
          listRegras(),
          listUsuarios(),
        ]);
        setTarifas(tarifasData);
        setRegras(regrasData);
        setUsuarios(usuariosData);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const loadFaturas = useCallback(async (mesEscolhido: string) => {
    try {
      setFaturas(await listFaturas(periodoDoMes(mesEscolhido).referencia));
      return true;
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      return false;
    }
  }, []);

  // Quando o mês muda: limpa a prévia, sugere tarifa/vencimento e busca faturas.
  useEffect(() => {
    if (!mes) {
      return;
    }

    setLinhas(null);
    setSuccess(null);
    setVencimento(periodoDoMes(mes).vencimentoPadrao);
    setTarifaId((atual) => tarifaVigente(tarifas, mes)?.tarifa_id ?? atual);
    void loadFaturas(mes);
  }, [mes, tarifas, loadFaturas]);

  function escolherRegra(id: string) {
    setRegraId(id);
    setLinhas(null);

    const regra = regras.find((item) => item.regra_id === id);

    if (regra) {
      setValorFixo(String(regra.valor_fixo));
      setPercentual(String(regra.percentual_taxa));

      if (regra.tarifa_id) {
        setTarifaId(regra.tarifa_id);
      }
    }
  }

  async function handleCalcular() {
    if (isWorking) {
      return;
    }

    const tarifa = tarifas.find((item) => item.tarifa_id === tarifaId);
    const fixo = Number(valorFixo);
    const pct = Number(percentual);

    if (!tarifa) {
      setError("Escolha uma tarifa. Cadastre uma na aba Tarifas se não houver.");
      return;
    }

    if (!Number.isFinite(fixo) || fixo < 0 || !Number.isFinite(pct) || pct < 0) {
      setError("Taxa fixa e percentual devem ser números maiores ou iguais a zero.");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const periodo = periodoDoMes(mes);
      const sessoes = await listSessoesCobraveis(
        periodo.inicio.toISOString(),
        periodo.fim.toISOString(),
      );
      const resultado = calcularRateio(sessoes, {
        valorKwh: Number(tarifa.valor_kwh),
        valorFixo: fixo,
        percentualTaxa: pct,
      });
      setLinhas(resultado);
    } catch (calcError) {
      setError(getErrorMessage(calcError));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleGerarFaturas() {
    if (isWorking || !linhas) {
      return;
    }

    // Quem já tem fatura neste mês não recebe outra (o banco só permite uma).
    const jaTemFatura = new Set(faturas.map((fatura) => fatura.usuario_id));
    const novas = linhas.filter((linha) => !jaTemFatura.has(linha.usuario_id));
    const ignoradas = linhas.length - novas.length;

    if (novas.length === 0) {
      setError("Todos os usuários desta prévia já têm fatura neste mês.");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const referencia = periodoDoMes(mes).referencia;
      const payload: FaturaInsert[] = novas.map((linha) => ({
        usuario_id: linha.usuario_id,
        unidade_id: usuariosById.get(linha.usuario_id)?.unidade_id ?? null,
        regra_id: regraId || null,
        tarifa_id: tarifaId || null,
        referencia,
        energia_total_kwh: linha.energiaKwh,
        valor_energia: linha.valorEnergia,
        valor_taxa_adm: linha.valorTaxa,
        status_pagamento: "pendente",
        vencimento,
      }));

      await createFaturas(payload);
      const listUpdated = await loadFaturas(mes);
      setLinhas(null);
      setSuccess(
        `${novas.length} fatura(s) gerada(s)${
          ignoradas > 0 ? `, ${ignoradas} já existiam e foram mantidas` : ""
        }${listUpdated ? "." : ", mas não foi possível atualizar a listagem."}`,
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsWorking(false);
    }
  }

  const totalPrevia = (campo: keyof Pick<LinhaRateio, "energiaKwh" | "valorEnergia" | "valorTaxa" | "valorTotal">) =>
    (linhas ?? []).reduce((soma, linha) => soma + linha[campo], 0);

  return (
    <section className="content-section" aria-labelledby="rateio-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">6. Motor de rateio</p>
          <h2 id="rateio-title">Rateio e faturas</h2>
          <p>
            Soma as sessões do mês de cada usuário e calcula: energia (kWh) ×
            tarifa + taxa administrativa.
          </p>
        </div>
      </div>

      {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
      {success && <FeedbackMessage type="success">{success}</FeedbackMessage>}

      {isLoading ? (
        <FeedbackMessage type="info">Carregando dados...</FeedbackMessage>
      ) : (
        <>
          <div className="form-panel">
            <div className="form-heading">
              <div>
                <h3>1. Parâmetros da conta</h3>
                <p>
                  Escolha o mês e a tarifa. A regra de rateio é opcional: ela só
                  preenche a taxa para você, que pode ajustar abaixo.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Mês de referência *
                <input
                  type="month"
                  required
                  value={mes}
                  onChange={(event) => setMes(event.target.value)}
                />
              </label>

              <label>
                Tarifa (R$ por kWh) *
                <select
                  value={tarifaId}
                  onChange={(event) => {
                    setTarifaId(event.target.value);
                    setLinhas(null);
                  }}
                >
                  <option value="">Selecione</option>
                  {tarifas
                    .filter((tarifa) => tarifa.ativo)
                    .map((tarifa) => (
                      <option key={tarifa.tarifa_id} value={tarifa.tarifa_id}>
                        {tarifa.descricao} — {moeda.format(Number(tarifa.valor_kwh))}
                      </option>
                    ))}
                </select>
              </label>

              <label className="form-field--wide">
                Regra de rateio (opcional)
                <select
                  value={regraId}
                  onChange={(event) => escolherRegra(event.target.value)}
                >
                  <option value="">Sem regra (informar taxa manualmente)</option>
                  {regras.map((regra) => (
                    <option key={regra.regra_id} value={regra.regra_id}>
                      {regra.descricao}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Taxa fixa em R$
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={valorFixo}
                  onChange={(event) => {
                    setValorFixo(event.target.value);
                    setLinhas(null);
                  }}
                />
              </label>

              <label>
                Taxa percentual (5 = 5%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={percentual}
                  onChange={(event) => {
                    setPercentual(event.target.value);
                    setLinhas(null);
                  }}
                />
              </label>

              <label>
                Vencimento das faturas *
                <input
                  type="date"
                  required
                  value={vencimento}
                  onChange={(event) => setVencimento(event.target.value)}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={handleCalcular}
                disabled={isWorking}
              >
                {isWorking ? "Calculando..." : "Calcular rateio"}
              </button>
            </div>
          </div>

          {linhas && (
            <div className="form-panel">
              <div className="form-heading">
                <div>
                  <h3>2. Prévia (ainda não foi salva)</h3>
                  <p>
                    Confira os valores. Só entram sessões finalizadas ou
                    interrompidas que começaram no mês escolhido.
                  </p>
                </div>
              </div>

              {linhas.length === 0 ? (
                <div className="empty-state">
                  <h3>Nada para cobrar neste mês</h3>
                  <p>
                    Não há sessões finalizadas ou interrompidas no período.
                    Cadastre sessões na aba Sessões.
                  </p>
                </div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Sessões</th>
                          <th>Energia</th>
                          <th>Valor da energia</th>
                          <th>Taxa</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((linha) => (
                          <tr key={linha.usuario_id}>
                            <td data-label="Usuário">
                              {usuariosById.get(linha.usuario_id)?.nome ?? "—"}
                            </td>
                            <td data-label="Sessões">{linha.sessoes}</td>
                            <td data-label="Energia">{formatKwh(linha.energiaKwh)}</td>
                            <td data-label="Valor da energia">
                              {moeda.format(linha.valorEnergia)}
                            </td>
                            <td data-label="Taxa">{moeda.format(linha.valorTaxa)}</td>
                            <td data-label="Total">
                              <strong>{moeda.format(linha.valorTotal)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td data-label="Usuário">
                            <strong>Total geral</strong>
                          </td>
                          <td data-label="Sessões">
                            {linhas.reduce((soma, linha) => soma + linha.sessoes, 0)}
                          </td>
                          <td data-label="Energia">
                            <strong>{formatKwh(totalPrevia("energiaKwh"))}</strong>
                          </td>
                          <td data-label="Valor da energia">
                            <strong>{moeda.format(totalPrevia("valorEnergia"))}</strong>
                          </td>
                          <td data-label="Taxa">
                            <strong>{moeda.format(totalPrevia("valorTaxa"))}</strong>
                          </td>
                          <td data-label="Total">
                            <strong>{moeda.format(totalPrevia("valorTotal"))}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="form-actions">
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={handleGerarFaturas}
                      disabled={isWorking}
                    >
                      {isWorking ? "Gerando..." : "Gerar faturas"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-panel">
            <div className="form-heading">
              <div>
                <h3>Faturas já geradas neste mês</h3>
              </div>
            </div>

            {faturas.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhuma fatura neste mês</h3>
                <p>Calcule o rateio acima e gere as faturas.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Energia</th>
                      <th>Valor da energia</th>
                      <th>Taxa</th>
                      <th>Total</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturas.map((fatura) => (
                      <tr key={fatura.fatura_id}>
                        <td data-label="Usuário">
                          {usuariosById.get(fatura.usuario_id)?.nome ?? "—"}
                        </td>
                        <td data-label="Energia">{formatKwh(fatura.energia_total_kwh)}</td>
                        <td data-label="Valor da energia">
                          {moeda.format(Number(fatura.valor_energia))}
                        </td>
                        <td data-label="Taxa">
                          {moeda.format(Number(fatura.valor_taxa_adm))}
                        </td>
                        <td data-label="Total">
                          <strong>{moeda.format(Number(fatura.valor_total))}</strong>
                        </td>
                        <td data-label="Vencimento">{formatDate(fatura.vencimento)}</td>
                        <td data-label="Status">
                          <span className="status-badge status-badge--neutral">
                            {fatura.status_pagamento.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
