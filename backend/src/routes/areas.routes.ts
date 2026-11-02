
import { Router } from "express";
import { db } from "../database/database.js";

const router = Router();

// Listar áreas de um relatório
router.get("/relatorio/:id", (req, res) => {
  const relatorioId = Number(req.params.id);

  if (!Number.isInteger(relatorioId) || relatorioId <= 0) {
    res.status(400).json({ erro: "ID inválido." });
    return;
  }

  const areas = db.prepare(`
    SELECT *
    FROM areas_inspecionadas
    WHERE relatorio_id = ?
    ORDER BY ordem, id
  `).all(relatorioId);

  res.json(areas);
});

// Cadastrar uma área inspecionada
router.post("/", (req, res) => {
  const {
    relatorio_id,
    titulo,
    descricao,
    ordem
  } = req.body ?? {};

  if (
    !Number.isInteger(relatorio_id) ||
    relatorio_id <= 0 ||
    typeof titulo !== "string" ||
    !titulo.trim()
  ) {
    res.status(400).json({
      erro: "Relatório válido e título são obrigatórios."
    });
    return;
  }

  const relatorio = db.prepare(
    "SELECT id FROM relatorios WHERE id = ?"
  ).get(relatorio_id);

  if (!relatorio) {
    res.status(404).json({
      erro: "Relatório não encontrado."
    });
    return;
  }

  const resultado = db.prepare(`
    INSERT INTO areas_inspecionadas (
      relatorio_id, titulo, descricao, ordem
    )
    VALUES (?, ?, ?, ?)
  `).run(
    relatorio_id,
    titulo.trim(),
    descricao ?? null,
    Number.isInteger(ordem) && ordem >= 0 ? ordem : 0
  );

  res.status(201).json({
    id: Number(resultado.lastInsertRowid),
    mensagem: "Área inspecionada cadastrada!"
  });
});

export default router;
