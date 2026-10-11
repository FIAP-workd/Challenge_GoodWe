# Plano de implementação: chat RAG do EV ChargeOPS

- **Data:** 2026-10-11
- **Status:** Implementado no PR #20; aguardando revisão
- **Especificação aprovada:** [2026-10-11-rag-chat-design.md](../specs/2026-10-11-rag-chat-design.md)

## Resumo

Implementar um chat público, compacto e em português no frontend React/Vite, conectado a uma Supabase Edge Function chamada `rag-chat`. A função orquestra tool calling local com Groq e só pode recuperar dados por operações de leitura predefinidas.

O banco contém dados fictícios, mas o serviço será público. Por isso, a chave secret do Supabase permanece no runtime da Edge Function, chamadas ao modelo têm limites, e nenhuma consulta aceita SQL livre. Campos `usuarios.senha` e `usuarios.rfid_uid` nunca entram no contexto da LLM.

## Arquivos e mudanças previstos

- `supabase/migrations/<timestamp>_rag_read_tools.sql`: RPCs SQL fixas de leitura/agregação e armazenamento de limite de chamadas.
- `supabase/functions/rag-chat/index.ts`: endpoint HTTP, validação, CORS, limites, tool calling Groq e resposta.
- `supabase/functions/rag-chat/tools.ts`: definições das ferramentas e despacho somente para RPCs autorizadas.
- `supabase/config.toml`: configuração da função para invocação pública sem JWT de usuário.
- `frontend/src/services/ragChatService.ts`: chamada tipada ao endpoint Supabase.
- `frontend/src/components/RagChat.tsx` e estilos do frontend: painel flutuante acessível, mensagens, sugestões, carregamento e erros.
- `frontend/src/App.tsx`: montar o painel nas páginas com conexão Supabase configurada.
- `README.md` ou guia dedicado: configuração de secrets e implantação manual.

## Etapas

### 1. Definir operações de recuperação restritas no banco

1. Criar migration com funções SQL somente de leitura para:
   - listar registros por categorias permitidas nas dez tabelas do schema, com colunas explicitamente selecionadas e filtros tipados;
   - retornar resumos operacionais e financeiros por período, usando cálculos no banco e as views `vw_consumo_mensal` / `vw_calculo_fatura` quando adequadas;
   - retornar resultados limitados e ordenação fixa por categoria.
2. Não implementar função genérica que execute SQL, receba nomes arbitrários de tabelas/colunas ou permita alterar dados.
3. Revogar execução pública das RPCs e concedê-la somente a `service_role`; não adicionar leitura pública nova às tabelas.
4. Criar tabela interna para contagem de requisições por janela e uma operação atômica de consumo da cota. Ativar RLS, não conceder acesso a `anon` ou `authenticated` e expurgar janelas expiradas; só a função privilegiada atualiza/consulta a cota.

### 2. Implementar Edge Function

1. Validar POST, JSON, pergunta não vazia, tamanho máximo e formato do histórico; tratar preflight CORS para GitHub Pages e desenvolvimento local.
2. Configurar a função para receber chamadas sem JWT de usuário, pois o app não possui login, mantendo exigência de chave pública Supabase no gateway.
3. Criar cliente privilegiado com `SUPABASE_SECRET_KEYS['default']` fornecida pelo runtime Supabase; nunca copiar uma chave privilegiada para código, frontend ou Actions.
4. Declarar ferramentas Groq por categoria. Validar estritamente argumentos, enumerações, datas, filtros e limites antes de chamar RPC; ignorar/rejeitar qualquer ferramenta desconhecida.
5. Executar tool calling local por HTTP na API Groq. Usar `GROQ_API_KEY` como secret, `GROQ_MODEL` como configuração com padrão `openai/gpt-oss-20b`, timeout e limite de até quatro chamadas de ferramenta por pergunta.
6. Limitar a pergunta a 1.000 caracteres, histórico a oito mensagens recentes, linhas por ferramenta a 25, contexto total a 6.000 tokens e saída do modelo a 800 tokens. Limitar a taxa por IP a 10 chamadas por minuto e 100 por dia; usar o cabeçalho confiável `cf-connecting-ip` do gateway, persistir somente hash do identificador e contadores, nunca o IP bruto.
7. Fazer o dispatcher selecionar somente colunas seguras. Para usuários, sempre omitir senha, RFID, email e telefone.
8. Tratar erro de quota, timeout, falha de banco e resposta inválida sem expor dados internos. Não registrar pergunta, resposta, linhas recuperadas ou secrets em logs.

### 3. Integrar o chat no frontend

1. Criar serviço que chama `supabase.functions.invoke("rag-chat")` e valida a resposta recebida.
2. Implementar componente flutuante reutilizável com abrir/fechar, limpar histórico, envio por botão/Enter, indicador de carregamento, aviso de falha e sugestões de perguntas.
3. Manter histórico curto somente em estado React, sem localStorage e sem persistência no Supabase.
4. Renderizar respostas como texto, sem HTML; incluir foco visível, rótulos acessíveis e layout que funcione em celular.
5. Montar o componente em `App.tsx` apenas quando a conexão Supabase estiver configurada, sem cobrir navegação ou formulários existentes.

### 4. Configurar e documentar publicação

1. Adicionar `[functions.rag-chat]` com `verify_jwt = false` em `supabase/config.toml`.
2. Documentar cadastro de `GROQ_API_KEY` e `GROQ_MODEL` em Edge Function Secrets/variáveis do Supabase, autenticação e vínculo do CLI, aplicação da migration e comando de deploy da função.
3. Explicar como testar localmente sem commitar `supabase/functions/.env`; manter apenas exemplo com nomes e valores fictícios.
4. Documentar CORS, URL do GitHub Pages e configuração pública já existente no build. Não criar workflow de deploy Supabase nesta versão.

### 5. Conferência do resultado

1. Conferir diff para assegurar que não há SQL livre, campos bloqueados ou chave privilegiada no frontend.
2. Executar o build de produção do frontend com modo GitHub Pages para verificar compilação/typecheck.
3. Fazer conferência manual da configuração documentada e do fluxo de erros sem publicar a função no projeto Supabase do usuário.
4. Deixar aplicação da migration e deploy remoto documentados para execução manual pelo usuário; não presumir acesso ao projeto Supabase.

## Dependências e observações

- O projeto Supabase remoto precisa ter o schema e as views da especificação. Se o banco real divergir das migrations no GitHub, aplicar a migration de RAG poderá exigir ajuste antes da publicação.
- As chaves do Groq/Supabase e o project ref remoto não são necessários no GitHub nem no chat.
- A Edge Function não será publicada automaticamente; o usuário controlará a implantação pelo Supabase CLI.
- Esta primeira versão não tem autenticação, isolamento por unidade, escrita no banco, embeddings nem histórico persistente.
- A cota gratuita da Groq pode mudar; o modelo fica configurável para permitir substituição sem alteração do frontend.

## Referências técnicas

- Supabase secrets nas Edge Functions: https://supabase.com/docs/guides/functions/secrets
- Supabase API keys e uso de secret key no backend: https://supabase.com/docs/guides/getting-started/api-keys
- Cabeçalho de IP do gateway Supabase: https://supabase.com/docs/guides/observability/log-field-reference
- Groq local tool calling: https://console.groq.com/docs/tool-use/local-tool-calling
