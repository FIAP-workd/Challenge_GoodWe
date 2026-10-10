# Frontend EV ChargeOps

Interface React para consultar e cadastrar registros nas tabelas básicas já
existentes no Supabase:

- `unidades`;
- `usuarios`;
- `carregadores`;
- `tarifas`.

O frontend está isolado nesta pasta e não altera migrations, backend ou
políticas de RLS.

## Requisitos

- Node.js 20.19 ou superior;
- npm;
- URL e chave publicável do projeto Supabase.

## Configuração

1. Entre na pasta do frontend:

   ```bash
   cd frontend
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie `.env.example` para `.env` e preencha:

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

   Use somente a chave publicável `sb_publishable_` destinada ao navegador.
   Nunca coloque `service_role`, secret key, senha ou credencial administrativa
   nesse arquivo. A chave publicável será incorporada ao JavaScript e ficará
   visível para qualquer visitante.

4. Inicie o projeto:

   ```bash
   npm run dev
   ```

5. Abra a URL mostrada pelo Vite, normalmente
   `http://localhost:5173`.

Sem as duas variáveis, a aplicação abre uma tela de configuração ausente e não
faz requisições ao Supabase.

## Operações implementadas

Todas as operações usam diretamente o cliente oficial
`@supabase/supabase-js`.

| Seção | Consulta | Cadastro |
| --- | --- | --- |
| Unidades | `select` em `unidades` | `insert` em `unidades` |
| Usuários | `select` em `usuarios` e `unidades` | `insert` em `usuarios` |
| Carregadores | `select` em `carregadores` | `insert` em `carregadores` |
| Tarifas | `select` em `tarifas` | `insert` em `tarifas` |

A listagem é consultada novamente após cada cadastro. Erros de constraint,
relacionamento ou RLS são apresentados na própria seção.

## Ordem de cadastro

Cadastre `unidades` antes de `usuarios` quando quiser criar o vínculo por
`usuarios.unidade_id`. O vínculo é opcional no schema. `carregadores` e
`tarifas` não dependem dessas tabelas e podem ser cadastrados
independentemente.

IDs, datas automáticas e colunas geradas não são enviados pelo formulário. A
interface também não lê nem envia `usuarios.senha` ou `usuarios.rfid_uid`, pois
login e RFID pertencem à frente de backend.

## Acesso ao banco e dados de demonstração

A migration do repositório não habilita RLS. O frontend não tem login e usa a
chave publicável; portanto, o acesso anônimo do Supabase pode consultar e alterar
tudo que as permissões do papel `anon` permitirem. Use somente dados fictícios
nesta demonstração e não insira senhas, dados pessoais ou informações reais.

Se o projeto Supabase conectado tiver RLS ativo, as policies precisam permitir
as operações necessárias ao papel usado pelo frontend. Para usar dados reais ou
privados, implemente autenticação e policies RLS, ou mova as operações para uma
API confiável no servidor. Não exponha uma chave `service_role` no frontend.

## Verificação local

Para validar tipos e gerar a versão de produção:

```bash
npm run build
```

Para visualizar o build:

```bash
npm run preview
```

## Fora do escopo

Este frontend não implementa login, Supabase Auth, credenciais, RFID, sessões
de recarga, medições, eventos, simulação de carregador, OCPP, rateio, faturas,
pagamentos, analytics, APIs próprias, Edge Functions, alteração de migrations
ou políticas de RLS.

## GitHub Pages: testar antes de integrar

Valide as alterações em uma branch e por pull request para `main`. O workflow
roda o build no pull request, mas só publica depois da integração na `main`.

Dentro de `frontend/`, gere e abra a mesma versão que será usada no Pages:

```bash
npm run build -- --mode github-pages
npm run preview -- --mode github-pages
```

Abra `http://localhost:4173/Challenge_GoodWe/` (ou a porta indicada pelo Vite).
O modo `github-pages` configura o caminho `/Challenge_GoodWe/` dos arquivos
CSS e JavaScript. `npm run dev` e o build comum continuam usando `/`.

O workflow `.github/workflows/frontend-pages.yml`:

- valida TypeScript e gera o build em pushes da `frontendteste` e em pull
  requests para `main`, sem publicar nessas situações;
- disponibiliza o build como artefato `github-pages` na execução em **Actions**;
- só publica quando executado na `main`, depois da revisão e integração;
- não executa migrations, backend ou alterações de RLS.

O Pages deste repositório tem um único endereço compartilhado. Uma branch não
ganha um endereço de prévia independente automaticamente. Para testar online
antes do merge sem substituir o site do grupo, é necessário um repositório
separado ou outra hospedagem de prévia, acordada com o grupo.

### Preparação para publicação pelo grupo

1. Em **Settings → Secrets and variables → Actions**, cadastre `SUPABASE_URL`
   como *repository variable* e `SUPABASE_PUBLISHABLE_KEY` como *repository
   secret*. Use somente a chave `sb_publishable_...`. O workflow não usa o
   `.env` local, que deve continuar fora do Git.
2. Em **Settings → Pages → Build and deployment → Source**, selecione
   **GitHub Actions**. O ambiente `github-pages` precisa permitir a `main`.
3. Revise o build no pull request e integre a branch à `main`. Só então o
   workflow poderá publicar em
   `https://fiap-workd.github.io/Challenge_GoodWe/`.
4. Confira **Actions → Frontend - build e GitHub Pages**, o job `deploy` e
   o endereço publicado. Para repetir depois da integração, use **Run workflow**
   na `main`.

O workflow Jekyll concorrente foi removido; o workflow do frontend é o único
responsável por publicar o site.

As variáveis `VITE_*` usadas no navegador e a chave `sb_publishable_` ficam
visíveis no build, mesmo quando a chave foi cadastrada como secret no GitHub.
Não coloque senha, chave `service_role` ou credencial administrativa nelas. A
chave publicável não substitui políticas de acesso do banco. Este site é uma
demonstração pública sem autenticação: use somente dados fictícios. Para dados
reais, implemente autenticação e revise RLS antes de publicar.

Se a interface mostrar falha de conexão, confira a URL atual no painel do
Supabase e se o projeto está ativo. `ERR_NAME_NOT_RESOLVED` no navegador
indica que o endereço não resolveu no DNS; isso não é um erro de RLS. Após
corrigir as variáveis de publicação, gere e publique um novo build, pois o
Vite incorpora a configuração durante a compilação.

Referência: [Deploy de projetos Vite no GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages).
