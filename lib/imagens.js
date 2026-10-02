const fs = require("fs");
const path = require("path");
const { aparencia, gerar, promptAula, promptPerfil } = require("./gerar-foto");

const MEET_DIRS = [
  path.join(__dirname, "..", "public", "meet"),
  path.join(__dirname, "..", "meet")
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,` + buf.toString("base64");
}

function list(re) {
  const files = [];
  for (const dir of MEET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (re.test(f) && !/^aula-[mf]-\d/i.test(f) && !/^host-aula-[mf]-\d/i.test(f)) {
        files.push(path.join(dir, f));
      }
    }
  }
  return files;
}

function local() {
  const aulas = list(/^aula-.*\.(jpe?g|png)$/i);
  if (!aulas.length) return null;
  const aula = pick(aulas);
  const id = path.basename(aula).replace(/^aula-/i, "").replace(/\.(jpe?g|png)$/i, "");
  const hosts = list(/^host-.*\.(jpe?g|png)$/i);
  const paired = hosts.find((f) => new RegExp(`host-aula-${id}\\.(jpe?g|png)$`, "i").test(path.basename(f)));
  const host = paired || (hosts.length ? pick(hosts) : "");
  return {
    video: dataUri(aula),
    hostAvatar: host ? dataUri(host) : ""
  };
}

async function gerarCenaMeet() {
  const soLocal = process.env.FOTOS_LOCAIS === "1";
  if (!soLocal) {
    const a = aparencia(Math.random() < 0.5 ? "female" : "male");
    try {
      const video = await gerar(promptAula(a));
      let hostAvatar = "";
      try { hostAvatar = await gerar(promptPerfil(a)); } catch (_) {}
      if (video && video.length > 80) return { video, hostAvatar };
    } catch (_) {}
  }
  return local() || { video: "", hostAvatar: "" };
}

module.exports = { gerarCenaMeet };
