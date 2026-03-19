GPL INCORPORADORA
DIÁRIO DE OBRA DIGITAL
Product Requirements Document · Versão 1.0

Produto	Diário de Obra Digital — GPL Incorporadora
Versão	1.0 — MVP
Data	Março 2026
Autor	Product Owner — GPL Incorporadora
Status	Em Revisão
Base	Discovery v2.0 · Março 2026

Confidencial · Distribuição Restrita
 
1. Contexto e Objetivo do Produto
A GPL Incorporadora conduz múltiplas obras simultaneamente e já utiliza o TocBIM Canteiro Digital para registro de diários de obra, avaliando a experiência atual como satisfatória. A motivação para o desenvolvimento de uma solução própria não é insatisfação com a ferramenta atual, mas a oportunidade estratégica de ganhar autonomia sobre o produto, reduzir custos operacionais no médio e longo prazo e construir uma base tecnológica integrada com os demais sistemas internos da GPL.
O principal vetor estratégico é a integração futura: o novo sistema nasce pensado para se conectar a outros softwares internos, algo que uma plataforma terceira limita por design. Adicionalmente, a GPL acumula conhecimento operacional suficiente para especificar com precisão o que realmente usa e o que pode ser simplificado ou melhorado.
1.1 Oportunidades Identificadas
•	Controle total sobre roadmap e evolução do produto
•	Redução de custo de licença no médio prazo
•	Interface otimizada para uso em campo, tablets e câmera integrada
•	Fluxo de aprovação e hierarquia adaptados à estrutura interna GPL
•	Relatórios e exportações com identidade visual própria
•	Base técnica para integração futura com sistema de ponto, catraca e planejamento (FPS)
1.2 Objetivos do Produto
1.	Digitalizar e padronizar o registro diário das obras da GPL com UX otimizada para tablet
2.	Garantir rastreabilidade de mão de obra própria e terceirizada, equipamentos, serviços e ocorrências
3.	Implementar fluxo de aprovação hierárquica com histórico imutável de transições
4.	Gerar relatórios automáticos com identidade visual GPL para diretoria, clientes e fiscalização
5.	Controlar acesso por perfil de usuário segmentado por obra
6.	Prover base técnica para integrações futuras com sistemas de ponto e planejamento
1.3 Métricas de Sucesso (OKRs do MVP)

Objetivo	Indicador-chave (KR)	Meta MVP
Adoção pela equipe de campo	% de diários preenchidos no dia correto	>= 80% em 30 dias
Qualidade dos registros	% de diários com todos os campos obrigatórios preenchidos	>= 90%
Fluxo de aprovação ativo	% de diários aprovados dentro do SLA definido	>= 85%
Satisfação dos usuários	NPS dos engenheiros e coordenadores após 60 dias	>= 40

2. Personas e Usuários
O sistema atende cinco perfis com objetivos e permissões distintos. Cada persona foi mapeada durante o Discovery v2.0 com base em entrevistas e observação de campo.

Persona	Objetivo Principal	Critério de Sucesso	Perfil de Acesso
Engenheiro / Técnico de Campo	Registrar o dia de obra com rapidez e precisão	Diário preenchido e operacionalizado corretamente no mesmo dia	Operador de Obra
Mestre / Encarregado	Informar dados de terceirizados e confirmar serviços executados	Dados corretos inseridos sem dependência do engenheiro	Colaborador
Coordenador de Obra	Revisar, aprovar ou devolver diários; cadastrar obras e fornecedores	Diários aprovados dentro do SLA com comentários objetivos	Coordenador
Diretoria / Administração	Acompanhar andamento das obras, ocorrências e produtividade	Dashboard confiável e relatórios disponíveis sem intermediários	Leitura
Admin GPL	Gerir toda a plataforma: usuários, cadastros e permissões	Sistema configurado, usuários criados, integridade dos dados garantida	Administrador

3. Escopo do Produto — MVP
3.1 Cadastros Base (CRUD)
Os cadastros são a fundação operacional do sistema. Coordenadores e Admins têm acesso completo a todos os CRUDs. Os dados cadastrais são referenciados em todos os módulos do Diário.

Entidade	Campos e Observações
Obras	Nome, endereço, responsável técnico, prazo de início/fim, status, documentação anexa
Funções	Nome da função (Pedreiro, Armador, Carpinteiro etc.), categoria, observações
Fornecedores / Terceirizados	Razão social, CNPJ, responsável, contato, tipo de serviço prestado, contrato/vigência
Equipamentos Próprios	Identificação/patrimônio, tipo, fabricante, modelo, obra de alocação atual, status
Equipamentos Locados	Fornecedor de locação, número do contrato/OS, tipo, período de locação (início-fim), valor
Usuários	Nome, e-mail, perfil de acesso, obras vinculadas

3.2 Diário de Obra — Core do Produto
Criação do Diário
•	Ao criar, o sistema exibe cards visuais em grid (estilo seletor de apps) para seleção dos módulos a preencher, com fundo desfocado, ícone e título
•	Opção de clonar módulos do dia anterior na mesma tela de criação
•	Módulos clonáveis: Equipe Própria, Equipe Terceirizada, Equipamentos, Serviços Executados
•	Módulos nunca clonados: Ocorrências, Visitas, Fotos, Observações
Controle de Data
•	Por padrão, só é possível preencher o diário do dia corrente — a data é fixada pelo sistema
•	Registro retroativo exige ativação de checkbox 'Registro Retroativo' e justificativa obrigatória (mínimo 20 caracteres)
•	Diários retroativos recebem marcação visual permanente no histórico e em todos os relatórios
•	Apenas um diário por obra por dia — duplicatas são bloqueadas com link para o registro existente

3.3 Módulos do Diário
Clima
•	Condições disponíveis: Ensolarado, Parcialmente Nublado, Nublado, Garoa, Chuva Leve, Chuva Forte, Tempestade
•	Campo de impacto: o clima impactou a execução? (Sim / Não) com campo de observação obrigatório quando Sim
Mão de Obra Própria
•	Importação via integração com sistema de ponto (prioritária) ou upload de planilha (fallback no MVP)
•	Edição manual permitida para ajustes e correções pontuais
•	Vinculação obrigatória de função por colaborador
•	Campo reservado para futura integração com sistema de catraca/controle de acesso da GPL
Mão de Obra Terceirizada
•	Lançamento manual por fornecedor: empresa (vínculo com cadastro), quantidade de pessoas e função
•	Múltiplos fornecedores por diário
•	Totalizador automático: efetivo próprio + terceirizado = efetivo total do dia
Equipamentos
•	Registro unificado de próprios e locados utilizados no dia
•	Equipamentos próprios: selecionados a partir do cadastro de patrimônio
•	Equipamentos locados: seleção do cadastro de locação (fornecedor, contrato, período)
•	Status obrigatório: Operando / Parado (motivo obrigatório) / Em Manutenção
•	Campo de horas de uso (opcional)
Serviços Executados
•	Campos: serviço, local estruturado (Bloco + Pavimento + Área/Apto), quantidade, unidade, observação
•	Um serviço pode ter múltiplos locais — cada local adicionado como subitem
•	Permite alta granularidade: ex. 'Concretagem de laje: Bloco A, Pav. 4, Aptos 401 a 410'
•	Vinculação opcional ao planejamento/FPS prevista para versão futura
Visitas
•	Campo dedicado, separado de comentários e ocorrências
•	Tipo: Técnica, Diretoria, Projetos, Vistoria de Qualidade, Fiscalização, Cliente, Reunião
•	Campos: visitante(s), empresa/origem, horário de entrada/saída, pauta e observações
•	Múltiplas visitas por dia
Ocorrências
•	Eventos que impactam execução: falta de água/energia, chuva, acidente, problema com vizinho, concretagem interrompida etc.
•	Campos: tipo, descrição, severidade (Baixa / Média / Alta), impacto (Sim/Não), fotos
•	Ocorrências de alta severidade são destacadas no dashboard e nos relatórios
Fotos e Anexos
•	Captura direta pela câmera do tablet via Web API (MediaDevices) — sem necessidade de app nativo
•	Upload de arquivos: imagens, PDF, documentos
•	Legenda obrigatória e vinculação ao módulo correspondente (serviço, ocorrência, equipamento)
Observações Gerais
•	Campo livre para anotações que não se enquadram nos módulos estruturados
•	Histórico de edições com usuário e timestamp

3.4 Fluxo de Aprovação
O diário percorre um ciclo de vida com estados bem definidos e histórico imutável de transições.

Estado	Descrição e Regras
Rascunho	Diário criado e em preenchimento pelo Operador de Obra. Editável pelo criador.
Aguardando Aprovação	Engenheiro finalizou e enviou. Somente leitura para o Operador de Obra.
Aprovado	Coordenador ou Admin aprovou. Diário congelado — somente leitura para todos.
Devolvido	Coordenador devolveu com comentário obrigatório. Engenheiro pode editar e reenviar.

•	Admin pode excluir diários — Engenheiros e Coordenadores não possuem essa permissão
•	Reabertura de diário aprovado exige permissão de Admin com registro de motivo obrigatório
•	Todo o histórico de transições (quem, quando, comentário) é permanente e visível no diário

3.5 Dashboard
•	Visão consolidada por obra: efetivo total do dia, ocorrências ativas, diários pendentes de aprovação
•	Gráfico de efetivo ao longo do tempo (próprios vs. terceirizados)
•	Alertas: diários não preenchidos no dia; diários aguardando aprovação acima do SLA definido
•	Filtros por obra, período e responsável
•	Diretoria e Coordenador têm visão de todas as obras; Engenheiro vê somente as suas

3.6 Relatórios e Exportação

Relatório	Formato	Público
Diário Completo por data ou período	PDF	Todos
Efetivo de Mão de Obra	PDF e Excel	Coord. / Admin
Ocorrências do Período	PDF	Todos
Serviços Executados	PDF	Todos
Registro Fotográfico	PDF	Todos
Visitas do Período	PDF	Coord. / Admin

Todos os relatórios são exportados com cabeçalho GPL, logo e identificação da obra. Diários retroativos são sinalizados com marcação visual em todos os relatórios.

 
4. Histórias de Usuário e Critérios de Aceite
4.1 Engenheiro de Campo — Criação do Diário

US-001	Criar diário com seleção visual de módulos
Como	Engenheiro de campo
Quero	Ver cards visuais para selecionar os módulos do diário ao criá-lo
Para	Agilizar o preenchimento escolhendo apenas o que é relevante no dia
Aceite	Sistema exibe grid de cards com ícone e título de cada módulo; usuário ativa/desativa com toque; confirmação visual imediata; opção de clonar do dia anterior disponível na mesma tela

US-002	Clonar diário do dia anterior
Como	Engenheiro de campo
Quero	Clonar dados do diário anterior selecionando quais módulos trazer
Para	Evitar retrabalho em dias com equipe e serviços similares
Aceite	Módulos clonáveis: Equipe Própria, Terceirizada, Equipamentos, Serviços; módulos nunca clonados: Ocorrências, Visitas, Fotos, Observações; dados clonados são editáveis normalmente; sem vínculo permanente com o dia anterior

US-003	Registrar mão de obra terceirizada manualmente
Como	Engenheiro de campo
Quero	Lançar terceirizados por fornecedor com quantidade e função
Para	Ter registro formal de mão de obra contratada sem ponto eletrônico
Aceite	Fornecedor deve estar previamente cadastrado; múltiplos fornecedores por diário; totalizador automático soma próprios + terceirizados = efetivo total

US-004	Registrar serviço com múltiplos locais
Como	Engenheiro de campo
Quero	Informar o local estruturado de cada serviço com bloco, pavimento e área
Para	Ter rastreabilidade precisa de onde cada serviço foi executado
Aceite	Campo de local composto por Bloco + Pavimento + Área/Apto; um serviço aceita múltiplos locais como subitens; quantidade e unidade são campos opcionais mas recomendados

US-005	Enviar diário para aprovação
Como	Engenheiro de campo
Quero	Finalizar e enviar o diário ao coordenador para aprovação
Para	Cumprir o fluxo hierárquico e oficializar o registro do dia
Aceite	Diário passa ao estado 'Aguardando Aprovação'; engenheiro não pode mais editar; coordenador recebe notificação; se devolvido, engenheiro recebe notificação com comentário e pode editar e reenviar

4.2 Coordenador de Obra — Aprovação

US-006	Aprovar ou devolver diário com comentário
Como	Coordenador de obra
Quero	Revisar o diário enviado e aprovar ou devolver com justificativa
Para	Garantir a qualidade e completude dos registros antes de serem oficializados
Aceite	Ao aprovar: diário é congelado em somente leitura; ao devolver: comentário é obrigatório; engenheiro é notificado; histórico de transição registra usuário, data/hora e comentário permanentemente

4.3 Admin GPL — Gestão da Plataforma

US-007	Gerenciar usuários e permissões
Como	Admin GPL
Quero	Criar, editar e desativar usuários, definindo perfil de acesso e obras vinculadas
Para	Garantir que cada usuário acesse somente o que é pertinente ao seu papel
Aceite	CRUD completo de usuários com seleção de perfil (Admin, Coordenador, Operador de Obra, Leitura); vinculação a uma ou mais obras; desativação sem exclusão preserva histórico

 
5. Regras de Negócio
5.1 Controle de Data

ID	Tipo	Descrição
RN01	Data padrão	Somente é permitido criar/editar o diário do dia corrente. A data é fixada automaticamente e não editável pelo usuário.
RN02	Retroativo	Registro de dias anteriores exige checkbox 'Registro Retroativo' ativado e justificativa obrigatória (mínimo 20 caracteres).
RN03	Flag retroativo	Diários retroativos recebem marcação visual permanente — visível no histórico, no diário e em todos os relatórios exportados.
RN04	Unicidade	Existe apenas um diário por obra por dia. Tentativa de duplicata exibe aviso com link para o diário existente.

5.2 Clonagem do Dia Anterior

ID	Tipo	Descrição
RN05	Seleção visual	Na criação do diário, o sistema exibe seleção visual por cards dos módulos a clonar do dia anterior.
RN06	Módulos	Clonáveis: Equipe Própria, Terceirizada, Equipamentos, Serviços. Não clonados: Ocorrências, Visitas, Fotos, Observações.
RN07	Edição livre	Dados clonados são editáveis normalmente. O clone é ponto de partida sem vínculo permanente com o dia anterior.

5.3 Mão de Obra

ID	Tipo	Descrição
RN08	Próprios	Importação prioritária via integração com sistema de ponto. Fallback: upload de planilha. Edição manual permitida para ajustes.
RN09	Catraca (futuro)	Campo técnico reservado para futura integração com sistema de controle de acesso/catraca da GPL. Não obrigatório no MVP.
RN10	Terceirizados	Lançados manualmente por fornecedor com quantidade e função. Fornecedor deve estar previamente cadastrado.
RN11	Totalização	Sistema totaliza efetivo automaticamente: próprios + terceirizados = total do dia.

5.4 Equipamentos

ID	Tipo	Descrição
RN12	Próprio	Selecionado a partir do cadastro de patrimônio da obra. Exige status obrigatório.
RN13	Locado	Requer: fornecedor de locação cadastrado, número de contrato/OS e período de locação (início e fim).
RN14	Status	Todo equipamento no diário deve ter status: Operando / Parado (motivo obrigatório) / Em Manutenção.
RN15	Histórico	Sistema mantém histórico de uso e locação por equipamento para consulta e auditoria.

5.5 Serviços Executados

ID	Tipo	Descrição
RN16	Local estruturado	Campo local composto por Bloco + Pavimento + Área/Apartamento. Um serviço aceita múltiplos locais.
RN17	Quantidade	Quantidade e unidade (m², m³, un, h etc.) são campos opcionais mas recomendados.
RN18	FPS (futuro)	Vinculação com atividades do planejamento/FPS prevista para versão futura. Não obrigatória no MVP.

5.6 Fluxo de Aprovação

ID	Tipo	Descrição
RN19	Estados	Rascunho → Aguardando Aprovação → Aprovado / Devolvido. Transições registradas com usuário e timestamp.
RN20	Congelamento	Diário Aprovado é somente leitura. Reabertura exige permissão de Admin com registro de motivo.
RN21	Devolução	Ao devolver, comentário é obrigatório. Engenheiro recebe notificação e pode editar e reenviar.
RN22	Exclusão	Somente o Admin pode excluir um diário, independentemente do estado.
RN23	Histórico	Todo o histórico de aprovações é permanente e não editável: quem atuou, quando e com qual comentário.

5.7 Grupos de Acesso

Funcionalidade	Admin	Coordenador	Op. Obra	Leitura
CRUD Obras	✓	✓	–	–
CRUD Fornecedores / Funções	✓	✓	–	–
CRUD Equipamentos / Usuários	✓	–	–	–
Criar / Editar Diário	✓	✓	✓	–
Enviar para Aprovação	✓	–	✓	–
Aprovar / Devolver Diário	✓	✓	–	–
Excluir Diário	✓	–	–	–
Visualizar Diários	✓	✓	✓	✓
Exportar Relatórios	✓	✓	–	✓
Dashboard	✓	✓	✓	✓
Gerenciar Usuários e Permissões	✓	–	–	–

 
6. Interface e Tecnologia
6.1 Decisões de Plataforma

Decisão	Justificativa
Frontend em React	Viabiliza futura integração com outros sistemas GPL via componentização e APIs
Web responsiva (foco tablet)	Dispositivo de campo padrão na GPL; elimina necessidade de app nativo no MVP
Câmera via Web API	MediaDevices API permite captura nativa no navegador do tablet sem app nativo
Interface única para todos os perfis	Todos os usuários (Admin, Coordenador, Operador de Obra, Leitura) acessam a mesma estrutura de layout — a visibilidade dos itens de menu e funcionalidades é controlada por perfil, não por interface separada
Design System GPL	Paleta Navy (#1A3C5E) + Azul Médio (#2B6CB0) + Laranja (#E07B39), tipografia Sora (títulos) + DM Sans (corpo), tom de solidez e conforto

6.2 Estrutura de Layout — Definida
O layout da aplicação está definido e segue o padrão visual já aprovado, composto por três regiões fixas:

Header (Barra Superior)
Região fixa no topo da aplicação, presente em todas as telas. Contém, da esquerda para direita:
•	Seletor de obra — dropdown 'Todas as obras' para filtrar o contexto global da sessão
•	Botão de colapso da sidebar — ícone de painel para ocultar/exibir a navegação lateral
•	Toggle Dark / Light Mode — alternância visual entre tema claro e escuro, persistido por usuário
•	Configurações — acesso a preferências do sistema
•	Perfil do usuário — ícone de avatar com acesso a dados da conta
•	Botão Sair — logout da sessão com ícone e rótulo explícito

Sidebar (Navegação Lateral)
Painel fixo à esquerda com navegação principal, colapsável via botão no header. Organizada em dois grupos:

Grupo	Item de Menu	Descrição
PRINCIPAL	Dashboard	Visão consolidada das obras — tela inicial padrão ao fazer login
PRINCIPAL	Diário da Obra	Criação, preenchimento e histórico de diários por obra
PRINCIPAL	Relatórios	Geração e exportação de relatórios em PDF e Excel
GESTÃO	Cadastros	CRUD de obras, fornecedores, funções e equipamentos (visível por perfil)
GESTÃO	Usuários	Gestão de usuários e permissões (visível apenas para Admin e Coordenador)

O item ativo é destacado com fundo azul (#2B6CB0) e texto branco. Itens inativos exibem ícone e texto em branco com 75% de opacidade sobre o fundo navy (#1A3C5E). A sidebar é colapsável e persiste o estado por sessão.

Área de Conteúdo
Região principal à direita da sidebar, fundo cinza claro (#F7F8FA) no modo claro. Renderiza o conteúdo da página selecionada na navegação. Scroll independente da sidebar e do header.

6.3 Comportamento por Perfil na Interface
Todos os perfis acessam a mesma interface. A diferença está na visibilidade e nas permissões dos itens, não no layout:

Perfil	Itens visíveis e comportamento na interface
Admin	Todos os itens visíveis: Dashboard, Diário da Obra, Relatórios, Cadastros, Usuários. Acesso total a todas as obras no seletor.
Coordenador	Dashboard, Diário da Obra, Relatórios, Cadastros e Usuários visíveis. Vê todas as obras no seletor. Sem acesso a exclusão de diários.
Operador de Obra	Dashboard, Diário da Obra e Relatórios visíveis. Seletor de obra limitado às obras vinculadas ao perfil. Itens de Gestão ocultos.
Leitura	Dashboard e Relatórios visíveis. Diário da Obra em modo somente leitura. Sem acesso a criação ou edição. Itens de Gestão ocultos.

6.4 Dark Mode
O sistema suporta alternância entre tema claro e escuro via toggle no header, persistido por usuário. A decisão de implementar dark mode nativo já está definida no MVP.

Elemento	Modo Claro	Modo Escuro
Sidebar	#1A3C5E (navy)	#1A3C5E (mantém — já escuro)
Header	#1A3C5E	#102840 (navy profundo)
Área de conteúdo	#F7F8FA (cinza claro)	#1A202C (quase preto)
Cards / Superfícies	#FFFFFF (branco)	#2D3748 (cinza escuro)
Texto principal	#1A202C	#F7F8FA

6.5 Princípios de UX para Campo
•	Touch-friendly: formulários com campos espaçados e botões dimensionados para toque com dedos
•	Sidebar colapsável para maximizar a área de conteúdo em tablets menores
•	Seletor de obra no header garante que o usuário saiba sempre em qual contexto está operando
•	Seleção de módulos em grid de cards com ícone, título e fundo desfocado — ativa/desativa com toque
•	Fluxo modular: cada seção é um bloco expansível, reduzindo scroll e carga cognitiva
•	Estados vazios informativos: quando um módulo não tem dados, exibe instrução clara de como adicionar
•	Feedback imediato: confirmações visuais ao salvar, enviar para aprovação e receber notificações
•	Legenda obrigatória nas fotos para garantir rastreabilidade do registro visual

7. Fora do Escopo — MVP

Item	Justificativa / Encaminhamento
Controle de Materiais	Gerenciado pelo Uaumob. Não será replicado neste sistema.
App Nativo (iOS / Android)	MVP inicia como web responsiva. App nativo avaliado conforme adoção.
Integração automática com ponto eletrônico	MVP aceita upload manual de planilha. Integração direta planejada para v2.
Integração com catraca de acesso	Campo técnico reservado. Implantação futura após sistema de acesso instalado na GPL.
Vinculação automática com FPS / cronograma	Campo manual opcional. Integração avaliada após MVP estabilizado.
Módulo financeiro ou controle de contratos	Fora do domínio do produto de registro operacional.

8. Riscos e Dependências
8.1 Riscos

Risco	Probabilidade	Impacto	Mitigação
Engenheiros não preencherem no mesmo dia	Alta	Alto	Alerta automático diário + retroativo com flag visual obrigatório
Resistência à migração do TocBIM	Média	Alto	Onboarding guiado, UX superior, treinamento em campo
Qualidade de dados (descrições rasas, fotos sem legenda)	Alta	Médio	Campos obrigatórios mínimos e validação no envio para aprovação
Escopo crescente durante desenvolvimento	Média	Médio	Backlog priorizado, MVP definido, Product Owner como guardião
Complexidade da integração com sistema de ponto	Média	Médio	Fallback via upload de planilha garantido no MVP

8.2 Dependências
•	Acesso ao sistema de ponto atual para mapeamento de campos e viabilidade de integração
•	Mapeamento das obras ativas e dados iniciais para carga no sistema
•	Definição de SLA de aprovação (quantas horas o gerente tem para aprovar) pela Gerência GPL
•	Definição de stack de backend e infraestrutura pelo time técnico
•	Entrevistas adicionais com engenheiros de outras obras para validação do Discovery

9. Próximos Passos
Sprint Atual

#	Ação	Responsável	Status
1	Validar este PRD com Gerência e Product Owner	PO + Gerência	Em andamento
2	Criar protótipos de baixa fidelidade no Figma — Diário e Dashboard	Design	A iniciar
3	Escrever histórias de usuário complementares com critérios de aceite detalhados	Product Owner	A iniciar
4	Definir stack e arquitetura do software com time técnico	Tech Lead + PO	A iniciar

Próxima Sprint

#	Ação	Responsável	Status
5	Construir roadmap de entregas e definir versão MVP com critérios claros	PO + Tech Lead	A iniciar
6	Entrevistas com engenheiros de outras obras para validação do Discovery	Product Owner	A planejar
7	Protótipos de alta fidelidade no Figma após validação dos wireframes	Design + PO	A planejar

A entrega do MVP está sendo estudada para finalização em 4 sprints a partir da consolidação final do Discovery. O cronograma será definido após as entrevistas de validação com o time de Planejamento de Obras, etapa prevista para ocorrer em paralelo à sprint atual e que poderá gerar ajustes pontuais no escopo antes do início do desenvolvimento.

GPL Incorporadora · Diário de Obra Digital · PRD v1.0 · Março 2026
