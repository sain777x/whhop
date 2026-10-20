const { gerar, promptCliente, seedHash } = require("./gerar-foto");

const FEMALE = /^(ana|anna|alice|amanda|amy|andrea|angela|ashley|barbara|beatriz|beth|bianca|brenda|brittany|camila|carla|carmen|carolina|caroline|cassandra|catherine|charlotte|chloe|christina|claire|clara|claudia|cristina|daniela|diana|elena|elisa|elizabeth|ella|emily|emma|erica|evelyn|fernanda|gabriela|grace|hannah|helen|helena|isabella|jennifer|jessica|julia|karen|kate|katherine|kelly|kimberly|kristen|laura|lauren|lisa|lucia|maria|marie|mary|melissa|mia|michelle|monica|nancy|natalia|nicole|nina|olivia|patricia|paula|rebecca|sara|sarah|selena|sofia|sophia|stephanie|susan|valentina|vanessa|victoria|vivian|yasmin|zoe)$/i;
const MALE = /^(adam|alan|alex|alexander|andre|andrew|anthony|arthur|benjamin|brandon|brian|bruno|carlos|charles|chris|daniel|danilo|david|diego|eduardo|eric|ethan|felipe|gabriel|george|henry|jack|james|john|jose|joseph|joshua|kevin|lucas|luis|mario|mark|michael|miguel|nathan|nicholas|noah|oliver|paul|pedro|peter|rafael|ricardo|richard|robert|ryan|samuel|thomas|victor|william|zachary)$/i;

function inferGender(nome) {
  const first = String(nome || "").trim().split(/\s+/)[0];
  if (FEMALE.test(first)) return "female";
  if (MALE.test(first)) return "male";
  if (/a$/.test(first.toLowerCase())) return "female";
  return "male";
}

async function bufferFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("falha ao baixar avatar");
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/jpeg";
  return `data:${ct.split(";")[0]};base64,${buf.toString("base64")}`;
}

async function sexoPorIA(nome) {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  const full = String(nome || "").trim();
  if (!apiKey || !full) return inferGender(nome);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.20-non-reasoning",
        temperature: 0,
        messages: [
          { role: "system", content: "You decide the most likely gender of a person's full name. Reply with exactly one word: female or male. Nothing else." },
          { role: "user", content: `Full name: ${full}` }
        ]
      })
    });
    if (!res.ok) return inferGender(nome);
    const data = await res.json();
    const out = String(data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "").toLowerCase().trim();
    if (out.includes("female") && !out.includes("male")) return "female";
    if (out.includes("male") && !out.includes("female")) return "male";
    if (out === "female" || out.startsWith("female")) return "female";
    if (out === "male" || out.startsWith("male")) return "male";
    return inferGender(nome);
  } catch (_) {
    return inferGender(nome);
  }
}

async function gerarAvatar(nome) {
  const gender = await sexoPorIA(nome);
  try {
    const avatarData = await gerar(promptCliente(gender, nome));
    if (avatarData && avatarData.length > 40) return { gender, avatarData };
  } catch (_) {}
  try {
    const url = `https://randomuser.me/api/portraits/${gender === "female" ? "women" : "men"}/${seedHash(nome) % 90}.jpg`;
    return { gender, avatarData: await bufferFromUrl(url) };
  } catch (_) {
    return { gender, avatarData: "" };
  }
}

module.exports = { inferGender, sexoPorIA, gerarAvatar };
