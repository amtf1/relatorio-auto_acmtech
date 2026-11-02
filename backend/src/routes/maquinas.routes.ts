
import { Router } from "express";
import { db } from "../database/database.js";

const router = Router();

// Listar máquinas cadastradas
router.get("/", (req, res) => {
  const maquinas = db.prepare(`
    SELECT
      maquinas.*,
      clientes.nome AS cliente
    FROM maquinas
    INNER JOIN clientes
      ON maquinas.cliente_id = clientes.id
    ORDER BY maquinas.id
  `).all();

  res.json(maquinas);
});

// Cadastrar máquina
router.post("/", (req, res) => {
  const {
    cliente_id,
    nome,
    fabricante,
    modelo,
    numero_serie,
    localizacao
  } = req.body ?? {};

  if (
    !Number.isInteger(cliente_id) ||
    cliente_id <= 0 ||
    typeof nome !== "string" ||
    !nome.trim()
  ) {
    res.status(400).json({
      erro: "Cliente válido e nome da máquina são obrigatórios."
    });
    return;
  }

  const cliente = db.prepare(
    "SELECT id FROM clientes WHERE id = ?"
  ).get(cliente_id);

  if (!cliente) {
    res.status(404).json({
      erro: "Cliente não encontrado."
    });
    return;
  }

  const resultado = db.prepare(`
    INSERT INTO maquinas (
      cliente_id,
      nome,
      fabricante,
      modelo,
      numero_serie,
      localizacao
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    cliente_id,
    nome.trim(),
    fabricante ?? null,
    modelo ?? null,
    numero_serie ?? null,
    localizacao ?? null
  );

  res.status(201).json({
    id: Number(resultado.lastInsertRowid),
    mensagem: "Máquina cadastrada com sucesso!"
  });
});

export default router;
