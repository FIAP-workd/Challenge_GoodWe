# Configurar e publicar o chat RAG

O chat usa uma Edge Function pública chamada `rag-chat`. A chave da Groq e a chave secret do Supabase ficam somente no runtime Supabase. O frontend envia apenas a chave publicável que já está configurada para o GitHub Pages.

## 1. Criar uma chave Groq

Crie uma API key na sua conta Groq. O modelo padrão do projeto é `openai/gpt-oss-20b`; a disponibilidade e os limites do plano gratuito podem mudar.

## 2. Salvar configuração no Supabase

No painel do projeto Supabase, abra **Edge Functions → Secrets** e adicione:

- `GROQ_API_KEY`: API key criada na Groq.
- `GROQ_MODEL`: `openai/gpt-oss-20b` (opcional; este é o padrão usado se não for definida).

Não envie esses valores ao GitHub, ao bundle do frontend nem ao chat. A Edge Function lê a chave secret Supabase disponibilizada pelo runtime; não é necessário criar uma variável com a chave secret do banco.

## 3. Aplicar a migration

A migration `supabase/migrations/20261011190000_rag_chat.sql` cria as funções read-only usadas pelo RAG e a tabela privada de limites de chamada.

Antes de aplicar, confirme que o projeto Supabase tem as tabelas e views da migration principal e de `20260810_ev_vw_valores_pagar.sql`. Se esse schema foi criado manualmente pelo SQL Editor e não consta no histórico do Supabase CLI, revise o histórico antes de executar `supabase db push`; o comando pode tentar reaplicar migrations antigas. Nesse caso, aplique somente a migration RAG pelo SQL Editor e mantenha o histórico de migrations sincronizado com seu processo.

Com um projeto vinculado e histórico em dia, o comando usual é:

```sh
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase migration list
supabase db push
```

Substitua `SEU_PROJECT_REF` pelo identificador do projeto. Não compartilhe o project ref junto com nenhuma chave.

## 4. Publicar a Edge Function

Com o Supabase CLI autenticado e o projeto vinculado:

```sh
supabase functions deploy rag-chat
```

A função é pública porque o site ainda não tem login. O gateway exige a chave publicável do projeto, que já é enviada pelo cliente Supabase no frontend. A função aplica CORS para `https://fiap-workd.github.io` e para Vite local em `http://localhost:5173` / `http://127.0.0.1:5173`.

Se o Pages ou o domínio customizado usar outra origem, atualize a lista `allowedOrigins` em `supabase/functions/rag-chat/index.ts` antes do deploy.

## 5. Testar localmente

Para o runtime local, crie `supabase/functions/.env` com os valores locais de desenvolvimento:

```dotenv
GROQ_API_KEY=sua-chave-de-desenvolvimento
GROQ_MODEL=openai/gpt-oss-20b
```

Esse arquivo não deve ser commitado. Confirme que `supabase/functions/.env` está ignorado pelo Git antes de adicionar valores.

Inicie a stack local e sirva a função:

```sh
supabase start
supabase functions serve rag-chat
```

A função exige as funções SQL da migration RAG no banco local. Faça uma pergunta sobre consumo e confira uma resposta sem conteúdo de `usuarios.senha` ou `usuarios.rfid_uid`.

## Limites e comportamento

- Máximo de 1.000 caracteres na pergunta e oito mensagens anteriores.
- Até 25 linhas por consulta e quatro chamadas de ferramenta por pergunta.
- Limite por IP de dez chamadas por minuto e cem por dia.
- Consultas somente leitura com categorias permitidas. Não há execução de SQL enviado pelo modelo ou pelo navegador.
- A conversa fica em memória e desaparece ao recarregar a página.
- Se o limite gratuito Groq acabar, a UI mostra indisponibilidade e não troca de provedor automaticamente.
