# Enterprise Challenge 2026 - EV ChargeOps

---

# 1. Divisão do Projeto

O Enterprise Challenge 2026 será desenvolvido em duas sprints:

## Sprint 01 — Pesquisa e Documentação
A equipe investiga o problema, mapeia o contexto técnico e regulatório, define a arquitetura da solução e documenta as decisões que guiarão o desenvolvimento.

**Prazo:** 21/06/2026

## Sprint 02 — Desenvolvimento e Prototipação
A equipe implementa a solução com base no que foi definido na Sprint 01.

**Prazo:** 20/09/2026

> No 2º semestre de 2026, cada aluno deverá gravar um vídeo pitch de 3 minutos para validação técnica do projeto.

---

# 2. Contexto do Desafio

A GoodWe é uma das maiores fabricantes globais de inversores e sistemas de armazenamento de energia, presente em mais de 100 países e com mais de 100 GW de capacidade instalada.

No Brasil, a empresa mantém parceria com a FIAP por meio do **Energy Innovation Lab**, onde opera um carregador de veículos elétricos **GoodWe HCA G2**.

## Problema

Infraestruturas de recarga compartilhadas em:

- Condomínios residenciais;
- Edifícios corporativos;
- Campus universitários;

não possuem mecanismos integrados para:

- Estruturar sessões por usuário;
- Calcular consumo individual;
- Aplicar regras de rateio;
- Proporcionar experiência digital para moradores e gestores.

## Questão Central

> Como transformar sessões de recarga de veículos elétricos em uma infraestrutura compartilhada em dados estruturados, rateio justo e inteligência acionável?

---

# 3. O que a Equipe Deve Fazer?

A Sprint 01 é composta por três frentes de pesquisa.

Em cada frente, a equipe deve:

1. Pesquisar;
2. Documentar;
3. Escolher pelo menos uma opção de aprofundamento;
4. Apresentar análises próprias.

> O foco da Sprint 01 é documentação, não desenvolvimento de código.

---

# 4. Frente 1 — Contexto e Problema

## Pesquisar e Documentar

### Infraestruturas de Recarga Compartilhada

- Principais desafios operacionais;
- Necessidades de gestores e usuários.

### Funcionamento de uma Sessão de Recarga

- Conexão do veículo;
- Início da sessão;
- Dados gerados;
- Encerramento da sessão.

### Modelos de Negócio

- Recarga gratuita;
- Cobrança por kWh;
- Cobrança por tempo;
- Assinatura mensal;
- Rateio condominial.

---

## 4.1 Opções de Aprofundamento

### Opção A — Análise de Mercado

Mapear pelo menos três soluções:

- Zaptec
- Wallbox Pulsar Plus
- ChargePoint
- Neocharge
- Copel Telecom EV

Avaliar:

- Problema resolvido;
- Funcionalidades;
- Modelo de negócio;
- Limitações.

### Opção B — Pesquisa com Usuários

Aplicar entrevistas com pelo menos três pessoas.

Extrair:

- Necessidades;
- Dores;
- Insights para a solução.

### Opção C — Análise de Dados Públicos

Pesquisar:

- Crescimento da frota elétrica no Brasil;
- Distribuição dos pontos de recarga;
- Perfis de uso.

---

# 5. Frente 2 — Base Regulatória e Técnica

## Pesquisar e Documentar

### Resolução Normativa ANEEL nº 1000/2021

- Exploração comercial;
- Comunicação à distribuidora;
- Protocolos abertos.

### Carregador GoodWe HCA G2

Interfaces disponíveis:

- RS-485;
- LAN;
- Wi-Fi;
- Bluetooth;
- RFID.

### API GoodWe (SEMS Portal)

Dados disponíveis:

- Status;
- Potência;
- Energia entregue;
- Eventos da sessão.

---

## 5.1 Opções de Aprofundamento

### Opção A — Mapeamento Regulatório

Investigar:

- Normas estaduais;
- Normas municipais;
- Regulamentações complementares.

### Opção B — Exploração da API GoodWe

Documentar:

- Endpoints;
- Campos retornados;
- Formato JSON;
- Integração com o EV ChargeOps.

### Opção C — APIs Complementares

Pesquisar:

- Open Charge Map API;
- Google Places API;
- ANEEL Open Data;
- IBGE.

---

# 6. Frente 3 — Arquitetura e IA

## Pesquisar e Documentar

### Camadas da Plataforma

1. Física (Carregador)
2. Conectividade
3. Aplicação
4. Apresentação

### Fluxo dos Dados

Sessão → Processamento → Rateio → Fatura

### Modelo de Rateio

Definir:

- Variáveis utilizadas;
- Critérios de cobrança;
- Casos excepcionais.

---

## 6.1 Opções de Aprofundamento

### Opção A — Benchmarking de Rateio

Comparar pelo menos dois modelos.

Avaliar:

- Vantagens;
- Desvantagens;
- Escolha da equipe.

### Opção B — Papel da IA

Exemplos:

- Regressão para previsão de consumo;
- Clusterização;
- NLP;
- Detecção de anomalias.

Para cada abordagem:

- Problema resolvido;
- Técnica utilizada;
- Dados necessários;
- Impacto esperado.

### Opção C — Esquema da Base de Dados

Entidades:

- Usuário;
- Unidade;
- Sessão;
- Fatura.

Definir:

- Atributos;
- Relacionamentos;
- Registros simulados.

---

# 7. Bases de Dados e Fontes Sugeridas

## 7.1 Frota e Infraestrutura

- ABVE
- ANEEL Open Data
- SENATRAN
- IBGE

## 7.2 Localização dos Pontos de Recarga

- Open Charge Map
- PlugShare
- ANEEL

## 7.3 APIs Técnicas

- GoodWe SEMS Portal API
- Google Places API
- Open Charge Map API

## 7.4 Datasets

### Kaggle

**Electric Vehicle Charging Sessions**

### UCI Machine Learning Repository

Datasets de consumo energético residencial e industrial.

---

# 8. Uso de Inteligência Artificial

Ferramentas permitidas:

- ChatGPT;
- Claude;
- Gemini;
- Outras IAs generativas.

## Regras

✅ A análise deve ser autoral.

✅ As fontes devem ser verificadas.

✅ Arquitetura, IA e modelo de rateio devem ser construídos pela equipe.

❌ Não utilizar respostas prontas sem análise crítica.

---

# 9. Entregável

Entregar um arquivo `.txt` contendo o link do repositório GitHub.

O repositório deverá possuir um `README.md`.

---

## 9.1 O README Deve Conter

- Nome da equipe;
- RMs dos integrantes;
- Descrição do problema;
- Resultado das três frentes de pesquisa;
- Opções de aprofundamento escolhidas;
- Diagrama da arquitetura;
- Modelo de rateio;
- Papel da IA;
- Plano da Sprint 02.

---

## 9.2 Orientações para o README

- Escrever em português claro;
- Utilizar títulos e listas apenas quando necessário;
- Evitar excesso de emojis;
- Inserir o diagrama de arquitetura no repositório;
- Referenciar todas as fontes utilizadas.

---

# 10. Rubrica de Avaliação

| Critério | Nota |
|------------|------|
| Problema descrito com clareza e embasamento | 0 – 2,0 |
| Três frentes de pesquisa documentadas | 0 – 3,0 |
| Arquitetura e modelo de rateio definidos | 0 – 2,0 |
| Papel da IA estrutural e bem definido | 0 – 1,5 |
| README organizado e autoral | 0 – 1,5 |
| **Total** | **0 – 10,0** |

---