import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createModel } from "./fixtures.js";
import { renderTemplate } from "./render.js";

const root = path.resolve(import.meta.dir, "..");
const xmlPath = path.join(root, "dist", "tempKaew.xml");

await new Promise((resolve, reject) => {
  const child = spawn("bun", ["run", "build"], { cwd: root, stdio: "inherit" });
  child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("build failed"))));
});

const xml = fs.readFileSync(xmlPath, "utf8");
const failures = [];

function check(name, ok) {
  if (!ok) {
    failures.push(name);
    console.error(`FAIL ${name}`);
  }
}

function page(url) {
  return renderTemplate(xml, createModel(url));
}

const home = page("/");
check("home hero", home.includes("career in code"));
check("home recent", home.includes("Recent posts"));
check("home first post", home.includes("Ownership in Rust"));
check("home pager", home.includes("Older posts") && home.includes("/?page=2"));
check("home hides later post", !home.includes("CSS grid study"));
check("home header", /<h1>\s*<span class="headerTitle">\s*tempKAEW\s*<\/span>\s*<\/h1>/.test(home));
check("home has no Home nav item", !home.includes('itemprop="name">Home<'));
check("search form stays local", home.includes('action="/search"'));
check("about link stays local", home.includes('href="/p/about.html"'));
check("no blogger tags", !/<b:|<data:/.test(home));
check("skin variables applied", !home.includes("$(font"));
check("homepage css", home.includes("#HTML0"));
check("theme attribute", home.includes('data-theme="dark"'));
check("head closer stays hidden", home.includes("<!--<head/>--></head>") && !home.includes("&lt;!--"));
check("body closer stays hidden", home.includes("<!--</body>--></body>"));

const next = page("/?page=2");
check("page 2 post", next.includes("CSS grid study") && next.includes("Local preview"));
check("page 2 pager", next.includes("Newer posts"));
check("page 2 hides first post", !next.includes("Ownership in Rust"));

const projects = page("/search/label/projects");
check("projects title", projects.includes(">Projects<") || projects.includes("Projects"));
check("projects cards", projects.includes("Hamlet widgets") && projects.includes("Local preview"));
check("projects omit other posts", !projects.includes("Ownership in Rust") && !projects.includes("PHP generators"));
check("projects omit hero", !projects.includes("career in code"));
check("projects show images", projects.includes("data:image/svg+xml") && !projects.includes("no image"));

const study = page("/search/label/studyLog");
check("label heading", study.includes("Articles tag : studyLog"));
check("label posts", study.includes("Ownership in Rust") && study.includes("CSS grid study") && !study.includes("PHP generators"));

const found = page("/search?q=generators");
check("search heading", found.includes("ผลการค้นหา : generators"));
check("search hit", found.includes("PHP generators") && !found.includes("Ownership in Rust"));

const blog = page("/search?max-results=8");
check("blog lists every sample", blog.includes("Ownership in Rust") && blog.includes("Local preview"));
check("blog is not the homepage heading", !blog.includes("Recent posts"));
check("blog does not paginate", !blog.includes("Older posts"));

const post = page("/2026/03/ownership-in-rust.html");
check("post title", post.includes("Ownership in Rust"));
check("post body", post.includes("<h2>The rules</h2>") && post.includes("fn main()"));
check("post blog title is a link", /<h2>\s*<a [^>]*class="headerTitle"[^>]*>\s*tempKAEW\s*<\/a>\s*<\/h2>/.test(post));
check("post home link", post.includes('itemprop="name">Home<'));
check("post categories", post.includes("postCategories") && post.includes('"Rust"') && post.includes('"studyLog"'));
check("post detail css", post.includes("#toc"));
check("post omits hero", !post.includes("career in code"));

const about = page("/p/about.html");
check("about page", about.includes("sample data") && about.includes("<h2>This preview</h2>"));

const missing = page("/missing-page");
check("error copy", missing.includes("Sorry, an error occurred while processing your request."));
check("error omits posts", !missing.includes("Ownership in Rust") && !missing.includes("Recent posts"));

if (failures.length) {
  console.error(`\n${failures.length} preview checks failed`);
  const marker = home.indexOf("<b:");
  if (marker >= 0) console.error(home.slice(Math.max(0, marker - 120), marker + 240));
  process.exit(1);
}

console.log("Preview render checks passed");
