const fs = require("fs");
const path = require("path");

const BLUE = "#007AFF";

const ICONS = {
  back: `<svg width="13" height="21" viewBox="0 0 13 21" fill="none"><path d="M11.2 1.6L2.2 10.5l9 8.9" stroke="${BLUE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  video: `<svg width="28" height="18" viewBox="0 0 28 18" fill="none"><rect x="1" y="1.4" width="17.2" height="15.2" rx="3.4" stroke="${BLUE}" stroke-width="1.8"/><path d="M19.4 5.6l7.2-3v12.8l-7.2-3V5.6z" stroke="${BLUE}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  phone: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.1 1.7c.45-.45 1.2-.55 1.75-.2l2.4 1.5c.55.35.75 1 .65 1.6l-.4 2.2c-.08.4-.3.75-.65.95L6.4 8.6a10 10 0 0 0 4.5 4.5l1-1.4c.25-.35.65-.55 1.05-.65l2.2-.35c.65-.1 1.3.15 1.65.7l1.5 2.45c.35.55.25 1.3-.2 1.75l-1.4 1.4c-.55.55-1.3.75-2.05.55C8.7 16.7 2.4 10.4 1.5 4.9c-.2-.75.05-1.5.55-2.05L4.1 1.7z" fill="${BLUE}"/></svg>`,
  plus: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3v16M3 11h16" stroke="#1c1c1e" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  sticker: `<svg width="22" height="20" viewBox="0 0 22 20" fill="none"><path d="M4 3.2h10.5a3 3 0 0 1 3 3v5.2c0 .4-.2.8-.5 1.1l-3.4 3.4c-.3.3-.7.5-1.1.5H4A3 3 0 0 1 1 13.2V6.2a3 3 0 0 1 3-3z" stroke="#1c1c1e" stroke-width="1.6"/><path d="M17.2 12.2v.2c0 .9-.4 1.7-1 2.3l-2.7 2.7" stroke="#1c1c1e" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  cam: `<svg width="24" height="20" viewBox="0 0 24 20" fill="none"><rect x="1.2" y="4.2" width="21.6" height="14.2" rx="3.2" stroke="#1c1c1e" stroke-width="1.7"/><circle cx="12" cy="11.3" r="3.6" stroke="#1c1c1e" stroke-width="1.7"/><path d="M8.2 4.2l.8-2h6l.8 2" stroke="#1c1c1e" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  mic: `<svg width="16" height="22" viewBox="0 0 16 22" fill="none"><rect x="5" y="1.2" width="6" height="11.2" rx="3" stroke="#1c1c1e" stroke-width="1.7"/><path d="M2.4 10.2a5.6 5.6 0 0 0 11.2 0M8 16.2v3.4M4.6 19.6h6.8" stroke="#1c1c1e" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  ticks: `<svg class="ticks" width="16" height="11" viewBox="0 0 16 11"><path d="M1.4 6.1l2.7 2.7L9.1 2.5" fill="none" stroke="#34b7f1" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 6.1l2.7 2.7L13.2 2.5" fill="none" stroke="#34b7f1" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cellular: `<svg width="18" height="12" viewBox="0 0 18 12" fill="#111"><rect x="0" y="7.4" width="3" height="4.6" rx=".55"/><rect x="4.8" y="5.2" width="3" height="6.8" rx=".55"/><rect x="9.6" y="2.7" width="3" height="9.3" rx=".55"/><rect x="14.4" y=".2" width="3" height="11.8" rx=".55"/></svg>`,
  wifi: `<svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1.15 4.15c3.85-3.55 9.85-3.55 13.7 0" stroke="#111" stroke-width="1.55" stroke-linecap="round"/><path d="M3.55 6.55c2.45-2.25 6.45-2.25 8.9 0" stroke="#111" stroke-width="1.55" stroke-linecap="round"/><path d="M6.05 8.95c1.15-1 2.75-1 3.9 0" stroke="#111" stroke-width="1.55" stroke-linecap="round"/><circle cx="8" cy="11.15" r=".95" fill="#111"/></svg>`
};

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&" + "amp;";
    if (ch === "<") return "&" + "lt;";
    if (ch === ">") return "&" + "gt;";
    if (ch === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function avatarSrc() {
  const file = path.join(__dirname, "..", "public", "avatar-selena.png");
  if (fs.existsSync(file)) {
    return "data:image/png;base64," + fs.readFileSync(file).toString("base64");
  }
  return "";
}

function linkCard(title, url) {
  if (!url || String(url).length < 8 || !/^https?:\/\//i.test(url)) return "";
  return `<div class="card">
      <div class="card-title">${esc(title)}</div>
      <div class="card-url">${esc(url)}</div>
    </div>`;
}

function bubble(msg) {
  const side = msg.from === "me" ? "out" : "in";
  const ticks = msg.from === "me" ? ICONS.ticks : "";
  const card = msg.card ? linkCard(msg.card, msg.url) : "";
  const text = msg.text ? `<div class="txt">${esc(msg.text)}</div>` : "";
  return `<div class="row ${side}">
      <div class="bubble ${side}${msg.card ? " has-card" : ""}">${card}${text}<span class="meta">${esc(msg.time)}${ticks}</span></div>
    </div>`;
}

function buildScenes(dados) {
  if (Array.isArray(dados.scenes) && dados.scenes.length) return dados.scenes;
  const checkout = dados.checkout;
  const meet = dados.meet;
  const first = String(dados.cliente || "Selena").trim().split(/\s+/)[0];

  return [
    {
      id: "01-interesse",
      label: "26 set · interesse + checkout",
      dateChip: "Saturday, September 26, 2026",
      messages: [
        { from: "them", text: "Hi. I saw the Marketing Mentorship Online Program and I am interested.", time: "11:04" },
        { from: "me", text: `Hi, ${first}. Good to hear from you. The mentorship is delivered live 1:1 on Google Meet.`, time: "11:07" },
        { from: "them", text: "Can you send the checkout link?", time: "11:11" },
        { from: "me", text: "Yes. Checkout is here:", time: "11:12" },
        { from: "me", time: "11:12", card: "Whop Checkout", url: checkout },
        { from: "them", text: "Is it recorded classes or live?", time: "11:16" }
      ]
    },
    {
      id: "02-checkout",
      label: "26 set · perguntas",
      dateChip: "Saturday, September 26, 2026",
      messages: [
        { from: "me", text: "Live. After payment I send the Google Meet link and we do the session in real time. The call is recorded so you can review it later.", time: "11:19" },
        { from: "them", text: "I am starting in marketing. Does that work?", time: "11:23" },
        { from: "me", text: "Yes. Everything is done on Google Meet, personalized to your level. No generic pre-recorded course.", time: "11:27" },
        { from: "them", text: "How fast do I get access after payment?", time: "11:31" },
        { from: "me", text: "Access is released on Whop right after checkout. Then I confirm and send the Meet link.", time: "11:34" },
        { from: "them", text: "Perfect. I will complete the payment on this link.", time: "11:38" },
        { from: "me", text: "Great. As soon as the order is confirmed, I will initialize your student profile.", time: "11:41" }
      ]
    },
    {
      id: "03-pagamento",
      label: "30 set · pagamento",
      dateChip: "Wednesday, September 30, 2026",
      messages: [
        { from: "them", text: "Hi. I just completed the payment for the Marketing Mentorship Online Program.", time: "00:03" },
        { from: "me", text: `Received, ${first}. Your order is confirmed and your student profile is now active.`, time: "00:07" },
        { from: "them", text: "Perfect. How does the session work?", time: "00:10" },
        { from: "me", text: "It is a live 1:1 marketing mentorship on Google Meet. After payment you receive a link and join the session in real time.", time: "00:14" },
        { from: "them", text: "And what exactly is included?", time: "00:17" }
      ]
    },
    {
      id: "04-meet",
      label: "30 set · Meet + live",
      dateChip: "Wednesday, September 30, 2026",
      messages: [
        { from: "me", text: "Live 1:1 session on Google Meet, full recording, additional support on Meet, and a personalized marketing plan. No generic pre-recorded content.", time: "00:19" },
        { from: "me", text: "Here is your Google Meet access:", time: "00:22" },
        { from: "me", time: "00:23", card: "Google Meet", url: meet, whiteCard: true },
        { from: "them", text: "Received. I already joined the Meet.", time: "00:26" },
        { from: "them", text: "I am in the session and watching the mentorship live.", time: "00:28" }
      ]
    }
  ];
}

function initialsOf(name) {
  const parts = String(name || "C").trim().split(/\s+/).filter(Boolean);
  const a = (parts[0] || "C")[0];
  const b = (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] || "L"));
  return (a + b).toUpperCase();
}

function renderHTML(dados, scene) {
  const cliente = dados.cliente || "Client";
  const status = dados.statusBar || scene.status || "19:42";
  const battery = dados.battery || String(40 + Math.floor(Math.random() * 50));
  const usePhoto = dados.usarFoto === true || String(dados.cliente || "").toLowerCase() === "selena hall";
  const photo = dados.avatarData || (usePhoto ? avatarSrc() : "");
  const avatar = photo
    ? `<img class="avatar" src="${photo}" alt="">`
    : `<div class="avatar fallback">${esc(initialsOf(cliente))}</div>`;

  const msgs = scene.messages.slice(0, 10);
  const bubbles = msgs.map((msg) => {
    const side = msg.from === "me" ? "out" : "in";
    const ticks = msg.from === "me" ? ICONS.ticks : "";
    const extraClass = msg.whiteCard ? " white-card" : (msg.card ? " has-card" : "");
    const card = msg.card ? linkCard(msg.card, msg.url) : "";
    const text = msg.text ? `<div class="txt">${esc(msg.text)}</div>` : "";
    return `<div class="row ${side}"><div class="bubble ${side}${extraClass}">${card}${text}<span class="meta">${esc(msg.time)}${ticks}</span></div></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  html, body { width: 393px; height: 852px; background: #fff; }
  body { font-family: Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; }
  .phone { width: 393px; height: 852px; position: relative; overflow: hidden; background: #f6f1e8; }

  .status {
    height: 48px; display: flex; align-items: flex-end; justify-content: space-between;
    padding: 0 22px 8px; background: #f7f7f7;
  }
  .clock { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; color: #111; }
  .sys { display: flex; align-items: center; gap: 5px; }
  .batt {
    height: 13px; min-width: 30px; padding: 0 5px; border-radius: 3px;
    background: #111; color: #fff; font-size: 8.5px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; letter-spacing: .2px;
  }

  .header {
    height: 58px; background: #f7f7f7; border-bottom: 0.5px solid #e5e5ea;
    display: flex; align-items: center; padding: 0 12px 0 8px; gap: 8px;
  }
  .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #c8c8c8; }
  .fallback { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; background: linear-gradient(180deg,#8d95a0,#5f6770); }
  .who { flex: 1; font-size: 17px; font-weight: 600; color: #111; letter-spacing: -0.2px; }
  .actions { display: flex; align-items: center; gap: 14px; }

  .chat {
    position: absolute; top: 106px; left: 0; right: 0; bottom: 90px;
    padding: 0 8px 6px;
    background-color: #efe6da;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><g fill='none' stroke='%23c4b19a' stroke-width='1.05' opacity='.62'><path d='M10 16c5-8 16-6 17 3'/><circle cx='46' cy='18' r='6'/><path d='M68 12l7 11-14 1.5z'/><path d='M92 14c7 1 10 10 5 15'/><rect x='8' y='48' width='13' height='10' rx='1.8'/><path d='M36 54c6 8-2 16-10 10'/><circle cx='62' cy='54' r='4.5'/><path d='M80 46h11l3 6-5 8H80z'/><path d='M14 88c8-1 11 8 5 11'/><path d='M40 84l9 11'/><path d='M62 88c5-7 15-3 13 7'/><circle cx='96' cy='86' r='6'/><path d='M20 30c3 4-2 8-6 4'/><path d='M84 70c4-6 12-2 10 5'/></g></svg>");
    background-size: 120px 120px;
    overflow: hidden;
  }
  .chip {
    position: absolute; top: 8px; left: 0; right: 0;
    text-align: center; z-index: 5; pointer-events: none;
  }
  .chip span {
    display: inline-block; background: #8d8d8d; color: #fff;
    font-size: 12.5px; font-weight: 600; padding: 5px 11px; border-radius: 11px;
  }
  .thread {
    position: absolute; top: 46px; left: 8px; right: 8px; bottom: 6px;
    display: flex; flex-direction: column; justify-content: flex-start; gap: 4px;
    overflow: hidden;
    padding-top: 8px;
  }

  .row { display: flex; width: 100%; }
  .row.in { justify-content: flex-start; }
  .row.out { justify-content: flex-end; }

  .bubble {
    max-width: 82%;
    padding: 7px 9px 5px 10px;
    border-radius: 16px;
    font-size: 15.4px; line-height: 1.28; color: #111;
    box-shadow: 0 1px 0.5px rgba(0,0,0,.08);
  }
  .bubble.in { background: #fff; border-top-left-radius: 5px; }
  .bubble.out { background: #dcf8c6; border-top-right-radius: 5px; }
  .bubble.white-card { background: #fff; border: 0; }

  .txt { padding-right: 2px; }

  .meta {
    display: flex; align-items: center; justify-content: flex-end; gap: 3px;
    float: right; margin: 6px 0 0 10px;
    font-size: 11px; color: #8b8b8b;
  }

  .card {
    background: #f2f2f2; border-radius: 10px; padding: 8px 10px 9px; margin-bottom: 6px; min-width: 230px;
  }
  .out .card { background: #e9f5df; }
  .white-card .card { background: #f3f3f3; }
  .card-title { font-weight: 700; font-size: 15px; margin-bottom: 3px; }
  .card-url { color: #007aff; font-size: 14.2px; line-height: 1.25; word-break: break-all; text-decoration: underline; }

  .composer {
    position: absolute; left: 0; right: 0; bottom: 0; height: 90px;
    background: #f7f7f7; border-top: 0.5px solid #e5e5ea;
    padding: 8px 10px 0;
  }
  .composer-row { display: flex; align-items: center; gap: 9px; }
  .field {
    flex: 1; height: 36px; border: 1.2px solid #c7c7cc; border-radius: 18px;
    display: flex; align-items: center; padding: 0 10px 0 14px; background: #fff;
  }
  .field span { color: #8e8e93; font-size: 16px; flex: 1; }
  .home { width: 128px; height: 5px; background: #111; border-radius: 100px; margin: 16px auto 0; }
</style>
</head>
<body>
  <div class="phone">
    <div class="status">
      <div class="clock">${esc(status)}</div>
      <div class="sys">${ICONS.cellular}${ICONS.wifi}<div class="batt">${esc(String(battery))}%</div></div>
    </div>
    <div class="header">
      <div style="width:22px;display:flex;justify-content:center">${ICONS.back}</div>
      ${avatar}
      <div class="who">${esc(cliente)}</div>
      <div class="actions">${ICONS.video}${ICONS.phone}</div>
    </div>
    <div class="chat">
      <div class="chip"><span>${esc(scene.dateChip || "Today")}</span></div>
      <div class="thread">${bubbles}</div>
    </div>
    <div class="composer">
      <div class="composer-row">
        ${ICONS.plus}
        <div class="field"><span>Message</span>${ICONS.sticker}</div>
        ${ICONS.cam}
        ${ICONS.mic}
      </div>
      <div class="home"></div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildScenes, renderHTML };
