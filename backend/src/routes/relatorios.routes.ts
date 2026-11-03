
import { Router } from "express";
import { db } from "../database/database.js";
import { gerarPDF } from "../services/pdf.service.js";

const router = Router();

// Listar relatórios
router.get("/", (req, res) => {
  const relatorios = db.prepare(`
    SELECT
      r.*,
      m.nome AS maquina,
      c.nome AS cliente
    FROM relatorios r
    INNER JOIN maquinas m ON r.maquina_id = m.id
    INNER JOIN clientes c ON m.cliente_id = c.id
    ORDER BY r.id DESC
  `).all();

  res.json(relatorios);
});

// Criar relatório
router.post("/", (req, res) => {
  const {
    maquina_id,
    tipo,
    periodicidade,
    data_servico,
    objetivo,
    conclusao
  } = req.body ?? {};

  if (
    !Number.isInteger(maquina_id) ||
    maquina_id <= 0 ||
    !["preventiva", "corretiva"].includes(tipo) ||
    typeof data_servico !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data_servico)
  ) {
    res.status(400).json({
      erro: "Máquina, tipo e data válida no formato AAAA-MM-DD são obrigatórios."
    });
    return;
  }

  const maquina = db.prepare(
    "SELECT id FROM maquinas WHERE id = ?"
  ).get(maquina_id);

  if (!maquina) {
    res.status(404).json({
      erro: "Máquina não encontrada."
    });
    return;
  }

  const resultado = db.prepare(`
    INSERT INTO relatorios (
      maquina_id,
      tipo,
      periodicidade,
      data_servico,
      objetivo,
      conclusao
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    maquina_id,
    tipo,
    periodicidade ?? null,
    data_servico,
    objetivo ?? null,
    conclusao ?? null
  );

  res.status(201).json({
    id: Number(resultado.lastInsertRowid),
    mensagem: "Relatório criado com sucesso!"
  });
});

export default router;
// Gerar PDF de um relatório
router.get("/:id/pdf", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID inválido." });
    return;
  }

  try {
    const pdf = await gerarPDF(id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="relatorio-${id}.pdf"`
    );

    res.end(pdf);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível gerar o PDF."
    });
  }
});
