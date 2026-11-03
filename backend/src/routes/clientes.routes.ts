
import { Router } from "express";
import { db } from "../database/database.js";

const router = Router();

// Listar clientes
router.get("/", (req, res) => {
  const clientes = db
    .prepare("SELECT * FROM clientes")
    .all();

  res.json(clientes);
});

// Cadastrar cliente
router.post("/", (req, res) => {
  const { nome, cnpj } = req.body;

  if (typeof nome !== "string" || !nome.trim()) {
    res.status(400).json({
      erro: "O nome do cliente é obrigatório."
    });
    return;
  }

  const resultado = db.prepare(`
    INSERT INTO clientes (nome, cnpj)
    VALUES (?, ?)
  `).run(nome.trim(), cnpj ?? null);

  res.status(201).json({
    id: Number(resultado.lastInsertRowid),
    nome: nome.trim(),
    cnpj: cnpj ?? null
  });
});

export default router;
