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
  const idades = [29, 33, 36, 39, 43, 46, 49, 53, 56, 31, 41, 51];
  const idade = idades[seed % idades.length];
  const cabelosF = [
    "blonde hair in a loose bun",
    "long wavy brown hair",
    "short red hair",
    "black hair in a low ponytail",
    "curly dark hair",
    "light brown hair with side part",
    "silver-streaked hair",
    "dark hair in a messy bun",
    "strawberry blonde shoulder-length hair",
    "chestnut hair with soft waves",
    "platinum short hair",
    "auburn hair tied half-up",
    "jet black hair with bangs",
    "honey blonde hair in a braid",
    "ash brown hair in a low twist",
    "dark brown hair with highlights",
    "copper hair in a top knot",
    "black hair with a side braid",
    "light auburn hair loose",
    "medium brown hair in a claw clip",
    "dirty blonde hair with layers",
    "espresso hair in a sleek bun",
    "warm brown hair with curls",
    "black hair with a half ponytail",
    "caramel highlights on dark hair",
    "short pixie cut dark hair",
    "long straight black hair",
    "wavy chestnut hair",
    "blonde hair with darker roots",
    "dark hair with a low side bun",
    "light brown hair in a French twist",
    "red hair with soft waves",
    "black hair in a high bun",
    "ash blonde shoulder-length hair",
    "brown hair with a middle part",
    "curly light brown hair",
    "straight dark brown hair",
    "blonde hair in a side braid",
    "black hair with loose curls",
    "medium length red hair",
    "brown hair in a low ponytail",
    "dark hair with a twisted bun",
    "light brown hair with waves",
    "black hair with a side part",
    "auburn hair in a messy bun",
    "blonde hair with a low ponytail",
    "dark brown hair with layers",
    "short brown hair with texture",
    "long black hair with highlights",
    "wavy red hair",
    "brown hair in a half-up style",
    "black hair with a low bun",
    "light brown hair with bangs",
    "dark hair with a side twist",
    "blonde hair in a high ponytail",
    "chestnut hair with a side part",
    "black hair with soft waves",
    "medium brown hair in a bun",
    "red hair in a low ponytail",
    "dark brown hair with a middle part",
    "blonde hair with a twisted bun",
    "black hair with layers",
    "light brown hair in a side bun",
    "curly black hair",
    "straight blonde hair",
    "wavy dark hair",
    "brown hair with a low twist",
    "black hair with a French braid",
    "auburn hair with layers",
    "blonde hair with a claw clip",
    "dark hair with a high ponytail",
    "light brown hair with a bun",
    "black hair with a side ponytail",
    "brown hair with soft curls",
    "red hair with a side part",
    "dark brown hair in a twist",
    "blonde hair with a low bun",
    "black hair with a half-up style",
    "light brown hair with a ponytail",
    "curly brown hair",
    "straight black hair with bangs",
    "wavy blonde hair",
    "brown hair with a high bun",
    "black hair with a low side part",
    "auburn hair with a bun",
    "dark hair with a side braid",
    "blonde hair with layers",
    "black hair with a twisted ponytail",
    "light brown hair with a high bun",
    "red hair with a low bun",
    "dark brown hair with a side part",
    "blonde hair with a messy bun",
    "black hair with soft layers",
    "brown hair with a French twist",
    "dark hair with a low ponytail",
    "light brown hair with curls",
    "black hair with a side bun",
    "auburn hair with a ponytail",
    "blonde hair with a middle part",
    "dark brown hair with a bun",
    "black hair with a half braid",
    "light brown hair with a twist",
  ];
  const cabelosM = [
    "bald head",
    "short gray hair",
    "dark hair with gray temples",
    "short brown hair",
    "light brown buzz cut",
    "salt and pepper hair",
    "short black hair",
    "receding hairline with short sides",
    "short dark hair with fade",
    "medium length brown hair",
    "short blond hair",
    "gray hair with short sides",
    "black hair with a short cut",
    "brown hair with a side part",
    "short dark hair with texture",
    "light brown hair with short sides",
    "black hair with a fade",
    "gray hair with a short cut",
    "brown hair with short sides",
    "dark hair with a short buzz",
    "short black hair with fade",
    "light brown hair with a side part",
    "gray hair with short texture",
    "brown hair with a short cut",
    "black hair with short sides",
    "dark brown hair with fade",
    "short gray hair with texture",
    "brown hair with a buzz cut",
    "black hair with a short side part",
    "light brown hair with short texture",
    "gray hair with a fade",
    "dark hair with short sides",
    "brown hair with short texture",
    "black hair with a medium cut",
    "short dark hair with side part",
    "gray hair with short sides",
    "brown hair with a fade",
    "black hair with short texture",
    "light brown hair with a buzz",
    "dark hair with a short side part",
    "brown hair with short fade",
    "black hair with a short buzz",
    "gray hair with a short buzz",
    "dark brown hair with short sides",
    "black hair with medium length",
    "brown hair with a short side part",
    "light brown hair with fade",
    "gray hair with medium length",
    "dark hair with short texture",
    "brown hair with a medium cut",
    "black hair with a fade cut",
    "short gray hair with fade",
    "dark hair with a medium cut",
    "brown hair with short buzz",
    "black hair with short fade",
    "light brown hair with medium length",
    "gray hair with short fade",
    "dark brown hair with short texture",
    "black hair with a short medium cut",
    "brown hair with a short fade",
    "dark hair with medium sides",
    "gray hair with a short side part",
    "black hair with short medium length",
    "brown hair with medium sides",
    "dark hair with a short medium cut",
    "light brown hair with short fade",
    "black hair with medium texture",
    "brown hair with short medium length",
    "gray hair with medium sides",
    "dark hair with short medium length",
    "black hair with a medium side part",
    "brown hair with medium texture",
    "dark hair with medium texture",
    "light brown hair with medium sides",
    "gray hair with short medium length",
    "black hair with medium fade",
    "brown hair with a medium side part",
    "dark hair with short medium texture",
    "black hair with medium sides",
    "brown hair with short medium sides",
    "gray hair with medium texture",
    "dark hair with medium side part",
    "black hair with short medium sides",
    "brown hair with medium fade",
    "dark hair with short medium sides",
    "light brown hair with medium texture",
    "gray hair with medium side part",
    "black hair with medium short cut",
    "brown hair with short medium texture",
    "dark hair with medium short cut",
    "black hair with medium short sides",
    "brown hair with medium short cut",
    "gray hair with medium short cut",
    "dark hair with medium short sides",
    "black hair with medium short texture",
    "brown hair with medium short sides",
    "dark hair with medium short texture",
    "short dark hair with slight wave",
    "medium brown hair with short sides",
    "black hair with a short textured cut",
    "gray hair with a medium fade",
  ];
  const cabelo = sexo === "female" ? cabelosF[seed % cabelosF.length] : cabelosM[seed % cabelosM.length];
  const fundos = [
    "home office with bookshelf and window light",
    "bright kitchen with plants",
    "neutral living room with sofa",
    "small studio with white wall and desk lamp",
    "office with soft daylight",
    "cozy room with wooden shelves",
    "minimalist room with plain wall and plant",
    "workspace with monitor slightly blurred",
    "bedroom with soft lamp light",
    "dining area with wooden table",
    "study with books and warm light",
    "living room with large window",
    "small office with white desk",
    "room with plants and natural light",
    "workspace with laptop and lamp",
    "kitchen with morning light",
    "bedroom with neutral walls",
    "study with wooden desk",
    "living room with sofa and lamp",
    "office with glass and daylight",
    "room with bookshelf and plant",
    "workspace with soft lamp",
    "kitchen with plants and window",
    "bedroom with warm lighting",
    "study with books and lamp",
    "living room with window light",
    "office with white walls",
    "room with wooden shelves",
    "workspace with natural light",
    "kitchen with soft daylight",
    "bedroom with plant and lamp",
    "study with warm lamp light",
    "living room with neutral tones",
    "office with bookshelf",
    "room with desk and plant",
    "workspace with window light",
    "kitchen with wooden cabinets",
    "bedroom with soft daylight",
    "study with plant and books",
    "living room with lamp light",
    "office with desk lamp",
    "room with white walls and plant",
    "workspace with warm light",
    "kitchen with window and plant",
    "bedroom with neutral lamp",
    "study with soft lighting",
    "living room with bookshelf",
    "office with natural light",
    "room with wooden desk",
    "workspace with soft daylight",
    "kitchen with morning window",
    "bedroom with warm lamp",
    "study with books and plant",
    "living room with soft light",
    "office with white desk",
    "room with plant and lamp",
    "workspace with lamp light",
    "kitchen with soft window",
    "bedroom with daylight",
    "study with warm light",
    "living room with plant",
    "office with bookshelf and lamp",
    "room with neutral walls",
    "workspace with plant",
    "kitchen with wooden table",
    "bedroom with soft plant",
    "study with lamp and books",
    "living room with window",
    "office with soft lamp",
    "room with desk lamp",
    "workspace with bookshelf",
    "kitchen with daylight",
    "bedroom with warm light",
    "study with plant light",
    "living room with soft lamp",
    "office with window light",
    "room with wooden plant",
    "workspace with soft plant",
    "kitchen with lamp light",
    "bedroom with bookshelf",
    "study with daylight",
    "living room with desk",
    "office with plant",
    "room with warm lamp",
    "workspace with wooden shelf",
    "kitchen with soft plant",
    "bedroom with window light",
    "study with soft plant",
    "living room with wooden shelf",
    "office with warm light",
    "room with soft daylight",
    "workspace with lamp and plant",
    "kitchen with wooden light",
    "bedroom with plant light",
    "study with window lamp",
    "living room with soft plant",
    "office with wooden desk",
    "room with lamp and plant",
    "workspace with warm lamp",
    "kitchen with plant light",
    "bedroom with soft shelf",
    "study with wooden light",
    "living room with lamp plant",
    "office with soft plant",
    "room with daylight lamp",
  ];
  const fundo = fundos[seed % fundos.length];
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
  const gesto = gestos[seed % gestos.length];
  return `Photorealistic webcam shot of a ${a.sexo}, age ${idade}, ${cabelo}, wearing casual professional clothes, ${gesto}, ${fundo}. Distinct face, natural skin, looking at the camera, mid-explanation. No text, no watermark.`;
}

module.exports = { aparencia, gerar, promptAula, promptPerfil, promptCliente, seedHash };
