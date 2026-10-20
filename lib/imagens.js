const { gerar, promptAula } = require("./gerar-foto");
const { sexoPorIA } = require("./avatar");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  // Não gera avatar do apresentador — só a cena de vídeo
  const hostSexo = await sexoPorIA(host);
  const video = await gerar(promptAula(hostSexo, host, dados.produto || "")).catch(() => "");
  return { video: video || "", hostAvatar: "" };
}

module.exports = { gerarCenaMeet };
