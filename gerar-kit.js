const fs = require("fs");
const path = require("path");
const { shotScene } = require("./server");
const { buildScenes } = require("./lib/iphone-whatsapp");

const dados = {
  empresa: process.env.EMPRESA || "MAICOL SERPA SANT ANA MARKETING LTDA",
  cliente: process.env.CLIENTE || "Selena Hall",
  curso: process.env.CURSO || "Marketing Mentorship Online Program",
  checkout: process.env.CHECKOUT || "https://whop.com/checkout/plan_yUcOnHccHp7BK",
  meet: process.env.MEET || "https://meet.google.com/wtn-hxqr-bvm",
  status: process.env.STATUS || "00:40",
  dia26: process.env.DIA26 || "11:04–11:41",
  dia30: process.env.DIA30 || "00:03–00:28",
  headerStatus: "online"
};

async function main() {
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
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
