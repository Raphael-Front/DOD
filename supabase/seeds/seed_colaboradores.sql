-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Seed: Colaboradores (4-6 por função)
-- Data: 17/03/2026
-- Instruções: Execute no Supabase Studio (SQL Editor)
-- ============================================================

-- Limpar colaboradores existentes para evitar duplicatas
DELETE FROM dim_colaboradores;

-- ============================================================
-- PEDREIRO
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Carlos Eduardo Silva',    '111.222.333-01', '(11) 98001-1001', 'MAT-001', 'GPL Incorporadora'),
  ('José Roberto Almeida',    '111.222.333-02', '(11) 98001-1002', 'MAT-002', 'GPL Incorporadora'),
  ('Antônio Ferreira Costa',  '111.222.333-03', '(11) 98001-1003', 'MAT-003', 'GPL Incorporadora'),
  ('Marcos Paulo Rodrigues',  '111.222.333-04', '(11) 98001-1004', 'MAT-004', 'GPL Incorporadora'),
  ('Paulo Henrique Moreira',  '111.222.333-05', '(11) 98001-1005', 'MAT-005', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Pedreiro';

-- ============================================================
-- ELETRICISTA
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Ricardo Souza Menezes',   '222.333.444-01', '(11) 98002-2001', 'MAT-011', 'GPL Incorporadora'),
  ('Felipe Andrade Lima',     '222.333.444-02', '(11) 98002-2002', 'MAT-012', 'GPL Incorporadora'),
  ('Bruno Carvalho Santos',   '222.333.444-03', '(11) 98002-2003', 'MAT-013', 'GPL Incorporadora'),
  ('Diego Martins Pereira',   '222.333.444-04', '(11) 98002-2004', 'MAT-014', 'GPL Incorporadora'),
  ('Leandro Oliveira Neves',  '222.333.444-05', '(11) 98002-2005', 'MAT-015', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Eletricista';

-- ============================================================
-- ENCARREGADO
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Roberto Carlos Pinto',    '333.444.555-01', '(11) 98003-3001', 'MAT-021', 'GPL Incorporadora'),
  ('Sérgio Luís Barbosa',     '333.444.555-02', '(11) 98003-3002', 'MAT-022', 'GPL Incorporadora'),
  ('Cláudio Ferraz Torres',   '333.444.555-03', '(11) 98003-3003', 'MAT-023', 'GPL Incorporadora'),
  ('Hélio Mendes Cardoso',    '333.444.555-04', '(11) 98003-3004', 'MAT-024', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Encarregado';

-- ============================================================
-- CARPINTEIRO
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Wagner Augusto Fonseca',  '444.555.666-01', '(11) 98004-4001', 'MAT-031', 'GPL Incorporadora'),
  ('Nilton Cruz Vasconcelos', '444.555.666-02', '(11) 98004-4002', 'MAT-032', 'GPL Incorporadora'),
  ('Edmar Vieira Ramos',      '444.555.666-03', '(11) 98004-4003', 'MAT-033', 'GPL Incorporadora'),
  ('Gilmar Prado Junqueira',  '444.555.666-04', '(11) 98004-4004', 'MAT-034', 'GPL Incorporadora'),
  ('Tiago Borges Lacerda',    '444.555.666-05', '(11) 98004-4005', 'MAT-035', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Carpinteiro';

-- ============================================================
-- SOLDADOR
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Renato Dias Cunha',       '555.666.777-01', '(11) 98005-5001', 'MAT-041', 'GPL Incorporadora'),
  ('Valter Moura Cabral',     '555.666.777-02', '(11) 98005-5002', 'MAT-042', 'GPL Incorporadora'),
  ('Alexandre Rocha Teles',   '555.666.777-03', '(11) 98005-5003', 'MAT-043', 'GPL Incorporadora'),
  ('Márcio Leal Sampaio',     '555.666.777-04', '(11) 98005-5004', 'MAT-044', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Soldador';

-- ============================================================
-- ARMADOR
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Fernando Queiroz Bastos', '666.777.888-01', '(11) 98006-6001', 'MAT-051', 'GPL Incorporadora'),
  ('Adriano Nogueira Freitas','666.777.888-02', '(11) 98006-6002', 'MAT-052', 'GPL Incorporadora'),
  ('Marcelo Araújo Gomes',    '666.777.888-03', '(11) 98006-6003', 'MAT-053', 'GPL Incorporadora'),
  ('Silvio Batista Correia',  '666.777.888-04', '(11) 98006-6004', 'MAT-054', 'GPL Incorporadora'),
  ('Luiz Gonzaga Machado',    '666.777.888-05', '(11) 98006-6005', 'MAT-055', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Armador';

-- ============================================================
-- ENCANADOR
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Anderson Vilas Boas',     '777.888.999-01', '(11) 98007-7001', 'MAT-061', 'GPL Incorporadora'),
  ('Edson Coutinho Xavier',   '777.888.999-02', '(11) 98007-7002', 'MAT-062', 'GPL Incorporadora'),
  ('Otávio Rezende Matos',    '777.888.999-03', '(11) 98007-7003', 'MAT-063', 'GPL Incorporadora'),
  ('Itamar Cavalcante Luz',   '777.888.999-04', '(11) 98007-7004', 'MAT-064', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Encanador';

-- ============================================================
-- GESSEIRO
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Darlei Souza Evangelista','888.999.000-01', '(11) 98008-8001', 'MAT-071', 'GPL Incorporadora'),
  ('Célio Magalhães Dantas',  '888.999.000-02', '(11) 98008-8002', 'MAT-072', 'GPL Incorporadora'),
  ('Rodnei Campos Azevedo',   '888.999.000-03', '(11) 98008-8003', 'MAT-073', 'GPL Incorporadora'),
  ('Jurandir Faria Esteves',  '888.999.000-04', '(11) 98008-8004', 'MAT-074', 'GPL Incorporadora'),
  ('Eliton Paixão Brandão',   '888.999.000-05', '(11) 98008-8005', 'MAT-075', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Gesseiro';

-- ============================================================
-- OPERADOR DE MÁQUINAS
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Jair Tavares Montenegro', '900.111.222-01', '(11) 98009-9001', 'MAT-081', 'GPL Incorporadora'),
  ('Elias Braga Nascimento',  '900.111.222-02', '(11) 98009-9002', 'MAT-082', 'GPL Incorporadora'),
  ('Gilberto Lopes Teixeira', '900.111.222-03', '(11) 98009-9003', 'MAT-083', 'GPL Incorporadora'),
  ('Cleber Santana Medeiros', '900.111.222-04', '(11) 98009-9004', 'MAT-084', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome ILIKE '%Operador%';

-- ============================================================
-- SERVENTE
-- ============================================================
INSERT INTO dim_colaboradores (nome, cpf, telefone, matricula, empresa, funcao_id, ativo)
SELECT v.nome, v.cpf, v.telefone, v.matricula, v.empresa, f.id, TRUE
FROM (VALUES
  ('Willian Teles Abreu',     '901.222.333-01', '(11) 98010-0001', 'MAT-091', 'GPL Incorporadora'),
  ('Josué Paiva Cordeiro',    '901.222.333-02', '(11) 98010-0002', 'MAT-092', 'GPL Incorporadora'),
  ('Cleyton Bonfim Aquino',   '901.222.333-03', '(11) 98010-0003', 'MAT-093', 'GPL Incorporadora'),
  ('Fábio Sena Guimarães',    '901.222.333-04', '(11) 98010-0004', 'MAT-094', 'GPL Incorporadora'),
  ('Robson Leite Carvalho',   '901.222.333-05', '(11) 98010-0005', 'MAT-095', 'GPL Incorporadora'),
  ('Ednaldo Morais Pinheiro', '901.222.333-06', '(11) 98010-0006', 'MAT-096', 'GPL Incorporadora')
) AS v(nome, cpf, telefone, matricula, empresa)
JOIN dim_funcoes f ON f.nome = 'Servente';

-- Verificar contagem inserida
SELECT f.nome AS funcao, COUNT(c.id) AS colaboradores
FROM dim_colaboradores c
JOIN dim_funcoes f ON f.id = c.funcao_id
GROUP BY f.nome
ORDER BY f.nome;
