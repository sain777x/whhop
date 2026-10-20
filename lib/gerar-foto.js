const XAI_URL = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.XAI_IMAGE_MODEL || "grok-imagine-image-2.0";

function key() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
// Seleção determinística por nome: a MESMA pessoa sai com o MESMO rosto em todos
// os kits (prova repetida, RFI, disputa) sem depender de estado externo.
function seedHash(s) {
  let h = 5381;
  s = String(s || "");
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
function pickSeed(arr, key) { return arr[seedHash(key) % arr.length]; }

function aparencia(sexo, seed) {
  const fem = sexo === "female";
  const P = (arr, salt) => (seed ? pickSeed(arr, seed + ":" + salt) : pick(arr));
  return {
    sexo: fem ? "woman" : "man",
    idade: P(fem ? [27, 31, 34, 38, 42] : [28, 32, 36, 40, 44], "idade"),
    cabelo: P(fem
      ? ["shoulder-length dark wavy hair", "hair tied back", "short dark hair", "long brown hair"]
      : ["short dark hair", "curly dark hair", "short hair and a light beard", "short brown hair"], "cabelo"),
    roupa: P(fem
      ? ["navy blouse", "beige sweater", "olive shirt", "white shirt"]
      : ["dark t-shirt", "gray shirt", "navy polo", "olive t-shirt"], "roupa"),
    sala: P([
      "home office with a bookshelf and a plant",
      "plain light wall and a desk lamp",
      "office chair with a window and soft daylight"
    ], "sala")
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

function promptAula(sexo, nome, produto) {
  const a = aparencia(sexo, nome);
  const seed = seedHash(nome + (produto || "") + String(Date.now()));
  const idades = [29, 33, 36, 39, 43, 46, 49, 53];
  const idade = idades[seed % idades.length];
  const cabelosF = ["blonde hair in a loose bun", "long wavy brown hair", "short red hair", "black hair in a low ponytail", "curly dark hair", "light brown hair with side part"];
  const cabelosM = ["bald head", "short gray hair", "dark hair with gray temples", "short brown hair", "light brown buzz cut", "salt and pepper hair"];
  const cabelo = sexo === "female" ? cabelosF[seed % cabelosF.length] : cabelosM[seed % cabelosM.length];
  const fundos = [
    "home office with bookshelf and window light",
    "bright kitchen with plants in background",
    "neutral living room with sofa",
    "small studio with white wall and desk lamp",
    "office with soft daylight from the side",
    "cozy room with wooden shelves",
    "minimalist room with plain wall and plant",
    "workspace with monitor slightly blurred"
  ];
  const fundo = fundos[seed % fundos.length];
  const gestos = [
    "both hands open in front of the chest, explaining",
    "one hand raised with fingers spread, making a point",
    "one index finger raised, emphasizing a step",
    "both hands gesturing outward",
    "one palm facing up, presenting an idea",
    "hands clasped then opening toward the camera"
  ];
  const gesto = gestos[seed % gestos.length];
  return `Photorealistic webcam shot of a ${a.sexo}, age ${idade}, ${cabelo}, wearing casual professional clothes, ${gesto}, ${fundo}. Distinct face, natural skin, looking at the camera, mid-explanation. No text, no watermark.`;
}

function promptPerfil(a) {
  return `Photorealistic square headshot of the same ${a.sexo}, age ${a.idade}, ${a.cabelo}, wearing a different shirt, looking at the camera, slight smile, different room from a webcam class, soft office background. No text, no watermark.`;
}

function promptCliente(sexo, nome) {
  const a = aparencia(sexo, nome);
  return `Photorealistic square phone profile photo of a ${a.sexo}, age ${a.idade}, ${a.cabelo}, casual clothes, looking at the camera, slight smile, indoor background. Natural skin, no text. Name context only, do not render text: ${nome}.`;
}

module.exports = { aparencia, gerar, promptAula, promptPerfil, promptCliente, seedHash };
