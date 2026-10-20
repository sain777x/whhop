function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&" + "amp;";
    if (ch === "<") return "&" + "lt;";
    if (ch === ">") return "&" + "gt;";
    if (ch === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function meetCode(url) {
  const m = String(url || "").match(/meet\.google\.com\/([a-z0-9-]+)/i);
  return m ? m[1] : "abc-defg-hij";
}

function initial(name) {
  return String(name || "H").trim()[0].toUpperCase();
}

async function subtitle(produto, detalhes) {
  const p = String(produto || "this topic").replace(/1:1|1-1|one-on-one/gi, "").trim();
  const d = String(detalhes || "").slice(0, 120);
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  if (apiKey) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: "grok-3-mini",
          temperature: 1,
          messages: [
            { role: "system", content: "Write one short spoken caption for a live coaching call. Max 14 words. Natural, as if the coach is explaining mid-session. No quotes. No 1:1. No product name repeated." },
            { role: "user", content: `Topic: ${p}. Context: ${d}. Write the caption.` }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
        const clean = text.replace(/["`]/g, "").trim();
        if (clean.length > 8 && clean.length < 90) return clean;
      }
    } catch (_) {}
  }
  const opts = [
    "so the key here is keeping it consistent every day",
    "what most people miss is the daily practice",
    "let me show you how this applies to your situation",
    "the first step is understanding where you are right now",
    "we start by looking at your current routine",
    "this is where most people get stuck",
    "the difference is doing it with feedback",
    "you already know the theory, now we make it practical",
    "let's break this down into something you can use today",
    "the goal is to leave with one clear next step",
    "what works is keeping it simple and repeatable",
    "so before we go further, tell me your biggest challenge",
    "this part is about building the habit, not the perfect plan",
    "most clients see the shift once they stop overthinking it",
    "we're going to map this to your actual schedule",
    "the mistake is trying to change everything at once",
    "start with one small win and build from there",
    "this only works if you track it for a few weeks",
    "let me walk you through what a good week looks like",
    "the hard part is not knowing, it's doing it when it's busy"
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

function svgBars() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaed"><rect x="3.5" y="13" width="3.2" height="7" rx="1"/><rect x="10.4" y="8" width="3.2" height="12" rx="1"/><rect x="17.3" y="4" width="3.2" height="16" rx="1"/></svg>`;
}
function svgMic() {
  return `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#fff" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm-7.2-3.2a.9.9 0 0 0-1.8.2 7 7 0 0 0 6.3 6.7V20H8.1a.9.9 0 1 0 0 1.8h7.8a.9.9 0 1 0 0-1.8h-1.2v-2.3a7 7 0 0 0 6.3-6.7.9.9 0 0 0-1.8-.2 5.2 5.2 0 0 1-10.4 0z"/><path stroke="#fff" stroke-width="2.2" stroke-linecap="round" d="M4.2 4.2l15.6 15.6"/></svg>`;
}
function svgCam() {
  return `<svg width="24" height="18" viewBox="0 0 24 18"><rect x="1.2" y="3.2" width="14.6" height="11.6" rx="2.2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M16.4 7.1l5.2-2.6v9.2l-5.2-2.6V7.1z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.4 2.6l19 13.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function svgCaret() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#e8eaed" stroke-width="1.8" stroke-linecap="round"><path d="M2.2 4.2L6 8l3.8-3.8"/></svg>`;
}
function svgLaptop() {
  return `<svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="#e8eaed" stroke-width="1.8"><rect x="4" y="2.2" width="16" height="10.2" rx="1.6"/><path d="M2 15.4h20" stroke-linecap="round"/></svg>`;
}
function svgEmoji() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8eaed" stroke-width="1.8"><circle cx="12" cy="12" r="8.2"/><circle cx="9" cy="10" r="1.1" fill="#e8eaed" stroke="none"/><circle cx="15" cy="10" r="1.1" fill="#e8eaed" stroke="none"/><path d="M8.4 14.2c1.1 1.4 2.4 2.1 3.6 2.1s2.5-.7 3.6-2.1" stroke-linecap="round"/></svg>`;
}
function svgCc() {
  return `<svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="#e8eaed" stroke-width="1.7"><rect x="1.2" y="1.6" width="21.6" height="12.8" rx="2"/><path d="M7.2 5.3c-1.3 0-2.2.9-2.2 2.7s.9 2.7 2.2 2.7M13.8 5.3c-1.3 0-2.2.9-2.2 2.7s.9 2.7 2.2 2.7"/></svg>`;
}
function svgMore() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8eaed"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>`;
}
function svgPhone() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20.4 15.2c-1.3-.6-2.6-1-3.3-.3l-1.2 1.2c-2.6-1.2-4.8-3.4-6-6l1.2-1.2c.7-.7.3-2-.3-3.3L9.4 3.4C8.7 2 7.2 2.1 6.6 2.6L4.8 4.4C4 5.2 3.6 6.3 3.8 7.6c.6 4.3 3.4 8.4 7.2 11.2 3.2 2.4 6.8 3.6 9.4 3.6 1.2 0 2.2-.4 2.9-1.2l1.8-1.8c.5-.6.6-2.1-.8-2.8l-3.9-1.4z" transform="rotate(-135 12 12)"/></svg>`;
}
function svgChat() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8eaed" stroke-width="1.8"><path d="M5 5.2h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3.2V6.2a1 1 0 0 1 1-1z"/></svg>`;
}
function svgPeople() {
  return `<svg width="22" height="18" viewBox="0 0 24 18" fill="#e8eaed"><circle cx="8.2" cy="5.2" r="2.6"/><circle cx="16.2" cy="6" r="2.1"/><path d="M1.8 16.2c.6-3.2 3.4-5 6.4-5 3 0 5.8 1.8 6.4 5"/><path d="M14.2 16.2c.4-1.8 1.7-3.1 3.5-3.4 1.7.4 2.9 1.7 3.3 3.4"/></svg>`;
}
function svgFull() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8eaed" stroke-width="1.8" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
}

async function renderMeetHTML(dados) {
  const host = dados.apresentador || dados.empresa || "host";
  const cliente = dados.cliente || "Client";
  const code = meetCode(dados.meet);
  const clock = dados.statusBar || "19:42";
  const video = dados.meetVideo || "";
  const hostPic = "";  // não usa avatar do apresentador
  const clientPic = dados.avatarData || "";
  const cap = await subtitle(dados.produto || dados.curso, dados.detalhes || dados.headline);
  const hostFace = hostPic
    ? `<img src="${hostPic}" alt="">`
    : `<span>${esc(initial(host))}</span>`;
  const clientFace = clientPic
    ? `<img src="${clientPic}" alt="">`
    : `<span>${esc(initial(cliente))}</span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1600px; height: 900px; background: #202124; font-family: "Segoe UI", Arial, sans-serif; color: #e8eaed; }
  .meet { width: 1600px; height: 900px; position: relative; overflow: hidden; background: #202124; }
  .top {
    height: 36px; display: flex; align-items: center; justify-content: space-between;
    padding: 0 14px; background: #202124; font-size: 13px;
  }
  .top-left { display: flex; align-items: center; gap: 10px; color: #e8eaed; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #9aa0a6; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: #9aa0a6; }
  .top-right { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #dadce0; }
  .pill { width: 10px; height: 10px; border-radius: 50%; background: #1e8e3e; }
  .stage { position: absolute; top: 36px; left: 0; right: 268px; bottom: 88px; background: #000; }
  .stage img.video { width: 100%; height: 100%; object-fit: cover; object-position: center 18%; display: block; }
  .host-tag {
    position: absolute; left: 12px; bottom: 14px;
    background: rgba(32,33,36,.82); color: #fff; font-size: 12px;
    padding: 4px 8px; border-radius: 4px;
  }
  .caption {
    position: absolute; left: 50%; bottom: 52px; transform: translateX(-50%);
    max-width: 72%; background: rgba(0,0,0,.72); color: #fff;
    font-size: 22px; line-height: 1.25; font-weight: 600;
    padding: 8px 14px; text-align: center;
  }
  .side {
    position: absolute; top: 36px; right: 0; width: 268px; bottom: 88px;
    background: #202124; padding: 10px 10px 16px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .tile {
    background: #3c4043; border-radius: 8px; min-height: 148px;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .tile.self { flex: 1; min-height: 220px; border: 2px solid #3ddc84; }
  .tile.remote { flex: 1; min-height: 148px; }
  .face { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; background: #1a73e8; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; overflow: hidden; }
  .face img { width: 100%; height: 100%; object-fit: cover; }
  .face.host { background: #1e8e3e; }
  .tile-name {
    position: absolute; left: 8px; bottom: 8px; font-size: 12px; color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,.6);
  }
  .dock {
    position: absolute; left: 0; right: 0; bottom: 0; height: 88px;
    background: #202124; display: flex; align-items: center; justify-content: center;
    padding: 0 28px;
  }
  .dock-center { display: flex; align-items: center; gap: 14px; }
  .dock-right { position: absolute; right: 28px; display: flex; align-items: center; gap: 12px; }
  .btn {
    width: 52px; height: 52px; border-radius: 50%; background: #3c4043;
    display: flex; align-items: center; justify-content: center; color: #e8eaed;
  }
  .btn svg { display: block; }
  .btn.red { background: #ea4335; }
  .btn.tiny { width: 30px; height: 30px; }
  .sep { width: 1px; height: 32px; background: #5f6368; margin: 0 8px; }
</style>
</head>
<body>
  <div class="meet">
    <div class="top">
      <div class="top-left">${esc(clock)} <span>|</span> ${esc(code)} <span class="dot">i</span></div>
      <div class="top-right"><span class="pill"></span> ${esc(host)} (Presenting) &nbsp; 2</div>
    </div>
    <div class="stage">
      ${video && video.length > 40 ? `<img class="video" src="${video}" alt="">` : ""}
      <div class="host-tag">${esc(host)} &nbsp; Presenting</div>
      <div class="caption">${esc(cap)}</div>
    </div>
    <div class="side">
      <div class="tile self">
        <div class="face host">${hostFace}</div>
        <div class="tile-name">${esc(host)}</div>
      </div>
      <div class="tile remote">
        <div class="face">${clientFace}</div>
        <div class="tile-name">${esc(cliente)}</div>
      </div>
    </div>
    <div class="dock">
      <div class="dock-center">
        <div class="btn">${svgBars()}</div>
        <div class="btn red">${svgMic()}</div>
        <div class="btn red">${svgCam()}</div>
        <div class="btn tiny">${svgCaret()}</div>
        <div class="sep"></div>
        <div class="btn">${svgLaptop()}</div>
        <div class="btn">${svgEmoji()}</div>
        <div class="btn">${svgCc()}</div>
        <div class="btn">${svgMore()}</div>
        <div class="sep"></div>
        <div class="btn red">${svgPhone()}</div>
      </div>
      <div class="dock-right">
        <div class="btn">${svgChat()}</div>
        <div class="btn">${svgPeople()}</div>
        <div class="btn">${svgFull()}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderMeetHTML, meetCode };
