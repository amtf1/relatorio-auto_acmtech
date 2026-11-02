
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { db } from "../database/database.js";

const router = Router();

const uploadsDir = path.resolve("uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const extensoes: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };

    const extensao = extensoes[file.mimetype];
    cb(null, `${randomUUID()}${extensao ?? ""}`);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const permitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!permitidos.includes(file.mimetype)) {
      cb(new Error("Formato de imagem não permitido."));
      return;
    }

    cb(null, true);
  }
});

// Cadastrar fotografia
router.post("/", upload.single("foto"), (req, res) => {
  const { area_id, legenda, ordem } = req.body;
  const arquivo = req.file;

  const areaId = Number(area_id);

  const area = Number.isInteger(areaId) && areaId > 0
    ? db.prepare(
        "SELECT id FROM areas_inspecionadas WHERE id = ?"
      ).get(areaId)
    : null;

  if (
    !arquivo ||
    !area ||
    typeof legenda !== "string" ||
    !legenda.trim()
  ) {
    if (arquivo) {
      fs.unlinkSync(arquivo.path);
    }

    res.status(400).json({
      erro: "Fotografia, área válida e legenda são obrigatórias."
    });
    return;
  }

  const ordemNumero = Number(ordem);

  try {
    const resultado = db.prepare(`
      INSERT INTO fotografias (
        area_id, caminho, legenda, ordem
      )
      VALUES (?, ?, ?, ?)
    `).run(
      areaId,
      arquivo.filename,
      legenda.trim(),
      Number.isInteger(ordemNumero) && ordemNumero >= 0
        ? ordemNumero
        : 0
    );

    res.status(201).json({
      id: Number(resultado.lastInsertRowid),
      mensagem: "Fotografia cadastrada com sucesso!",
      arquivo: arquivo.filename
    });
  } catch {
    fs.unlinkSync(arquivo.path);

    res.status(500).json({
      erro: "Não foi possível salvar a fotografia."
    });
  }
});

// Listar fotografias de uma área
router.get("/area/:id", (req, res) => {
  const areaId = Number(req.params.id);

  if (!Number.isInteger(areaId) || areaId <= 0) {
    res.status(400).json({ erro: "ID inválido." });
    return;
  }

  const fotografias = db.prepare(`
    SELECT *
    FROM fotografias
    WHERE area_id = ?
    ORDER BY ordem, id
  `).all(areaId);

  res.json(fotografias);
});

export default router;
