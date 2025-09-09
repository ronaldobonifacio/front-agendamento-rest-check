// routes.mjs
import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";
import { db } from "./database.mjs";
import { CONFIG } from "./config.mjs";
import { checkApi } from "./apiChecker.mjs";
import { sendWhatsappMessage } from "./whatsappService.mjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupRoutes(app, serviceState, scheduleAllApis) {
  
  // Rota principal
  app.get("/", async (req, res) => {
    try {
      const html = await fs.readFile(path.join(__dirname, "../public/index.html"), "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) {
      res.status(500).send("Erro ao carregar frontend");
    }
  });

  // Status do serviço
  app.get("/status", async (req, res) => {
    await db.read();
    const response = { ...serviceState, apis: db.data.apis };
    console.log("📤 Resposta:", response);
    res.json(response);
  });

  // Toggle de mensagens
  app.post("/toggle-messages", (req, res) => {
    serviceState.isMessageSendingEnabled = !serviceState.isMessageSendingEnabled;
    const response = { ok: true, state: serviceState.isMessageSendingEnabled };
    console.log("📤 Resposta:", response);
    res.json(response);
  });

  // Adicionar ou atualizar API
  app.post("/api/add", async (req, res) => {
    try {
      console.log("📥 Dados recebidos:", req.body);
      const api = req.body;
      await db.read();

      // Validate ping configuration
      if (api.type === 'PING') {
        if (!api.host || !api.port) {
          return res.status(400).json({ ok: false, error: "Host e porta são obrigatórios para ping" });
        }
        // Ensure port is a number
        api.port = parseInt(api.port);
        if (isNaN(api.port) || api.port < 1 || api.port > 65535) {
          return res.status(400).json({ ok: false, error: "Porta deve ser um número entre 1 e 65535" });
        }
      }

      if (api.id) {
        // Atualizar API existente
        const idx = db.data.apis.findIndex((a) => a.id === api.id);
        if (idx !== -1) {
          db.data.apis[idx] = { ...db.data.apis[idx], ...api };
        } else {
          // Se não encontrar, adiciona como novo
          api.id = nanoid();
          api.enabled = true;
          db.data.apis.push(api);
        }
      } else {
        // Adicionar nova API
        api.id = nanoid();
        api.enabled = true;
        db.data.apis.push(api);
      }

      await db.write();
      await scheduleAllApis();

      const response = { ok: true, api };
      console.log("📤 Resposta:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Erro ao adicionar/atualizar API:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Deletar API
  app.post("/api/delete", async (req, res) => {
    try {
      console.log("📥 Dados recebidos:", req.body);
      const { id } = req.body;
      
      await db.read();
      const originalLength = db.data.apis.length;
      db.data.apis = db.data.apis.filter((a) => a.id !== id);
      
      if (db.data.apis.length === originalLength) {
        return res.status(404).json({ ok: false, error: "API não encontrada" });
      }
      
      await db.write();
      
      const response = { ok: true };
      console.log("📤 Resposta:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Erro ao deletar API:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Testar API
  app.post("/api/test", async (req, res) => {
    try {
      console.log("📥 Dados recebidos:", req.body);
      const { id } = req.body;
      
      await db.read();
      const api = db.data.apis.find((a) => a.id === id);
      
      if (!api) {
        return res.status(404).json({ ok: false, error: "API não encontrada" });
      }
      
      const { online, responseTime } = await checkApi(api);
      
      // Atualizar dados da API
      api.lastRun = DateTime.now().setZone(CONFIG.TIMEZONE).toFormat("dd/MM/yyyy HH:mm:ss");
      api.isOnline = online;
      api.responseTime = responseTime;
      
      await db.write();
      
      const response = { 
        ok: true, 
        result: { 
          online, 
          responseTime, 
          api: api.name,
          type: api.type || 'API'
        } 
      };
      console.log("📤 Resposta:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Erro ao testar API:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Listar APIs
  app.get("/api/list", async (req, res) => {
    try {
      await db.read();
      res.json({ ok: true, apis: db.data.apis });
    } catch (error) {
      console.error("❌ Erro ao listar APIs:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Adicionar grupo/layout de agendamento
  app.post("/schedule-group/add", async (req, res) => {
    try {
      await db.read();
      const group = { ...req.body, id: nanoid() };
      db.data.schedules = db.data.schedules || [];
      db.data.schedules.push(group);
      await db.write();
      res.json({ ok: true, group });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Listar grupos/layouts de agendamento
  app.get("/schedule-group/list", async (req, res) => {
    try {
      await db.read();
      res.json({ ok: true, groups: db.data.schedules || [] });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Teste de envio WhatsApp instantâneo
  app.post("/test-whatsapp", async (req, res) => {
    try {
      const msg = req.body?.message || "🚀 Teste de envio WhatsApp realizado com sucesso!";
      await sendWhatsappMessage(msg, true);
      res.json({ ok: true, sent: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Lock para evitar múltiplos envios simultâneos
  let whatsappOfflineLock = false;

  // Enviar mensagem WhatsApp das rotas offline manualmente
  app.post("/send-whatsapp-offline", async (req, res) => {
    if (whatsappOfflineLock) {
      return res.status(429).json({ ok: false, sent: false, message: "Envio já em andamento, aguarde..." });
    }
    whatsappOfflineLock = true;
    try {
      await db.read();
      let offlineApis = [];

      // Testa todas as APIs e atualiza o status no banco
      for (const api of db.data.apis) {
        if (!api.enabled) continue;
        const { online, responseTime } = await checkApi(api);
        api.lastRun = DateTime.now().setZone(CONFIG.TIMEZONE).toFormat("dd/MM/yyyy HH:mm:ss");
        api.isOnline = online;
        api.responseTime = responseTime;
        if (!online) offlineApis.push(api.name);
      }

      await db.write();

      if (offlineApis.length === 0) {
        whatsappOfflineLock = false;
        return res.json({ ok: false, sent: false, message: "Nenhuma rota offline no momento." });
      }

      // ENVIE APENAS UMA MENSAGEM PARA TODAS AS OFFLINES
      const msg = `❌ APIs OFFLINE: ${offlineApis.join(", ").toUpperCase()}`;
      await sendWhatsappMessage(msg, true);

      whatsappOfflineLock = false;
      res.json({ ok: true, sent: true, message: msg });
    } catch (error) {
      whatsappOfflineLock = false;
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Middleware de erro 404
  app.use((req, res) => {
    res.status(404).json({ ok: false, error: "Endpoint não encontrado" });
  });

  // Middleware de tratamento de erros
  app.use((err, req, res, next) => {
    console.error("❌ Erro na aplicação:", err);
    res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  });
}
