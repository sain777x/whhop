const { gerar, promptCliente } = require("./gerar-foto");

const FEMALE = /^(ana|anna|alice|amanda|amy|andrea|angela|ashley|barbara|beatriz|beth|bianca|brenda|brittany|camila|carla|carmen|carolina|caroline|cassandra|catherine|charlotte|chloe|christina|claire|clara|claudia|cristina|daniela|diana|elena|elizabeth|ella|emily|emma|erica|evelyn|fernanda|gabriela|grace|hannah|helen|helena|isabella|jennifer|jessica|julia|karen|kate|katherine|kelly|kimberly|laura|lauren|lisa|lucia|maria|marie|mary|melissa|mia|michelle|monica|nancy|natalia|nicole|nina|olivia|patricia|paula|rebecca|sara|sarah|selena|sofia|sophia|stephanie|susan|valentina|vanessa|victoria|vivian|yasmin|zoe)$/i;
const MALE = /^(adam|alan|alex|alexander|andre|andrew|anthony|arthur|benjamin|brandon|brian|bruno|carlos|charles|chris|daniel|danilo|david|diego|eduardo|eric|ethan|felipe|frank|gabriel|george|henry|jack|james|john|jose|joseph|joshua|kevin|lucas|luis|mario|mark|michael|miguel|nathan|nicholas|noah|oliver|paul|pedro|peter|rafael|ricardo|richard|robert|ryan|samuel|thomas|victor|william|zachary)$/i;

function inferGender(nome) {
  const first = String(nome || "").trim().split(/\s+/)[0];
  if (MALE.test(first)) return "male";
  if (FEMALE.test(first)) return "female";
  return Math.random() < 0.5 ? "female" : "male";
}

async function sexoPorIA(nome, aleatorio = false) {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  const full = String(nome || "").trim();
  const fallback = () => aleatorio
    ? (Math.random() < 0.5 ? "female" : "male")
    : inferGender(nome);
  if (!apiKey || !full) return fallback();
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
          { role: "system", content: "You decide the gender of a person's name. Reply with one word only: female or male." },
          { role: "user", content: `Full name: ${full}` }
        ]
      })
    });
    if (!res.ok) return fallback();
    const data = await res.json();
    const out = String(data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "").toLowerCase();
    if (out.includes("female") && !out.includes("male")) return "female";
    if (out.includes("male") && !out.includes("female")) return "male";
    return fallback();
  } catch (_) {
    return fallback();
  }
}

async function gerarAvatar(nome) {
  const gender = await sexoPorIA(nome, false);
  try {
    const avatarData = await gerar(promptCliente(gender, nome));
    if (avatarData && avatarData.length > 40) return { gender, avatarData };
  } catch (err) {
    console.error("gerarAvatar falhou", err.message);
  }
  return { gender, avatarData: "" };
}

module.exports = { inferGender, sexoPorIA, gerarAvatar };
