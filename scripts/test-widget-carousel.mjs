import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  const path = req.url?.split("?")[0] || "/";
  const file = join(root, path === "/" ? "harmony-home.html" : path.replace(/^\//, ""));
  try {
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(8765, "127.0.0.1", r));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://127.0.0.1:8765/harmony-home.html", { waitUntil: "networkidle" });

const state0 = await page.evaluate(() => {
  const root = document.getElementById("harmony-photos-widget");
  const img = root?.querySelector(".ios-photos-widget__photo.is-active");
  return {
    hpwInited: root?.dataset.hpwInited,
    hasCtrl: !!root?.harmonyPhotosWidget,
    src: img?.currentSrc || img?.src || "",
  };
});

await page.waitForTimeout(6000);

const state1 = await page.evaluate(() => {
  const root = document.getElementById("harmony-photos-widget");
  const img = root?.querySelector(".ios-photos-widget__photo.is-active");
  return { src: img?.currentSrc || img?.src || "" };
});

console.log("errors", errors);
console.log("state0", state0);
console.log("state1", state1);
console.log("rotated", state0.src !== state1.src && state1.src.length > 0);

await browser.close();
server.close();

process.exit(state0.src !== state1.src ? 0 : 1);
