// Usage: node scripts/screenshot.mjs <out.png> [script.js | steps.json] [width] [height]
// steps.json is an array of { eval } | { drag: [x1, y1, x2, y2] } | { click: [x, y], button? } | { key } | { type } | { wait } | { shot }.
// Coordinates are CSS pixels. An eval step logs its return value.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [out = "/tmp/shot.png", input = "", width = "1440", height = "640"] = process.argv.slice(2);
const steps = input.endsWith(".json") ? JSON.parse(readFileSync(input, "utf8")) : input ? [{ eval: input }] : [];
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
  const mouse = (type, x, y, button = "left") =>
    send("Input.dispatchMouseEvent", { type, x, y, button, buttons: type === "mouseReleased" ? 0 : button === "left" ? 1 : 2, clickCount: 1 });
  const shot = async (file) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`wrote ${file}`);
  };

  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  for (const step of steps) {
    if (step.eval) {
      const result = await send("Runtime.evaluate", { expression: step.eval, awaitPromise: true, returnByValue: true });
      console.log(result.exceptionDetails ? `error: ${result.exceptionDetails.exception?.description}` : JSON.stringify(result.result.value));
    } else if (step.drag) {
      const [x1, y1, x2, y2] = step.drag;
      await mouse("mouseMoved", x1, y1);
      await mouse("mousePressed", x1, y1);
      for (let i = 1; i <= 10; i++) {
        await mouse("mouseMoved", x1 + ((x2 - x1) * i) / 10, y1 + ((y2 - y1) * i) / 10);
        await sleep(16);
      }
      if (step.hold) {
        await sleep(300);
        await shot(step.hold);
      }
      await mouse("mouseReleased", x2, y2);
    } else if (step.click) {
      const [x, y] = step.click;
      await mouse("mouseMoved", x, y);
      await mouse("mousePressed", x, y, step.button);
      await mouse("mouseReleased", x, y, step.button);
    } else if (step.key) {
      const text = step.key === "Enter" ? "\r" : step.key.length === 1 ? step.key : undefined;
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: step.key, code: step.code, windowsVirtualKeyCode: step.keyCode, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: step.key, code: step.code, windowsVirtualKeyCode: step.keyCode });
    } else if (step.type) {
      await send("Input.insertText", { text: step.type });
    } else if (step.shot) {
      await shot(step.shot);
    }
    await sleep(step.wait ?? 400);
  }
  await shot(out);
  ws.close();
} finally {
  chrome.kill();
}
