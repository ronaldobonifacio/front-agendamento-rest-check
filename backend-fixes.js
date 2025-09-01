// Adicione estas modificações no seu monitor.mjs

// Importar o módulo http
const http = require("http")

// Definir o serviceState
const serviceState = {
  isMessageSendingEnabled: true,
}

// --- SERVIDOR HTTP COM CORS ---
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.writeHead(200)
    return res.end()
  }

  if (req.method === "POST") {
    if (req.url === "/toggle-messages") {
      serviceState.isMessageSendingEnabled = !serviceState.isMessageSendingEnabled
      res.setHeader("Content-Type", "application/json")
      return res.end(JSON.stringify({ ok: true, state: serviceState.isMessageSendingEnabled }))
    }
  }
})
