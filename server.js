const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const express = require("express");
const cors = require("cors");
const { buildScenes, renderHTML } = require("./lib/iphone-whatsapp");
const { montarComIA } = require("./lib/grok");
const { renderMeetHTML } = require("./lib/meet-windows");

const PORT = process.env.PORT || 3000;
const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe")
    : "/usr/bin/chromium");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

let fila = Promise.resolve();
function umPorVez(fn) {
  const run = fila.then(fn, fn);
  fila = run.then(() => {}, () => {});
  return run;
}

function validar(dados) {
  const need = ["empresa", "cliente", "curso", "checkout", "meet"];
  return need.filter((k) => !dados || !String(dados[k] || "").trim());
}

function runChrome(htmlPath, pngPath, width = 393, height = 852, scale = 2) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--force-device-scale-factor=${scale}`,
      `--screenshot=${pngPath}`,
      `--window-size=${width},${height}`,
      `file://${htmlPath}`
    ];
    const child = spawn(CHROME, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString(); });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("timeout no Chromium"));
    }, 25000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1000) {
        resolve(fs.readFileSync(pngPath));
      } else {
        reject(new Error(`Chromium falhou (${code}): ${err.slice(-400)}`));
      }
    });
  });
}

async function shotHtml(html, width, height, scale) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wa-print-"));
  const htmlPath = path.join(dir, "chat.html");
  const pngPath = path.join(dir, "chat.png");
  fs.writeFileSync(htmlPath, html, "utf8");
  try {
    return await runChrome(htmlPath, pngPath, width, height, scale);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function shotScene(dados, scene) {
  return shotHtml(renderHTML(dados, scene), 393, 852, 1);
}

async function shotMeet(dados) {
  return shotHtml(renderMeetHTML(dados), 1600, 900, 1);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, chrome: CHROME, fotosLocais: process.env.FOTOS_LOCAIS === "1" });
});

async function montarDados(body) {
  return montarComIA(body);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function nomesPrints() {
  const agora = new Date();
  const baseImg = 1000 + Math.floor(Math.random() * 8000);
  const iphone = [0, 1, 2, 3].map((i) => `IMG_${String(baseImg + i).padStart(4, "0")}.PNG`);
  const t = new Date(agora.getTime() + 8000);
  const win = `Captura de tela ${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.png`;
  return { iphone, win };
}

app.post("/api/gerar-print", (req, res) => {
  umPorVez(async () => {
    console.log("pedido /api/gerar-print");
    const dados = await montarDados(req.body || {});
    if (!dados.cliente || !dados.checkout) {
      return res.status(400).json({ error: "Mande rawText ou cliente + checkout" });
    }
    const scenes = buildScenes(dados);
    const wanted = dados.cena || dados.scene || "01-interesse";
    const scene = scenes.find((s) => s.id === wanted) || scenes[0];
    const buffer = await shotScene(dados, scene);
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `inline; filename="${scene.id}.png"`);
    res.send(buffer);
  }).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Falha ao renderizar", detail: String(err.message || err) });
  });
});

app.post("/api/gerar-kit", (req, res) => {
  umPorVez(async () => {
    console.log("pedido /api/gerar-kit");
    const dados = await montarDados(req.body || {});
    if (!dados.cliente || !dados.checkout) {
      return res.status(400).json({ error: "Mande rawText ou cliente + checkout" });
    }
    const scenes = buildScenes(dados);
    const nomes = nomesPrints();
    const prints = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const buffer = await shotScene(dados, scene);
      prints.push({
        id: scene.id,
        label: scene.label,
        filename: nomes.iphone[i],
        image: `data:image/png;base64,${buffer.toString("base64")}`
      });
    }
    try {
      const meetBuf = await shotMeet(dados);
      prints.push({
        id: "05-meet-windows",
        label: "Meet Windows",
        filename: nomes.win,
        image: `data:image/png;base64,${meetBuf.toString("base64")}`
      });
    } catch (meetErr) {
      console.error(meetErr);
      prints.push({
        id: "05-meet-windows",
        label: "Meet Windows (falhou)",
        filename: "05-meet-windows.png",
        error: String(meetErr.message || meetErr)
      });
    }
    console.log("kit pronto", dados.cliente, "video", dados.meetVideo ? "sim" : "nao");
    res.json({
      ok: true,
      fonte: dados.fonte || "local",
      cliente: dados.cliente,
      produto: dados.produto || dados.curso,
      meet: dados.meet,
      statusBar: dados.statusBar,
      battery: dados.battery,
      erroGrok: dados.erroGrok || null,
      erroImagem: dados.erroImagem || null,
      prints
    });
  }).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Falha ao renderizar o kit", detail: String(err.message || err) });
  });
});

const provaEntrega = require("./lib/provas-entrega");

app.post("/api/prova-entrega", (req, res) => {
  umPorVez(async () => {
    console.log("pedido /api/prova-entrega");
    const out = await provaEntrega(req.body || {}, umPorVez);
    res.json(out);
  }).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Falha no kit de entrega", detail: String(err.message || err) });
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API em http://localhost:${PORT}`);
    console.log("POST /api/gerar-kit");
    console.log("POST /api/gerar-print");
  });
}

module.exports = { shotScene, validar, buildScenes };
