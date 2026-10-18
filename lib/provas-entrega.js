/**
 * POST /api/prova-entrega — kit de PROVA DE ENTREGA para o AI Resolver.
 * Reaproveita o motor existente (montarComIA/buildScenes/shotScene) e soma:
 *  - cena 05-acesso: iPhone WhatsApp com a entrega do acesso (link real)
 *  - cena 06-browser: janela de desktop abrindo a página REAL do produto
 * Os horários vêm de DIA/HORARIO do rawText (contrato de relógio do resolver).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { montarComIA } = require("./grok");

const CHROME = process.env.CHROME_PATH || (process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/chromium");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

function runChromeLocal(htmlPath, pngPath, width, height) {
  return new Promise((resolve, reject) => {
    const args = ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
      "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
      `--screenshot=${pngPath}`, `--window-size=${width},${height}`, `file://${htmlPath}`];
    const child = spawn(CHROME, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString(); });
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("timeout no Chromium")); }, 20000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1000) resolve(fs.readFileSync(pngPath));
      else reject(new Error(`Chromium falhou (${code}): ${err.slice(-400)}`));
    });
  });
}

async function shot(html, width, height) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pe-"));
  const htmlPath = path.join(dir, "page.html");
  const pngPath = path.join(dir, "page.png");
  fs.writeFileSync(htmlPath, html, "utf8");
  try { return await runChromeLocal(htmlPath, pngPath, width, height); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function acessScene(dados, productPageUrl) {
  const time = dados.statusBar || "12:00";
  const seller = dados.apresentador || dados.empresa || "Host";
  const link = productPageUrl || dados.checkout || "";
  const wallpaper = `file://${path.join(PUBLIC_DIR, "wallpaper.jpg")}`;
  const avatar = dados.avatarData ? `<img src="${dados.avatarData}"/>` : "<b>?</b>";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:393px;height:852px;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
  body{background:${wallpaper} center/cover no-repeat,url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%230b141a"/></svg>');position:relative}
  .statusbar{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;color:#fff;font-size:15px;font-weight:600;background:rgba(11,20,26,.35)}
  .chathead{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1f2c34;color:#e9edef}
  .chathead .av{width:40px;height:40px;border-radius:50%;background:#128c7e;display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden}
  .chathead .name{font-weight:600;font-size:16px}.chathead .sub{font-size:12px;color:#8696a0}
  .chat{padding:14px 12px;display:flex;flex-direction:column;gap:10px}
  .day{align-self:center;background:#182229;color:#8696a0;font-size:12px;padding:4px 10px;border-radius:8px;margin-top:6px}
  .in{max-width:75%;background:#1f2c34;border-radius:12px;padding:10px 12px;color:#e9edef;font-size:14.5px;align-self:flex-start}
  .out{max-width:78%;background:#005c4b;border-radius:12px;padding:10px 12px;color:#e9edef;font-size:14.5px;align-self:flex-end}
  .time{display:block;text-align:right;font-size:11px;color:#8696a0;margin-top:4px}
  .card{display:block;background:#075e54;border-radius:10px;padding:10px 12px;margin-top:8px;color:#fff;text-decoration:none}
  .card .ct{font-weight:600;font-size:13.5px}.card .cu{color:#7ad0c4;font-size:12px;margin-top:4px;word-break:break-all}
  </style></head><body>
  <div class="statusbar"><span>${esc(time)}</span><span>🔋 ${esc(String(dados.battery || "78"))}%</span></div>
  <div class="chathead"><div class="av">${avatar}</div><div><div class="name">${esc(seller)}</div><div class="sub">online</div></div></div>
  <div class="chat">
    <div class="day">${esc((dados.scenes && dados.scenes[3] && dados.scenes[3].dateChip) || "Today")}</div>
    <div class="out">Payment approved 🎉 Thanks!
      <span class="time">${esc(time)} ✓✓</span></div>
    <div class="in">You're all set! Your access is already unlocked inside your Whop account.<span class="time">${esc(time)}</span></div>
    <div class="in">Here's your program page — everything downloads from there automatically:<a class="card" href="#"><span class="ct">${esc(dados.produto || dados.curso || "Your Program")}</span><span class="cu">${esc(link)}</span></a><span class="time">${esc(time)} ✓✓</span></div>
    <div class="out">Perfect, I can see it. Thank you!<span class="time">${esc(time)} ✓✓</span></div>
  </div>
  </body></html>`;
}

function browserScene(dados, productPageUrl) {
  const title = dados.produto || dados.curso || "Program";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1600px;height:900px;font-family:"Segoe UI",Arial,sans-serif;background:#202124}
  .win{border-radius:12px;overflow:hidden;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.5)}
  .tabs{background:#dee1e6;padding:10px 14px 0;display:flex;gap:8px;align-items:center}
  .tab{background:#fff;border-radius:10px 10px 0 0;padding:10px 18px;font-size:13px;color:#202124;max-width:520px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .urlbar{background:#fff;padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e5e5}
  .arrows{color:#5f6368;font-size:15px}
  .url{flex:1;background:#f1f3f4;border-radius:18px;padding:8px 16px;font-size:13px;color:#202124}
  iframe{flex:1;width:100%;border:0}
  </style></head><body><div class="win">
  <div class="tabs"><div class="tab">🔒 ${esc(title)} — ${esc(String(productPageUrl||"").replace(new RegExp("^https?://"),"").replace(new RegExp("/$"),""))}</div></div>
  <div class="urlbar"><span class="arrows">←  →  ⟳</span><span class="url">🔒 ${esc(productPageUrl)}</span></div>
  <iframe src="${esc(productPageUrl)}"></iframe>
  </div></body></html>`;
}

module.exports = async function provaEntrega(body, umPorVez) {
  const fn = async () => {
    const dados = await montarComIA(body || {}, { fast: !body.fullAi });
    if (!dados.cliente || !dados.checkout) throw new Error("Mande rawText ou cliente + checkout");
    const { buildScenes } = require("./iphone-whatsapp");
    const scenes = buildScenes(dados);
    // POR DEFEITO gera SOMENTE 05-acesso (comunicacao de acesso concedido, HTML local e leve) -
    // responde ao pedido exato da Whop e encaixa na instancia pequena do whhop.
    // body.rich:true soma o chat de checkout/pagamento (02/03) e a pagina real (06-browser).
    const wanted = (body && body.rich) ? ["02-checkout", "03-pagamento"] : [];
    const picked = scenes.filter((s) => wanted.includes(s.id));
    const prints = [];
    for (const scene of picked) {
      const buf = await shot(require("./iphone-whatsapp").renderHTML(dados, scene), 393, 852);
      prints.push({ id: scene.id, label: scene.label, filename: `${scene.id}.png`, image: `data:image/png;base64,${buf.toString("base64")}` });
    }
    const pageUrl = (body.productPageUrl || dados.checkout || "");
    try {
      const acc = await shot(acessScene(dados, pageUrl), 393, 852);
      prints.push({ id: "05-acesso", label: "Entrega do acesso (WhatsApp)", filename: "IMG_9005.PNG", image: `data:image/png;base64,${acc.toString("base64")}` });
    } catch (e) { prints.push({ id: "05-acesso", error: String(e.message || e) }); }
    if (body && body.rich) {
      try {
        const brw = await shot(browserScene(dados, pageUrl), 1600, 900);
        const t = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        prints.push({ id: "06-browser", label: "Página do produto", filename: `Captura de tela ${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())} ${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.png`, image: `data:image/png;base64,${brw.toString("base64")}` });
      } catch (e) { prints.push({ id: "06-browser", error: String(e.message || e) }); }
    }
    return { ok: true, fonte: dados.fonte, cliente: dados.cliente, produto: dados.produto || dados.curso, statusBar: dados.statusBar, prints };
  };
  return umPorVez ? umPorVez(fn) : fn();
};
