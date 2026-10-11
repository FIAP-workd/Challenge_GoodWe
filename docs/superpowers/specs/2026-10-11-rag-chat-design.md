# Especificação de design: chat RAG para EV ChargeOPS

- **Data:** 2026-10-11
- **Status:** Aprovada pelo usuário em 2026-10-11
- **Repositório:** `FIAP-workd/Challenge_GoodWe`

## 1. Objetivo

Adicionar um pequeno chat em português ao frontend do EV ChargeOPS. O chat deve responder perguntas sobre os dados fictícios do banco Supabase e usar uma LLM com plano gratuito.

A recuperação será feita por consultas estruturadas e controladas ao banco, dentro de uma Supabase Edge Function. A função envia ao provedor apenas os dados relevantes para a pergunta atual. Esse desenho é um RAG tabular: o contexto vem de registros e agregados do banco, sem exigir embeddings ou pgvector.

## 2. Contexto atual

- O frontend é uma aplicação React/Vite publicada em GitHub Pages.
- O frontend usa Supabase JS e atualmente não implementa autenticação de usuários.
- O schema descrito em `supabase/migrations/20260718_ev_chargeops.sql` tem as tabelas `unidades`, `usuarios`, `carregadores`, `sessoes`, `medicoes`, `eventos`, `tarifas`, `regras_rateio`, `faturas` e `fato_uso_cargas`.
- A migration `20260810_ev_vw_valores_pagar.sql` cria `vw_consumo_mensal` e `vw_calculo_fatura`.
- A configuração de conexão já existe para o frontend; a Edge Function será configurada e publicada separadamente no projeto Supabase.

## 3. Experiência no frontend

- Exibir um botão flutuante que abre e fecha um painel compacto de chat, disponível nas telas atuais.
- Interface e respostas em português, com mensagens do usuário e do assistente, campo de texto, estado de carregamento e erros compreensíveis.
- Mostrar sugestões iniciais, por exemplo: “Qual foi o consumo por mês?”, “Quais carregadores estão com falha?” e “Qual o total faturado por referência?”.
- Enviar a pergunta atual e um histórico curto mantido somente em memória no navegador. O histórico desaparece ao recarregar a página; não será armazenado no banco.
- Mostrar respostas como texto simples, sem renderizar HTML arbitrário ou conteúdo executável.
- Permitir encerrar/limpar a conversa na interface.

## 4. Arquitetura

1. O frontend chama a função `rag-chat` por HTTPS usando a configuração pública do Supabase.
2. A Edge Function valida método, origem conforme a configuração do projeto, formato e tamanho do pedido.
3. A função conversa com a API de chat completions da Groq e executa localmente apenas as ferramentas de leitura predefinidas que o modelo solicitar.
4. Cada ferramenta consulta o Supabase usando operações fixas, lista explícita de colunas e filtros validados. Não há ferramenta de SQL livre.
5. A função limita os resultados e envia ao modelo apenas o recorte necessário.
6. A função retorna a resposta final, sem expor tokens, stack traces ou credenciais.

A função é pública porque o site atual não tem login. A chave privilegiada do Supabase e a chave da Groq permanecem nos secrets do Supabase e nunca são incluídas no bundle Vite, no GitHub Pages ou no histórico do navegador. Como a chave privilegiada do Supabase ignora RLS, o backend deve mantê-la isolada e limitar seu uso à implementação da função. O frontend não recebe essa chave.

## 5. Recuperação e dados permitidos

A primeira versão expõe somente consultas de leitura sobre as dez tabelas e as duas views existentes. As ferramentas devem validar nomes, campos, filtros, ordenação, intervalo de datas e limite de linhas por meio de esquemas rígidos.

Categorias de perguntas cobertas:

- cadastros de unidades, usuários, carregadores e tarifas;
- estado e potência dos carregadores;
- sessões, duração, energia e medições;
- eventos operacionais;
- regras de rateio e faturas;
- consumo mensal e cálculo de fatura pelas views existentes.

Agregações financeiras e operacionais devem ser calculadas no banco por consultas fixas, com valores numéricos retornados para o modelo apresentar. O modelo não deve estimar totais a partir de uma amostra truncada.

Campos sensíveis ficam fora do contexto da LLM, mesmo sendo dados de demonstração: `usuarios.senha`, `usuarios.rfid_uid`, e qualquer segredo de autenticação. Nas consultas de usuário, retornar apenas os campos estritamente necessários à resposta; evitar email e telefone se nome, unidade e estado do cadastro forem suficientes.

Se a pergunta não puder ser respondida com as consultas disponíveis, o chat deve dizer isso claramente e não inventar dados. A resposta deve indicar o período ou os filtros usados quando forem relevantes e pode identificar as tabelas/views que sustentam a resposta.

## 6. Provedor e uso da LLM

- Provedor inicial: Groq, usando a API de tool/function calling para que a Edge Function execute a recuperação no próprio backend.
- Modelo selecionado por configuração de secret `GROQ_MODEL`, com valor inicial `openai/gpt-oss-20b`; manter o nome configurável porque disponibilidade, preço e limites dos modelos podem mudar.
- Segredo obrigatório: `GROQ_API_KEY`, configurado nas Edge Function Secrets do projeto Supabase.
- O corpo da requisição à Groq inclui a pergunta, instruções do sistema, histórico curto da sessão e resultados relevantes das ferramentas. Não enviar tabelas inteiras ou dados sem relação com a pergunta.
- Tratar limite de taxa, indisponibilidade, timeout e resposta inválida com uma mensagem de erro amigável. A aplicação não deve tentar outro provedor automaticamente.

## 7. Limites e proteção de cota

- Limitar o tamanho da pergunta e do histórico enviado.
- Limitar o número de chamadas de ferramenta por pergunta, linhas por consulta e tamanho total do contexto.
- Aplicar limite de requisições na Edge Function para reduzir abuso da rota pública. O mecanismo e os limites numéricos serão implementados de forma explícita no plano técnico, respeitando os cabeçalhos disponíveis no runtime Supabase.
- Não registrar texto integral das perguntas, respostas, chaves ou conteúdo bruto das linhas do banco nos logs de produção.
- Quando uma requisição for recusada por limite ou cota do provedor, retornar mensagem curta e manter a interface utilizável.

Os limites do plano gratuito da Groq podem variar. A integração não promete disponibilidade contínua nem uso ilimitado; a UI deve apresentar indisponibilidade quando a cota do provedor for excedida.

## 8. Publicação e configuração

A implantação da Edge Function será manual via Supabase CLI, sem criar nesta primeira versão um workflow que precise guardar um token administrativo do Supabase no GitHub Actions.

Documentar os passos para:

1. instalar e autenticar o Supabase CLI;
2. vincular o repositório ao projeto Supabase;
3. configurar `GROQ_API_KEY` e `GROQ_MODEL` como secrets/variáveis da Edge Function;
4. publicar `rag-chat`;
5. compilar o frontend para GitHub Pages com a URL e a chave publicável que já existem no ambiente de build;
6. testar uma pergunta e erros de limite.

Nenhum valor real de chave deve ser versionado. Um arquivo de exemplo pode conter somente nomes de variáveis e valores fictícios.

## 9. Fora do escopo da primeira versão

- Login, autorização por usuário ou isolamento por unidade.
- SQL arbitrário gerado pelo modelo.
- Escrita ou alteração de dados do banco pelo chat.
- Embeddings, pgvector, pipeline de ingestão vetorial ou serviço separado de RAG.
- Persistência do histórico de conversa.
- Deploy automático da Edge Function via GitHub Actions.
- Uso de dados reais ou sensíveis.

## 10. Critérios de aceitação

1. O chat abre e fecha em todas as telas do frontend e funciona em português.
2. Uma pergunta suportada produz resposta baseada em dados consultados no Supabase.
3. Consultas agregadas retornam valores calculados no banco, sem estimativa do modelo.
4. Nenhuma requisição do navegador contém `GROQ_API_KEY` ou chave privilegiada do Supabase.
5. As ferramentas só executam consultas previstas e não aceitam SQL ou nomes de tabela/coluna arbitrários.
6. `senha` e `rfid_uid` nunca são enviados à Groq.
7. Falta de configuração, limite de uso, cota esgotada ou erro do provedor são apresentados de forma compreensível.
8. O histórico não persiste depois que a página é recarregada.
9. O README ou um guia dedicado explica configuração e publicação manual da função.

## 11. Referências técnicas

- Supabase Edge Function secrets e variáveis padrão: https://supabase.com/docs/guides/functions/secrets
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Groq local tool calling: https://console.groq.com/docs/tool-use/local-tool-calling
- Groq modelos e suporte a tool use: https://console.groq.com/docs/tool-use/overview
- Groq retenção de dados: https://console.groq.com/docs/your-data
- Groq limites de uso: https://console.groq.com/docs/rate-limits
