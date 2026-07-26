import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackMessage } from "../components/FeedbackMessage";
import {
  createUsuario,
  getErrorMessage,
  listUnidades,
  listUsuarios,
} from "../services/supabaseService";
import type { Unidade, Usuario } from "../types/database";

interface UsuarioForm {
  unidade_id: string;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
}

const initialForm: UsuarioForm = {
  unidade_id: "",
  nome: "",
  email: "",
  telefone: "",
  ativo: true,
};

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState<UsuarioForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const unidadesById = useMemo(
    () =>
      new Map(
        unidades.map((unidade) => [
          unidade.unidade_id,
          `${unidade.bloco} / ${unidade.apartamento}`,
        ]),
      ),
    [unidades],
  );

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [usuariosData, unidadesData] = await Promise.all([
        listUsuarios(),
        listUnidades(),
      ]);
      setUsuarios(usuariosData);
      setUnidades(unidadesData);
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

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createUsuario({
        unidade_id: form.unidade_id || null,
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        ativo: form.ativo,
      });

      const listUpdated = await loadData(false);
      closeForm();
      setSuccess(
        listUpdated
          ? "Usuário cadastrado e listagem atualizada."
          : "Usuário cadastrado, mas não foi possível atualizar a listagem.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="usuarios-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">2. Depende de unidades</p>
          <h2 id="usuarios-title">Usuários</h2>
          <p>
            Pessoas vinculadas opcionalmente a uma unidade já cadastrada.
          </p>
        </div>

        {!isFormOpen && (
          <button className="button button--primary" type="button" onClick={openForm}>
            Cadastrar usuário
          </button>
        )}
      </div>

      {isFormOpen && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <h3>Novo usuário</h3>
              <p>
                Senha e RFID não são coletados nesta interface. Esses fluxos
                pertencem ao backend.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Nome (`nome`) *
              <input
                name="nome"
                required
                maxLength={150}
                autoComplete="name"
                value={form.nome}
                onChange={(event) =>
                  setForm({ ...form, nome: event.target.value })
                }
              />
            </label>

            <label>
              E-mail (`email`) *
              <input
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>

            <label>
              Unidade (`unidade_id`)
              <select
                name="unidade_id"
                value={form.unidade_id}
                onChange={(event) =>
                  setForm({ ...form, unidade_id: event.target.value })
                }
              >
                <option value="">Sem unidade vinculada</option>
                {unidades.map((unidade) => (
                  <option key={unidade.unidade_id} value={unidade.unidade_id}>
                    {unidade.bloco} / {unidade.apartamento}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Telefone (`telefone`)
              <input
                name="telefone"
                type="tel"
                maxLength={30}
                autoComplete="tel"
                value={form.telefone}
                onChange={(event) =>
                  setForm({ ...form, telefone: event.target.value })
                }
              />
            </label>

            <label className="checkbox-field form-field--wide">
              <input
                name="ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(event) =>
                  setForm({ ...form, ativo: event.target.checked })
                }
              />
              Usuário ativo (`ativo`)
            </label>
          </div>

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar usuário"}
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
        <FeedbackMessage type="info">Carregando usuários...</FeedbackMessage>
      ) : usuarios.length === 0 ? (
        !error && (
          <div className="empty-state">
            <h3>Nenhum usuário cadastrado</h3>
            <p>Use o botão de cadastro para incluir o primeiro registro.</p>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Unidade</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.usuario_id}>
                  <td data-label="Nome">{usuario.nome}</td>
                  <td data-label="E-mail">{usuario.email}</td>
                  <td data-label="Unidade">
                    {usuario.unidade_id
                      ? unidadesById.get(usuario.unidade_id) ??
                        "Unidade não encontrada"
                      : "Sem vínculo"}
                  </td>
                  <td data-label="Telefone">{usuario.telefone || "—"}</td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${
                        usuario.ativo
                          ? "status-badge--active"
                          : "status-badge--inactive"
                      }`}
                    >
                      {usuario.ativo ? "Ativo" : "Inativo"}
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
