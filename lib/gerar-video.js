const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const XAI_VIDEO = "https://api.x.ai/v1/videos/generations";
const MODEL = process.env.XAI_VIDEO_MODEL || "grok-imagine-video-1.5-lite";

function key() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function legendasIA(produto, detalhes, cliente, host) {
  const apiKey = key();
  const p = String(produto || "the session").slice(0, 60);
  const d = String(detalhes || "").slice(0, 150);
  const c = String(cliente || "the client").split(/\s+/)[0];
  const h = String(host || "the host").split(/\s+/)[0];
  if (!apiKey) {
    return [
      `Live 1:1 on ${p.slice(0, 30)}`,
      `${h} walks ${c} through the first step`,
      `We open your own example on Meet`,
      `You keep the recording after`,
      `Questions answered live`
    ];
  }
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: "Return ONLY a JSON array of 5 short subtitle lines. No markdown." },
          { role: "user", content: `Write 5 short spoken subtitle lines (max 8 words each) for a live Google Meet teaching session. Host: ${h}. Client: ${c}. Product: ${p}. Details: ${d}. Lines should sound like the host explaining the session live. English only.` }
        ],
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error("chat fail");
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
    const arr = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (Array.isArray(arr) && arr.length >= 4) return arr.slice(0, 5).map((s) => String(s).slice(0, 50));
  } catch (_) {}
  return [
    `Live 1:1 on ${p.slice(0, 30)}`,
    `${h} walks ${c} through the first step`,
    `We open your own example on Meet`,
    `You keep the recording after`,
    `Questions answered live`
  ];
}

function promptAula(produto, detalhes, cliente, host) {
  const p = String(produto || "the mentorship").slice(0, 60);
  const d = String(detalhes || "").slice(0, 100);
  const c = String(cliente || "the client").split(/\s+/)[0];
  const h = String(host || "the host").split(/\s+/)[0];
  return `Photorealistic Google Meet session. ${h} is presenting and teaching ${c} about ${p}. Natural head movements, looking at the camera, hands gesturing while explaining. ${d ? "Topic: " + d + "." : ""} Keep the Meet interface visible with both participants. Same room and lighting. No extra text, no watermark.`;
}

async function iniciarVideo(imageDataUri, prompt, duration = 15) {
  const apiKey = key();
  if (!apiKey) throw new Error("sem XAI_API_KEY");
  const body = {
    model: MODEL,
    prompt,
    image: { url: imageDataUri },
    duration,
    resolution: "480p",
    generate_audio: false
  };
  const res = await fetch(XAI_VIDEO, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`video start ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (!data.request_id) throw new Error("sem request_id");
  return data.request_id;
}

async function esperarVideo(requestId, maxWaitMs = 180000) {
  const apiKey = key();
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`poll ${res.status}`);
    const data = await res.json();
    if (data.status === "done" && data.video && data.video.url) return data.video.url;
    if (data.status === "failed" || data.status === "expired") {
      throw new Error(`video ${data.status}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    await sleep(4000);
  }
  throw new Error("timeout no vídeo");
}

async function baixar(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("falha ao baixar vídeo");
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function queimarLegendas(input, output, lines, duration = 15) {
  return new Promise((resolve, reject) => {
    const step = duration / lines.length;
    const srtPath = output.replace(/\.mp4$/i, ".srt");
    const srt = lines.map((text, i) => {
      const start = i * step;
      const end = (i + 1) * step;
      const fmt = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
      };
      return `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${text}\n`;
    }).join("\n");
    fs.writeFileSync(srtPath, srt, "utf8");

    const args = [
      "-y",
      "-i", input,
      "-vf", `subtitles=${srtPath}:force_style='Fontsize=22,PrimaryColour=&HFFFFFF&,BackColour=&H80000000&,BorderStyle=4,Outline=1,MarginV=90,Alignment=2',scale=640:-2`,
      "-c:v", "libx264",
      "-crf", "18",
      "-preset", "veryslow",
      "-threads", "2",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      output
    ];
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("close", (code) => {
      try { fs.unlinkSync(srtPath); } catch (_) {}
      if (code === 0 && fs.existsSync(output)) resolve(output);
      else reject(new Error(`ffmpeg ${code}: ${err.slice(-400)}`));
    });
  });
}

async function gerarVideoAula(dados, outDir) {
  const image = dados.hostAvatar || dados.meetVideo;
  if (!image || image.length < 80) throw new Error("sem imagem do avatar/host");
  fs.mkdirSync(outDir, { recursive: true });
  const raw = path.join(outDir, "aula-raw.mp4");
  const stamp = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const nome = `Captura de tela ${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.mp4`;
  const final = path.join(outDir, nome);

  const dur = 12 + Math.floor(Math.random() * 4);
  const prompt = promptAula(dados.produto || dados.curso, dados.detalhes || dados.headline, dados.cliente, dados.apresentador || dados.empresa);

  const id = await iniciarVideo(image, prompt, dur);
  const url = await esperarVideo(id);
  await baixar(url, raw);

  const lines = await legendasIA(dados.produto || dados.curso, dados.detalhes || dados.headline, dados.cliente, dados.apresentador || dados.empresa);
  await queimarLegendas(raw, final, lines, dur);
  try { fs.unlinkSync(raw); } catch (_) {}
  return final;
}

module.exports = { gerarVideoAula, promptAula, legendasIA };
