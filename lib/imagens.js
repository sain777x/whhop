const { gerar, promptHost, promptAula } = require("./gerar-foto");
const { sexoPorIA } = require("./avatar");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  const hostSexo = await sexoPorIA(host);
  try {
    const [hostAvatar, video] = await Promise.all([
      gerar(promptHost(hostSexo, host)),
      gerar(promptAula(hostSexo, host, dados.produto || ""))
    ]);
    return { video: video || "", hostAvatar: hostAvatar || "" };
  } catch (_) {
    return { video: "", hostAvatar: "" };
  }
}

module.exports = { gerarCenaMeet };
