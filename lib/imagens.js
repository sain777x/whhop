const { gerar, promptHost, promptAula } = require("./gerar-foto");
const { gerarAvatar, sexoPorIA } = require("./avatar");

async function gerarCenaMeet(dados) {
  const host = dados.apresentador || "the host";
  // hostAvatarForced vem do body (base64 enviada pela conta) — mesmo rosto em
  // todas as provas da mesma pessoa. Sem ele, gera pelo APRESENTADOR.
  const fixedHost = dados.hostAvatarForced ? String(dados.hostAvatarForced) : "";
  const hostSexo = await sexoPorIA(host);
  const faceHost = () =>
    fixedHost
      ? Promise.resolve(fixedHost)
      : gerar(promptHost(hostSexo, host)).catch(async () => {
          try {
            return ((await gerarAvatar(host)).avatarData) || "";
          } catch (_) {
            return "";
          }
        });
  try {
    const [hostAvatar, video] = await Promise.all([
      faceHost(),
      gerar(promptAula(hostSexo, host, dados.produto || ""))
    ]);
    return { video: video || "", hostAvatar: hostAvatar || "" };
  } catch (_) {
    return { video: "", hostAvatar: fixedHost || "" };
  }
}

module.exports = { gerarCenaMeet };
