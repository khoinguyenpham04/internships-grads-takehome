// Usage: node scripts/screenshot.mjs <out.png> [js to run before capture] [width] [height]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [out = "/tmp/shot.png", script = "", width = "1440", height = "640"] = process.argv.slice(2);
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--remote-debugging-port=9333", "--user-data-dir=/tmp/shot-profile", `--window-size=${width},${height}`, "about:blank"],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    target = await fetch("http://127.0.0.1:9333/json").then((r) => r.json()).then((t) => t.find((x) => x.type === "page")).catch(() => null);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      const onMessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id !== n) return;
        ws.removeEventListener("message", onMessage);
        resolve(msg.result);
      };
      ws.addEventListener("message", onMessage);
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  if (script) {
    const result = await send("Runtime.evaluate", { expression: script, awaitPromise: true });
    if (result.exceptionDetails) console.error(result.exceptionDetails.text);
    await sleep(800);
  }
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`wrote ${out}`);
  ws.close();
} finally {
  chrome.kill();
}
