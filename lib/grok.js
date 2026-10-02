const { parseRaw, generateDialogue, randomMeet } = require("./dialogo");
const { gerarAvatar } = require("./avatar");
const { gerarCenaMeet } = require("./imagens");

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = process.env.XAI_MODEL || "grok-3-mini";

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

function normalizeScenes(parsed, json) {
  const meet = parsed.meet || json.meet || randomMeet();
  const checkout = parsed.checkout;
  const chip = dateChipFromBR(parsed.dia);
  const scenesIn = Array.isArray(json.scenes) ? json.scenes : [];
  const ids = ["01-interesse", "02-checkout", "03-pagamento", "04-meet"];
  const labels = ["interesse + checkout", "perguntas", "pagamento aprovado", "Meet + live"];

  const scenes = ids.map((id, i) => {
    const src = scenesIn[i] || {};
    const messages = (src.messages || []).map((m) => {
      const from = m.from === "me" || m.type === "right" ? "me" : "them";
      const out = { from, time: m.time || parsed.horario || "18:00" };
      if (m.card && m.url) {
        out.card = m.card;
        out.url = m.url;
        if (String(m.card).toLowerCase().includes("meet")) out.whiteCard = true;
      } else if (m.text) {
        out.text = m.text;
      }
      return out;
    }).filter((m) => m.text || m.card);

    const last = messages[messages.length - 1];
    return {
      id,
      label: src.label || labels[i],
      dateChip: i >= 2 ? "Today" : (src.dateChip || chip),
      status: src.status || (last && last.time) || parsed.horario || "18:55",
      messages
    };
  });

  if (checkout && scenes[0] && !scenes[0].messages.some((m) => m.card === "Whop Checkout")) {
    const at = Math.min(4, scenes[0].messages.length);
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

async function gerarComGrok(parsed, apiKey) {
  const prompt = `Write a new WhatsApp sales chat. Return ONLY JSON.
Facts:
CLIENT: ${parsed.cliente}
HOST: ${parsed.apresentador}
PRODUCT: ${parsed.produto}
DETAILS: ${parsed.detalhes || "live 1:1 mentorship"}
PRICE: ${parsed.valor}
CHECKOUT: ${parsed.checkout}
DATE: ${parsed.dia}
APPROVAL: ${parsed.horario}

Rules:
- English. Short. Different wording and different question order every time.
- Do not reuse stock lines like "student profile is active" or "I am still weak on".
- Use DETAILS in at least two host messages.
- Scene 1: interest, then host sends checkout. 6 to 8 messages.
- Scene 2: new questions, client says they will pay. 6 to 8 messages.
- Scene 3: client paid the exact price, host confirms with the host name. 6 to 7 messages.
- Scene 4: host sends Meet, client is in the live call. 6 to 8 messages.
- No card objects. Links are added later.
- Times increase. Approval scene starts after ${parsed.horario}.

{"meet":"https://meet.google.com/abc-defg-hij","scenes":[{"id":"01-interesse","status":"16:22","messages":[{"from":"them","text":"...","time":"16:10"}]},{"id":"02-checkout","status":"16:40","messages":[]},{"id":"03-pagamento","status":"19:05","messages":[]},{"id":"04-meet","status":"19:20","messages":[]}]}`;

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: MODEL,
      temperature: 1,
      messages: [
        { role: "system", content: "You output only JSON. Every chat must be newly worded." },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`xAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  return normalizeScenes(parsed, extractJson(content));
}

async function montarComIA(body) {
  const raw = body.rawText || body.texto || body.info;
  if (!raw) return body;
  const parsed = parseRaw(raw);
  let dados = generateDialogue(parsed);
  dados.fonte = "local";
  const apiKey = key();
  if (apiKey) {
    try {
      const grok = await gerarComGrok(parsed, apiKey);
      if (grok && Array.isArray(grok.scenes) && grok.scenes.every((s) => s.messages && s.messages.length > 3)) {
        dados = grok;
      }
    } catch (err) {
      dados.fonte = "local-fallback";
      dados.erroGrok = String(err.message || err);
    }
  }
  const av = await gerarAvatar(dados.cliente);
  dados.avatarData = av.avatarData;
  dados.sexo = av.gender;
  if (dados.scenes && dados.scenes[2]) dados.scenes[2].dateChip = "Today";
  if (dados.scenes && dados.scenes[3]) dados.scenes[3].dateChip = "Today";
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
