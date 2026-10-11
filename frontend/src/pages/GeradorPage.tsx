import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import { supabase } from "../lib/supabase";
import { createSessao, listSessoes } from "../services/rateioService";
import {
  getErrorMessage,
  listCarregadores,
  listUsuarios,
} from "../services/supabaseService";
import type { Carregador, Usuario } from "../types/database";
import type { Sessao } from "../types/rateio";

// =====================================================================
// GeradorPage — Challenge GoodWe + FIAP (EV ChargeOps)
// 1. Gera sessões realistas para popular a tabela `sessoes`;
// 2. Simula uma sessão de recarga ao vivo com um cliente cadastrado;
// 3. Prévia de rateio por usuário e histórico recente.
// =====================================================================

interface SessaoPayload {
  usuario_id: string;
  charger_id: string;
  inicio: string;
  fim: string;
  energia_kwh: number;
  status: "finalizada";
  motivo_fim: string | null;
}

interface LinhaGerada extends SessaoPayload {
  custo: number; // apenas exibição (energia × tarifa); não é coluna do banco
}

type OrigemLinha = "banco" | "gerador";

interface LinhaHistorico {
  chave: string;
  inicio: string;
  cliente: string;
  carregador: string;
  energia_kwh: number;
  custo: number;
  origem: OrigemLinha;
}

// ----- utilitários -----

/** RNG com semente (mulberry32): a mesma semente reproduz a mesma prévia. */
function criarRng(semente: string): () => number {
  if (!semente.trim()) {
    return Math.random;
  }
  let estado = 0;
  for (const caractere of semente) {
    estado = (estado * 31 + caractere.charCodeAt(0)) >>> 0;
  }
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const moeda = (valor: number): string =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const energiaTexto = (valor: number): string =>
  `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kWh`;

const dataHoraTexto = (iso: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

function duracaoTexto(totalSegundos: number): string {
  const segundos = Math.max(0, Math.floor(totalSegundos));
  const horas = String(Math.floor(segundos / 3600)).padStart(2, "0");
  const minutos = String(Math.floor((segundos % 3600) / 60)).padStart(2, "0");
  const resto = String(segundos % 60).padStart(2, "0");
  return `${horas}:${minutos}:${resto}`;
}

function baixarArquivo(conteudo: string, nome: string, tipo: string): void {
  const blob = new Blob([conteudo], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

const escaparSql = (valor: string): string => valor.replace(/'/g, "''");

/** Converte texto de input em número aceitando vírgula decimal. */
const numero = (texto: string, padrao: number): number => {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : padrao;
};

// CSS próprio da página (classes prefixadas para não conflitar com styles.css)
const GERADOR_CSS = `
.gerador-painel { display: grid; gap: 16px; }
.gerador-card { border: 1px solid rgba(128, 128, 128, 0.28); border-radius: 12px; padding: 16px; }
.gerador-card h3 { margin: 0 0 12px; }
.gerador-nota { font-size: 0.85rem; opacity: 0.75; margin: 8px 0 0; }
.gerador-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 12px 0; }
.gerador-kpi { border: 1px solid rgba(128, 128, 128, 0.28); border-radius: 10px; padding: 10px 12px; }
.gerador-kpi span { display: block; font-size: 0.75rem; opacity: 0.7; }
.gerador-kpi strong { font-size: 1.25rem; font-variant-numeric: tabular-nums; }
.gerador-usuarios { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 12px; font-size: 0.9rem; }
.gerador-barras { display: grid; gap: 8px; margin-top: 8px; }
.gerador-barra { display: grid; grid-template-columns: minmax(120px, 180px) 1fr minmax(160px, auto); gap: 10px; align-items: center; font-size: 0.9rem; }
.gerador-trilho { background: rgba(128, 128, 128, 0.18); border-radius: 6px; height: 12px; overflow: hidden; }
.gerador-trilho > div { background: #22c55e; height: 100%; }
.gerador-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(128, 128, 128, 0.4); white-space: nowrap; }
.gerador-canvas { width: 100%; height: 80px; display: block; margin: 4px 0 12px; }
`;

export function GeradorPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregadores, setCarregadores] = useState<Carregador[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ----- gerador de sessões -----
  const [diasTexto, setDiasTexto] = useState("30");
  const [minTexto, setMinTexto] = useState("1");
  const [maxTexto, setMaxTexto] = useState("5");
  const [potenciaTexto, setPotenciaTexto] = useState("7.4");
  const [tarifaTexto, setTarifaTexto] = useState("0.92");
  const [semente, setSemente] = useState("");
  const [chargerSelecionado, setChargerSelecionado] = useState("");
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [geradas, setGeradas] = useState<LinhaGerada[]>([]);
  const [geradasInseridas, setGeradasInseridas] = useState(false);
  const [inserindo, setInserindo] = useState(false);

  // ----- simulação ao vivo -----
  const [simUsuarioId, setSimUsuarioId] = useState("");
  const [simChargerId, setSimChargerId] = useState("");
  const [simPotenciaTexto, setSimPotenciaTexto] = useState("7.4");
  const [simTarifaTexto, setSimTarifaTexto] = useState("0.92");
  const [simVelocidade, setSimVelocidade] = useState(60);
  const [simEstado, setSimEstado] = useState<"parado" | "rodando" | "pausado">("parado");
  const [simInicio, setSimInicio] = useState<Date | null>(null);
  const [simSegundos, setSimSegundos] = useState(0);
  const [simKwh, setSimKwh] = useState(0);
  const [simCusto, setSimCusto] = useState(0);
  const [simPotenciaAtual, setSimPotenciaAtual] = useState(0);
  const [salvandoSim, setSalvandoSim] = useState(false);

  const historicoPotencia = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tarifa = numero(tarifaTexto, 0.92);
  const potencia = numero(potenciaTexto, 7.4);
  const simPotencia = numero(simPotenciaTexto, 7.4);
  const simTarifa = numero(simTarifaTexto, 0.92);

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.usuario_id, usuario.nome])),
    [usuarios],
  );

  const carregadoresById = useMemo(
    () =>
      new Map(
        carregadores.map((carregador) => [carregador.charger_id, carregador.localizacao]),
      ),
    [carregadores],
  );

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [usuariosData, carregadoresData, sessoesData] = await Promise.all([
        listUsuarios(),
        listCarregadores(),
        listSessoes(),
      ]);
      setUsuarios(usuariosData);
      setCarregadores(carregadoresData);
      setSessoes(sessoesData);
      return true;
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      return false;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------- 1 · gerador de sessões ----------

  function gerarPrevia(): void {
    setError(null);
    setSuccess(null);

    const dias = Math.floor(numero(diasTexto, 30));
    const min = Math.floor(numero(minTexto, 1));
    const max = Math.floor(numero(maxTexto, 5));

    if (dias < 1 || dias > 90) {
      setError("O período deve ficar entre 1 e 90 dias.");
      return;
    }
    if (min < 1 || max < min) {
      setError("Informe mínimo >= 1 e máximo >= mínimo de sessões por dia.");
      return;
    }
    if (!chargerSelecionado) {
      setError("Selecione o carregador.");
      return;
    }

    const idsEfetivos =
      usuariosSelecionados.length > 0
        ? usuariosSelecionados
        : usuarios.map((usuario) => usuario.usuario_id);
    if (idsEfetivos.length === 0) {
      setError("Cadastre ao menos um usuário na aba 2 antes de gerar sessões.");
      return;
    }

    const rng = criarRng(semente);
    const linhas: LinhaGerada[] = [];
    const hoje = new Date();

    for (let diaOffset = dias; diaOffset >= 1; diaOffset -= 1) {
      const dia = new Date(hoje);
      dia.setDate(dia.getDate() - diaOffset);

      const quantidade = min + Math.floor(rng() * (max - min + 1));

      for (let i = 0; i < quantidade; i += 1) {
        // Distribuição de horários: 30% manhã (7h–10h), 50% fim de tarde/noite
        // (17h–22h) e 20% demais horários — padrão típico de recarga.
        const sorteio = rng();
        let hora: number;
        if (sorteio < 0.3) {
          hora = 7 + rng() * 3;
        } else if (sorteio < 0.8) {
          hora = 17 + rng() * 5;
        } else {
          hora = rng() * 24;
        }

        const inicio = new Date(dia);
        inicio.setHours(Math.floor(hora), Math.floor((hora % 1) * 60), 0, 0);

        const duracaoMin = 25 + rng() * 155; // 25 a 180 minutos
        const fim = new Date(inicio.getTime() + duracaoMin * 60_000);

        // Energia: potência × tempo × eficiência (88%–96%), limitada a 80 kWh.
        const eficiencia = 0.88 + rng() * 0.08;
        const energiaBruta = potencia * (duracaoMin / 60) * eficiencia;
        const energia = Math.min(80, Math.round(energiaBruta * 1000) / 1000);

        linhas.push({
          usuario_id: idsEfetivos[Math.floor(rng() * idsEfetivos.length)],
          charger_id: chargerSelecionado,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          energia_kwh: energia,
          status: "finalizada",
          motivo_fim: null,
          custo: Math.round(energia * tarifa * 100) / 100,
        });
      }
    }

    setGeradas(linhas);
    setGeradasInseridas(false);
    setSuccess(
      `Prévia gerada: ${linhas.length} sessões em ${dias} dias. Revise, insira no banco ou baixe os arquivos.`,
    );
  }

  async function inserirGeradas(): Promise<void> {
    if (!supabase) {
      setError("Cliente Supabase não configurado neste ambiente.");
      return;
    }
    if (geradas.length === 0) {
      setError("Gere a prévia antes de inserir.");
      return;
    }

    setInserindo(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = geradas.map((linha) => ({
        usuario_id: linha.usuario_id,
        charger_id: linha.charger_id,
        inicio: linha.inicio,
        fim: linha.fim,
        energia_kwh: linha.energia_kwh,
        status: linha.status,
        motivo_fim: linha.motivo_fim,
      }));

      const { error: insertError } = await supabase.from("sessoes").insert(payload);
      if (insertError) {
        throw insertError;
      }

      setGeradasInseridas(true);
      const atualizado = await loadData(false);
      setSuccess(
        atualizado
          ? `${payload.length} sessões inseridas no Supabase e listagem atualizada.`
          : `${payload.length} sessões inseridas, mas não foi possível atualizar a listagem.`,
      );
    } catch (saveError) {
      setError(
        `${getErrorMessage(saveError)} Se a escrita estiver bloqueada, use "Baixar SQL" e execute o arquivo no SQL Editor do Supabase.`,
      );
    } finally {
      setInserindo(false);
    }
  }

  function baixarSql(): void {
    const valores = geradas.map(
      (linha) =>
        `  ('${escaparSql(linha.usuario_id)}', '${escaparSql(linha.charger_id)}', '${linha.inicio}', '${linha.fim}', ${linha.energia_kwh}, 'finalizada', NULL)`,
    );
    const conteudo = [
      "-- EV ChargeOps · sessões geradas pelo Gerador de Dados",
      `-- Challenge GoodWe + FIAP · ${new Date().toLocaleString("pt-BR")}`,
      "INSERT INTO sessoes (usuario_id, charger_id, inicio, fim, energia_kwh, status, motivo_fim) VALUES",
      valores.join(",\n"),
      ";",
      "",
    ].join("\n");
    baixarArquivo(conteudo, "sessoes-geradas.sql", "text/sql");
  }

  function baixarJson(): void {
    baixarArquivo(
      JSON.stringify(geradas, null, 2),
      "sessoes-geradas.json",
      "application/json",
    );
  }

  function baixarCsv(): void {
    const cabecalho = "usuario_id;charger_id;inicio;fim;energia_kwh;status";
    const linhas = geradas.map((linha) =>
      [
        linha.usuario_id,
        linha.charger_id,
        linha.inicio,
        linha.fim,
        String(linha.energia_kwh).replace(".", ","),
        linha.status,
      ].join(";"),
    );
    baixarArquivo([cabecalho, ...linhas].join("\n"), "sessoes-geradas.csv", "text/csv");
  }

  // ---------- 2 · simulação ao vivo ----------

  useEffect(() => {
    if (simEstado !== "rodando") {
      return;
    }

    const id = window.setInterval(() => {
      setSimSegundos((segundos) => segundos + simVelocidade);

      // Variação de ±5% para a potência instantânea ficar realista.
      const potenciaInstantanea = simPotencia * (0.95 + Math.random() * 0.1);
      setSimPotenciaAtual(potenciaInstantanea);

      historicoPotencia.current.push(potenciaInstantanea);
      if (historicoPotencia.current.length > 120) {
        historicoPotencia.current.shift();
      }

      const deltaKwh = (potenciaInstantanea * simVelocidade) / 3600;
      setSimKwh((atual) => atual + deltaKwh);
      setSimCusto((atual) => atual + deltaKwh * simTarifa);
    }, 1000);

    return () => window.clearInterval(id);
  }, [simEstado, simVelocidade, simPotencia, simTarifa]);

  // Sparkline de potência no canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dados = historicoPotencia.current;
    if (dados.length < 2) {
      return;
    }

    const maximo = Math.max(...dados) * 1.1;
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    dados.forEach((valor, indice) => {
      const x = (indice / (dados.length - 1)) * canvas.width;
      const y = canvas.height - (valor / maximo) * (canvas.height - 6) - 3;
      if (indice === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [simPotenciaAtual]);

  function iniciarSimulacao(): void {
    if (!simUsuarioId || !simChargerId) {
      setError("Selecione o cliente e o carregador antes de iniciar a simulação.");
      return;
    }
    setError(null);
    setSuccess(null);
    historicoPotencia.current = [];
    setSimInicio(new Date());
    setSimSegundos(0);
    setSimKwh(0);
    setSimCusto(0);
    setSimPotenciaAtual(0);
    setSimEstado("rodando");
  }

  function alternarPausa(): void {
    setSimEstado((estado) => (estado === "rodando" ? "pausado" : "rodando"));
  }

  async function encerrarSimulacao(): Promise<void> {
    if (simEstado === "parado" || !simInicio) {
      return;
    }

    setSimEstado("parado");

    if (simSegundos < 60) {
      setError("Simule ao menos 1 minuto antes de encerrar para gerar um registro válido.");
      return;
    }

    setSalvandoSim(true);
    setError(null);

    try {
      const fim = new Date(simInicio.getTime() + simSegundos * 1000);
      await createSessao({
        usuario_id: simUsuarioId,
        charger_id: simChargerId,
        inicio: simInicio.toISOString(),
        fim: fim.toISOString(),
        energia_kwh: Math.round(simKwh * 1000) / 1000,
        status: "finalizada",
        motivo_fim: "simulacao_ao_vivo",
      });

      const atualizado = await loadData(false);
      setSuccess(
        atualizado
          ? "Sessão ao vivo registrada no Supabase e listagem atualizada."
          : "Sessão ao vivo registrada, mas não foi possível atualizar a listagem.",
      );
      setSimInicio(null);
      setSimSegundos(0);
      setSimKwh(0);
      setSimCusto(0);
      setSimPotenciaAtual(0);
      historicoPotencia.current = [];
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSalvandoSim(false);
    }
  }

  // ---------- 3 · rateio e 4 · histórico ----------

  const linhasRateio = useMemo(() => {
    const mapa = new Map<string, { nome: string; kwh: number; custo: number }>();

    const somar = (usuarioId: string, energia: number) => {
      const atual = mapa.get(usuarioId) ?? {
        nome: usuariosById.get(usuarioId) ?? usuarioId,
        kwh: 0,
        custo: 0,
      };
      atual.kwh += energia;
      atual.custo += energia * tarifa;
      mapa.set(usuarioId, atual);
    };

    if (!geradasInseridas) {
      geradas.forEach((linha) => somar(linha.usuario_id, linha.energia_kwh));
    }
    sessoes.forEach((sessao) => somar(sessao.usuario_id, Number(sessao.energia_kwh)));

    const totalKwh = [...mapa.values()].reduce((soma, item) => soma + item.kwh, 0);

    return [...mapa.entries()]
      .map(([id, item]) => ({
        id,
        nome: item.nome,
        kwh: item.kwh,
        custo: item.custo,
        participacao: totalKwh > 0 ? (item.kwh / totalKwh) * 100 : 0,
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [sessoes, geradas, geradasInseridas, tarifa, usuariosById]);

  const linhasHistorico = useMemo<LinhaHistorico[]>(() => {
    const linhas: LinhaHistorico[] = sessoes.map((sessao) => ({
      chave: `banco-${sessao.sessao_id}`,
      inicio: sessao.inicio,
      cliente: usuariosById.get(sessao.usuario_id) ?? "—",
      carregador: carregadoresById.get(sessao.charger_id) ?? "—",
      energia_kwh: Number(sessao.energia_kwh),
      custo: Number(sessao.energia_kwh) * tarifa,
      origem: "banco",
    }));

    if (!geradasInseridas) {
      geradas.forEach((linha, indice) => {
        linhas.push({
          chave: `gerada-${indice}`,
          inicio: linha.inicio,
          cliente: usuariosById.get(linha.usuario_id) ?? "—",
          carregador: carregadoresById.get(linha.charger_id) ?? "—",
          energia_kwh: linha.energia_kwh,
          custo: linha.custo,
          origem: "gerador",
        });
      });
    }

    return linhas.sort((a, b) => b.inicio.localeCompare(a.inicio)).slice(0, 20);
  }, [sessoes, geradas, geradasInseridas, tarifa, usuariosById, carregadoresById]);

  const rotuloOrigem: Record<OrigemLinha, string> = {
    banco: "banco",
    gerador: "gerador",
  };

  const cadastrosProntos = usuarios.length > 0 && carregadores.length > 0;

  return (
    <section className="content-section" aria-labelledby="gerador-title">
      <style>{GERADOR_CSS}</style>
      <h2 id="gerador-title">Gerador de dados e simulação ao vivo</h2>
      <p>
        Popula a tabela <code>sessoes</code> com um histórico realista e permite simular
        uma sessão de recarga ao vivo com um cliente já cadastrado.
      </p>

      {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
      {success && <FeedbackMessage type="success">{success}</FeedbackMessage>}

      {isLoading ? (
        <FeedbackMessage type="info">Carregando cadastros...</FeedbackMessage>
      ) : !cadastrosProntos ? (
        <div className="empty-state">
          <h3>Cadastros insuficientes</h3>
          <p>
            Cadastre ao menos um usuário (aba 2) e um carregador (aba 3) antes de usar o
            gerador.
          </p>
        </div>
      ) : (
        <div className="gerador-painel">
          {/* ---------- 1 · Gerador de sessões ---------- */}
          <div className="gerador-card">
            <h3>1 · Gerador de sessões</h3>
            <div className="form-grid">
              <label>
                Dias de histórico *
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={diasTexto}
                  onChange={(evento) => setDiasTexto(evento.target.value)}
                />
              </label>
              <label>
                Sessões por dia — mínimo *
                <input
                  type="number"
                  min={1}
                  value={minTexto}
                  onChange={(evento) => setMinTexto(evento.target.value)}
                />
              </label>
              <label>
                Sessões por dia — máximo *
                <input
                  type="number"
                  min={1}
                  value={maxTexto}
                  onChange={(evento) => setMaxTexto(evento.target.value)}
                />
              </label>
              <label>
                Carregador *
                <select
                  value={chargerSelecionado}
                  onChange={(evento) => setChargerSelecionado(evento.target.value)}
                >
                  <option value="">Selecione</option>
                  {carregadores.map((carregador) => (
                    <option key={carregador.charger_id} value={carregador.charger_id}>
                      {carregador.localizacao} ({carregador.serial_number})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Potência (kW) *
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={potenciaTexto}
                  onChange={(evento) => setPotenciaTexto(evento.target.value)}
                />
              </label>
              <label>
                Tarifa (R$/kWh) *
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tarifaTexto}
                  onChange={(evento) => setTarifaTexto(evento.target.value)}
                />
              </label>
              <label className="form-field--wide">
                Semente (opcional — a mesma semente reproduz a mesma prévia)
                <input
                  type="text"
                  value={semente}
                  placeholder="ex.: demo-goodwe"
                  onChange={(evento) => setSemente(evento.target.value)}
                />
              </label>
            </div>

            <p>Usuários incluídos (nenhum marcado = todos):</p>
            <div className="gerador-usuarios">
              {usuarios.map((usuario) => (
                <label key={usuario.usuario_id}>
                  <input
                    type="checkbox"
                    checked={usuariosSelecionados.includes(usuario.usuario_id)}
                    onChange={() =>
                      setUsuariosSelecionados((atual) =>
                        atual.includes(usuario.usuario_id)
                          ? atual.filter((id) => id !== usuario.usuario_id)
                          : [...atual, usuario.usuario_id],
                      )
                    }
                  />{" "}
                  {usuario.nome}
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={gerarPrevia}
              >
                Gerar prévia
              </button>
            </div>

            {geradas.length > 0 && (
              <>
                <div className="gerador-kpis">
                  <div className="gerador-kpi">
                    <span>Sessões</span>
                    <strong>{geradas.length}</strong>
                  </div>
                  <div className="gerador-kpi">
                    <span>Energia total</span>
                    <strong>
                      {energiaTexto(geradas.reduce((soma, l) => soma + l.energia_kwh, 0))}
                    </strong>
                  </div>
                  <div className="gerador-kpi">
                    <span>Custo total</span>
                    <strong>{moeda(geradas.reduce((soma, l) => soma + l.custo, 0))}</strong>
                  </div>
                  <div className="gerador-kpi">
                    <span>Média por sessão</span>
                    <strong>
                      {energiaTexto(
                        geradas.reduce((soma, l) => soma + l.energia_kwh, 0) /
                          geradas.length,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Início</th>
                        <th>Cliente</th>
                        <th>Carregador</th>
                        <th>Duração</th>
                        <th>Energia</th>
                        <th>Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geradas.slice(0, 15).map((linha, indice) => (
                        <tr key={`previa-${indice}`}>
                          <td>{dataHoraTexto(linha.inicio)}</td>
                          <td>{usuariosById.get(linha.usuario_id) ?? "—"}</td>
                          <td>{carregadoresById.get(linha.charger_id) ?? "—"}</td>
                          <td>
                            {duracaoTexto(
                              (new Date(linha.fim).getTime() -
                                new Date(linha.inicio).getTime()) /
                                1000,
                            )}
                          </td>
                          <td>{energiaTexto(linha.energia_kwh)}</td>
                          <td>{moeda(linha.custo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {geradas.length > 15 && (
                  <p className="gerador-nota">
                    Mostrando as 15 primeiras de {geradas.length} sessões — a inserção e os
                    arquivos incluem todas.
                  </p>
                )}

                <div className="form-actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={inserirGeradas}
                    disabled={inserindo || geradasInseridas}
                  >
                    {inserindo
                      ? "Inserindo..."
                      : geradasInseridas
                        ? "Inseridas no banco ✓"
                        : "Inserir no Supabase"}
                  </button>
                  <button className="button button--secondary" type="button" onClick={baixarSql}>
                    Baixar SQL
                  </button>
                  <button className="button button--secondary" type="button" onClick={baixarJson}>
                    Baixar JSON
                  </button>
                  <button className="button button--secondary" type="button" onClick={baixarCsv}>
                    Baixar CSV
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ---------- 2 · Simulação ao vivo ---------- */}
          <div className="gerador-card">
            <h3>2 · Simulação ao vivo</h3>
            <div className="form-grid">
              <label>
                Cliente *
                <select
                  value={simUsuarioId}
                  onChange={(evento) => setSimUsuarioId(evento.target.value)}
                >
                  <option value="">Selecione</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.usuario_id} value={usuario.usuario_id}>
                      {usuario.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Carregador *
                <select
                  value={simChargerId}
                  onChange={(evento) => setSimChargerId(evento.target.value)}
                >
                  <option value="">Selecione</option>
                  {carregadores.map((carregador) => (
                    <option key={carregador.charger_id} value={carregador.charger_id}>
                      {carregador.localizacao} ({carregador.serial_number})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Potência (kW)
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={simPotenciaTexto}
                  onChange={(evento) => setSimPotenciaTexto(evento.target.value)}
                />
              </label>
              <label>
                Tarifa (R$/kWh)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={simTarifaTexto}
                  onChange={(evento) => setSimTarifaTexto(evento.target.value)}
                />
              </label>
              <label>
                Velocidade do tempo
                <select
                  value={simVelocidade}
                  onChange={(evento) => setSimVelocidade(Number(evento.target.value))}
                >
                  <option value={1}>x1 (tempo real)</option>
                  <option value={60}>x60 (1 min por segundo)</option>
                  <option value={300}>x300 (5 min por segundo)</option>
                </select>
              </label>
            </div>

            <div className="gerador-kpis">
              <div className="gerador-kpi">
                <span>Tempo de sessão</span>
                <strong>{duracaoTexto(simSegundos)}</strong>
              </div>
              <div className="gerador-kpi">
                <span>Energia</span>
                <strong>{energiaTexto(simKwh)}</strong>
              </div>
              <div className="gerador-kpi">
                <span>Custo</span>
                <strong>{moeda(simCusto)}</strong>
              </div>
              <div className="gerador-kpi">
                <span>Potência agora</span>
                <strong>{simPotenciaAtual.toFixed(2)} kW</strong>
              </div>
            </div>

            <canvas ref={canvasRef} width={600} height={80} className="gerador-canvas" />

            <div className="form-actions">
              {simEstado === "parado" ? (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={iniciarSimulacao}
                >
                  Iniciar
                </button>
              ) : (
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={alternarPausa}
                >
                  {simEstado === "rodando" ? "Pausar" : "Continuar"}
                </button>
              )}
              <button
                className="button button--primary"
                type="button"
                onClick={encerrarSimulacao}
                disabled={simEstado === "parado" || salvandoSim}
              >
                {salvandoSim ? "Registrando..." : "Encerrar e registrar"}
              </button>
            </div>
            <p className="gerador-nota">
              Ao encerrar, a sessão é salva na tabela <code>sessoes</code> com motivo
              "simulacao_ao_vivo" e aparece na aba 5 (Sessões).
            </p>
          </div>

          {/* ---------- 3 · Prévia de rateio ---------- */}
          <div className="gerador-card">
            <h3>3 · Prévia de rateio</h3>
            <div className="gerador-barras">
              {linhasRateio.map((linha) => (
                <div className="gerador-barra" key={linha.id}>
                  <span>{linha.nome}</span>
                  <div className="gerador-trilho">
                    <div style={{ width: `${Math.min(100, linha.participacao)}%` }} />
                  </div>
                  <span>
                    {energiaTexto(linha.kwh)} · {moeda(linha.custo)} ·{" "}
                    {linha.participacao.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <p className="gerador-nota">
              Custo estimado com a tarifa informada ({moeda(tarifa)}/kWh). Use esta prévia
              para validar o modelo de rateio definido pelo grupo na sprint 01.
            </p>
          </div>

          {/* ---------- 4 · Histórico recente ---------- */}
          <div className="gerador-card">
            <h3>4 · Histórico recente</h3>
            {linhasHistorico.length === 0 ? (
              <p className="gerador-nota">
                Nenhuma sessão ainda — gere a prévia ou rode a simulação ao vivo.
              </p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Início</th>
                      <th>Cliente</th>
                      <th>Carregador</th>
                      <th>Energia</th>
                      <th>Custo estimado</th>
                      <th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasHistorico.map((linha) => (
                      <tr key={linha.chave}>
                        <td>{dataHoraTexto(linha.inicio)}</td>
                        <td>{linha.cliente}</td>
                        <td>{linha.carregador}</td>
                        <td>{energiaTexto(linha.energia_kwh)}</td>
                        <td>{moeda(linha.custo)}</td>
                        <td>
                          <span className="gerador-badge">{rotuloOrigem[linha.origem]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}