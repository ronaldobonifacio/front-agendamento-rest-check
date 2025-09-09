// apiChecker.mjs
import axios from "axios";
import { CONFIG } from "./config.mjs";
import { checkPing } from "./pingChecker.mjs";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function checkApi(api) {
  // Check if this is a ping type monitoring
  if (api.type === 'PING') {
    return await checkPing(api);
  }
  
  // Original API checking logic
  let lastResponseTime = null;

  for (let i = 1; i <= CONFIG.RETRIES; i++) {
    const start = Date.now();
    try {
      const config = {
        method: api.method || "GET",
        url: api.url,
        timeout: CONFIG.TIMEOUT,
      };

      if (api.headers) {
        try {
          config.headers = JSON.parse(api.headers);
        } catch (e) {
          console.warn(`⚠️ Headers inválidos para ${api.name}`);
        }
      }

      if (api.body && (api.method === "POST" || api.method === "PUT" || api.method === "PATCH")) {
        try {
          config.data = JSON.parse(api.body);
        } catch (e) {
          console.warn(`⚠️ Body inválido para ${api.name}`);
        }
      }

      const res = await axios(config);
      lastResponseTime = Date.now() - start;
      
      if (res.status >= 200 && res.status < 300) {
        return { online: true, responseTime: lastResponseTime };
      }
    } catch (err) {
      console.warn(`⚠️ Tentativa ${i} falhou para ${api.name}: ${err.message}`);
      lastResponseTime = Date.now() - start;
    }
    
    if (i < CONFIG.RETRIES) await delay(CONFIG.RETRY_DELAY);
  }
  return { online: false, responseTime: lastResponseTime };
}
