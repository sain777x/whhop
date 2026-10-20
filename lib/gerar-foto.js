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

function pool(n, fn) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(fn(i));
  return out;
}

const ETNIAS = [
  "East Asian", "Southeast Asian", "South Asian", "Black West African", "Black East African",
  "Black Caribbean", "White Northern European", "White Southern European", "White Eastern European",
  "Latino", "Mexican", "Brazilian", "Colombian", "Afro-Latino", "Middle Eastern", "North African",
  "Persian", "Arab", "Turkish", "Jewish", "Indian", "Pakistani", "Sri Lankan", "Korean", "Japanese",
  "Chinese", "Vietnamese", "Thai", "Filipino", "Indonesian", "Pacific Islander", "Indigenous American",
  "Central Asian", "Scandinavian", "Irish", "Greek", "mixed East Asian and White", "mixed Black and White",
  "mixed Latino and East Asian", "Ethiopian"
];
const FORMATOS = ["oval", "round", "square", "long", "heart-shaped", "diamond", "oblong", "rectangular", "soft triangular", "wide"];
const OLHOS = ["dark brown", "light brown", "hazel", "green", "blue-gray", "deep-set brown", "almond brown", "wide-set hazel", "hooded dark", "pale blue"];
const DETALHES = [
  "high cheekbones", "soft cheeks", "a strong brow", "freckles across the nose", "a broad nose",
  "a narrow nose", "full lips", "a defined jaw", "a soft jaw", "a wide forehead", "a short forehead",
  "visible smile lines", "a smooth youthful face", "a mature lined face", "asymmetric eyebrows"
];

function rostos(sexo) {
  const out = [];
  for (const etnia of ETNIAS) {
    for (const formato of FORMATOS) {
      for (const olhos of OLHOS) {
        const detalhe = DETALHES[out.length % DETALHES.length];
        out.push(`${sexo} of ${etnia} ancestry, ${formato} face, ${olhos} eyes, ${detalhe}`);
        if (out.length >= 120) return out;
      }
    }
  }
  return out;
}

const IDADES = pool(100, (i) => {
  const age = 22 + (i % 50);
  return i < 50 ? `${age}-year-old` : `${age}-year-old with the face of someone that exact age`;
});

const CORES_ROUPA = [
  "navy", "charcoal", "black", "white", "cream", "beige", "olive", "forest green", "burgundy", "rust",
  "mustard", "slate blue", "light blue", "heather gray", "warm brown", "camel", "teal", "maroon", "sand", "wine",
  "indigo", "khaki", "soft pink", "lavender", "coral", "denim blue", "chocolate", "ivory", "sage", "copper",
  "stone", "brick red", "midnight blue", "oatmeal", "taupe"
];
const PECAS_F = [
  "blouse", "knit top", "blazer over a tee", "cardigan", "silk shirt", "turtleneck", "linen shirt",
  "crewneck sweater", "button-down shirt", "wrap top", "polo shirt", "denim shirt", "quarter-zip",
  "tailored vest over a shirt", "ribbed top", "cashmere sweater", "utility shirt", "sleeveless knit under a jacket",
  "oxford shirt with rolled sleeves", "chore jacket over a tee"
];
const PECAS_M = [
  "oxford button-down", "polo shirt", "henley", "crewneck sweater", "blazer over a tee", "linen shirt",
  "quarter-zip", "cardigan", "flannel shirt", "turtleneck", "v-neck sweater", "rolled-sleeve shirt",
  "overshirt", "knit polo", "chambray shirt", "denim shirt", "bomber over a tee", "shawl-collar sweater",
  "rugby shirt", "work shirt"
];
const ROUPAS_F = pool(120, (i) => `${CORES_ROUPA[i % CORES_ROUPA.length]} ${PECAS_F[i % PECAS_F.length]}`);
const ROUPAS_M = pool(120, (i) => `${CORES_ROUPA[(i * 3) % CORES_ROUPA.length]} ${PECAS_M[i % PECAS_M.length]}`);

const CORES_CABELO = ["jet black", "dark brown", "medium brown", "light brown", "auburn", "copper", "honey blonde", "ash blonde", "platinum", "gray", "salt-and-pepper", "chestnut", "espresso", "dirty blonde", "warm black", "caramel", "red", "silver", "black with gray", "strawberry blonde"];
const ESTILOS_F = ["long and straight", "long waves", "a shoulder-length bob", "a short pixie", "a low bun", "a high ponytail", "a braid over one shoulder", "loose curls", "slicked-back hair", "a half-up style", "bangs", "a claw clip", "a French twist", "layers with a side part", "a middle part", "a short afro", "shoulder-length twists", "locs pulled back", "a wavy bob", "hair tucked behind one ear"];
const ESTILOS_M = ["a buzz cut", "a skin fade", "a short crop", "medium length swept back", "a receding hairline", "completely bald", "a short afro", "tight curls", "a side part", "textured short hair", "a mullet-free medium cut", "gray temples", "a widow's peak", "thinning crown", "locs cut short", "waves", "a crew cut", "long hair tied back", "a messy short cut", "shaved sides"];
const CABELOS_F = pool(120, (i) => `${CORES_CABELO[i % CORES_CABELO.length]} hair in ${ESTILOS_F[i % ESTILOS_F.length]}`);
const CABELOS_M = pool(120, (i) => `${CORES_CABELO[(i * 5) % CORES_CABELO.length]} hair, ${ESTILOS_M[i % ESTILOS_M.length]}`);

const BARBA_ESTILO = ["clean-shaven", "light stubble", "heavy stubble", "a short boxed beard", "a full beard", "a goatee", "a mustache only", "a circle beard", "a trimmed long beard", "a patchy short beard", "a five-o'clock shadow", "a neat corporate beard", "a soul patch", "mutton-chop stubble", "a thin beard along the jaw"];
const BARBA_COR = ["black", "dark brown", "brown", "auburn", "blond", "gray", "salt-and-pepper", "white", "reddish"];
const BARBA_QTD = ["thin", "medium", "thick"];
const BARBAS = pool(120, (i) => {
  const estilo = BARBA_ESTILO[i % BARBA_ESTILO.length];
  if (estilo === "clean-shaven") return "clean-shaven, no beard";
  return `${estilo}, ${BARBA_QTD[i % BARBA_QTD.length]} and ${BARBA_COR[i % BARBA_COR.length]}`;
});

const SALAS = ["home office", "kitchen", "living room", "bedroom", "study", "dining nook", "spare room", "sunroom", "loft corner", "small studio", "apartment office", "enclosed porch", "library corner", "hallway nook", "converted garage studio"];
const LUZES = ["cool daylight from the left", "a warm lamp on the right", "overcast window light", "late afternoon sun", "bright morning light", "a dim evening lamp", "mixed lamp and window light", "soft north light", "hard side window light", "blue-hour lamp light"];
const OBJETOS = ["a monstera", "a full bookshelf", "a plain painted wall", "one framed picture", "wooden shelves", "a white desk", "the edge of a sofa", "window blinds", "a ceramic lamp", "a cork board", "a brick wall", "linen curtains", "a plant on a stool", "open shelves", "a muted rug"];
const FUNDOS = pool(120, (i) => `${SALAS[i % SALAS.length]} with ${LUZES[(i * 3) % LUZES.length]} and ${OBJETOS[(i * 7) % OBJETOS.length]}`);

const GESTOS = pool(120, (i) => {
  const atos = [
    "right index finger raised",
    "left palm open toward the camera",
    "both hands counting on fingers",
    "right hand pointing off to the side",
    "chin resting on the left hand",
    "holding a pen in the right hand",
    "holding a ceramic mug",
    "adjusting glasses with one hand",
    "hands low and mostly out of frame",
    "one fist resting on the desk",
    "both hands framing a small shape",
    "right hand sweeping sideways",
    "fingers pinched as if showing a detail",
    "palms pressed together",
    "one hand in the hair",
    "leaning on one elbow",
    "holding a closed notebook",
    "pointing at a laptop below the frame",
    "hands clasped on the table",
    "one shoulder closer to the camera, other hand explaining",
    "both palms up at different heights",
    "right hand chopping the air",
    "left hand drawing a circle",
    "hands spread wide then stopping",
    "one hand on the chest, the other extended"
  ];
  const modos = [
    "leaning forward", "sitting back", "in a tight webcam crop", "in a slightly wider frame",
    "with elbows on the desk", "turned a few degrees then looking into the lens"
  ];
  return `${atos[i % atos.length]}, ${modos[i % modos.length]}`;
});

function escolha(arr, seed, salt) {
  return arr[seedHash(String(seed) + ":" + salt) % arr.length];
}

function ficha(sexo, nome, papel) {
  const fem = sexo === "female";
  const base = String(nome || "person") + "|" + (fem ? "f" : "m") + "|" + papel;
  return {
    rosto: escolha(fem ? rostos("woman") : rostos("man"), base, "rosto"),
    idade: escolha(IDADES, base, "idade"),
    cabelo: escolha(fem ? CABELOS_F : CABELOS_M, base, "cabelo"),
    barba: fem ? "no facial hair" : escolha(BARBAS, base, "barba"),
    roupa: escolha(fem ? ROUPAS_F : ROUPAS_M, base, "roupa"),
    fundo: escolha(FUNDOS, base, "fundo"),
    gesto: escolha(GESTOS, base, "gesto")
  };
}

function promptAula(sexo, nome, produto) {
  const a = ficha(sexo, nome, "aula");
  return [
    "Photorealistic laptop webcam frame, 3:2, of one specific real person.",
    `${a.rosto}, ${a.idade}.`,
    `Hair: ${a.cabelo}. Facial hair: ${a.barba}.`,
    `Clothes: wearing ${a.roupa}. The garment color must be obvious and must not default to a navy shirt.`,
    `Gesture: ${a.gesto}, mid-sentence, looking into the webcam.`,
    `Background: ${a.fundo}.`,
    "Follow every trait exactly. Do not reuse a generic coach face. Natural skin texture, no beauty filter, no text, no watermark, no logo.",
    produto ? `Topic context only, do not render text: ${String(produto).slice(0, 80)}.` : ""
  ].filter(Boolean).join(" ");
}

function promptCliente(gender, nome) {
  const a = ficha(gender, nome, "cliente");
  return [
    "Photorealistic square phone profile photo, close crop of the head and shoulders, of one specific real person.",
    `${a.rosto}, ${a.idade}.`,
    `Hair: ${a.cabelo}. Facial hair: ${a.barba}.`,
    `Wearing ${a.roupa}.`,
    `Background softly blurred: ${a.fundo}.`,
    "Slight natural smile, looking at the phone camera. Unique face, not a stock model, no text, no watermark.",
    nome ? `Name context only, do not render text: ${nome}.` : ""
  ].filter(Boolean).join(" ");
}

function promptPerfil(gender, nome) {
  return promptCliente(gender, nome);
}

module.exports = { aparencia, gerar, promptAula, promptPerfil, promptCliente, seedHash, ficha };
