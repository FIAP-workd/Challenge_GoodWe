import { useState } from "react";
import { supabaseConfigError } from "./lib/supabase";
import { CarregadoresPage } from "./pages/CarregadoresPage";
import { RateioPage } from "./pages/RateioPage";
import { SessoesPage } from "./pages/SessoesPage";
import { TarifasPage } from "./pages/TarifasPage";
import { UnidadesPage } from "./pages/UnidadesPage";
import { UsuariosPage } from "./pages/UsuariosPage";

type Page =
  | "unidades"
  | "usuarios"
  | "carregadores"
  | "tarifas"
  | "sessoes"
  | "rateio";

const navigation: Array<{ id: Page; label: string }> = [
  { id: "unidades", label: "Unidades" },
  { id: "usuarios", label: "Usuários" },
  { id: "carregadores", label: "Carregadores" },
  { id: "tarifas", label: "Tarifas" },
  { id: "sessoes", label: "Sessões" },
  { id: "rateio", label: "Rateio e faturas" },
];

function CurrentPage({ page }: { page: Page }) {
  switch (page) {
    case "usuarios":
      return <UsuariosPage />;
    case "carregadores":
      return <CarregadoresPage />;
    case "tarifas":
      return <TarifasPage />;
    case "sessoes":
      return <SessoesPage />;
    case "rateio":
      return <RateioPage />;
    default:
      return <UnidadesPage />;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("unidades");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              EV
            </span>
            <div>
              <span className="brand-name">EV ChargeOps</span>
              <span className="brand-description">Cadastros iniciais</span>
            </div>
          </div>

          <span className="scope-label">Integração Supabase</span>
        </div>
      </header>

      {supabaseConfigError ? (
        <main className="main-content main-content--narrow">
          <section className="configuration-panel" aria-labelledby="config-title">
            <p className="eyebrow">Configuração necessária</p>
            <h1 id="config-title">Conecte o front ao Supabase</h1>
            <p className="configuration-error">{supabaseConfigError}</p>
            <p>
              Crie um arquivo <code>.env</code> dentro da pasta{" "}
              <code>frontend</code> e preencha somente as variáveis públicas:
            </p>
            <pre>
              <code>
                SUPABASE_URL={"\n"}
                SUPABASE_PUBLISHABLE_KEY=
              </code>
            </pre>
            <p className="configuration-note">
              Não use <code>service_role</code>, secret key, senha ou outra
              credencial administrativa no navegador.
            </p>
          </section>
        </main>
      ) : (
        <>
          <div className="navigation-background">
            <nav className="section-navigation" aria-label="Tabelas de cadastro">
              {navigation.map((item, index) => (
                <button
                  key={item.id}
                  className={`navigation-item ${
                    currentPage === item.id ? "navigation-item--active" : ""
                  }`}
                  type="button"
                  aria-current={currentPage === item.id ? "page" : undefined}
                  onClick={() => setCurrentPage(item.id)}
                >
                  <span>{index + 1}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <main className="main-content">
            <div className="page-introduction">
              <p className="eyebrow">Estrutura para popular a base</p>
              <h1>Cadastros essenciais</h1>
              <p>
                Consulte e inclua registros nas quatro tabelas básicas,
                respeitando a ordem de dependência do banco.
              </p>
            </div>

            <CurrentPage page={currentPage} />
          </main>
        </>
      )}

      <footer className="app-footer">
        <p>
          Challenge GoodWe · Frontend de consulta e cadastro · Sem autenticação
          ou RFID
        </p>
      </footer>
    </div>
  );
}
