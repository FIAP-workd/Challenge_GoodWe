# Challenge_GoodWe

# Frente 1 – Contexto e Problema

## O que são infraestruturas de recarga compartilhada e quais são os principais desafios operacionais enfrentados por gestores de condomínios, edifícios corporativos ou campus universitários?

Infraestruturas de recarga compartilhada são estações de abastecimento de energia para veículos elétricos (VEs) projetadas para serem utilizadas por múltiplos motoristas ou moradores. Elas utilizam sistemas inteligentes para gerenciar a energia e individualizar o consumo de cada usuário, sendo muito comuns em condomínios, empresas e locais públicos. Porém, gestores de condomínios, edifícios corporativos ou campus universitários podem enfrentar problemas como:

### Avaliação da infraestrutura elétrica

1. Avaliação da infraestrutura elétrica: um engenheiro eletricista deve analisar se a rede elétrica do local suporta a carga, se os quadros, transformadores ou cabos precisam ser substituídos e deve garantir que o projeto atenda às normas técnicas e as exigências do INMETRO.

### Modelos de Instalação

2. Modelos de Instalação: avaliar qual o modelo mais adequado para cada situação. No modelo individual, um morador arca com todos os custos e a energia é medida isoladamente. Esse modelo exige uma infraestrutura robusta, reduz conflitos de uso, mas pode ser inviável tecnicamente. No modelo coletivo, o condomínio, edifício ou campus instala um ou mais pontos compartilhados. Esse modelo é o mais adequado em fases iniciais de adoção, porém precisa de sistemas operacionais e logísticos para melhor controle do consumo.

### Aspectos logísticos e operacionais em modelos coletivos

3. Aspectos logísticos e operacionais em modelos coletivos: planejar operações para evitar filas através da criação de agendas, ter um regulamento interno atualizado com regras de acesso e sanções por usos indevidos, estabelecer tarifas de acordo com tempo de recarga, levando em consideração o horário, definir método de cobrança e forma de pagamento, treinar a equipe de funcionários e criar um fundo de reservas específico para manutenção preventiva, reparos e modernização da rede elétrica.

---

## Como funciona uma sessão de recarga do ponto de vista técnico: o que acontece entre o momento em que o veículo é conectado e o encerramento da sessão, quais dados são gerados e como podem ser capturados?

A sessão de recarga dos veículos elétricos é dividida em etapas:

### Etapas da sessão de recarga

1. Verificação de Segurança
2. Negociação com o Veículo
3. Seguro da Carga
4. Medição e Registro
5. Fechamento Seguro

A etapa de Verificação de Segurança é executada para verificar se as condições elétricas e de aterramentos estão adequadas para a liberação da potência do carregador.

A etapa de Negociação com o Veículo é executada para o carregador e o carro elétrico se conectarem para definir o melhor limite de corrente e iniciarem a sessão.

A etapa de Seguro de Carga é executada para ajustar a potência conforme a qual o veículo elétrico aceita naquele momento e conforme os limites locais.

A etapa de Medição e Registro é executada para pegar os registros de dados da sessão de carregamento, sendo muito útil para cobrança e gestão do carregador.

A etapa do Fechamento Seguro finaliza a sessão de carregamento interrompendo a energia de forma controlada.

### Captura de dados da sessão

Para capturar os dados, é usado o Open Charge Point Protocol (OCPP), protocolo desenvolvido especificamente para permitir a troca de informações do carregador elétrico com alguma plataforma de gerenciamento, e também por meio de sistemas de autenticação como o RFID (dispositivo de identificação que utiliza ondas de rádio para transmitir informações). Todos os dados coletados podem ser enviados para plataformas de gerenciamento e armazenados em banco de dados para fins de controle.

### Dados coletados

• Dados da sessão: ID, Data e Hora do Início e Fim da sessão de carregamento, Tempo de duração.

• Dados elétricos: Energia consumida (kWh), Energia acumulada, Potência (kW), Corrente elétrica (A), Tensão elétrica (V).

• Dados do usuário: Identificação do usuário, Método de autenticação, ID do cartão RFID.

• Dados do carregador: Status do carregador (Disponível, Carregando, Indisponível, Falha).

• Dados de Eventos e Alertas: Falha de energia, Falha de comunicação, Desconexão, Interrupção.

---

## Quais modelos de negócio existem para recarga compartilhada no Brasil e no mundo: recarga gratuita, cobrança por kWh, cobrança por tempo, assinatura mensal ou rateio condominial?

### Cobrança por tempo

As recargas no Brasil acontecem nos eletropostos de uso público, estacionamentos, condomínios, shoppings, supermercados e outros locais. Ela geralmente é feita por minuto e os usuários são tarifados com base no tempo de conexão por meio de um aplicativo da rede de recarga.

### Rateio condominial

Quando a recarga é feita em condomínios residenciais, o pagamento é feito através do rateio de consumo. Isso só é possível graças aos carregadores inteligentes que medem o consumo de cada usuário.

### Cobrança por kWh

O condomínio ou operador pode optar pelo modelo de cobrança por kWh consumido, onde o valor pode variar de acordo com o fornecedor da infraestrutura e o valor da energia elétrica.

### Assinatura mensal

O usuário paga uma mensalidade fixa para cobrir todos os custos do carregador. Toda energia consumida é reembolsada para o condomínio pelo valor da concessionária.

### Recarga gratuita

Algumas concessionárias, shoppings e supermercados oferecem pontos de recarga gratuitos como cortesia, porém em 2026 a quantidade de locais que possuem essa possibilidade gratuita diminuiu drasticamente e empresas passaram a cobrar pelas recargas.

---

# Opção C – Análise de Dados Públicos

## Análise de dados públicos: pesquise e analise dados sobre o crescimento da frota de veículos elétricos no Brasil, distribuição de pontos de recarga e perfis de uso

### Crescimento da frota de veículos elétricos

Segundo dados da Associação Brasileira do Veículo Elétrico (ABVE), desde 2022 até 2026 foram vendidos aproximadamente 711.868 veículos elétricos em todo Brasil. Sendo 49.244 em 2022, 93.927 em 2023, 177.357 em 2024, 223.896 em 2025 e em 2026 até o momento (junho de 2026) 167.444.

Por meio das estatísticas, é possível analisar um crescimento percentual entre os anos:

2022 para 2023: 90,73%

2023 para 2024: 88,82%

2024 para 2025: 26,24%

2025 para junho de 2026: -25,21%*

os valores de 2026 são considerados até junho de 2026

Fatores como a redução de custos, a maior oferta de modelos e a evolução tecnológica dos carros explicam esse crescimento percentual ao longo dos anos.

### Distribuição dos pontos de recarga

No Brasil atualmente existem aproximadamente 25.429 eletropostos espalhados pelos estados, sendo São Paulo o estado com maior quantidade, 6954 (27,3% do total) e Roraima o de menor quantidade, 22 (0,1%), a região com mais eletropostos é o Sudeste (43,5% do total). Dos 25.429 eletropostos, 16.828 (66,18%) são AC (corrente alternada) que são classificados como carregamento lento e 8.601 (33,82%) são DC (corrente contínua) que são classificados como carregamento rápido.

Dados estatísticos como esses, percebe-se que o crescimento de eletropostos acompanha o crescimento da compra de veículos no Brasil, porém, muitos estados ainda tem poucos carregadores, indicando assim uma distribuição desigual comparada a outros estados como São Paulo.

### Perfil de uso – Dataset Kaggle

Por meio de Datasets como o “Electric Vehicle Charging Dataset” da Kaggle, torna-se possível analisar estatísticas simuladas como: Tempo de recarga, Energia entregue, Horário de conexão e Identificador do dia. Ao analisar as 1.965.239 simulações existentes, é possível observar uma média das estatísticas como: Duração média da recarga sendo 3,80 horas, Energia média entregue sendo 9,44 kWh, Horário médio de conexão sendo 14,49 horas, Maior duração registrada sendo 39,41 horas e Maior energia entregue sendo 62,52 kWh.

### Dataset residencial – UCI Machine Learning Repository

O dataset “Individual Household Electric Power Consumption” da UCI Machine Learning Repository contém medições de consumo energético residencial que foram coletadas ao longo dos anos. Possibilitando analisar parâmetros como Data da medição, Horário da medição, Potência ativa global, Potência reativa global, Tensão elétrica, corrente elétrica, submedição 1, submedição 2 e submedição 3. A partir desses dados, é possível identificar padrões de consumo, horários de pico, variações na tensão e corrente elétrica e também é possível prever demandas futuras.

### Dataset industrial – UCI Machine Learning Repository

Em conjunto com o dataset residencial da UCI Machine Learning, também temos o industrial “Steel Industry Energy Consumption” que contém parâmetros como Data e Horário da medição, Consumo de Energia (kWh), Potência reativa atrasada, Potência reativa adiantada, Emissão estimada de CO₂, Fator de Potência atrasado, Fator de Potência adiantado, Segundos após meia-noite, Dia útil ou final de semana, Dia da semana e Tipo de carga elétrica. Dados desse dataset possibilitam identificar padrões de consumo industrial, períodos de maior demanda, variações de carga elétrica e indicadores relacionados à eficiência energética, também possibilitando fazer o monitoramento do consumo e previsões de demandas futuras.

# Frente 2: Base Regulatória e Técnica

No âmbito regulatório, temos a Resolução Normativa ANEEL nº 1000/2021, que consolidou e incorporou regras importantes que afetam diretamente o mercado de carros elétricos e paineis solares.

À luz da resolução, está definido que qualquer pessoa ou empresa poderá instalar as estações de recarga para carros elétricos, além de poderem cobrar pelo serviço e o preço sobre recarga poder ser livremente negociado. Um outro ponto positivo é não ser necessário que uma distribuidora opere tais pontos de recarga, o que abre espaço para um mercado competitivo de distribuição.

Com a ANEEL instituindo regras e dando espaço para construção de um mercado competitivo sobre os carros elétricos, temos uma construção de um espaço seguro para o setor se desenvolver. O mercado competitivo em um setor em desenvolvimento, diminui possibilidades de criação de lobbys para estações de recargas, e faz com que mais pessoas busquem pelos carros elétricos. A norma também autoriza a construção de postos de recarga com capacidade de obter lucros, ou até mesmo como serviço de um outro estabelecimento que não esteja no ramo, com isso, empreendimentos como postos de combustível, shoppings, estacionamentos, condomínios e empresas privadas podem se aproveitar das estações de recarga para obter lucros, ou até mesmo para atrais mais pessoas.

Um outro ponto que a norma regula é a proibição do Vehicle-to-Grid, de utilizar a bateria do carro como uma forma de utilizar em outros locais, ou até mesmo comercializar essa energia. O veículo não pode gerar créditos de energia.

Além do mercado de carregadores de carros elétricos, a norma também regula sobre estações de geração solar. Diante disso, no espaço atual, é possível usarmos a geração solar de um ambiente para realizar recargas nos carros elétricos, o que potencializa os serviços prestados pela GoodWe, oferecendo carregadores elétricos e também painéis de geração solar.




# Frente 3: Arquitetura e IA


# Conclusão

A análise dos dados públicos demonstrou que o mercado de veículos elétricos no Brasil vem apresentando crescimento acelerado nos últimos anos, impulsionado por fatores como a evolução tecnológica dos veículos, ampliação da oferta de modelos e redução dos custos de utilização. Paralelamente, a infraestrutura de recarga também tem crescido de forma significativa, embora ainda exista uma distribuição desigual dos eletropostos entre os estados brasileiros.

Os datasets analisados permitiram compreender melhor o comportamento dos usuários e o consumo energético associado às sessões de recarga. O dataset da Kaggle evidenciou que cada sessão gera informações relevantes, como duração da recarga, energia consumida e horários de utilização. Já os datasets da UCI demonstraram como dados energéticos podem ser monitorados e utilizados para identificar padrões de consumo, prever demandas futuras e auxiliar na tomada de decisões.

Dessa forma, conclui-se que a utilização desses dados pode contribuir diretamente para o desenvolvimento da plataforma EV ChargeOps, permitindo a realização de cobranças individualizadas, rateio justo dos custos de energia, geração de relatórios gerenciais e aplicação de inteligência operacional para otimizar a utilização da infraestrutura de recarga compartilhada.

# Referências

CONDOMÍNIO INTERATIVO. Desafios para a Implantação de Carregadores de Veículos Elétricos em Condomínios. Disponível em: https://www.condominiointerativo.com.br/materia/151/marcondes-bernardo/desafios-para-implantacao-de-carregadores-de-veiculos-eletricos-em-condominios.html. Acesso em: 16 jun. 2026.

VOOLTA. Entenda o sistema de cobrança de recarga de carros elétricos. Disponível em: https://voolta.com.br/blog/sistema-de-cobranca/. Acesso em: 16 jun. 2026.

LUXMAN ENERGY. Estação de Recarga Veicular: Guia Completo para Carros Elétricos no Brasil. Disponível em: https://www.luxmanenergy.com/lo/estacao-de-recarga-veicular-guia-completo-brasil/. Acesso em: 16 jun. 2026.

GARANHANI, Gabriel. Estudo de Implementação dos Protocolos OCPP e OCPI para Interoperabilidade entre Redes de Carregamento de Veículos Elétricos. São Paulo: Universidade Federal de São Paulo, 2024. Disponível em: https://repositorio.unifesp.br/server/api/core/bitstreams/92878082-23b3-4dd9-a9b2-043fb29bd8f6/content. Acesso em: 16 jun. 2026.

USE-MOVE. Um Guia Completo sobre o Protocolo OCPP. Disponível em: https://use-move.com/2023/08/01/um-guia-completo-sobre-o-protocolo-ocpp/. Acesso em: 16 jun. 2026.

AMANCIO, Stephanie. Quem paga pela energia da recarga do carro elétrico no condomínio? POWER2GO. Disponível em: https://www.power2go.com.br/post/quem-paga-pela-energia-da-recarga-do-carro-elétrico-no-condomínio. Acesso em: 18 jun. 2026.

CAMPOLINA, Cindy. Tudo sobre a cobrança de recargas de carros no Brasil. VOLTBRAS. Disponível em: https://voltbras.com/tudo-sobre-a-cobranca-de-recargas-de-carros-eletricos-no-brasil/. Acesso em: 18 jun. 2026.

AMANCIO, Stephanie. Cobrança por kWh ou assinatura mensal? O melhor modelo para recarga de carros elétricos. POWER2GO. Disponível em: https://www.power2go.com.br/post/melhor-modelo-de-cobrança-para-recarga-de-carros-elétricos. Acesso em: 18 jun. 2026.

BARROS, Thais. Ponto de recarga de carros elétricos: onde e como encontrar no Brasil. TUPIMOB. Disponível em: https://tupimob.com/ponto-de-recarga-carro-eletrico/. Acesso em: 18 jun. 2026.

ABVE. BI Geral. Disponível em: https://abve.org.br/bi-geral/. Acesso em: 18 jun. 2026.

Kaggle. Electric Vehicle Charging Dataset. Disponível em: https://www.kaggle.com/datasets/mexwell/electric-vehicle-charging-dataset. Acesso em: 18 jun. 2026.

UCI Machine Learning Repository. Individual Household Electric Power Consumption. Disponível em: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption. Acesso em: 19 jun. 2026.

UCI Machine Learning Repository. Steel Industry Energy Consumption. Disponível em: https://archive.ics.uci.edu/dataset/851/steel+industry+energy+consumption. Acesso em: 19 jun. 2026.
