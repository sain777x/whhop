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
  const res = await fetch(url);
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
    })
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
  const age = 35 + Math.floor(Math.random() * 15);
  return `Photorealistic square webcam headshot of a ${a.sexo}, age ${age}, ${a.cabelo}, wearing a dark polo or button shirt, professional look, looking at the camera, slight smile, home office background with bookshelf. No text.`;
}

function promptAula(sexo, nome, produto) {
  const a = aparencia(sexo);
  return `Photorealistic photo of the same ${a.sexo} from the profile photo, age ${a.idade}, ${a.cabelo}, wearing a casual shirt, teaching a live online class, gesturing with hands, looking at the camera, home office background with bookshelf and plants. No text, no watermark.`;
}

function promptPerfil(a) {
  return `Photorealistic square headshot of the same ${a.sexo}, age ${a.idade}, ${a.cabelo}, wearing a different shirt, looking at the camera, slight smile, different room from a webcam class, soft office background. No text, no watermark.`;
}

function promptCliente(sexo, nome) {
  const a = aparencia(sexo);
  return `Photorealistic square phone profile photo of a ${a.sexo}, age ${a.idade}, ${a.cabelo}, casual clothes, looking at the camera, slight smile, indoor background. Natural skin, no text. Name context only, do not render text: ${nome}.`;
}

module.exports = { aparencia, gerar, promptAula, promptPerfil, promptCliente, promptHost };
