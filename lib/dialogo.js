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

function chip(date, now) {
  const br = now || new Date();
  const fmt = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const todayStr = fmt(br);
  const yest = new Date(br.getTime() - 86400000);
  const yestStr = fmt(yest);
  const dateStr = fmt(date);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yestStr) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function parseRaw(rawText) {
  const text = String(rawText || "");
  const grab = (re, fallback = "") => {
    const m = text.match(re);
    return m ? m[1].trim() : fallback;
  };
  return {
    cliente: grab(/CLIENTE:\s*(.+)/i, "Client"),
    valor: grab(/VALOR:\s*(.+)/i, "the fee"),
    apresentador: grab(/APRESENTADOR:\s*(.+)/i, "Host"),
    empresa: grab(/APRESENTADOR:\s*(.+)/i, "Host"),
    produto: grab(/PRODUTO:\s*(.+)/i, "Mentorship").replace(/^product name\s+/i, ""),
    curso: grab(/PRODUTO:\s*(.+)/i, "Mentorship").replace(/^product name\s+/i, ""),
    detalhes: grab(/DETALHES DO PRODUTO:\s*(.+)/i, ""),
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
  const payTimes = walk(firstPay, 12, 2, 3, capPay);
  const lastPay = payTimes[payTimes.length - 1];

  let firstMeet = lastPay + rand(3, 12);
  if (firstMeet > capPay) firstMeet = Math.min(capPay, lastPay + 3);
  const meetTimes = walk(firstMeet, 12, 1, 3, capPay);

  const daysBefore = rand(2, 4);
  const interestDay = new Date(payDay);
  interestDay.setDate(interestDay.getDate() - daysBefore);
  if (interestDay.getTime() > now.getTime()) {
    interestDay.setTime(now.getTime() - daysBefore * 86400000);
  }

  const startAsk = rand(10 * 60, 19 * 60);
  const askTimes = walk(startAsk, 18, 2, 4, 22 * 60 + 30);

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

function pedaco(texto, produto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t) return produto || "the first lesson";
  const words = t.replace(/[.]/g, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 7).join(" ");
}

function ideias(texto, produto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t || /^(n\/a|na|null|none|-)$/i.test(t)) {
    return [pedaco(produto), "your own project", "the recording"];
  }
  const parts = t.split(/[.;]/).map((s) => pedaco(s, produto)).filter((s) => s.length > 3);
  if (!parts.length) return [pedaco(produto)];
  return parts.slice(0, 3);
}

function generateDialogue(parsed, tlIn) {
  const first = firstName(parsed.cliente);
  const produto = parsed.produto || parsed.curso || "the mentorship";
  const detalheRaw = parsed.detalhes || parsed.headline || "";
  const pedacos = ideias(detalheRaw, produto);
  const detalhe = pedacos[0] || produto;
  const extra1 = pedacos[1] || detalhe;
  const extra2 = pedacos[2] || produto;
  const valor = parsed.valor || "the fee";
  const host = parsed.apresentador || parsed.empresa || "the host";
  const checkout = parsed.checkout;
  const tl = tlIn || buildTimeline(parsed);
  const meet = parsed.meet || tl.meetUrl;
  const topic = detalhe;

  const opens = shuffle([
    [`Hi ${host}. I saw ${produto}. Is the seat still open?`, `Hi ${first}. Yes. It is a live 1:1 on ${produto}.`],
    [`Hello. Is ${produto} a call or a pack of videos?`, `Hey ${first}. It is a live call. We cover ${detalhe}.`],
    [`Hey ${host}. What does the first hour of ${produto} cover?`, `Hi ${first}. We start with ${detalhe} on your own case.`],
    [`Quick one. Do you still take people for ${produto} this week?`, `${first}, yes. The seat for ${produto} is open.`],
    [`Hi. I landed on ${produto} and wanted to check availability.`, `Hi ${first}. It is open. We do ${produto} live.`],
    [`Hello ${host}. Is ${produto} with you personally?`, `Hi ${first}. Yes. It is with me, live 1:1 on ${produto}.`],
    [`Hey. What makes ${produto} different from a course?`, `Hi ${first}. We work on your real case for ${produto}, not slides.`],
    [`Hi ${host}. Is there a waitlist for ${produto}?`, `${first}, no waitlist. You can start ${produto} this week.`],
    [`Hello. Does ${produto} include a review of my work?`, `Hi ${first}. Yes. We review your work live in ${produto}.`],
    [`Hey ${host}. How long is the first call for ${produto}?`, `Hi ${first}. The first call for ${produto} is one focused hour.`],
    [`Hi. Do we work on my own project in ${produto}?`, `Hey ${first}. Yes. We apply ${produto} to your project.`],
    [`Hello ${host}. Is ${produto} for beginners?`, `Hi ${first}. Any level. We start from where you are on ${produto}.`],
    [`Hey. What do I need before ${produto}?`, `Hi ${first}. Just a browser. We cover the setup for ${produto} on the call.`],
    [`Hi ${host}. Is ${produto} one session or more?`, `Hey ${first}. One focused session on ${produto}. You keep the recording.`],
    [`Hello. Does ${produto} cover practical work?`, `Hi ${first}. Yes. We build something real with ${produto}.`],
    [`Hey ${host}. Can I start ${produto} this week?`, `Hi ${first}. Yes. The seat is open for ${produto}.`],
    [`Hi. Is ${produto} recorded or live only?`, `Hey ${first}. It is live. You also get the recording of ${produto}.`],
    [`Hello ${host}. What is included in ${produto}?`, `Hi ${first}. The live call, the recording, and ${detalhe}.`],
    [`Hey. Do you help with specific problems in ${produto}?`, `Hi ${first}. Yes. We work on your specific case in ${produto}.`],
    [`Hi ${host}. Is ${produto} worth it if I am new?`, `Hey ${first}. Yes. We start from your level on ${produto}.`],
    [`Hello. I am considering ${produto}. Can you tell me more?`, `Hi ${first}. It is a live 1:1 where we cover ${detalhe}.`],
    [`Hey ${host}. Is ${produto} a good fit for my level?`, `Hi ${first}. Yes. We adapt ${produto} to where you are.`]
  ]);
  const [openThem, openMe] = opens[0];

  const pairs = shuffle([
    [`I am new to ${produto}. Is that a problem?`, `No. We start from your level and build ${detalhe} on the call.`],
    [`Is ${produto} one person or a group?`, `One person. Your screen, your case on ${produto}.`],
    [`Do we use my own project in ${produto}?`, `Yes. We apply ${extra1} to what you are building.`],
    [`How long is the call for ${produto}?`, `One live block. We stay on ${detalhe}.`],
    [`Will I get the recording of ${produto}?`, `Yes. You keep it and can replay the part on ${extra1}.`],
    [`What happens right after I pay for ${produto}?`, `I see the order, then I send the Meet for ${produto}.`],
    [`Do I need tools before ${produto}?`, `A browser is enough. We open ${detalhe} together.`],
    [`Is there follow-up after ${produto}?`, `Yes. A short plan from the call on ${extra2}.`],
    [`Can we focus on my specific case in ${produto}?`, `Yes. That is the point. We work on your case.`],
    [`What if I get stuck after ${produto}?`, `You have the recording and can message me about ${detalhe}.`],
    [`Do you share your screen in ${produto}?`, `Yes. I show each step of ${detalhe} live.`],
    [`Is ${produto} theory or practice?`, `Practice. We do ${detalhe} on your work.`],
    [`How fast do I get access after paying for ${produto}?`, `Right after checkout. Then I send the Meet.`],
    [`Can I ask questions during ${produto}?`, `Yes. It is 1:1. We pause whenever you need on ${detalhe}.`],
    [`What should I prepare for ${produto}?`, `Just your current work. We start from there on ${detalhe}.`],
    [`Is the call for ${produto} recorded?`, `Yes. You get the full recording of ${produto}.`],
    [`Do we set goals in ${produto}?`, `Yes. We define what to do next on ${detalhe}.`],
    [`Can I apply ${produto} the same day?`, `Yes. You leave with something you can use from ${detalhe}.`],
    [`What makes ${produto} different?`, `It is live, on your case, covering ${detalhe}.`],
    [`Is there a limit on questions in ${produto}?`, `No. We cover what you need on ${detalhe}.`],
    [`Do I need experience for ${produto}?`, `No. We adjust ${produto} to your level.`],
    [`Will you review my work in ${produto}?`, `Yes. We look at your work and apply ${detalhe}.`]
  ]).slice(0, 8);

  const linkAsk = pick([
    "Send the payment link when you can.",
    "Where do I pay to hold the seat for " + produto + "?",
    "Drop the checkout here.",
    "Can you send the link for " + produto + "?",
    "How do I pay?",
    "Send me the checkout.",
    "Where is the payment page?",
    "I am ready. Send the link.",
    "How do I book " + produto + "?",
    "Send the seat link.",
    "Where do I complete the payment?",
    "Can I get the checkout link?",
    "Send it. I will pay now.",
    "How do I secure the seat?",
    "Drop the link for " + produto + ".",
    "I want to pay. Where?",
    "Send the payment page.",
    "How do I join " + produto + "?",
    "Link please.",
    "Where do I check out?",
    "Send the link to hold my spot.",
    "I am ready to pay for " + produto + "."
  ]);
  const linkSend = pick([
    "Checkout is this one:",
    "Pay on this page:",
    "Here is the seat link:",
    "Here is the checkout for " + produto + ":",
    "Use this link:",
    "Payment page:",
    "Here:",
    "This is the link:",
    "Checkout below:",
    "Pay here:",
    "Seat link:",
    "Here is where you pay:",
    "Use this:",
    "The checkout:",
    "Link for " + produto + ":",
    "Pay through this:",
    "Here is the page:",
    "This one:",
    "Checkout link:",
    "Here is your link:",
    "Pay on this:",
    "The seat is here:"
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
    `I send Google Meet next.`,
    `Next message is the Meet.`,
    "Stay in this chat. The room link comes in a minute."
  ]);
  const extra = pick([
    `Besides the call, you get the recording and a follow-up.`,
    `${produto} is the live hour, the recording, and a plan at the end.`,
    `Included: the Meet and the replay.`
  ]);
  const joined = pick([
    "I am in the Meet.",
    "Joined. I can see the room.",
    "Link opened. I am on the call.",
    "I am in. Ready for ${produto}.",
    "Entered the room. I can see you.",
    "I am on the call now.",
    "Joined the Meet. Waiting for you.",
    "I am inside. Screen is up.",
    "Connected. I can hear the room.",
    "I am in the session for ${produto}.",
    "Joined. My camera is ready.",
    "I am on. Let me know when to start.",
    "Entered. I can see the Meet.",
    "I am in. Ready when you are.",
    "Joined the call. Audio is good.",
    "I am inside the room.",
    "Connected to the Meet.",
    "I am on the call. Go ahead.",
    "Joined. I can see the screen.",
    "I am in. Waiting for ${produto} to start.",
    "Entered the Meet. I am ready.",
    "I am on. Let us start ${produto}."
  ]);
  const live = pick([
    "I can hear you. Go ahead.",
    "Screen is up on my side.",
    "I am watching. Start when you want.",
    "I see your screen. Ready.",
    "Audio is clear. Let us begin ${produto}.",
    "I am following. Show me the first step.",
    "I can see it. Go on.",
    "Screen shared. I am watching.",
    "I hear you. Start with ${detalhe}.",
    "I am here. Walk me through it.",
    "Video is on. I can see you.",
    "I am ready. Show the first part of ${produto}.",
    "Screen is good. Continue.",
    "I can see everything. Go ahead.",
    "Audio and video are fine. Start.",
    "I am watching the screen. Begin.",
    "I see it. Let us do ${detalhe}.",
    "I am on. Show me how it works.",
    "Screen is clear. I am following.",
    "I can hear and see. Let us start.",
    "Ready on my side. Go ahead with ${produto}.",
    "I am watching. Take me through ${detalhe}."
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
        status: tl.ask[8],
        messages: [
          { from: "them", text: openThem, time: tl.ask[0] },
          { from: "me", text: openMe, time: tl.ask[1] },
          { from: "them", text: pairs[0][0], time: tl.ask[2] },
          { from: "me", text: pairs[0][1], time: tl.ask[3] },
          { from: "them", text: pairs[1][0], time: tl.ask[4] },
          { from: "me", text: pairs[1][1], time: tl.ask[5] },
          { from: "them", text: linkAsk, time: tl.ask[6] },
          { from: "me", text: linkSend, time: tl.ask[7] },
          { from: "me", time: tl.ask[7], card: "Whop Checkout", url: checkout },
          { from: "them", text: "Opening it now.", time: tl.ask[8] }
        ]
      },
      {
        id: "02-checkout",
        label: "perguntas",
        dateChip: tl.interestChip,
        status: tl.ask[15],
        messages: [
          { from: "them", text: pairs[2][0], time: tl.ask[9] },
          { from: "me", text: pairs[2][1], time: tl.ask[10] },
          { from: "them", text: pairs[3][0], time: tl.ask[11] },
          { from: "me", text: pairs[3][1], time: tl.ask[12] },
          { from: "them", text: pairs[4][0], time: tl.ask[13] },
          { from: "me", text: pairs[4][1], time: tl.ask[14] },
          { from: "them", text: intent, time: tl.ask[15] },
          { from: "me", text: closeAsk, time: tl.ask[16] },
          { from: "them", text: "I will message you here as soon as it clears.", time: tl.ask[17] }
        ]
      },
      {
        id: "03-pagamento",
        label: "pagamento aprovado",
        dateChip: tl.payChip,
        status: tl.statusPay,
        messages: [
          { from: "them", text: paid, time: tl.pay[0] },
          { from: "me", text: received, time: tl.pay[1] },
          { from: "them", text: how, time: tl.pay[2] },
          { from: "me", text: howAns, time: tl.pay[3] },
          { from: "them", text: "What else is in it?", time: tl.pay[4] },
          { from: "me", text: extra, time: tl.pay[5] },
          { from: "them", text: "Do I need to prepare anything?", time: tl.pay[6] },
          { from: "me", text: `Just a browser. We start on ${topic}.`, time: tl.pay[7] },
          { from: "them", text: "Send the room when it is ready.", time: tl.pay[8] },
          { from: "me", text: "Sending it in the next message.", time: tl.pay[9] }
        ]
      },
      {
        id: "04-meet",
        label: "Meet + live",
        dateChip: tl.payChip,
        status: tl.statusMeet,
        messages: [
          { from: "me", text: pick(["Here is the Meet for " + produto + ":", "Join the room for " + produto + ":", "Room link for the session:", "Here is your access to " + produto + ":", "Meet link below:", "Join here for the live session:", "This is the room for " + produto + ":", "Open this Meet:", "Your session link:", "Click to join " + produto + ":", "The call is here:", "Enter through this link:", "Meet for " + produto + " is ready:", "Join now:", "Here is the live room:", "Access link for the session:", "Open the Meet below:", "Your 1:1 room:", "Session link for " + produto + ":", "Join the call here:", "The room is open:", "Here is where we do " + produto + ":"]), time: tl.meet[0] },
          { from: "me", time: tl.meet[0], card: "Google Meet", url: meet },
          { from: "them", text: joined, time: tl.meet[1] },
          { from: "me", text: pick(["Good. We open with " + detalhe + ".", "Perfect. Let us start on " + detalhe + ".", "Great. First we cover " + detalhe + ".", "Ok. We begin with " + produto + ".", "Right. Opening with " + detalhe + ".", "Good. Starting on " + detalhe + " now.", "Let us go. First block is " + detalhe + ".", "Ok. We do " + detalhe + " first.", "Perfect. " + detalhe + " is up first.", "Good. We start the live part on " + produto + ".", "Right. " + detalhe + " on your screen.", "Ok. Let us walk through " + detalhe + ".", "Good. First step of " + produto + ".", "Perfect. We open your case on " + detalhe + ".", "Great. Starting the session on " + produto + ".", "Ok. " + detalhe + " is the first block.", "Good. Let us do " + detalhe + " live.", "Right. Opening " + produto + " now.", "Perfect. We begin on your work.", "Good. First part is " + detalhe + ".", "Ok. Let us start the practical part.", "Great. " + produto + " begins now."]), time: tl.meet[2] },
          { from: "them", text: live, time: tl.meet[3] },
          { from: "me", text: pick(["Stay on this. First example of " + detalhe + " is on screen.", "Watch this part. It is the base of " + produto + ".", "Follow here. This is how " + detalhe + " starts.", "Look at the screen. First step of " + produto + ".", "Stay with me. This block is " + detalhe + ".", "On screen now: the opening of " + produto + ".", "Watch. This is the first move in " + detalhe + ".", "Follow this. It sets up " + produto + ".", "Screen shows the start of " + detalhe + ".", "Stay here. We build " + detalhe + " from this.", "Look. First example for " + produto + ".", "On your screen: step one of " + detalhe + ".", "Watch this. It is core to " + produto + ".", "Follow along. This is " + detalhe + " in practice.", "Screen is on the first part of " + produto + ".", "Stay. We open " + detalhe + " here.", "Look at this. It is the start of " + produto + ".", "Follow. First block of " + detalhe + ".", "On screen: how " + produto + " begins.", "Watch here. This is " + detalhe + ".", "Stay on the screen. Step one.", "Look. We start " + produto + " from here."]), time: tl.meet[4] },
          { from: "them", text: pick(["I see it.", "Got it. I am watching.", "I can see the screen.", "Following.", "I see the first step.", "On it.", "I see what you mean.", "Watching.", "I can see it clearly.", "Got the screen.", "I see the example.", "Following along.", "I see it now.", "Screen is clear.", "I am looking.", "I see the block.", "Got it on my side.", "I can see the step.", "Watching the screen.", "I see. Go on.", "Got it.", "I am on the same screen."]), time: tl.meet[5] },
          { from: "me", text: pick(["Now do this step on your side.", "Try this part yourself.", "Apply this to your work.", "Do the same on your screen.", "Your turn. Try " + detalhe + ".", "Repeat this step.", "Now you do it.", "Apply " + detalhe + " here.", "Go ahead and try.", "Do this block.", "Your move. Same step.", "Try it on your case.", "Now apply it.", "Do the first step.", "Your turn on " + produto + ".", "Try this. Tell me when done.", "Apply it now.", "Do it on your screen.", "Go. Same move.", "Your turn. " + detalhe + ".", "Try the step.", "Do this and confirm."]), time: tl.meet[6] },
          { from: "them", text: pick(["Done. I am on the same screen.", "Finished that step.", "I did it. Same result.", "Done on my side.", "Applied. It worked.", "I got the same screen.", "Step is done.", "I did it. Ready for next.", "Finished. It matches.", "Done. What is next?", "I applied it.", "Got it done.", "Same result here.", "I did the step.", "Finished that part.", "Done. It looks right.", "I am through that step.", "Applied it. Ready.", "Done here.", "I finished. Next?", "Got the same.", "Step complete."]), time: tl.meet[7] },
          { from: "me", text: pick(["Good. Next block of " + produto + " is up.", "Right. Moving to the next part of " + detalhe + ".", "Ok. Second step of " + produto + " now.", "Good. Next piece of " + detalhe + ".", "Perfect. We go to the next block.", "Right. Next part of " + produto + ".", "Ok. Continuing with " + detalhe + ".", "Good. Second block is on screen.", "Next step of " + produto + " now.", "Right. We move on in " + detalhe + ".", "Ok. Next part.", "Good. Following block of " + produto + ".", "Next. This is still " + detalhe + ".", "Right. Second step.", "Ok. We continue " + produto + ".", "Good. Next block.", "Moving on. Next part of " + detalhe + ".", "Right. Next screen.", "Ok. Second piece of " + produto + ".", "Good. We keep going on " + detalhe + ".", "Next block is up.", "Right. Continuing."]), time: tl.meet[8] },
          { from: "them", text: pick(["Got it. I am following.", "I see the next part.", "Following.", "I am on it.", "Got the next block.", "I see it. Continue.", "Following along.", "I am with you.", "Got it. Next.", "I see. Go on.", "Following the next step.", "I am here.", "Got the screen.", "I see the next one.", "With you.", "I am following the block.", "Got it.", "I see. Ready.", "Following now.", "I am on the next part.", "Got it. Continue.", "I see it."]), time: tl.meet[9] }
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
