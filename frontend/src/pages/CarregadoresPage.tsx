import { type FormEvent, useCallback, useEffect, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import {
  createCarregador,
  getErrorMessage,
  listCarregadores,
} from "../services/supabaseService";
import {
  CARREGADOR_STATUS,
  type Carregador,
  type CarregadorStatus,
} from "../types/database";

interface CarregadorForm {
  modelo: string;
  serial_number: string;
  localizacao: string;
  status: CarregadorStatus;
  potencia_max_kw: string;
  firmware_version: string;
}

const initialForm: CarregadorForm = {
  modelo: "",
  serial_number: "",
  localizacao: "",
  status: "disponivel",
  potencia_max_kw: "",
  firmware_version: "",
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function CarregadoresPage() {
  const [carregadores, setCarregadores] = useState<Carregador[]>([]);
  const [form, setForm] = useState<CarregadorForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCarregadores = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      setCarregadores(await listCarregadores());
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
    void loadCarregadores();
  }, [loadCarregadores]);

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

    const potenciaMaxima = Number(form.potencia_max_kw);

    if (!Number.isFinite(potenciaMaxima) || potenciaMaxima <= 0) {
      setError("Potência máxima deve ser um número maior que zero.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createCarregador({
        modelo: form.modelo.trim(),
        serial_number: form.serial_number.trim(),
        localizacao: form.localizacao.trim(),
        status: form.status,
        potencia_max_kw: potenciaMaxima,
        firmware_version: form.firmware_version.trim() || null,
      });

      const listUpdated = await loadCarregadores(false);
      closeForm();
      setSuccess(
        listUpdated
          ? "Carregador cadastrado e listagem atualizada."
          : "Carregador cadastrado, mas não foi possível atualizar a listagem.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="carregadores-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">3. Cadastro independente</p>
          <h2 id="carregadores-title">Carregadores</h2>
          <p>Equipamentos disponíveis na infraestrutura de recarga.</p>
        </div>

        {!isFormOpen && (
          <button className="button button--primary" type="button" onClick={openForm}>
            Cadastrar carregador
          </button>
        )}
      </div>

      {isFormOpen && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <h3>Novo carregador</h3>
              <p>
                O status inicial deve usar um dos valores permitidos pela
                migration.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Modelo (`modelo`) *
              <input
                name="modelo"
                required
                maxLength={100}
                value={form.modelo}
                onChange={(event) =>
                  setForm({ ...form, modelo: event.target.value })
                }
              />
            </label>

            <label>
              Número de série (`serial_number`) *
              <input
                name="serial_number"
                required
                maxLength={100}
                value={form.serial_number}
                onChange={(event) =>
                  setForm({ ...form, serial_number: event.target.value })
                }
              />
            </label>

            <label className="form-field--wide">
              Localização (`localizacao`) *
              <input
                name="localizacao"
                required
                maxLength={255}
                value={form.localizacao}
                onChange={(event) =>
                  setForm({ ...form, localizacao: event.target.value })
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
                  setForm({
                    ...form,
                    status: event.target.value as CarregadorStatus,
                  })
                }
              >
                {CARREGADOR_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Potência máxima em kW (`potencia_max_kw`) *
              <input
                name="potencia_max_kw"
                type="number"
                required
                min="0.001"
                step="0.001"
                inputMode="decimal"
                value={form.potencia_max_kw}
                onChange={(event) =>
                  setForm({ ...form, potencia_max_kw: event.target.value })
                }
              />
            </label>

            <label>
              Firmware (`firmware_version`)
              <input
                name="firmware_version"
                maxLength={50}
                value={form.firmware_version}
                onChange={(event) =>
                  setForm({ ...form, firmware_version: event.target.value })
                }
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar carregador"}
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
        <FeedbackMessage type="info">Carregando carregadores...</FeedbackMessage>
      ) : carregadores.length === 0 ? (
        !error && (
          <div className="empty-state">
            <h3>Nenhum carregador cadastrado</h3>
            <p>Use o botão de cadastro para incluir o primeiro registro.</p>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Número de série</th>
                <th>Localização</th>
                <th>Potência</th>
                <th>Firmware</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {carregadores.map((carregador) => (
                <tr key={carregador.charger_id}>
                  <td data-label="Modelo">{carregador.modelo}</td>
                  <td data-label="Número de série">
                    {carregador.serial_number}
                  </td>
                  <td data-label="Localização">{carregador.localizacao}</td>
                  <td data-label="Potência">
                    {Number(carregador.potencia_max_kw).toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    kW
                  </td>
                  <td data-label="Firmware">
                    {carregador.firmware_version || "—"}
                  </td>
                  <td data-label="Status">
                    <span className="status-badge status-badge--neutral">
                      {formatStatus(carregador.status)}
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
