const { gerar, promptHost, promptAula } = require("./gerar-foto");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  const gender = dados.sexo === "female" ? "female" : "male";
  const produto = dados.produto || "the mentorship";
  try {
    const [hostAvatar, video] = await Promise.all([
      gerar(promptHost(gender, host)).catch((e) => { console.error("hostAvatar falhou", e.message); return ""; }),
      gerar(promptAula(gender, host, produto)).catch((e) => { console.error("video falhou", e.message); return ""; })
    ]);
    console.log("imagens geradas", hostAvatar ? "host ok" : "host vazio", video ? "video ok" : "video vazio");
    return { video: video || "", hostAvatar: hostAvatar || "" };
  } catch (err) {
    console.error("gerarCenaMeet erro", err.message);
    return { video: "", hostAvatar: "" };
  }
}

module.exports = { gerarCenaMeet };
