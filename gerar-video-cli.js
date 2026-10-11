const fs = require("fs");
const path = require("path");
const { montarComIA } = require("./lib/grok");
const { gerarVideoAula } = require("./gerar-video");

async function main() {
  const raw = process.argv[2] || process.env.RAW || [
    "CLIENTE: Test Client",
    "PRODUTO: PHP Mentorship",
    "DETALHES DO PRODUTO: live 1:1 on PHP and SQL",
    "link: https://whop.com/checkout/example",
    "DIA: 30/09/2026",
    "HORARIO: 18:55"
  ].join("\n");
  const dados = await montarComIA({ rawText: raw });
  const outDir = path.join(__dirname, "out");
  const file = await gerarVideoAula(dados, outDir);
  console.log("vídeo gerado:", file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
