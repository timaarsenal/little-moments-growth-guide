/** Draws the weekly summary as a square PNG for messengers. */
export async function weeklyCardImage(title: string, line: string, minutes: number): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const css = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  ctx.fillStyle = color("--background", "#fdf6ec");
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color("--primary-soft", "#f6dcc4");
  ctx.beginPath();
  ctx.arc(size / 2, 470, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color("--foreground", "#3b2a20");
  ctx.textAlign = "center";
  ctx.font = "bold 56px Comfortaa, Nunito, sans-serif";
  ctx.fillText(title, size / 2, 140);
  ctx.fillStyle = color("--primary", "#d9734a");
  ctx.font = "bold 200px Comfortaa, Nunito, sans-serif";
  ctx.fillText(String(minutes), size / 2, 530);
  ctx.fillStyle = color("--foreground", "#3b2a20");
  ctx.font = "600 44px Nunito, sans-serif";
  const words = line.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > size - 160) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => ctx.fillText(l, size / 2, 820 + i * 60));
  ctx.font = "bold 40px Comfortaa, sans-serif";
  ctx.fillText("🐣 Balapan", size / 2, size - 60);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}

/** Share via the phone's share sheet (WhatsApp etc.); falls back to download + WhatsApp text link. */
export async function shareWeeklyCard(blob: Blob, text: string) {
  const file = new File([blob], "balapan-week.png", { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
