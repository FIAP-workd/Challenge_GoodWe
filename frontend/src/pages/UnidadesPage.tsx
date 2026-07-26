import { type FormEvent, useCallback, useEffect, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import {
  createUnidade,
  getErrorMessage,
  listUnidades,
} from "../services/supabaseService";
import type { Unidade } from "../types/database";

interface UnidadeForm {
  bloco: string;
  apartamento: string;
  pavimento: string;
  observacoes: string;
}

const initialForm: UnidadeForm = {
  bloco: "",
  apartamento: "",
  pavimento: "",
  observacoes: "",
};

export function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState<UnidadeForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUnidades = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      setUnidades(await listUnidades());
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
    void loadUnidades();
  }, [loadUnidades]);

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

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createUnidade({
        bloco: form.bloco.trim(),
        apartamento: form.apartamento.trim(),
        pavimento: form.pavimento.trim() || null,
        observacoes: form.observacoes.trim() || null,
      });

      const listUpdated = await loadUnidades(false);
      closeForm();
      setSuccess(
        listUpdated
          ? "Unidade cadastrada e listagem atualizada."
          : "Unidade cadastrada, mas não foi possível atualizar a listagem.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="unidades-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">1. Cadastro base</p>
          <h2 id="unidades-title">Unidades</h2>
          <p>
            Apartamentos ou espaços físicos que podem ser associados aos
            usuários.
          </p>
        </div>

        {!isFormOpen && (
          <button className="button button--primary" type="button" onClick={openForm}>
            Cadastrar unidade
          </button>
        )}
      </div>

      {isFormOpen && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <h3>Nova unidade</h3>
              <p>Os campos marcados com * são obrigatórios.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Bloco (`bloco`) *
              <input
                name="bloco"
                required
                maxLength={50}
                value={form.bloco}
                onChange={(event) =>
                  setForm({ ...form, bloco: event.target.value })
                }
              />
            </label>

            <label>
              Apartamento (`apartamento`) *
              <input
                name="apartamento"
                required
                maxLength={50}
                value={form.apartamento}
                onChange={(event) =>
                  setForm({ ...form, apartamento: event.target.value })
                }
              />
            </label>

            <label>
              Pavimento (`pavimento`)
              <input
                name="pavimento"
                maxLength={50}
                value={form.pavimento}
                onChange={(event) =>
                  setForm({ ...form, pavimento: event.target.value })
                }
              />
            </label>

            <label className="form-field--wide">
              Observações (`observacoes`)
              <textarea
                name="observacoes"
                rows={3}
                value={form.observacoes}
                onChange={(event) =>
                  setForm({ ...form, observacoes: event.target.value })
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
              {isSaving ? "Salvando..." : "Salvar unidade"}
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
        <FeedbackMessage type="info">Carregando unidades...</FeedbackMessage>
      ) : unidades.length === 0 ? (
        !error && (
          <div className="empty-state">
            <h3>Nenhuma unidade cadastrada</h3>
            <p>Use o botão de cadastro para incluir o primeiro registro.</p>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Bloco</th>
                <th>Apartamento</th>
                <th>Pavimento</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((unidade) => (
                <tr key={unidade.unidade_id}>
                  <td data-label="Bloco">{unidade.bloco}</td>
                  <td data-label="Apartamento">{unidade.apartamento}</td>
                  <td data-label="Pavimento">{unidade.pavimento || "—"}</td>
                  <td data-label="Observações">
                    {unidade.observacoes || "—"}
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
