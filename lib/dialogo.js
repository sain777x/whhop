function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toMin(hhmm) {
  const [h, m] = String(hhmm || "18:00").split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

function fromMin(total) {
  const t = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

function parseDia(dia) {
  const m = String(dia || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return new Date();
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0, 0);
}

function chip(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function parseRaw(rawText) {
  const text = String(rawText || "");
  const grab = (re, fallback = "") => {
    const m = text.match(re);
    return m ? m[1].trim() : fallback;
  };
  return {
    cliente: grab(/CLIENTE:\s*(.+)/i, "Client"),
    valor: grab(/VALOR:\s*(.+)/i, ""),
    apresentador: grab(/APRESENTADOR:\s*(.+)/i, "Host"),
    empresa: grab(/APRESENTADOR:\s*(.+)/i, "Host"),
    produto: grab(/PRODUTO:\s*(.+)/i, "Mentorship"),
    curso: grab(/PRODUTO:\s*(.+)/i, "Mentorship"),
    detalhes: grab(/DETALHES DO PRODUTO:\s*(.+)/i, ""), // ADICIONADO AQUI
    checkout: grab(/link:\s*(https?:\/\/\S+)/i, ""),
    statusPedido: grab(/Status:\s*(.+)/i, "APPROVED"),
    dia: grab(/DIA:\s*(.+)/i, ""),
    horario: grab(/HORARIO:\s*([0-9]{1,2}:[0-9]{2})/i, "18:55"),
    rawText: text
  };
}

function randomMeet() {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  const part = (n) => Array.from({ length: n }, () => letters[rand(0, letters.length - 1)]).join("");
  return `https://meet.google.com/${part(3)}-${part(4)}-${part(3)}`;
}

function firstName(nome) {
  return String(nome || "there").trim().split(/\s+/)[0];
}

function walk(start, count, minGap, maxGap, cap) {
  let t = start;
  const out = [];
  for (let i = 0; i < count; i++) {
    if (cap != null && t > cap) t = cap;
    out.push(t);
    t += rand(minGap, maxGap);
  }
  return out;
}

function buildTimeline(parsed, now = new Date()) {
  const payDay = parseDia(parsed.dia);
  const payMin = toMin(parsed.horario || "18:55");
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sameDay =
    payDay.getFullYear() === now.getFullYear() &&
    payDay.getMonth() === now.getMonth() &&
    payDay.getDate() === now.getDate();

  const capPay = sameDay ? Math.max(payMin, nowMin) : 23 * 60 + 50;

  let firstPay = payMin + rand(5, 15);
  if (firstPay > capPay) firstPay = Math.max(payMin, capPay - 18);
  const payTimes = walk(firstPay, 9, 2, 4, capPay);
  const lastPay = payTimes[payTimes.length - 1];

  let firstMeet = lastPay + rand(3, 12);
  if (firstMeet > capPay) firstMeet = Math.min(capPay, lastPay + 3);
  const meetTimes = walk(firstMeet, 8, 2, 3, capPay);

  const daysBefore = rand(2, 4);
  const interestDay = new Date(payDay);
  interestDay.setDate(interestDay.getDate() - daysBefore);
  if (interestDay.getTime() > now.getTime()) {
    interestDay.setTime(now.getTime() - daysBefore * 86400000);
  }

  const startAsk = rand(10 * 60, 19 * 60);
  const askTimes = walk(startAsk, 12, 2, 5, 22 * 60 + 30);

  return {
    interestChip: chip(interestDay),
    payChip: chip(payDay),
    ask: askTimes.map(fromMin),
    pay: payTimes.map(fromMin),
    meet: meetTimes.map(fromMin),
    statusAsk1: fromMin(askTimes[5]),
    statusAsk2: fromMin(askTimes[7]),
    statusPay: fromMin(payTimes[4]),
    statusMeet: fromMin(meetTimes[4]),
    meetUrl: randomMeet()
  };
}

function hooks(produto) {
  const p = String(produto || "").toLowerCase();
  const bits = [];
  if (/php/.test(p)) bits.push("PHP", "backend in PHP");
  if (/sql|mysql|postgres/.test(p)) bits.push("SQL queries", "database design");
  if (/js|javascript|node/.test(p)) bits.push("JavaScript");
  if (/python/.test(p)) bits.push("Python");
  if (/instagram|social/.test(p)) bits.push("Instagram positioning");
  if (/market/.test(p)) bits.push("sales positioning");
  if (/mentor/.test(p)) bits.push("1:1 live session");
  if (!bits.length) bits.push(produto);
  return bits;
}

function generateDialogue(parsed) {
  const cliente = parsed.cliente;
  const first = firstName(cliente);
  const produto = parsed.produto || parsed.curso;
  const valor = parsed.valor || "the mentorship fee";
  const host = parsed.apresentador || parsed.empresa || "the team";
  const checkout = parsed.checkout;
  const tl = buildTimeline(parsed);
  const meet = tl.meetUrl;
  const topic = pick(hooks(produto));
  // Usa os detalhes (headline) se existirem, senão usa o tópico
  const detalhes = parsed.detalhes || `live 1:1 focused on ${topic}`;

  const openThem = pick([
    `Hi. I found the ${produto} page and wanted to check if it is still open.`,
    `Hello. I am looking at ${produto}. Is this actually live or a recorded pack?`,
    `Hi. I saw ${produto} and I want to understand how the first session works.`,
    `Hey. Quick question about ${produto} — do you still have a seat this week?`
  ]);
  const openMe = pick([
    `Hi ${first}. Yes. It is live 1:1, focused on ${detalhes}. Not a pre-recorded course.`,
    `Hey ${first}, good to hear from you. We do this live on Google Meet and I adapt it to your level. We cover ${detalhes}.`,
    `Hi ${first}. The ${produto} is a live session. We work in real time on ${detalhes}.`
  ]);
  const askLink = pick([
    "Can you send the checkout link?",
    "How do I reserve the spot?",
    "If it is still available, send me the payment link."
  ]);
  const sendLink = pick([
    "Yes. Checkout is here:",
    "You can grab the seat on this link:",
    "Here is the checkout:"
  ]);
  const q1 = pick([
    `I am still weak on ${topic}. Does that work?`,
    "Do I need to already be advanced before the first call?",
    "I am starting from a basic level. Is that a problem?"
  ]);
  const a1 = pick([
    `That works. I start from where you are and we build ${detalhes} live.`,
    "No. I adjust the session. There is no generic pre-recorded track.",
    `It is fine. The point of the 1:1 is to cover ${detalhes} at your current level.`
  ]);
  const q2 = pick([
    "What happens right after I pay?",
    "How fast do I get access after checkout?",
    "Is access instant on Whop?"
  ]);
  const a2 = pick([
    "Whop releases access right after checkout. I confirm and then send the Meet link.",
    "Access unlocks on Whop immediately. After I see the order I send Google Meet.",
    "Yes. After payment I confirm and set up your student profile."
  ]);
  const payIntent = pick([
    valor ? `Perfect. I will complete the ${valor} payment on this link.` : "Perfect. I will pay on this link now.",
    "Okay. I am going to finish checkout.",
    valor ? `Got it. I will pay ${valor} on that checkout.` : "Got it. I will complete checkout now."
  ]);
  const closeAsk = pick([
    "Great. As soon as it confirms I initialize your student profile.",
    "Good. After the order lands I prepare the live session.",
    "Perfect. I will watch for the confirmation and then send Meet."
  ]);
  const paid = pick([
    valor
      ? `Hi. I just completed the ${valor} payment for ${produto}. Status is approved.`
      : `Hi. I just paid for ${produto}. It shows approved.`,
    valor
      ? `Hello. Payment of ${valor} went through for ${produto}.`
      : `Hello. Checkout is done for ${produto}.`
  ]);
  const received = pick([
    `Received, ${first}. Payment confirmed by ${host}. Your student profile is active.`,
    `Got it, ${first}. ${host} confirmed the order and access is on.`,
    `Confirmed, ${first}. ${host} received it. You are in.`
  ]);
  const how = pick([
    "Perfect. How does the session work now?",
    "Great. What are the next steps?",
    "Nice. When do we start the live call?"
  ]);
  const howAns = pick([
    "It is a live 1:1 on Google Meet. I send the link and we work in real time.",
    `We jump on Meet and go through ${detalhes} live. I will send access next.`,
    "Live session on Google Meet. After this I drop the link."
  ]);
  const included = pick([
    "And what exactly is included?",
    "What do I get besides the call?",
    "Is there a recording after the live?"
  ]);
  const includedAns = pick([
    `Live 1:1 focused on ${detalhes}, the recording, extra support on Meet, and a plan for what you do after. No pre-recorded pack.`,
    `The ${produto} includes the live call focusing on ${detalhes}, the recording and follow-up on Meet.`,
    "Live session, full recording and extra help on Meet. Nothing is a canned course."
  ]);
  const joined = pick([
    "Received. I already joined the Meet.",
    "Got the link. I am joining now.",
    "I opened the Meet link."
  ]);
  const live = pick([
    "I am in the session and watching the mentorship live.",
    "I am inside the Meet. The live already started.",
    "I am on the call now."
  ]);
  const firstPayMsg = pick([
    "Is this a group class or one to one?",
    "Do we work on my project or is it only theory?",
    "How long is the first live session?"
  ]);
  const firstPayAns = pick([
    "One to one. We use your case, not a generic slide deck.",
    "It is 1:1 and we apply it to what you are building now.",
    "About a live block on Meet. I keep it practical."
  ]);
  const waitPay = pick([
    "Okay. I will finish checkout and message you here.",
    "All good. I am opening the link now.",
    "Thanks. I will pay and come back on this chat."
  ]);
  const recQ = pick([
    "Will I get the recording after the call?",
    "Can I rewatch the session later?"
  ]);
  const recA = pick([
    "Yes. You get the recording plus the live call.",
    "Yes. The session is recorded so you can review it."
  ]);
  const ready = pick([
    "I am ready when you send Meet.",
    "Send the link whenever it is ready."
  ]);
  const afterLive = pick([
    "Audio is fine. I can see your screen.",
    "I can hear you. Starting with the first part now."
  ]);
  const hostLive = pick([
    `Good. Stay on the call. We start ${detalhes} now.`,
    "Perfect. Keep the Meet open. I am already in the room."
  ]);

  return {
    ...parsed,
    meet,
    status: tl.statusMeet,
    scenes: [
      {
        id: "01-interesse",
        label: "interesse + checkout",
        dateChip: tl.interestChip,
        status: tl.statusAsk1,
        messages: [
          { from: "them", text: openThem, time: tl.ask[0] },
          { from: "me", text: openMe, time: tl.ask[1] },
          { from: "them", text: firstPayMsg, time: tl.ask[2] },
          { from: "me", text: firstPayAns, time: tl.ask[3] },
          { from: "them", text: askLink, time: tl.ask[4] },
          { from: "me", text: sendLink, time: tl.ask[5] },
          { from: "me", time: tl.ask[5], card: "Whop Checkout", url: checkout },
          { from: "them", text: q1, time: tl.ask[6] }
        ]
      },
      {
        id: "02-checkout",
        label: "perguntas",
        dateChip: tl.interestChip,
        status: tl.statusAsk2,
        messages: [
          { from: "me", text: a1, time: tl.ask[6] },
          { from: "them", text: q2, time: tl.ask[7] },
          { from: "me", text: a2, time: tl.ask[8] },
          { from: "them", text: recQ, time: tl.ask[9] },
          { from: "me", text: recA, time: tl.ask[10] },
          { from: "them", text: payIntent, time: tl.ask[11] },
          { from: "me", text: closeAsk, time: fromMin(toMin(tl.ask[11]) + rand(2, 4)) },
          { from: "them", text: waitPay, time: fromMin(toMin(tl.ask[11]) + rand(5, 7)) }
        ]
      },
      {
        id: "03-pagamento",
        label: "pagamento aprovado",
        dateChip: "Today",
        status: tl.statusPay,
        messages: [
          { from: "them", text: paid, time: tl.pay[0] },
          { from: "me", text: received, time: tl.pay[1] },
          { from: "them", text: how, time: tl.pay[2] },
          { from: "me", text: howAns, time: tl.pay[3] },
          { from: "them", text: included, time: tl.pay[4] },
          { from: "me", text: includedAns, time: tl.pay[5] },
          { from: "them", text: ready, time: tl.pay[6] }
        ]
      },
      {
        id: "04-meet",
        label: "Meet + live",
        dateChip: "Today",
        status: tl.statusMeet,
        messages: [
          { from: "me", text: pick(["Here is your Google Meet access:", "Join on this Meet link:"]), time: tl.meet[0] },
          { from: "me", time: tl.meet[0], card: "Google Meet", url: meet, whiteCard: true },
          { from: "them", text: joined, time: tl.meet[1] },
          { from: "me", text: hostLive, time: tl.meet[2] },
          { from: "them", text: live, time: tl.meet[3] },
          { from: "them", text: afterLive, time: tl.meet[4] },
          { from: "me", text: pick(["Stay there. I am sharing the first example now.", "Good. We start with the first block on your screen."]), time: tl.meet[5] },
          { from: "them", text: pick(["Okay. I am following.", "Got it. I am watching."]), time: tl.meet[6] }
        ]
      }
    ]
  };
}

module.exports = {
  parseRaw,
  generateDialogue,
  randomMeet,
  buildTimeline,
  firstName
};