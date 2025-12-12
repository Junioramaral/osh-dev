-- Renomear content para symptoms
ALTER TABLE faq_articles RENAME COLUMN content TO symptoms;

-- Adicionar coluna problem
ALTER TABLE faq_articles ADD COLUMN problem text;

-- Adicionar coluna solution
ALTER TABLE faq_articles ADD COLUMN solution text;