const XAI_URL = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.XAI_IMAGE_MODEL || "grok-imagine-image-2.0";

function key() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function aparencia(sexo) {
  const fem = sexo === "female";
  return {
    sexo: fem ? "woman" : "man",
    idade: pick(fem ? [27, 31, 34, 38, 42] : [28, 32, 36, 40, 44]),
    cabelo: pick(fem
      ? ["shoulder-length dark wavy hair", "hair tied back", "short dark hair", "long brown hair"]
      : ["short dark hair", "curly dark hair", "short hair and a light beard", "short brown hair"]),
    roupa: pick(fem
      ? ["navy blouse", "beige sweater", "olive shirt", "white shirt"]
      : ["dark t-shirt", "gray shirt", "navy polo", "olive t-shirt"]),
    sala: pick([
      "home office with a bookshelf and a plant",
      "plain light wall and a desk lamp",
      "office chair with a window and soft daylight"
    ])
  };
}

async function baixar(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("falha ao baixar imagem");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) throw new Error("imagem vazia");
  const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  return `data:${ct};base64,${buf.toString("base64")}`;
}

async function xai(prompt) {
  const apiKey = key();
  if (!apiKey) throw new Error("sem XAI_API_KEY");
  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      response_format: "b64_json",
      aspect_ratio: /square|headshot|profile/i.test(prompt) ? "1:1" : "3:2",
      resolution: "1k"
    },
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) throw new Error(`imagem ${res.status}`);
  const data = await res.json();
  const item = data.data && data.data[0];
  if (!item) throw new Error("sem imagem");
  if (item.b64_json) return `data:image/jpeg;base64,${item.b64_json}`;
  if (item.url) return baixar(item.url);
  throw new Error("resposta sem url");
}

async function pollinations(prompt) {
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=1024&height=768&nologo=true&model=flux";
  return baixar(url);
}

async function gerar(prompt) {
  return xai(prompt);
}

function promptHost(sexo, nome) {
  const a = aparencia(sexo);
  const age = 38 + Math.floor(Math.random() * 12);
  const cabeloHost = sexo === "female"
    ? pick(["blonde hair in a bun", "long straight black hair", "red hair tied back", "short platinum hair"])
    : pick(["bald head", "gray hair", "short blond hair", "dark hair with gray streaks"]);
  return `Photorealistic square webcam headshot of a ${a.sexo}, age ${age}, ${cabeloHost}, wearing a dark polo or button shirt, professional look, looking at the camera, slight smile, home office background with bookshelf. Distinct face, not similar to a client photo. No text.`;
}

function promptAula(sexo, nome, produto) {
  const a = aparencia(sexo);
  const cabeloHost = sexo === "female"
    ? pick(["blonde hair in a bun", "long straight black hair", "red hair tied back", "short platinum hair"])
    : pick(["bald head", "gray hair", "short blond hair", "dark hair with gray streaks"]);
  const gestos = [
    "both hands open in front of the chest, explaining",
    "one hand raised with fingers spread, making a point",
    "hands together then opening, mid-explanation",
    "one index finger raised, emphasizing a step",
    "both hands gesturing outward, describing a process",
    "one hand pointing at an imaginary screen, teaching",
    "hands moving as if counting steps, explaining",
    "one palm facing up, presenting an idea",
    "both hands framing a concept in the air",
    "one hand chopping the air gently, listing points",
    "hands clasped then opening toward the camera",
    "one hand raised near the face, thinking out loud",
    "both hands showing size or scale, explaining",
    "one hand sweeping sideways, walking through a flow",
    "fingers pinched then opening, detailing a step",
    "one hand on the chest then extending out, explaining",
    "both hands moving up and down, comparing options",
    "one hand circling, describing a cycle",
    "palms facing each other, holding an idea",
    "one hand pointing down then up, sequencing steps"
  ];
  const gesto = gestos[Math.floor(Math.random() * gestos.length)];
  return `Photorealistic raw webcam still of a ${a.sexo}, age ${a.idade}, ${cabeloHost}, wearing a ${a.roupa}, looking directly into the camera lens, eyes locked on the viewer, mouth slightly open mid-sentence, ${gesto}. ${a.sala}. Distinct face, different from any client. Natural skin, realistic lighting, no text, no watermark, no looking away.`;
}

function promptPerfil(a) {
  return `Photorealistic square headshot of the same ${a.sexo}, age ${a.idade}, ${a.cabelo}, wearing a different shirt, looking at the camera, slight smile, different room from a webcam class, soft office background. No text, no watermark.`;
}

function promptCliente(sexo, nome) {
  const a = aparencia(sexo);
  return `Photorealistic square phone profile photo of a ${a.sexo}, age ${a.idade}, ${a.cabelo}, casual clothes, looking at the camera, slight smile, indoor background. Natural skin, no text. Name context only, do not render text: ${nome}.`;
}

module.exports = { aparencia, gerar, promptAula, promptPerfil, promptCliente, promptHost };
