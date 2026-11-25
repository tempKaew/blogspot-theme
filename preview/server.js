import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderTemplate } from "./render.js";

const root = path.resolve(import.meta.dir, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const xmlPath = path.join(root, "dist", `${packageJson.theme?.name || "theme"}.xml`);
const fixturePath = path.join(import.meta.dir, "fixtures.js");
const port = Number(process.env.PORT) || 4173;

let xml = "";
let buildError = "";
let fixtureMod = null;
let fixtureStamp = 0;
let refreshTask = null;
let refreshAgain = false;
let needsBuild = false;
const clients = new Set();

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", "build"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output.trim() || `build exited with ${code}`));
    });
  });
}

async function loadFixtures() {
  const stamp = fs.statSync(fixturePath).mtimeMs;
  if (!fixtureMod || stamp !== fixtureStamp) {
    fixtureStamp = stamp;
    fixtureMod = await import(`./fixtures.js?v=${stamp}`);
  }
  return fixtureMod;
}

async function refresh(build) {
  needsBuild = needsBuild || build;
  if (refreshTask) {
    refreshAgain = true;
    return refreshTask;
  }
  refreshTask = (async () => {
    do {
      refreshAgain = false;
      const buildNow = needsBuild;
      needsBuild = false;
      if (buildNow) {
        try {
          await runBuild();
          buildError = "";
        } catch (error) {
          buildError = error instanceof Error ? error.message : String(error);
          console.error(buildError);
        }
        if (fs.existsSync(xmlPath)) xml = fs.readFileSync(xmlPath, "utf8");
      }
      await loadFixtures();
    } while (refreshAgain);
  })();
  try {
    await refreshTask;
  } finally {
    refreshTask = null;
  }
  notify();
}

function notify() {
  const payload = new TextEncoder().encode("data: reload\n\n");
  for (const client of clients) {
    try {
      client.enqueue(payload);
    } catch {
      clients.delete(client);
    }
  }
}

function schedule(build) {
  clearTimeout(schedule.timer);
  schedule.timer = setTimeout(() => {
    refresh(build).catch((error) => console.error(error));
  }, 200);
}

function previewBar(requestUrl, fixtures) {
  const current = new URL(requestUrl, "http://preview.local");
  const links = (fixtures.previewLinks ?? []).map((link) => {
    const target = new URL(link.href, "http://preview.local");
    const active = current.pathname === target.pathname ? " active" : "";
    return `<a class="${active.trim()}" href="${link.href}">${link.label}</a>`;
  }).join("");
  const error = buildError ? `<span class="error">Build failed. The last good preview is still open.</span>` : "";
  return `<style>
    #kaew-preview{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 14px;background:#111;color:#eee;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;border-top:1px solid #333}
    #kaew-preview strong{font-weight:700;margin-right:4px}
    #kaew-preview a{color:#9ecbff;text-decoration:none}
    #kaew-preview a.active{color:#fff;font-weight:700}
    #kaew-preview .error{color:#ffb4b4}
    body{padding-bottom:46px !important}
  </style>
  <div id="kaew-preview"><strong>Preview</strong>${links}${error}</div>
  <script>
    (function () {
      var source = new EventSource("/__preview/events");
      source.onmessage = function () { location.reload(); };
    })();
  </script>`;
}

function inject(html, requestUrl, fixtures) {
  const bar = previewBar(requestUrl, fixtures);
  const marker = "<!--</body>-->";
  const at = html.lastIndexOf(marker);
  if (at !== -1) return html.slice(0, at) + bar + html.slice(at);
  const close = html.lastIndexOf("</body>");
  if (close !== -1) return html.slice(0, close) + bar + html.slice(close);
  return html + bar;
}

function errorPage(title, detail) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><pre style="white-space:pre-wrap;font-family:ui-monospace,monospace">${detail.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre>
  <script>new EventSource("/__preview/events").onmessage=function(){location.reload()}</script></body></html>`;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

await refresh(true);

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/__preview/events") {
      let controller;
      const stream = new ReadableStream({
        start(next) {
          controller = next;
          clients.add(next);
        },
        cancel() {
          clients.delete(controller);
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    if (refreshTask) await refreshTask;
    if (!xml) {
      return htmlResponse(errorPage("Build failed", buildError || "Theme XML has not been built yet."), 500);
    }

    try {
      const fixtures = await loadFixtures();
      const model = fixtures.createModel(`${url.pathname}${url.search}`);
      const page = inject(renderTemplate(xml, model), `${url.pathname}${url.search}`, fixtures);
      return htmlResponse(page);
    } catch (error) {
      const detail = error instanceof Error ? error.stack || error.message : String(error);
      return htmlResponse(errorPage("Preview render failed", detail), 500);
    }
  },
});

fs.watch(path.join(root, "src"), { recursive: true }, () => schedule(true));
fs.watch(fixturePath, () => schedule(false));
console.log(`Preview at http://127.0.0.1:${port}`);
console.log("Editing src rebuilds dist XML and reloads the browser. Editing preview/fixtures.js only reloads the sample data.");
