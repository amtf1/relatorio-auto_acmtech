
import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";

import { db } from "../database/database.js";

type Relatorio = {
  id: number;
  tipo: string;
  periodicidade: string | null;
  data_servico: string;
  objetivo: string | null;
  conclusao: string | null;
  cliente: string;
  maquina: string;
  modelo: string | null;
};

type Area = {
  id: number;
  titulo: string;
  descricao: string | null;
};

type Fotografia = {
  caminho: string;
  legenda: string;
};

function escaparHTML(valor: unknown): string {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    caractere => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caractere] ?? caractere
  );
}

async function carregarImagem(
  nome: string,
  pasta: "assets/images" | "uploads"
): Promise<string> {
  const nomeSeguro = path.basename(nome);

  const caminho = path.resolve(pasta, nomeSeguro);
  const arquivo = await fs.readFile(caminho);

  const extensao = path.extname(nomeSeguro).toLowerCase();

  const mime = extensao === ".png"
    ? "image/png"
    : extensao === ".webp"
      ? "image/webp"
      : "image/jpeg";

  return `data:${mime};base64,${arquivo.toString("base64")}`;
}

async function imagemOpcional(nome: string): Promise<string> {
  try {
    return await carregarImagem(nome, "assets/images");
  } catch {
    return "";
  }
}

function escolherImagemMaquina(nome: string): string {
  const nomeNormalizado = nome.toUpperCase();

  if (nomeNormalizado.includes("WAVE SOLDERING")) {
    return "ws350pclf.png";
  }

  if (nomeNormalizado.includes("HELLER 1913 MK5")) {
    return "heller1913mk5.jpg";
  }

  if (nomeNormalizado.includes("HELLER 1913 MKIII")) {
    return "heller1913mkIII.jpg";
  }

  if (nomeNormalizado.includes("ERSA VERSAFLOW")) {
    return "ersaversaflowss.png";
  }

  return "default.png";
}

function preencherTemplate(
  template: string,
  dados: Record<string, string>
): string {
  return template.replace(
    /\{\{([A-Z_]+)\}\}/g,
    (_, chave: string) => dados[chave] ?? ""
  );
}

export async function gerarPDF(id: number): Promise<Buffer> {
  const relatorio = db.prepare(`
    SELECT
      r.id,
      r.tipo,
      r.periodicidade,
      r.data_servico,
      r.objetivo,
      r.conclusao,
      c.nome AS cliente,
      m.nome AS maquina,
      m.modelo
    FROM relatorios r
    JOIN maquinas m ON m.id = r.maquina_id
    JOIN clientes c ON c.id = m.cliente_id
    WHERE r.id = ?
  `).get(id) as Relatorio | undefined;

  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }

  const areas = db.prepare(`
    SELECT id, titulo, descricao
    FROM areas_inspecionadas
    WHERE relatorio_id = ?
    ORDER BY ordem, id
  `).all(id) as Area[];

  const templateCapa = await fs.readFile(
    path.resolve("src/templates/capa.html"),
    "utf-8"
  );

  const css = await fs.readFile(
    path.resolve("src/templates/styles/capa.css"),
    "utf-8"
  );

  const logoACMTECH = await imagemOpcional("acmtech_logo.jpg");

  // Temporário: depois o logo virá do cadastro do cliente.
  const logoCliente = await imagemOpcional("harman_logo_thmb.jpg");

  const imagemMaquina = await imagemOpcional(
    escolherImagemMaquina(
      `${relatorio.maquina} ${relatorio.modelo ?? ""}`
    )
  );

  const [ano, mes, dia] = relatorio.data_servico.split("-");

  const data = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia)
  );

  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(data);

  const tipoFormatado = relatorio.tipo === "preventiva"
    ? "Manutenção Preventiva"
    : "Manutenção Corretiva";

  const capa = preencherTemplate(templateCapa, {
    LOGO_CLIENTE: logoCliente,
    LOGO_ACMTECH: logoACMTECH,
    DATA_EXTENSO: escaparHTML(dataExtenso),
    TITULO: escaparHTML(
      `${tipoFormatado} - ${relatorio.maquina}`
    ),
    IMAGEM_MAQUINA: imagemMaquina,
    CLIENTE: escaparHTML(relatorio.cliente),
    MAQUINA: escaparHTML(relatorio.maquina),
    MODELO: escaparHTML(relatorio.modelo),
    TIPO: escaparHTML(tipoFormatado),
    NUMERO_RELATORIO: String(relatorio.id)
  });

  let conteudoAreas = "";
  let numeroFigura = 0;

  for (const [indice, area] of areas.entries()) {
    const fotografias = db.prepare(`
      SELECT caminho, legenda
      FROM fotografias
      WHERE area_id = ?
      ORDER BY ordem, id
    `).all(area.id) as Fotografia[];

    let htmlFotografias = "";

    for (const fotografia of fotografias) {
      const imagem = await carregarImagem(
        fotografia.caminho,
        "uploads"
      );

      numeroFigura++;

      htmlFotografias += `
        <figure>
          <img src="${imagem}" alt="Fotografia da manutenção">
          <figcaption>
            Figura ${numeroFigura} –
            ${escaparHTML(fotografia.legenda)}
          </figcaption>
        </figure>
      `;
    }

    conteudoAreas += `
      <section>
        <h3>
          2.${indice + 1}
          ${escaparHTML(area.titulo)}
        </h3>

        <p>${escaparHTML(area.descricao)}</p>

        <div class="grade-fotos">
          ${htmlFotografias}
        </div>
      </section>
    `;
  }

  const conteudo = `
    <div class="conteudo-relatorio">
      <h2>1. OBJETIVO</h2>
      <p>${escaparHTML(relatorio.objetivo)}</p>

      <h2>2. ÁREAS INSPECIONADAS</h2>
      ${conteudoAreas}

      <h2>3. CONCLUSÃO</h2>
      <p>${escaparHTML(relatorio.conclusao)}</p>
    </div>
  `;

  // Insere o conteúdo técnico depois da capa.
  const html = capa.replace(
    "</body>",
    `${conteudo}</body>`
  ).replace(
    "</head>",
    `<style>${css}</style></head>`
  );

  const navegador = await puppeteer.launch({
    headless: true
  });

  try {
    const pagina = await navegador.newPage();

    await pagina.setContent(html, {
      waitUntil: "load"
    });

    const arquivoPDF = await pagina.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        bottom: "0",
        left: "0",
        right: "0"
      }
    });

    return Buffer.from(arquivoPDF);
  } finally {
    await navegador.close();
  }
}
