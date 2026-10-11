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

function promptAula(produto, detalhes) {
  const p = String(produto || "the mentorship").slice(0, 80);
  const d = String(detalhes || "").slice(0, 120);
  return `Photorealistic webcam view of the same person teaching a live 1:1 online class about ${p}. Natural head movements, looking at the camera, hands gesturing while explaining, slight body shifts, mid-sentence expression. ${d ? "Topic: " + d + "." : ""} Same room and lighting as the starting frame. No text, no watermark, no screen content.`;
}

function legendas(produto) {
  const p = String(produto || "the session").replace(/^product name\s+/i, "").slice(0, 40);
  const lines = [
    `Live 1:1 on ${p}`,
    `We open your own example`,
    `Step by step on Meet`,
    `You keep the recording`,
    `Questions answered live`
  ];
  return lines;
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
      "-vf", `subtitles=${srtPath}:force_style='Fontsize=24,PrimaryColour=&HFFFFFF&,BackColour=&H80000000&,BorderStyle=4,Outline=1',scale=640:-2`,
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
  const image = dados.meetVideo || dados.hostAvatar;
  if (!image || image.length < 80) throw new Error("sem imagem do avatar/host");
  fs.mkdirSync(outDir, { recursive: true });
  const raw = path.join(outDir, "aula-raw.mp4");
  const final = path.join(outDir, "aula-15s.mp4");

  const prompt = promptAula(dados.produto || dados.curso, dados.detalhes || dados.headline);
  const id = await iniciarVideo(image, prompt, 15);
  const url = await esperarVideo(id);
  await baixar(url, raw);

  const lines = legendas(dados.produto || dados.curso);
  await queimarLegendas(raw, final, lines, 15);
  try { fs.unlinkSync(raw); } catch (_) {}
  return final;
}

module.exports = { gerarVideoAula, promptAula, legendas };
