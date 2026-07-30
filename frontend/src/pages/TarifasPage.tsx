import { type FormEvent, useCallback, useEffect, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import {
  createTarifa,
  getErrorMessage,
  listTarifas,
} from "../services/supabaseService";
import type { Tarifa } from "../types/database";

interface TarifaForm {
  descricao: string;
  valor_kwh: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  ativo: boolean;
}

const initialForm: TarifaForm = {
  descricao: "",
  valor_kwh: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  ativo: true,
};

function formatDate(date: string | null) {
  if (!date) {
    return "Sem data final";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function TarifasPage() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm] = useState<TarifaForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTarifas = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      setTarifas(await listTarifas());
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
    void loadTarifas();
  }, [loadTarifas]);

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

    const valorKwh = Number(form.valor_kwh);

    if (!Number.isFinite(valorKwh) || valorKwh < 0) {
      setError("Valor por kWh deve ser um número igual ou maior que zero.");
      return;
    }

    if (form.vigencia_fim && form.vigencia_fim < form.vigencia_inicio) {
      setError("A data final não pode ser anterior à data inicial.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createTarifa({
        descricao: form.descricao.trim(),
        valor_kwh: valorKwh,
        vigencia_inicio: form.vigencia_inicio,
        vigencia_fim: form.vigencia_fim || null,
        ativo: form.ativo,
      });

      const listUpdated = await loadTarifas(false);
      closeForm();
      setSuccess(
        listUpdated
          ? "Tarifa cadastrada e listagem atualizada."
          : "Tarifa cadastrada, mas não foi possível atualizar a listagem.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="tarifas-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">4. Cadastro independente</p>
          <h2 id="tarifas-title">Tarifas</h2>
          <p>Valores de energia e seus períodos de vigência.</p>
        </div>

        {!isFormOpen && (
          <button className="button button--primary" type="button" onClick={openForm}>
            Cadastrar tarifa
          </button>
        )}
      </div>

      {isFormOpen && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <h3>Nova tarifa</h3>
              <p>A data final é opcional para uma tarifa sem término definido.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field--wide">
              Descrição (`descricao`) *
              <input
                name="descricao"
                required
                maxLength={150}
                value={form.descricao}
                onChange={(event) =>
                  setForm({ ...form, descricao: event.target.value })
                }
              />
            </label>

            <label>
              Valor por kWh (`valor_kwh`) *
              <input
                name="valor_kwh"
                type="number"
                required
                min="0"
                step="0.0001"
                inputMode="decimal"
                value={form.valor_kwh}
                onChange={(event) =>
                  setForm({ ...form, valor_kwh: event.target.value })
                }
              />
            </label>

            <label>
              Início da vigência (`vigencia_inicio`) *
              <input
                name="vigencia_inicio"
                type="date"
                required
                value={form.vigencia_inicio}
                onChange={(event) =>
                  setForm({ ...form, vigencia_inicio: event.target.value })
                }
              />
            </label>

            <label>
              Fim da vigência (`vigencia_fim`)
              <input
                name="vigencia_fim"
                type="date"
                min={form.vigencia_inicio || undefined}
                value={form.vigencia_fim}
                onChange={(event) =>
                  setForm({ ...form, vigencia_fim: event.target.value })
                }
              />
            </label>

            <label className="checkbox-field">
              <input
                name="ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(event) =>
                  setForm({ ...form, ativo: event.target.checked })
                }
              />
              Tarifa ativa (`ativo`)
            </label>
          </div>

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar tarifa"}
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
        <FeedbackMessage type="info">Carregando tarifas...</FeedbackMessage>
      ) : tarifas.length === 0 ? (
        !error && (
          <div className="empty-state">
            <h3>Nenhuma tarifa cadastrada</h3>
            <p>Use o botão de cadastro para incluir o primeiro registro.</p>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor por kWh</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((tarifa) => (
                <tr key={tarifa.tarifa_id}>
                  <td data-label="Descrição">{tarifa.descricao}</td>
                  <td data-label="Valor por kWh">
                    {Number(tarifa.valor_kwh).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td data-label="Início">
                    {formatDate(tarifa.vigencia_inicio)}
                  </td>
                  <td data-label="Fim">{formatDate(tarifa.vigencia_fim)}</td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${
                        tarifa.ativo
                          ? "status-badge--active"
                          : "status-badge--inactive"
                      }`}
                    >
                      {tarifa.ativo ? "Ativa" : "Inativa"}
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
