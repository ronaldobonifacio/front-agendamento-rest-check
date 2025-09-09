// pingChecker.mjs
import net from "net";
import { CONFIG } from "./config.mjs";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function checkPing(pingConfig) {
  let lastResponseTime = null;

  for (let i = 1; i <= CONFIG.RETRIES; i++) {
    const start = Date.now();
    
    try {
      const isReachable = await testTcpConnection(pingConfig.host, pingConfig.port, CONFIG.TIMEOUT);
      lastResponseTime = Date.now() - start;
      
      if (isReachable) {
        return { online: true, responseTime: lastResponseTime };
      }
    } catch (err) {
      console.warn(`⚠️ Tentativa ${i} de ping falhou para ${pingConfig.name}: ${err.message}`);
      lastResponseTime = Date.now() - start;
    }
    
    if (i < CONFIG.RETRIES) await delay(CONFIG.RETRY_DELAY);
  }
  
  return { online: false, responseTime: lastResponseTime };
}

function testTcpConnection(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onError);
    
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}
