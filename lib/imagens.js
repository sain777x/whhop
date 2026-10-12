const fs = require("fs");
const path = require("path");

const MEET_DIR = path.join(__dirname, "..", "meet");

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
  if (!fs.existsSync(MEET_DIR)) return [];
  return fs.readdirSync(MEET_DIR).filter((f) => re.test(f));
}

async function gerarCenaMeet() {
  const aulas = list(/^aula-.*\.(jpe?g|png)$/i);
  if (!aulas.length) return { video: "", hostAvatar: "" };
  const aula = pick(aulas);
  const id = aula.replace(/^aula-/i, "").replace(/\.(jpe?g|png)$/i, "");
  const hosts = list(/^host-.*\.(jpe?g|png)$/i);
  const paired = hosts.find((f) => new RegExp(`^host-aula-${id}\\.(jpe?g|png)$`, "i").test(f));
  const host = paired || (hosts.length ? pick(hosts) : "");
  return {
    video: dataUri(path.join(MEET_DIR, aula)),
    hostAvatar: host ? dataUri(path.join(MEET_DIR, host)) : ""
  };
}

module.exports = { gerarCenaMeet };
