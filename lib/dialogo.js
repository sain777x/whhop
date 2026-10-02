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
    headline: grab(/HEADLINE:\s*(.+)/i, ""),
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

function hooks(produto, headline) {
  const p = `${produto || ""} ${headline || ""}`.toLowerCase();
  const bits = [];
  if (headline) bits.push(headline.replace(/\.$/, ""));
  if (/php/.test(p)) bits.push("PHP", "backend in PHP");
  if (/sql|mysql|postgres/.test(p)) bits.push("SQL queries", "database design");
  if (/js|javascript|node/.test(p)) bits.push("JavaScript");
  if (/python/.test(p)) bits.push("Python");
  if (/instagram|social/.test(p)) bits.push("Instagram positioning");
  if (/market/.test(p)) bits.push("sales positioning");
  if (/mentor|guidance|one-on-one|1:1/.test(p)) bits.push("1:1 live session");
  if (!bits.length) bits.push(produto);
  return bits;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function generateDialogue(parsed) {
  const first = firstName(parsed.cliente);
  const produto = parsed.produto || parsed.curso || "the mentorship";
  const detalhe = parsed.detalhes || parsed.headline || pick(hooks(produto, parsed.headline));
  const valor = parsed.valor || "the fee";
  const host = parsed.apresentador || parsed.empresa || "the host";
  const checkout = parsed.checkout;
  const tl = buildTimeline(parsed);
  const meet = tl.meetUrl;
  const topic = pick(hooks(produto, detalhe));

  const opens = shuffle([
    [`Hi. I landed on ${produto} and wanted to ask if the seat is still open.`, `Hi ${first}. It is open. We do it live, and the first block is ${detalhe}.`],
    [`Hello. Is ${produto} a call with the mentor or a pack of videos?`, `Hey ${first}. It is a live call. ${detalhe}.`],
    [`Hey. I saw ${produto}. Can you tell me what the first hour covers?`, `Hi ${first}. The first hour is practical: ${detalhe}.`],
    [`Quick one on ${produto}. Do you still take new people this week?`, `${first}, yes. I keep the group small and we work on ${topic}.`]
  ]);
  const [openThem, openMe] = opens[0];

  const pairs = shuffle([
    [`I am new to ${topic}. Is that a problem?`, `No. I start from your current level and we build ${topic} on the call.`],
    [`Is this one person or a group room?`, `One person. Your screen, your case, not a slide for everyone.`],
    [`Do we use my own project?`, `Yes. Bring what you are building and we apply ${detalhe} to it.`],
    [`How long is the first call?`, `One live block on Meet. I keep it on ${topic}, not a tour of theory.`],
    [`Will I get the recording?`, `Yes. You keep the recording and can replay the part on ${topic}.`],
    [`What happens the minute I pay?`, `Whop unlocks it, I see the order under ${host}, then I send Meet.`],
    [`Do I need any tool installed before?`, `Nothing special. A browser is enough. We open ${topic} together.`],
    [`Is there homework after?`, `A short plan from the call. The main work is live, on ${detalhe}.`]
  ]).slice(0, 3);

  const linkAsk = pick([
    "Send the payment link when you can.",
    "Where do I pay to hold the seat?",
    "Drop the checkout here and I will open it."
  ]);
  const linkSend = pick([
    "Checkout is this one:",
    "Pay on this page:",
    "Here is the seat link:"
  ]);
  const intent = pick([
    `I will pay the ${valor} on that page.`,
    `Opening it now. The amount I see is ${valor}.`,
    `Ok. I am completing ${valor} on that checkout.`
  ]);
  const closeAsk = pick([
    `I will watch for it and message you as ${host}.`,
    "Once it clears I send the Meet.",
    "I will confirm here as soon as the order shows."
  ]);
  const paid = pick([
    `Paid. ${valor} for ${produto} just cleared.`,
    `Done. ${valor} went through for ${produto}.`,
    `Checkout finished. ${valor} on ${produto} is approved.`
  ]);
  const received = pick([
    `Seen, ${first}. ${host} has the order.`,
    `${first}, it landed. ${host} confirmed ${valor}.`,
    `Got the payment, ${first}. ${host} is marking you in.`
  ]);
  const how = pick([
    "What do I do now?",
    "When do we get on the call?",
    "Do I wait for a link from you?"
  ]);
  const howAns = pick([
    `I send Google Meet next and we start on ${topic}.`,
    `Next message is the Meet. We go straight into ${detalhe}.`,
    "Stay in this chat. The room link comes in a minute."
  ]);
  const extra = pick([
    `Besides the call, you get the recording and a follow-up on ${topic}.`,
    `${produto} is the live hour, the recording, and the plan we write at the end.`,
    `Included: the Meet, the replay, and the part on ${detalhe}.`
  ]);
  const joined = pick([
    "I am in the Meet.",
    "Joined. I can see the room.",
    "Link opened. I am on the call."
  ]);
  const live = pick([
    "I can hear you. Go ahead.",
    "Screen is up on my side.",
    "I am watching. Start when you want."
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
        status: tl.ask[6],
        messages: [
          { from: "them", text: openThem, time: tl.ask[0] },
          { from: "me", text: openMe, time: tl.ask[1] },
          { from: "them", text: pairs[0][0], time: tl.ask[2] },
          { from: "me", text: pairs[0][1], time: tl.ask[3] },
          { from: "them", text: linkAsk, time: tl.ask[4] },
          { from: "me", text: linkSend, time: tl.ask[5] },
          { from: "me", time: tl.ask[5], card: "Whop Checkout", url: checkout },
          { from: "them", text: pairs[1][0], time: tl.ask[6] }
        ]
      },
      {
        id: "02-checkout",
        label: "perguntas",
        dateChip: tl.interestChip,
        status: tl.ask[11],
        messages: [
          { from: "me", text: pairs[1][1], time: tl.ask[7] },
          { from: "them", text: pairs[2][0], time: tl.ask[8] },
          { from: "me", text: pairs[2][1], time: tl.ask[9] },
          { from: "them", text: intent, time: tl.ask[10] },
          { from: "me", text: closeAsk, time: tl.ask[11] }
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
          { from: "them", text: "What else is in it?", time: tl.pay[4] },
          { from: "me", text: extra, time: tl.pay[5] },
          { from: "them", text: "Send the room when it is ready.", time: tl.pay[6] }
        ]
      },
      {
        id: "04-meet",
        label: "Meet + live",
        dateChip: "Today",
        status: tl.statusMeet,
        messages: [
          { from: "me", text: pick(["Room link:", "Join here:"]), time: tl.meet[0] },
          { from: "me", time: tl.meet[0], card: "Google Meet", url: meet, whiteCard: true },
          { from: "them", text: joined, time: tl.meet[1] },
          { from: "me", text: `Good. We open with ${topic}.`, time: tl.meet[2] },
          { from: "them", text: live, time: tl.meet[3] },
          { from: "me", text: `Stay on this. First example of ${detalhe} is on the screen.`, time: tl.meet[4] },
          { from: "them", text: "I see it.", time: tl.meet[5] }
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
