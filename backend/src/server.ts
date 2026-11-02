
import express from "express";
import "./database/database.js";
import clientesRoutes from "./routes/clientes.routes.js";
import maquinasRoutes from "./routes/maquinas.routes.js";
import relatoriosRoutes from "./routes/relatorios.routes.js";
import areasRoutes from "./routes/areas.routes.js";
import fotografiasRoutes from "./routes/fotografias.routes.js";

const app = express();

const PORT = 3000;

// Permite receber dados em JSON
app.use(express.json());
app.use("/clientes", clientesRoutes);
app.use("/maquinas", maquinasRoutes);
app.use("/relatorios", relatoriosRoutes);
app.use("/areas", areasRoutes);
app.use("/fotografias", fotografiasRoutes);

// Rota inicial da API
app.get("/", (req, res) => {
  res.json({
    mensagem: "API ACMTECH funcionando!",
    versao: "1.0.0"
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
