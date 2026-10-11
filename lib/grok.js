const { parseRaw, generateDialogue, randomMeet, buildTimeline } = require("./dialogo");
const { gerarAvatar } = require("./avatar");
const { gerarCenaMeet } = require("./imagens");

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = process.env.XAI_MODEL || "grok-4.20-non-reasoning";
const MODELS = [MODEL, "grok-4.20-non-reasoning", "grok-4.3"].filter((m, i, a) => a.indexOf(m) === i);

async function chat(apiKey, messages, temperature) {
  let last = "sem resposta";
  for (const model of MODELS) {
    const res = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ model, temperature, messages })
    });
    if (res.ok) return res.json();
    last = `xAI ${res.status} ${model}: ${(await res.text()).slice(0, 180)}`;
    if (res.status !== 400 && res.status !== 404) break;
  }
  throw new Error(last);
}

function key() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

function extractJson(text) {
  const clean = String(text || "").replace(/```json/g, "").replace(/```/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Grok não devolveu JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

function dateChipFromBR(dia) {
  if (!dia) return "Today";
  const m = String(dia).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "Today";
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0, 0);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function parecePortugues(texto) {
  return /[áàâãéêíóôõúç]/i.test(texto) || /\b(para|com|do|da|de|você|aula|aulas|aprenda|básico|avançado)\b/i.test(texto);
}

async function paraIngles(texto, apiKey) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t || !parecePortugues(t) || !apiKey) return t;
  try {
    const data = await chat(apiKey, [
      { role: "system", content: "Translate to natural English. Keep the meaning. No quotes. No markdown." },
      { role: "user", content: t }
    ], 0.4);
    const out = data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || "").replace(/["`]/g, "").trim()
      : "";
    return out && out.length > 8 ? out : t;
  } catch (_) {
    return t;
  }
}
function semDetalhe(v) {
  return !v || /^(n\/a|na|null|none|-|—)$/i.test(String(v).trim());
}

function detalheLocal(produto) {
  const p = String(produto || "the mentorship");
  const opts = [
    `a live 1:1 that walks you through ${p} from the first step, with your own example on screen`,
    `a practical session on ${p}: we set up the tools, do one real case, and leave you with a repeatable method`,
    `hands-on coaching for ${p}, starting from zero and ending with something you can use the same day`,
    `a private Meet where we cover ${p} step by step, no recorded pack, only what applies to you`
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

async function gerarDetalhes(produto, apiKey) {
  const local = detalheLocal(produto);
  if (!apiKey) return local;
  try {
    const data = await chat(apiKey, [
      { role: "system", content: "You write one short product description. No quotes. No markdown." },
      { role: "user", content: `Product name: ${produto}\nWrite one new English sentence, max 22 words, describing what a live 1:1 mentorship on this product includes. Be specific to the product name. Do not say N/A.` }
    ], 1);
    const text = data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || "").replace(/["`]/g, "").trim()
      : "";
    return text && text.length > 12 ? text : local;
  } catch (_) {
    return local;
  }
}

function normalizeScenes(parsed, json, tl) {
  const meet = parsed.meet || json.meet || randomMeet();
  const checkout = parsed.checkout;
  const payChip = tl.payChip;
  const interestChip = tl.interestChip;
  const scenesIn = Array.isArray(json.scenes) ? json.scenes : [];
  const ids = ["01-interesse", "02-checkout", "03-pagamento", "04-meet"];
  const labels = ["interesse + checkout", "perguntas", "pagamento aprovado", "Meet + live"];
  const times = [tl.ask, tl.ask, tl.pay, tl.meet];

  const scenes = ids.map((id, i) => {
    const src = scenesIn[i] || {};
    const clock = times[i] || [];
    const messages = (src.messages || []).map((m, j) => {
      const from = m.from === "me" || m.type === "right" ? "me" : "them";
      const out = { from, time: clock[j] || m.time || parsed.horario || "18:00" };
      if (m.card && m.url) {
        out.card = m.card;
        out.url = m.url;
        if (String(m.card).toLowerCase().includes("meet")) out.whiteCard = true;
      } else if (m.text) {
        out.text = String(m.text).slice(0, 220);
      }
      return out;
    }).filter((m) => m.text || m.card);

    const last = messages[messages.length - 1];
    return {
      id,
      label: labels[i],
      dateChip: i >= 2 ? payChip : interestChip,
      status: (last && last.time) || parsed.horario || "18:55",
      messages
    };
  });

  if (checkout && scenes[0] && !scenes[0].messages.some((m) => m.card === "Whop Checkout")) {
    const at = Math.min(6, scenes[0].messages.length);
    const time = (scenes[0].messages[at - 1] && scenes[0].messages[at - 1].time) || parsed.horario;
    scenes[0].messages.splice(at, 0, { from: "me", time, card: "Whop Checkout", url: checkout });
  }
  if (scenes[3] && !scenes[3].messages.some((m) => m.card === "Google Meet")) {
    scenes[3].messages.splice(1, 0, {
      from: "me",
      time: (scenes[3].messages[0] && scenes[3].messages[0].time) || parsed.horario,
      card: "Google Meet",
      url: meet,
      whiteCard: true
    });
  }
  scenes.forEach((s) => s.messages.forEach((m) => {
    if (m.card === "Google Meet") m.url = meet;
    if (m.card === "Whop Checkout") m.url = checkout;
  }));

  return { ...parsed, meet, status: scenes[3].status, scenes, fonte: "grok" };
}

async function gerarComGrok(parsed, apiKey, tl) {
  const prompt = `Write a new WhatsApp sales chat from this raw order. Return ONLY JSON.

RAW:
${parsed.rawText || ""}

CLIENT: ${parsed.cliente}
HOST: ${parsed.apresentador}
PRODUCT: ${parsed.produto}
DETAILS: ${parsed.detalhes}
PRICE: ${parsed.valor}
CHECKOUT: ${parsed.checkout}
PAY DAY: ${parsed.dia}
PAY TIME: ${parsed.horario}

Rules:
- English only. Max 16 words per line.
- DETAILS is already given. Use it. Do not invent another description.
- Do not paste a raw URL. The checkout and Meet cards are added later.
- Keep HOST exactly as given. Do not split or rewrite the host name.
- Host messages are from the presenter. Client messages are from the buyer.
- Scene 1 interest: 7 messages. Host sends the checkout near the end.
- Scene 2 questions: 7 messages. Client says they will pay the exact price.
- Scene 3 payment approved: 7 messages. Client paid. Host confirms with the host name.
- Scene 4 Meet live: 7 messages. Host sends the Meet. Client is already in the call.
- Short lines. The date chip must stay above the first bubble, never over it.
- No card objects. Links are inserted later.
- Do not write dates. Only message text and times.

{"meet":"https://meet.google.com/abc-defg-hij","scenes":[{"messages":[{"from":"them","text":"...","time":"16:10"}]},{"messages":[]},{"messages":[]},{"messages":[]}]}`;

  const data = await chat(apiKey, [
    { role: "system", content: "You output only JSON. The whole chat is newly written from the raw order. English only." },
    { role: "user", content: prompt }
  ], 1);
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  return normalizeScenes(parsed, extractJson(content), tl);
}

async function montarComIA(body) {
  const raw = body.rawText || body.texto || body.info;
  if (!raw) return body;
  const parsed = parseRaw(raw);
  const apiKey = key();
  if (semDetalhe(parsed.detalhes)) {
    try {
      parsed.detalhes = await gerarDetalhes(parsed.produto, apiKey);
    } catch (_) {
      parsed.detalhes = detalheLocal(parsed.produto);
    }
    parsed.headline = parsed.detalhes;
  }
  try {
    parsed.detalhes = await paraIngles(parsed.detalhes, apiKey);
  } catch (_) {}
  parsed.headline = parsed.detalhes;
  const tl = buildTimeline(parsed);
  parsed.meet = tl.meetUrl;
  let dados = generateDialogue(parsed);
  dados.fonte = "local";
  if (apiKey) {
    try {
      const grok = await gerarComGrok(parsed, apiKey, tl);
      if (grok && Array.isArray(grok.scenes) && grok.scenes.every((s) => s.messages && s.messages.length > 5)) {
        dados = grok;
      } else {
        dados.fonte = "local-fallback";
        dados.erroGrok = "IA devolveu cena curta";
      }
    } catch (err) {
      dados.fonte = "local-fallback";
      dados.erroGrok = String(err.message || err);
    }
  } else {
    dados.erroGrok = "XAI_API_KEY ausente";
  }
  const av = await gerarAvatar(dados.cliente);
  dados.avatarData = av.avatarData;
  dados.sexo = av.gender;
  if (dados.scenes && dados.scenes[0]) dados.scenes[0].dateChip = tl.interestChip;
  if (dados.scenes && dados.scenes[1]) dados.scenes[1].dateChip = tl.interestChip;
  if (dados.scenes && dados.scenes[2]) dados.scenes[2].dateChip = tl.payChip;
  if (dados.scenes && dados.scenes[3]) dados.scenes[3].dateChip = tl.payChip;
  const now = new Date();
  dados.statusBar = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  dados.battery = String(34 + Math.floor(Math.random() * 58));
  try {
    const cena = await gerarCenaMeet(dados);
    dados.meetVideo = cena.video;
    dados.hostAvatar = cena.hostAvatar;
  } catch (err) {
    dados.erroImagem = String(err.message || err);
  }
  return dados;
}

module.exports = { montarComIA, gerarComGrok };
