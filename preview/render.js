import { DOMParser } from "@xmldom/xmldom";
import { escapeAttr, escapeHtml, evalExpr, stringify, truthy } from "./expr.js";

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function children(node) {
  return Array.from(node.childNodes ?? []);
}

function elementChildren(node, name) {
  return children(node).filter((child) => child.nodeType === 1 && (!name || child.nodeName === name));
}

function attr(node, name) {
  const value = node.getAttribute?.(name);
  return value == null || value === "" ? null : value;
}

function decorate(item, index, total) {
  if (item && typeof item === "object" && item.__html == null) {
    return {
      ...item,
      isFirst: index === 0 ? "true" : "false",
      isLast: index === total - 1 ? "true" : "false",
    };
  }
  return item;
}

function pushData(ctx, frame) {
  return { ...ctx, dataStack: [...ctx.dataStack, frame] };
}

function settingValue(name, text) {
  if (name === "content") return { __html: text };
  const trimmed = text.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && /^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return text;
}

function readSettings(widget) {
  const settings = {};
  for (const group of elementChildren(widget, "b:widget-settings")) {
    for (const setting of elementChildren(group, "b:widget-setting")) {
      const name = setting.getAttribute("name");
      if (!name) continue;
      settings[name] = settingValue(name, setting.textContent ?? "");
    }
  }
  return settings;
}

function linksFromSettings(settings) {
  const links = [];
  for (let i = 0; i < 40; i++) {
    const textKey = `text-${i}`;
    const linkKey = `link-${i}`;
    if (!Object.prototype.hasOwnProperty.call(settings, textKey) && !Object.prototype.hasOwnProperty.call(settings, linkKey)) break;
    links.push({
      name: stringify(settings[textKey]),
      target: stringify(settings[linkKey]),
    });
  }
  return links;
}

function indexDefaults(doc) {
  const byType = new Map();
  const visit = (node) => {
    if (node.nodeType === 1 && node.nodeName === "b:defaultmarkup") {
      const types = (node.getAttribute("type") || "Common").split(",").map((type) => type.trim()).filter(Boolean);
      for (const type of types) {
        if (!byType.has(type)) byType.set(type, new Map());
        const map = byType.get(type);
        for (const includable of elementChildren(node, "b:includable")) {
          const id = includable.getAttribute("id");
          if (id) map.set(id, includable);
        }
      }
    }
    for (const child of children(node)) visit(child);
  };
  visit(doc);
  return byType;
}

function widgetIncludables(widget, byType) {
  const map = new Map();
  const type = widget.getAttribute("type") || "";
  for (const layer of ["All", "Common", type]) {
    const source = byType.get(layer);
    if (!source) continue;
    for (const [id, node] of source) map.set(id, node);
  }
  for (const includable of elementChildren(widget, "b:includable")) {
    const id = includable.getAttribute("id");
    if (id) map.set(id, includable);
  }
  return map;
}

function skinVariables(css) {
  const vars = {};
  const tags = css.matchAll(/<Variable\b([^>]*?)\/?>/g);
  for (const tag of tags) {
    const body = tag[1];
    const name = body.match(/\bname=(['"])(.*?)\1/)?.[2];
    const value = body.match(/\bvalue=(['"])(.*?)\1/)?.[2] ?? "";
    if (!name) continue;
    vars[name] = value;
    vars[name.replaceAll(".", "_")] = value;
  }
  return vars;
}

function applySkinVars(css) {
  const vars = skinVariables(css);
  return css.replace(/\$\(([^)]+)\)/g, (_, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
    if (name.endsWith(".family")) {
      const base = vars[name.slice(0, -".family".length)] ?? "";
      return base.match(/var\([^)]+\)|"[^"]+"|'[^']+'/)?.[0] ?? "inherit";
    }
    return "";
  });
}

function isRawMarkup(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("<")) return false;
  return /^(?:<!--[\s\S]*?-->|<\/?(?:head|body)\b[^>]*>)+$/.test(trimmed);
}

function renderText(text, ctx) {
  if (ctx.rawText || isRawMarkup(text)) return text;
  return escapeHtml(text);
}

function printValue(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.__html != null) return value.__html;
  return escapeHtml(stringify(value));
}

function evalAttr(source, ctx) {
  try {
    return evalExpr(source, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
}

function renderIncludable(node, ctx) {
  if (!node || ctx.depth > 40) return "";
  let next = { ...ctx, depth: ctx.depth + 1 };
  const varName = node.getAttribute("var");
  if (varName) next = pushData(next, { [varName]: ctx.widgetData?.this ?? ctx.widgetData ?? {} });
  return renderNodes(children(node), next);
}

function renderInclude(node, ctx) {
  const condition = attr(node, "cond");
  if (condition && !truthy(evalAttr(condition, ctx))) return "";
  const name = node.getAttribute("name");
  const includable = ctx.includables?.get(name);
  if (!includable) return "";
  let next = ctx;
  const dataAttr = attr(node, "data");
  if (dataAttr) {
    const extra = evalAttr(dataAttr, ctx);
    if (extra && typeof extra === "object") next = pushData(ctx, extra);
  }
  return renderIncludable(includable, next);
}

function renderIf(node, ctx) {
  const branches = [];
  let current = { cond: attr(node, "cond"), nodes: [] };
  for (const child of children(node)) {
    if (child.nodeType === 1 && child.nodeName === "b:elseif") {
      branches.push(current);
      current = { cond: attr(child, "cond"), nodes: [] };
      continue;
    }
    if (child.nodeType === 1 && child.nodeName === "b:else") {
      branches.push(current);
      current = { cond: null, nodes: [] };
      continue;
    }
    current.nodes.push(child);
  }
  branches.push(current);
  for (const branch of branches) {
    if (branch.cond == null || truthy(evalAttr(branch.cond, ctx))) return renderNodes(branch.nodes, ctx);
  }
  return "";
}

function renderLoop(node, ctx) {
  const values = evalAttr(attr(node, "values") ?? "", ctx);
  const list = Array.isArray(values) ? values : [];
  const varName = node.getAttribute("var") || "item";
  const indexName = attr(node, "index");
  const nodes = children(node);
  return list.map((item, index) => {
    const frame = { [varName]: decorate(item, index, list.length) };
    if (indexName) frame[indexName] = index;
    return renderNodes(nodes, pushData(ctx, frame));
  }).join("");
}

function renderWith(node, ctx) {
  const value = evalAttr(attr(node, "value") ?? "", ctx);
  const varName = node.getAttribute("var") || "value";
  return renderNodes(children(node), pushData(ctx, { [varName]: value }));
}

function renderWidget(widget, ctx) {
  if (widget.getAttribute("visible") === "false") return "";
  const condition = attr(widget, "cond");
  if (condition && !truthy(evalAttr(condition, ctx))) return "";

  const id = widget.getAttribute("id") || "";
  const type = widget.getAttribute("type") || "HTML";
  const settings = readSettings(widget);
  const frame = { ...settings, widget: { instanceId: id } };
  if (type === "LinkList") frame.links = linksFromSettings(settings);
  if (type === "Header") {
    const title = ctx.blog?.title ?? "";
    frame.title = title;
    frame.this = { ...settings, title, description: ctx.blog?.description ?? "" };
  }
  if (type === "Blog") Object.assign(frame, ctx.blogWidget ?? {});
  if (type === "HTML" && Object.prototype.hasOwnProperty.call(settings, "content")) frame.content = settings.content;

  const includables = widgetIncludables(widget, ctx.defaultmarkups);
  const main = includables.get("main");
  const inner = main
    ? renderIncludable(main, { ...pushData(ctx, frame), includables, widgetData: frame })
    : "";
  return `<div class="${escapeAttr(`widget ${type}`)}" id="${escapeAttr(id)}">${inner}</div>`;
}

function renderSection(node, ctx) {
  const condition = attr(node, "cond");
  if (condition && !truthy(evalAttr(condition, ctx))) return "";
  const id = node.getAttribute("id");
  const className = node.getAttribute("class");
  const inner = elementChildren(node, "b:widget").map((widget) => renderWidget(widget, ctx)).join("");
  const idAttr = id ? ` id="${escapeAttr(id)}"` : "";
  const classAttr = className ? ` class="${escapeAttr(className)}"` : "";
  return `<div${idAttr}${classAttr}>${inner}</div>`;
}

function renderSkin(node) {
  const css = applySkinVars(node.textContent ?? "").replaceAll("</style", "<\\/style");
  return `<style>${css}</style>`;
}

function renderElement(node, ctx, tagName) {
  const tag = tagName || node.nodeName;
  if (tag === "b:tag") {
    const condition = attr(node, "cond");
    if (condition && !truthy(evalAttr(condition, ctx))) return "";
    const dynamic = attr(node, "expr:name");
    const resolved = dynamic ? stringify(evalAttr(dynamic, ctx)) : node.getAttribute("name") || "div";
    return renderElement(node, ctx, resolved || "div");
  }

  const attrs = [];
  const seen = new Set();
  const classNames = [];
  const pushAttr = (name, value) => {
    if (name === "name" && node.nodeName === "b:tag") return;
    if (name === "cond" || name === "expr:name") return;
    if (seen.has(name)) {
      const index = attrs.findIndex((item) => item.startsWith(`${name}="`));
      if (index >= 0) attrs.splice(index, 1);
    }
    seen.add(name);
    attrs.push(`${name}="${escapeAttr(value)}"`);
  };

  for (let i = 0; i < (node.attributes?.length ?? 0); i++) {
    const attribute = node.attributes[i];
    const name = attribute.name;
    if (name.startsWith("xmlns") || name === "cond") continue;
    if (name.startsWith("expr:")) {
      pushAttr(name.slice(5), stringify(evalAttr(attribute.value, ctx)));
      continue;
    }
    if (name.startsWith("b:")) continue;
    if (name === "class") classNames.push(attribute.value);
    else pushAttr(name, attribute.value);
  }

  const inner = [];
  let next = ctx;
  if (tag === "script" || tag === "style") next = { ...ctx, rawText: true };
  for (const child of children(node)) {
    if (child.nodeType === 1 && child.nodeName === "b:attr") {
      const condition = attr(child, "cond");
      if (condition && !truthy(evalAttr(condition, ctx))) continue;
      const name = child.getAttribute("name");
      const expr = attr(child, "expr:value");
      const value = expr ? stringify(evalAttr(expr, ctx)) : (child.getAttribute("value") ?? "");
      if (name) pushAttr(name, value);
      continue;
    }
    if (child.nodeType === 1 && child.nodeName === "b:class") {
      const condition = attr(child, "cond");
      if (condition && !truthy(evalAttr(condition, ctx))) continue;
      const name = child.getAttribute("name");
      if (name) classNames.push(name);
      continue;
    }
    inner.push(renderNode(child, next));
  }

  if (classNames.length) pushAttr("class", classNames.join(" ").trim());
  const open = attrs.length ? `<${tag} ${attrs.join(" ")}>` : `<${tag}>`;
  if (VOID_TAGS.has(tag)) return open;
  return `${open}${inner.join("")}</${tag}>`;
}

function renderNode(node, ctx) {
  if (node.nodeType === 3 || node.nodeType === 4) return renderText(node.nodeValue ?? "", ctx);
  if (node.nodeType !== 1) return "";
  const name = node.nodeName;
  if (name.startsWith("data:")) return printValue(evalAttr(name, ctx));
  switch (name) {
    case "b:if":
      return renderIf(node, ctx);
    case "b:loop":
      return renderLoop(node, ctx);
    case "b:with":
      return renderWith(node, ctx);
    case "b:eval":
      return printValue(evalAttr(attr(node, "expr") ?? "", ctx));
    case "b:include":
      return renderInclude(node, ctx);
    case "b:section":
      return renderSection(node, ctx);
    case "b:widget":
      return renderWidget(node, ctx);
    case "b:skin":
      return renderSkin(node);
    case "b:tag":
      return renderElement(node, ctx, "b:tag");
    case "b:defaultmarkups":
    case "b:defaultmarkup":
    case "b:includable":
    case "b:widget-settings":
    case "b:widget-setting":
    case "b:template-skin":
    case "b:elseif":
    case "b:else":
    case "b:attr":
    case "b:class":
      return "";
    default:
      if (name.startsWith("b:")) return "";
      return renderElement(node, ctx);
  }
}

function renderNodes(nodes, ctx) {
  return nodes.map((node) => renderNode(node, ctx)).join("");
}

function prepareXml(xml) {
  let source = xml.replace(/^\uFEFF/, "").replace(/<\?xml[^?]*\?>/i, "");
  if (!/<\/body>/i.test(source)) source = source.replace(/<\/html>/i, "</body></html>");
  return source;
}

export function renderTemplate(xml, model) {
  const problems = [];
  const doc = new DOMParser({
    onError(level, message) {
      if (level === "fatalError" || level === "error") problems.push(String(message));
    },
  }).parseFromString(prepareXml(xml), "text/xml");
  if (problems.length) throw new Error(problems[0]);
  if (!doc.documentElement || doc.documentElement.nodeName === "parsererror") {
    throw new Error(doc.documentElement?.textContent || "Unable to parse the theme XML");
  }

  const extracted = skinVariables(
    elementChildren(doc.documentElement, "b:skin").map((node) => node.textContent ?? "").join("\n") +
      xml,
  );
  const ctx = {
    dataStack: [{
      blog: model.blog,
      view: model.view,
      messages: model.messages,
      skin: { vars: { ...(model.skin?.vars ?? {}), ...extracted } },
      ...(model.post ? { post: model.post } : {}),
    }],
    names: {},
    includables: new Map(),
    defaultmarkups: indexDefaults(doc),
    blogWidget: model.blogWidget ?? {},
    blog: model.blog,
    depth: 0,
  };
  const html = repairDocumentClosers(`<!DOCTYPE html>\n${renderNode(doc.documentElement, ctx)}`);
  return model.blogOrigin ? html.replaceAll(model.blogOrigin, "") : html;
}

// Hamlet writes the head and body closers as escaped text around a real tag.
// An XML parser splits that into text plus an element, which would show the
// closer on the page. Join those pieces back into the original HTML.
function repairDocumentClosers(html) {
  return html
    .replace(/&lt;!--\s*<head>\s*<\/head>\s*--&gt;&lt;\/head&gt;/, "<!--<head/>--></head>")
    .replace(/&lt;!--\s*<\/body>\s*--&gt;&lt;\/body&gt;/, "<!--</body>--></body>");
}
