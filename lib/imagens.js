const { gerar, promptHost, promptAula } = require("./gerar-foto");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  const clienteSexo = dados.sexo === "female" ? "female" : "male";
  const hostSexo = clienteSexo === "female" ? "male" : "female";
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
