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

   Use somente a chave publicável destinada ao navegador. Nunca coloque
   `service_role`, secret key, senha ou credencial administrativa nesse
   arquivo.

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

## RLS

A migration do repositório informa que RLS não foi habilitado inicialmente.
Se o projeto Supabase conectado tiver RLS ativo, as policies precisam permitir
`select` e `insert` para a chave e o papel usados pelo frontend. Um bloqueio é
mostrado na interface, mas a correção deve ser feita pela equipe responsável
pelo banco de dados.

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
