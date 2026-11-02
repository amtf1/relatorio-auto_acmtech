
import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync("acmtech.db");

// Ativa as chaves estrangeiras
db.exec("PRAGMA foreign_keys = ON");

// Cria as tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT
  );

  CREATE TABLE IF NOT EXISTS maquinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    fabricante TEXT,
    modelo TEXT,
    numero_serie TEXT,
    localizacao TEXT,

    FOREIGN KEY (cliente_id)
      REFERENCES clientes(id)
  );
  
  CREATE TABLE IF NOT EXISTS relatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id INTEGER NOT NULL,
    tipo TEXT NOT NULL
        CHECK (tipo IN ('preventiva', 'corretiva')),
    periodicidade TEXT,
    data_servico TEXT NOT NULL,
    objetivo TEXT,
    conclusao TEXT,
    status TEXT NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'finalizado')),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (maquina_id)
        REFERENCES maquinas(id)
  );

  CREATE TABLE IF NOT EXISTS areas_inspecionadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relatorio_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (relatorio_id)
        REFERENCES relatorios(id)
        ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS fotografias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER NOT NULL,
    caminho TEXT NOT NULL,
    legenda TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (area_id)
        REFERENCES areas_inspecionadas(id)
        ON DELETE CASCADE
  );

`);

console.log("Banco de dados inicializado!");
