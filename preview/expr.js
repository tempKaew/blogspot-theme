// Evaluates the subset of Blogger expressions this theme actually uses.

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

export function truthy(value) {
  if (value == null || value === false || value === "") return false;
  if (typeof value === "number" && value === 0) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && value.__html != null) return value.__html.trim() !== "";
  return true;
}

export function stringify(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.__html != null) return value.__html;
  if (typeof value === "object") return "";
  return String(value);
}

function isEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return false;
  if (typeof a === "object" && a.__html != null) a = a.__html;
  if (typeof b === "object" && b.__html != null) b = b.__html;
  return String(a) === String(b);
}

function readProp(value, key) {
  if (value == null) return undefined;
  if (key === "canonical" && (typeof value === "string" || typeof value === "number")) {
    return String(value);
  }
  if (typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key)) {
    return value[key];
  }
  return undefined;
}

function lookupData(key, ctx) {
  const stack = ctx.dataStack;
  for (let i = stack.length - 1; i >= 0; i--) {
    const frame = stack[i];
    if (frame && Object.prototype.hasOwnProperty.call(frame, key)) return frame[key];
  }
  return undefined;
}

export function resolveData(path, ctx) {
  const parts = path.split(".").filter(Boolean);
  let escaped = false;
  if (parts.at(-1) === "escaped") {
    escaped = true;
    parts.pop();
  }
  if (parts.length === 0) return undefined;
  let value = lookupData(parts[0], ctx);
  for (let i = 1; i < parts.length; i++) value = readProp(value, parts[i]);
  // Escaping happens when the value is written into HTML, so `.escaped`
  // still returns the text the rest of the expression can concatenate.
  if (escaped) return stringify(value);
  return value;
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  const s = source;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let value = "";
      while (i < s.length && s[i] !== quote) {
        if (s[i] === "\\") {
          i++;
          value += s[i] ?? "";
          i++;
          continue;
        }
        value += s[i++];
      }
      i++;
      tokens.push({ type: "string", value });
      continue;
    }
    if (s.startsWith("data:", i)) {
      i += 5;
      let path = "";
      while (i < s.length && /[\w.]/.test(s[i])) path += s[i++];
      tokens.push({ type: "data", value: path.replace(/\.$/, "") });
      continue;
    }
    if (/[0-9]/.test(c)) {
      let raw = "";
      while (i < s.length && /[0-9.]/.test(s[i])) raw += s[i++];
      tokens.push({ type: "number", value: Number(raw) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let id = "";
      while (i < s.length && /\w/.test(s[i])) id += s[i++];
      if (id === "not" && /^\s+in\b/.test(s.slice(i))) {
        i += s.slice(i).match(/^\s+in\b/)[0].length;
        tokens.push({ type: "op", value: "not in" });
      } else {
        tokens.push({ type: "id", value: id });
      }
      continue;
    }
    if (s.startsWith("==", i) || s.startsWith("!=", i) || s.startsWith("=>", i)) {
      tokens.push({ type: "op", value: s.slice(i, i + 2) });
      i += 2;
      continue;
    }
    tokens.push({ type: "punct", value: c });
    i++;
  }
  return tokens;
}

function parse(source) {
  const tokens = tokenize(source);
  let index = 0;
  const peek = () => tokens[index];
  const next = () => tokens[index++];
  const fail = (message) => {
    throw new Error(`${message} in \`${source}\``);
  };
  const peekPunct = (value) => peek()?.type === "punct" && peek().value === value;
  const expectPunct = (value) => {
    if (!peekPunct(value)) fail(`expected "${value}"`);
    next();
  };
  const expectId = () => {
    const token = peek();
    if (token?.type !== "id") fail("expected a name");
    return next().value;
  };

  function keyName(ast) {
    if (ast.type === "name" || ast.type === "literal") return String(ast.value);
    fail("unsupported dictionary key");
  }

  function parseBrace() {
    expectPunct("{");
    if (peekPunct("}")) {
      expectPunct("}");
      return { type: "dict", entries: [] };
    }
    const first = parseTernary();
    if (peekPunct(":")) {
      const entries = [];
      let keyAst = first;
      while (true) {
        expectPunct(":");
        entries.push([keyName(keyAst), parseTernary()]);
        if (!peekPunct(",")) break;
        expectPunct(",");
        keyAst = parseTernary();
      }
      expectPunct("}");
      return { type: "dict", entries };
    }
    const items = [first];
    while (peekPunct(",")) {
      expectPunct(",");
      items.push(parseTernary());
    }
    expectPunct("}");
    return { type: "set", items };
  }

  function parseList() {
    expectPunct("[");
    const items = [];
    if (!peekPunct("]")) {
      items.push(parseTernary());
      while (peekPunct(",")) {
        expectPunct(",");
        items.push(parseTernary());
      }
    }
    expectPunct("]");
    return { type: "list", items };
  }

  function parsePrimary() {
    const token = peek();
    if (!token) fail("unexpected end");
    if (token.type === "number" || token.type === "string") {
      next();
      return { type: "literal", value: token.value };
    }
    if (token.type === "data") {
      next();
      return { type: "data", value: token.value };
    }
    if (token.type === "id") {
      if (token.value === "true" || token.value === "false") {
        next();
        return { type: "literal", value: token.value === "true" };
      }
      next();
      if (peekPunct("(")) {
        expectPunct("(");
        const args = [];
        if (!peekPunct(")")) {
          args.push(parseTernary());
          while (peekPunct(",")) {
            expectPunct(",");
            args.push(parseTernary());
          }
        }
        expectPunct(")");
        return { type: "call", name: token.value, args };
      }
      return { type: "name", value: token.value };
    }
    if (peekPunct("(")) {
      expectPunct("(");
      const inner = parseTernary();
      expectPunct(")");
      return inner;
    }
    if (peekPunct("{")) return parseBrace();
    if (peekPunct("[")) return parseList();
    fail(`unexpected ${token.type} ${token.value}`);
  }

  function parsePostfix() {
    let expr = parsePrimary();
    while (true) {
      if (peekPunct(".")) {
        expectPunct(".");
        expr = { type: "get", expr, prop: expectId() };
        continue;
      }
      const token = peek();
      if (token?.type === "id" && (token.value === "filter" || token.value === "any" || token.value === "none")) {
        next();
        expectPunct("(");
        const param = expectId();
        if (!(peek()?.type === "op" && peek().value === "=>")) fail("expected =>");
        next();
        const body = parseTernary();
        expectPunct(")");
        expr = { type: token.value, expr, param, body };
        continue;
      }
      if (token?.type === "id" && token.value === "snippet") {
        next();
        expr = { type: "snippet", expr, params: parseBrace() };
        continue;
      }
      if (token?.type === "id" && token.value === "path") {
        next();
        expr = { type: "path", expr, arg: parsePrimary() };
        continue;
      }
      break;
    }
    return expr;
  }

  function parseAdd() {
    let left = parsePostfix();
    while (peekPunct("+")) {
      expectPunct("+");
      left = { type: "binary", op: "+", left, right: parsePostfix() };
    }
    return left;
  }

  function parseMembership() {
    const left = parseAdd();
    const token = peek();
    if (token?.type === "op" && token.value === "not in") {
      next();
      return { type: "binary", op: "not in", left, right: parseAdd() };
    }
    if (token?.type === "id" && token.value === "in") {
      next();
      return { type: "binary", op: "in", left, right: parseAdd() };
    }
    return left;
  }

  function parseRelational() {
    let left = parseMembership();
    while (peek()?.type === "id" && ["lt", "gt", "lte", "gte"].includes(peek().value)) {
      const op = next().value;
      left = { type: "binary", op, left, right: parseMembership() };
    }
    return left;
  }

  function parseEquality() {
    let left = parseRelational();
    while (peek()?.type === "op" && (peek().value === "==" || peek().value === "!=")) {
      const op = next().value;
      left = { type: "binary", op, left, right: parseRelational() };
    }
    return left;
  }

  function parseNot() {
    if (peekPunct("!")) {
      next();
      return { type: "unary", op: "!", expr: parseNot() };
    }
    if (peek()?.type === "id" && peek().value === "not") {
      next();
      return { type: "unary", op: "!", expr: parseNot() };
    }
    return parseEquality();
  }

  function parseAnd() {
    let left = parseNot();
    while (peek()?.type === "id" && peek().value === "and") {
      next();
      left = { type: "binary", op: "and", left, right: parseNot() };
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (peek()?.type === "id" && peek().value === "or") {
      next();
      left = { type: "binary", op: "or", left, right: parseAnd() };
    }
    return left;
  }

  function parseTernary() {
    const cond = parseOr();
    if (!peekPunct("?")) return cond;
    expectPunct("?");
    const yes = parseTernary();
    expectPunct(":");
    const no = parseTernary();
    return { type: "ternary", cond, yes, no };
  }

  const ast = parseTernary();
  if (index < tokens.length) fail(`unexpected "${tokens[index].value}"`);
  return ast;
}

function contains(collection, value) {
  if (Array.isArray(collection)) return collection.some((item) => isEqual(item, value));
  if (collection && typeof collection === "object") {
    return Object.values(collection).some((item) => isEqual(item, value));
  }
  return false;
}

function compare(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isNaN(left) && !Number.isNaN(right) && a !== "" && b !== "") return left - right;
  return String(a).localeCompare(String(b));
}

function joinPath(base, segment) {
  const left = stringify(base);
  const right = stringify(segment).replace(/^\/+/, "");
  if (left === "" || left === "/") return `/${right}`;
  return `${left.replace(/\/+$/, "")}/${right}`;
}

function evalCall(name, args) {
  if (name === "resizeImage") {
    const url = stringify(args[0]);
    return url || "";
  }
  throw new Error(`unknown function ${name}`);
}

function evalAst(ast, ctx) {
  switch (ast.type) {
    case "literal":
      return ast.value;
    case "data":
      return resolveData(ast.value, ctx);
    case "name":
      return Object.prototype.hasOwnProperty.call(ctx.names, ast.value) ? ctx.names[ast.value] : undefined;
    case "get":
      return readProp(evalAst(ast.expr, ctx), ast.prop);
    case "unary":
      return !truthy(evalAst(ast.expr, ctx));
    case "ternary":
      return truthy(evalAst(ast.cond, ctx)) ? evalAst(ast.yes, ctx) : evalAst(ast.no, ctx);
    case "set":
    case "list":
      return ast.items.map((item) => evalAst(item, ctx));
    case "dict": {
      const object = {};
      for (const [key, value] of ast.entries) object[key] = evalAst(value, ctx);
      return object;
    }
    case "call":
      return evalCall(ast.name, ast.args.map((arg) => evalAst(arg, ctx)));
    case "filter":
    case "any":
    case "none": {
      const list = evalAst(ast.expr, ctx);
      const items = Array.isArray(list) ? list : [];
      const match = (item) => truthy(evalAst(ast.body, { ...ctx, names: { ...ctx.names, [ast.param]: item } }));
      if (ast.type === "filter") return items.filter(match);
      if (ast.type === "any") return items.some(match);
      return !items.some(match);
    }
    case "snippet": {
      const options = evalAst(ast.params, ctx);
      let text = stringify(evalAst(ast.expr, ctx));
      if (options.links === false) text = text.replace(/<[^>]+>/g, "");
      if (options.linebreaks === false) text = text.replace(/\s+/g, " ").trim();
      const length = Number(options.length ?? text.length);
      if (text.length <= length) return text;
      const cut = text.slice(0, length).trimEnd();
      return options.ellipsis === false ? cut : `${cut}…`;
    }
    case "path":
      return joinPath(evalAst(ast.expr, ctx), evalAst(ast.arg, ctx));
    case "binary": {
      if (ast.op === "or") {
        const left = evalAst(ast.left, ctx);
        return truthy(left) ? left : evalAst(ast.right, ctx);
      }
      if (ast.op === "and") {
        const left = evalAst(ast.left, ctx);
        return truthy(left) ? evalAst(ast.right, ctx) : left;
      }
      const left = evalAst(ast.left, ctx);
      const right = evalAst(ast.right, ctx);
      if (ast.op === "+") {
        if (typeof left === "number" && typeof right === "number") return left + right;
        return stringify(left) + stringify(right);
      }
      if (ast.op === "==") return isEqual(left, right);
      if (ast.op === "!=") return !isEqual(left, right);
      if (ast.op === "in") return contains(right, left);
      if (ast.op === "not in") return !contains(right, left);
      const delta = compare(left, right);
      if (ast.op === "lt") return delta < 0;
      if (ast.op === "gt") return delta > 0;
      if (ast.op === "lte") return delta <= 0;
      if (ast.op === "gte") return delta >= 0;
      throw new Error(`unknown operator ${ast.op}`);
    }
    default:
      throw new Error(`unknown expression node ${ast.type}`);
  }
}

export function evalExpr(source, ctx) {
  return evalAst(parse(source), ctx ?? { dataStack: [], names: {} });
}

if (import.meta.main) {
  const data = {
    view: { isHomepage: true, isSingleItem: false, isLayoutMode: false, search: { label: "projects", query: "" } },
    posts: [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ],
    featuredPostIds: ["b"],
    blog: { homepageUrl: "/", title: "tempKAEW", postImageUrl: "https://img.example/a.jpg", pageName: "" },
    messages: { noTitle: "Untitled", search: "Search" },
    post: {
      title: 'Rust & Go',
      labels: [{ name: "Rust" }, { name: "Product" }],
      snippet: "hello world",
    },
    widget: { instanceId: "Blog1" },
    imagePlacement: "BEHIND",
    num: 1,
    i: 1,
    label: { name: "studyLog", isLast: "false" },
  };
  const ctx = { dataStack: [data], names: {} };
  const cases = [
    ['data:view.isHomepage ? data:posts filter (post => post.id not in data:featuredPostIds) : data:posts', (v) => v.length === 1 && v[0].id === "a"],
    ['data:post.labels any (label => label.name in ["Sponsored" , "Advertorial"])', (v) => v === false],
    ['data:post.labels none (label => label.name in ["Sponsored" , "Advertorial" , "Product" , "Label_1"])', (v) => v === false],
    ['data:imagePlacement in {"REPLACE", "BEFORE_DESCRIPTION"}', (v) => v === false],
    ['data:imagePlacement not in {"REPLACE", "BEFORE_DESCRIPTION"}', (v) => v === true],
    ['!data:view.isSingleItem ? "h1" : "h2"', (v) => v === "h1"],
    ['data:blog.homepageUrl.canonical path "search"', (v) => v === "/search"],
    ['data:blog.homepageUrl.canonical + "feeds/posts/default"', (v) => v === "/feeds/posts/default"],
    ['data:post.title.escaped != "" ? data:post.title.escaped : data:messages.noTitle', (v) => v === "Rust & Go"],
    ['data:widget.instanceId + "_blog-pager-newer-link"', (v) => v === "Blog1_blog-pager-newer-link"],
    ["data:num+2", (v) => v === 3],
    ['data:label.name != "projects" and data:i lt 2', (v) => v === true],
    ["data:post.snippet.escaped snippet { length: 5, links: false, linebreaks: false, ellipsis: false }", (v) => v === "hello"],
    ["resizeImage(data:blog.postImageUrl, 0)", (v) => v === "https://img.example/a.jpg"],
    ['data:messages.search + "..."', (v) => v === "Search..."],
    ["!data:view.isLayoutMode", (v) => v === true],
    ['data:view.search.label == "projects"', (v) => v === true],
  ];
  let failed = 0;
  for (const [source, check] of cases) {
    const value = evalExpr(source, ctx);
    if (!check(value)) {
      failed++;
      console.error("FAIL", source, "=>", value);
    }
  }
  if (failed) {
    console.error(`${failed} expression checks failed`);
    process.exit(1);
  }
  console.log(`${cases.length} expression checks passed`);
}
