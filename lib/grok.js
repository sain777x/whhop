const { parseRaw, generateDialogue, randomMeet } = require("./dialogo");
const { gerarAvatar } = require("./avatar");
const { gerarCenaMeet } = require("./imagens");

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = process.env.XAI_MODEL || "grok-beta";
const XAI_API_KEY =
  process.env.XAI_API_KEY ||
  process.env.GROK_API_KEY ||
  "xai-5KvcBaHl9QAKEkD60S6mhEKmGaaXvRoNcG4w47LBaOyDbeqlnalyksUy4XwQsLFEOtyvBscZo4cGWChg";

function extractJson(text) {
  const clean = String(text || "").replace(/```json/g, "").replace(/```/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Grok não devolveu JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

// Função dateChipFromBR que estava faltando no original
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
      const out = { from, time: m.time || "18:00" };
      if (m.card && m.url) {
        out.card = m.card;
        out.url = m.url;
        if (String(m.card).toLowerCase().includes("meet")) out.whiteCard = true;
      } else if (m.link) {
        const isMeet = String(m.link).includes("meet.google");
        out.card = isMeet ? "Google Meet" : "Whop Checkout";
        out.url = m.link;
        if (isMeet) out.whiteCard = true;
        if (m.text) out.text = m.text;
      } else if (m.text) {
        out.text = m.text;
      }
      return out;
    });
    const last = messages[messages.length - 1];
    return {
      id,
      label: src.label || labels[i],
      dateChip: src.dateChip || chip,
      status: src.status || (last && last.time) || parsed.horario || "18:55",
      messages
    };
  });

  const hasCheckout = scenes.some((s) => s.messages.some((m) => m.card === "Whop Checkout"));
  if (!hasCheckout && checkout && scenes[0]) {
    scenes[0].messages.splice(Math.min(4, scenes[0].messages.length), 0, {
      from: "me",
      time: scenes[0].messages[3] ? scenes[0].messages[3].time : parsed.horario,
      card: "Whop Checkout",
      url: checkout
    });
  }
  const hasMeet = scenes.some((s) => s.messages.some((m) => m.card === "Google Meet"));
  if (!hasMeet && scenes[3]) {
    scenes[3].messages.splice(1, 0, {
      from: "me",
      time: scenes[3].messages[0] ? scenes[3].messages[0].time : parsed.horario,
      card: "Google Meet",
      url: meet,
      whiteCard: true
    });
  } else {
    scenes.forEach((s) => s.messages.forEach((m) => {
      if (m.card === "Google Meet") m.url = meet;
    }));
  }

  return {
    ...parsed,
    meet,
    status: scenes[3].status,
    scenes,
    fonte: "grok"
  };
}

async function gerarComGrok(parsed, apiKey) {
  const prompt = `You generate realistic WhatsApp sales chats for a live 1:1 mentorship.
Return ONLY valid JSON, no markdown.

Use these facts:
CLIENT: ${parsed.cliente}
HOST/PRESENTER: ${parsed.apresentador}
PRODUCT: ${parsed.produto}
PRODUCT DETAILS (Headline): ${parsed.detalhes || "Not provided"}
PRICE: ${parsed.valor}
CHECKOUT: ${parsed.checkout}
DATE: ${parsed.dia}
APPROVAL TIME: ${parsed.horario}
PAYMENT STATUS: ${parsed.statusPedido}

Rules:
- English, natural, short messages. Never copy a previous run word for word.
- Incoming messages (them) never mention blue ticks.
- Host confirms payment using the presenter name.
- Client mentions the exact price on the approval message.
- The host MUST use the PRODUCT DETAILS (Headline) to explain the benefits of the program in Scene 1 or 2.
- Scene 1 afternoon-ish before approval: interest + request link + host sends checkout.
- Scene 2 continues questions, client says they will pay.
- Scene 3 starts at APPROVAL TIME: client paid, host confirms, what is included.
- Scene 4: host sends Google Meet, client joined and is watching live.
- Times must increase. Status bar time = last visible message time on that screen.
- Include a Meet URL in JSON field "meet" like https://meet.google.com/xxx-yyyy-zzz (invent a new one).

JSON shape:
{
  "meet": "https://meet.google.com/abc-defg-hij",
  "scenes": [
    {"id":"01-interesse","dateChip":"Wednesday, September 30, 2026","status":"16:22","messages":[
      {"from":"them","text":"...","time":"16:10"},
      {"from":"me","text":"...","time":"16:13"},
      {"from":"them","text":"...","time":"16:16"},
      {"from":"me","text":"Yes. Checkout is here:","time":"16:19"},
      {"from":"me","card":"Whop Checkout","url":"${parsed.checkout}","time":"16:19"},
      {"from":"them","text":"...","time":"16:22"}
    ]},
    {"id":"02-checkout","dateChip":"Wednesday, September 30, 2026","status":"16:34","messages":[]},
    {"id":"03-pagamento","dateChip":"Wednesday, September 30, 2026","status":"19:07","messages":[]},
    {"id":"04-meet","dateChip":"Wednesday, September 30, 2026","status":"19:18","messages":[
      {"from":"me","text":"...","time":"19:10"},
      {"from":"me","text":"Here is your Google Meet access:","time":"19:13"},
      {"from":"me","card":"Google Meet","url":"https://meet.google.com/abc-defg-hij","time":"19:13"},
      {"from":"them","text":"...","time":"19:16"},
      {"from":"them","text":"...","time":"19:18"}
    ]}
  ]
}`;

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      messages: [
        { role: "system", content: "You output only JSON for WhatsApp mock conversation scenes." },
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
  const key = XAI_API_KEY;
  if (key) {
    try {
      const grok = await gerarComGrok(parsed, key);
      if (grok && Array.isArray(grok.scenes)) {
        dados.scenes.forEach((scene, i) => {
          const gs = grok.scenes[i];
          if (!gs || !gs.messages) return;
          scene.messages.forEach((msg, j) => {
            const gm = gs.messages[j];
            if (gm && gm.text && !msg.card) msg.text = gm.text;
          });
        });
        dados.fonte = "grok";
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