const { gerar, promptHost, promptAula } = require("./gerar-foto");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  const gender = dados.sexo === "female" ? "female" : "male";
  try {
    const [hostAvatar, video] = await Promise.all([
      gerar(promptHost(gender, host)),
      gerar(promptAula(gender, host, dados.produto || ""))
    ]);
    return { video: video || "", hostAvatar: hostAvatar || "" };
  } catch (_) {
    return { video: "", hostAvatar: "" };
  }
}

module.exports = { gerarCenaMeet };
