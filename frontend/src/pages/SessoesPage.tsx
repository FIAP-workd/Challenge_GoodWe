import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import { createSessao, listSessoes } from "../services/rateioService";
import {
  getErrorMessage,
  listCarregadores,
  listUsuarios,
} from "../services/supabaseService";
import type { Carregador, Usuario } from "../types/database";
import {
  SESSAO_STATUS,
  type Sessao,
  type SessaoStatus,
} from "../types/rateio";

interface SessaoForm {
  usuario_id: string;
  charger_id: string;
  inicio: string;
  fim: string;
  energia_kwh: string;
  status: SessaoStatus;
  motivo_fim: string;
}

const initialForm: SessaoForm = {
  usuario_id: "",
  charger_id: "",
  inicio: "",
  fim: "",
  energia_kwh: "",
  status: "finalizada",
  motivo_fim: "",
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: SessaoStatus) {
  if (status === "finalizada") {
    return "status-badge--active";
  }

  if (status === "cancelada" || status === "erro") {
    return "status-badge--inactive";
  }

  return "status-badge--neutral";
}

export function SessoesPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregadores, setCarregadores] = useState<Carregador[]>([]);
  const [form, setForm] = useState<SessaoForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.usuario_id, usuario.nome])),
    [usuarios],
  );

  const carregadoresById = useMemo(
    () =>
      new Map(
        carregadores.map((carregador) => [
          carregador.charger_id,
          carregador.localizacao,
        ]),
      ),
    [carregadores],
  );

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [sessoesData, usuariosData, carregadoresData] = await Promise.all([
        listSessoes(),
        listUsuarios(),
        listCarregadores(),
      ]);
      setSessoes(sessoesData);
      setUsuarios(usuariosData);
      setCarregadores(carregadoresData);
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

  function openForm() {
    setForm(initialForm);
    setError(null);
    setSuccess(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setForm(initialForm);
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const energia = Number(form.energia_kwh);

    if (!Number.isFinite(energia) || energia < 0) {
      setError("Energia deve ser um número maior ou igual a zero.");
      return;
    }

    if (form.fim && new Date(form.fim) < new Date(form.inicio)) {
      setError("O fim da sessão não pode ser antes do início.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createSessao({
        usuario_id: form.usuario_id,
        charger_id: form.charger_id,
        inicio: new Date(form.inicio).toISOString(),
        fim: form.fim ? new Date(form.fim).toISOString() : null,
        energia_kwh: energia,
        status: form.status,
        motivo_fim: form.motivo_fim.trim() || null,
      });

      const listUpdated = await loadData(false);
      closeForm();
      setSuccess(
        listUpdated
          ? "Sessão cadastrada e listagem atualizada."
          : "Sessão cadastrada, mas não foi possível atualizar a listagem.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="sessoes-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">5. Dados para o rateio</p>
          <h2 id="sessoes-title">Sessões de recarga</h2>
          <p>
            Cada sessão é uma recarga de um usuário em um carregador. Use esta
            tela para criar sessões de teste enquanto o simulador não existe.
          </p>
        </div>

        {!isFormOpen && (
          <button className="button button--primary" type="button" onClick={openForm}>
            Cadastrar sessão
          </button>
        )}
      </div>

      {isFormOpen && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <h3>Nova sessão</h3>
              <p>
                Só sessões finalizadas ou interrompidas entram na conta do
                rateio.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Usuário (`usuario_id`) *
              <select
                name="usuario_id"
                required
                value={form.usuario_id}
                onChange={(event) =>
                  setForm({ ...form, usuario_id: event.target.value })
                }
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
              Carregador (`charger_id`) *
              <select
                name="charger_id"
                required
                value={form.charger_id}
                onChange={(event) =>
                  setForm({ ...form, charger_id: event.target.value })
                }
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
              Início (`inicio`) *
              <input
                name="inicio"
                type="datetime-local"
                required
                value={form.inicio}
                onChange={(event) =>
                  setForm({ ...form, inicio: event.target.value })
                }
              />
            </label>

            <label>
              Fim (`fim`)
              <input
                name="fim"
                type="datetime-local"
                value={form.fim}
                onChange={(event) => setForm({ ...form, fim: event.target.value })}
              />
            </label>

            <label>
              Energia em kWh (`energia_kwh`) *
              <input
                name="energia_kwh"
                type="number"
                required
                min="0"
                step="0.001"
                inputMode="decimal"
                value={form.energia_kwh}
                onChange={(event) =>
                  setForm({ ...form, energia_kwh: event.target.value })
                }
              />
            </label>

            <label>
              Status (`status`) *
              <select
                name="status"
                required
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as SessaoStatus })
                }
              >
                {SESSAO_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field--wide">
              Motivo do fim (`motivo_fim`)
              <input
                name="motivo_fim"
                maxLength={255}
                value={form.motivo_fim}
                onChange={(event) =>
                  setForm({ ...form, motivo_fim: event.target.value })
                }
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar sessão"}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <FeedbackMessage type="error">{error}</FeedbackMessage>}
      {success && <FeedbackMessage type="success">{success}</FeedbackMessage>}

      {isLoading ? (
        <FeedbackMessage type="info">Carregando sessões...</FeedbackMessage>
      ) : sessoes.length === 0 ? (
        !error && (
          <div className="empty-state">
            <h3>Nenhuma sessão cadastrada</h3>
            <p>
              Cadastre antes ao menos um usuário e um carregador, depois use o
              botão para criar a primeira sessão.
            </p>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Carregador</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Energia</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessoes.map((sessao) => (
                <tr key={sessao.sessao_id}>
                  <td data-label="Usuário">
                    {usuariosById.get(sessao.usuario_id) ?? "—"}
                  </td>
                  <td data-label="Carregador">
                    {carregadoresById.get(sessao.charger_id) ?? "—"}
                  </td>
                  <td data-label="Início">{formatDateTime(sessao.inicio)}</td>
                  <td data-label="Fim">{formatDateTime(sessao.fim)}</td>
                  <td data-label="Energia">
                    {Number(sessao.energia_kwh).toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    kWh
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${statusClass(sessao.status)}`}>
                      {formatStatus(sessao.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
