const fs = require("fs");
const path = require("path");
const { shotScene } = require("./server");
const { buildScenes } = require("./lib/iphone-whatsapp");
const { montarComIA } = require("./lib/grok");

function rawFromEnv() {
  if (process.env.RAW) return process.env.RAW;
  const arg = process.argv[2];
  if (arg && fs.existsSync(arg)) return fs.readFileSync(arg, "utf8");
  if (arg) return arg;
  return [
    `CLIENTE: ${process.env.CLIENTE || "Selena Hall"}`,
    `VALOR: ${process.env.VALOR || ""}`,
    `APRESENTADOR: ${process.env.APRESENTADOR || process.env.EMPRESA || "Host"}`,
    `PRODUTO: ${process.env.PRODUTO || process.env.CURSO || "Mentorship"}`,
    `DETALHES DO PRODUTO: ${process.env.DETALHES || "N/A"}`,
    `ARQUIVO: ${process.env.ARQUIVO || ""}`,
    `link: ${process.env.CHECKOUT || "https://whop.com/checkout/plan_yUcOnHccHp7BK"}`,
    `Status: APPROVED`,
    `DIA: ${process.env.DIA || ""}`,
    `HORARIO: ${process.env.HORARIO || "18:55"}`
  ].join("\n");
}

async function main() {
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const dados = await montarComIA({ rawText: rawFromEnv() });
  console.log("detalhes:", dados.detalhes || "(vazio)");
  const scenes = buildScenes(dados);
  for (const scene of scenes) {
    const buf = await shotScene(dados, scene);
    const file = path.join(outDir, `${scene.id}.png`);
    fs.writeFileSync(file, buf);
    console.log("gerado", file, buf.length);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
