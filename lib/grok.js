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

function dateChipUTC3(dia, horario) {
  const m = String(dia || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "Today";
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  const [h, min] = String(horario || "00:00").split(":").map((x) => parseInt(x, 10) || 0);
  // Input is UTC-3 (Brasil). UTC = local + 3h
  const utcDate = new Date(Date.UTC(year, month, day, h + 3, min));
  // Format as UTC+3 (Etc/GMT-3 = UTC+3)
  return utcDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Etc/GMT-3"
  });
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
  const meet = parsed.meet || tl.meetUrl;
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
      } else if (m.text) {
        const clean = String(m.text).replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
        if (clean) out.text = clean.slice(0, 220);
      }
      return out;
    }).filter((m) => m.text || m.card);

    while (messages.length < 12) {
      const last = messages[messages.length - 1];
      const time = (last && last.time) || parsed.horario || "18:00";
      const from = messages.length % 2 ? "me" : "them";
      const text = from === "me"
        ? "I am here. We keep going."
        : "Okay. I am following.";
      messages.push({ from, time, text });
    }

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
    scenes[0].messages.splice(at, 0, { from: "me", time, card: "Checkout", url: checkout });
  }
  if (scenes[3] && !scenes[3].messages.some((m) => m.card === "Google Meet")) {
    scenes[3].messages.splice(1, 0, {
      from: "me",
      time: (scenes[3].messages[0] && scenes[3].messages[0].time) || parsed.horario,
      card: "Google Meet",
      url: meet
    });
  }
  scenes.forEach((s, i) => s.messages.forEach((m) => {
    if (m.card === "Google Meet") {
      m.from = "me";
      m.url = meet;
      delete m.whiteCard;
    }
    if (m.card === "Whop Checkout" || m.card === "Checkout") {
      m.card = "Checkout";
      m.from = "me";
      m.url = checkout;
    }
  }));
  scenes.forEach((s, i) => {
    if (i < 3) s.messages = s.messages.filter((m) => m.card !== "Google Meet");
  });

  return { ...parsed, meet, status: scenes[3].status, scenes, fonte: "grok" };
}

async function gerarComGrok(parsed, apiKey, tl) {
  const selfPaced = /self-paced|NO live call|NO Meet/i.test(parsed.rawText || "");
  const modeRules = selfPaced ? "\n- DELIVERY IS A SELF-PACED DOWNLOAD PROGRAM: there is NO live call and NO Meet anywhere. Drop every Meet / scheduled-call reference. When the client pays, the host confirms by name and immediately sends the program page link, saying access is unlocked and every module downloads automatically into their account right now; the client opens it and confirms they can see the modules." : "";
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
- English only. Natural WhatsApp, not a script. 8 to 18 words per line.
- from "me" is the HOST, the seller. Green, right.
- from "them" is the CLIENT, the buyer. White, left.
- Never reverse. Host never says it looks perfect for me. Client never pitches the course.
- Do not paste DETAILS as one bubble. Turn it into 2 or 3 short spoken lines.
- Do not paste a raw URL. Cards are added later. Do not send the Meet link before scene 4.
- Keep HOST exactly as given. Use the client first name.
- Scene 1: client shows interest, host explains what is included, sends checkout near the end. 12 messages.
- Scene 2: client asks 3 real questions about the product, host answers, client says they will pay. 12 messages. No Meet link.
- Scene 3: client says they paid, host confirms by name, and says the live session starts RIGHT NOW / in the next minutes. Host will send the Meet link in the next message. NEVER say "tomorrow", "later today", "15 mins before", or "see you then". The session is immediate. 12 messages.
- Scene 4: host immediately sends the Meet link, client joins right away, and they start the live session in the same conversation. Continuous from Scene 3. 12 messages.
- Sound like two people texting. No empty stretch.
- IMPORTANT: Scene 3 and Scene 4 happen on the SAME day, one right after the other. The mentorship session starts at the moment the link is sent.${modeRules}

Example:
them: Hey, is the game mentorship still open?
me: Hi Marie. Yes. It is a live 1:1 on Meet.
them: What do we actually do in the hour?
me: We open your project and I review the code with you.

{"meet":"https://meet.google.com/abc-defg-hij","scenes":[{"messages":[{"from":"them","text":"Is the seat open?","time":"16:10"},{"from":"me","text":"Yes. It is a live 1:1.","time":"16:12"}]},{"messages":[]},{"messages":[]},{"messages":[]}]}`;

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
  let dados = generateDialogue(parsed, tl);
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
  // Status bar follows the HORARIO from the raw prompt (not the current clock)
  const baseMin = (() => {
    const [h, m] = String(parsed.horario || "18:55").split(":").map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
  })();
  const gap = 3 + Math.floor(Math.random() * 5);
  const barMin = baseMin + gap;
  const br = `${String(Math.floor(barMin / 60) % 24).padStart(2, "0")}:${String(barMin % 60).padStart(2, "0")}`;
  dados.statusBar = br;
  dados.battery = String(34 + Math.floor(Math.random() * 58));
  const targetLast = Math.max(0, baseMin);
  const toMin = (hhmm) => {
    const [h, m] = String(hhmm || "00:00").split(":").map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
  };
  const fromMin = (t) => {
    const x = ((t % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  };
  if (dados.scenes) {
    // Treat scenes 3 and 4 (pay day) as one continuous timeline so print 3 always ends before print 4 starts
    const payScenes = dados.scenes.filter((s, idx) => idx >= 2 && s.dateChip === "Today" && s.messages && s.messages.length);
    if (payScenes.length >= 2) {
      const allTimes = [];
      payScenes.forEach(s => s.messages.forEach(m => allTimes.push(toMin(m.time))));
      const curLast = allTimes[allTimes.length - 1];
      const shift = targetLast - curLast;
      payScenes.forEach(s => {
        s.messages.forEach(m => {
          m.time = fromMin(toMin(m.time) + shift);
        });
        s.status = s.messages[s.messages.length - 1].time;
      });
    }
    // Other Today scenes (if any) still get independent shift
    dados.scenes.forEach((s, idx) => {
      if (idx >= 2) return; // already handled
      if (s.dateChip !== "Today" || !s.messages || !s.messages.length) return;
      const times = s.messages.map((m) => toMin(m.time));
      const curLast = times[times.length - 1];
      const shift = targetLast - curLast;
      s.messages.forEach((m, i) => {
        m.time = fromMin(times[i] + shift);
      });
      s.status = s.messages[s.messages.length - 1].time;
    });
  }
  // Prints 3 e 4 (cenas índice 2 e 3) → UTC+3. Input é UTC-3, então +6h.
  const OFFSET_MIN = 6 * 60;
  if (dados.scenes && dados.scenes.length >= 4) {
    const payChipUTC3 = dateChipUTC3(parsed.dia, parsed.horario);
    [2, 3].forEach((idx) => {
      const s = dados.scenes[idx];
      if (!s || !s.messages || !s.messages.length) return;
      s.messages.forEach((m) => {
        if (m.time) m.time = fromMin(toMin(m.time) + OFFSET_MIN);
      });
      const lastMin = toMin(s.messages[s.messages.length - 1].time);
      s.status = fromMin(lastMin + gap);
      s.dateChip = payChipUTC3;
    });
    const newBar = (baseMin + OFFSET_MIN + gap) % 1440;
    dados.statusBar = fromMin(newBar);
  }
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
