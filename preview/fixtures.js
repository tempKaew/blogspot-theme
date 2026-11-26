// Sample blog used by the local preview. Edit the posts below to see
// different titles, labels, and article HTML without importing the theme.
// `bun run build` does not use this file.

export const blogOrigin = "https://tempkaew.blogspot.com";

const blogTitle = "tempKAEW";

export const messages = {
  home: "Home",
  search: "Search",
  noTitle: "Untitled",
  newerPosts: "Newer posts",
  olderPosts: "Older posts",
  posts: "Posts",
};

function html(value) {
  return { __html: String(value).trim() };
}

function placeholder(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="54%" fill="white" font-size="42" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function label(name) {
  return { name, url: `/search/label/${encodeURIComponent(name)}` };
}

function article({ slug, year, month, title, date, labels, excerpt, body, image = "" }) {
  return {
    id: slug,
    title,
    url: `/${year}/${month}/${slug}.html`,
    date,
    labels,
    snippet: excerpt,
    snippets: { short: excerpt },
    body: html(body),
    featuredImage: image,
    kind: "post",
  };
}

function page({ slug, title, excerpt, body }) {
  return {
    id: slug,
    title,
    url: `/p/${slug}.html`,
    date: "",
    labels: [],
    snippet: excerpt,
    snippets: { short: excerpt },
    body: html(body),
    featuredImage: "",
    kind: "page",
  };
}

export const posts = [
  article({
    slug: "ownership-in-rust",
    year: "2026",
    month: "03",
    title: "Ownership in Rust",
    date: "12 March 2026",
    labels: [label("Rust"), label("studyLog")],
    excerpt: "How borrowing keeps a Rust program honest without a garbage collector.",
    image: placeholder("#7c3aed", "Rust"),
    body: `
      <p>Ownership is the rule that every value has one owner at a time. Borrowing lets other code look at that value without taking it.</p>
      <h2>The rules</h2>
      <p>You can have one mutable borrow or many shared borrows. The compiler tracks which one is live.</p>
      <h2>A small example</h2>
      <h3>Moving a string</h3>
      <pre><code class="language-rust">fn main() {
    let name = String::from("tempKAEW");
    greet(name);
}</code></pre>
      <p>After <code>greet</code> takes <code>name</code>, the caller cannot use it again.</p>
      <a class="download" href="https://github.com/tempKaew/larust-app/releases/download/v1.0.0/larust-app.zip"><span>larust-app.zip<small>2.4 MB</small></span></a>
    `,
  }),
  article({
    slug: "php-generators",
    year: "2026",
    month: "02",
    title: "PHP generators",
    date: "2 February 2026",
    labels: [label("PHP")],
    excerpt: "Yield a stream of rows without holding the whole result in memory.",
    body: `
      <p>A generator looks like a function and behaves like an iterator.</p>
      <h2>Yield</h2>
      <pre><code class="language-php">function numbers(int $max) {
    for ($i = 1; $i &lt;= $max; $i++) yield $i;
}</code></pre>
      <p>The caller pulls values one at a time.</p>
    `,
  }),
  article({
    slug: "signals-in-javascript",
    year: "2026",
    month: "01",
    title: "Signals in JavaScript",
    date: "18 January 2026",
    labels: [label("JavaScript")],
    excerpt: "A signal stores a value and tells subscribers when it changes.",
    body: `
      <p>Signals are a small reactive primitive: read the current value, or subscribe to the next one.</p>
      <h2>Why they stay simple</h2>
      <p>The update is explicit, so the dependency list does not have to be inferred.</p>
    `,
  }),
  article({
    slug: "hamlet-widgets",
    year: "2025",
    month: "12",
    title: "Hamlet widgets",
    date: "9 December 2025",
    labels: [label("projects"), label("JavaScript")],
    excerpt: "A theme split into partials, includables, and a single XML file.",
    image: placeholder("#0f766e", "Widgets"),
    body: `
      <p>Widgets keep the header, the post list, and the footer independently replaceable.</p>
      <h2>What the preview renders</h2>
      <p>The local server evaluates the same XML that Blogger will import.</p>
    `,
  }),
  article({
    slug: "css-grid-study",
    year: "2025",
    month: "11",
    title: "CSS grid study",
    date: "21 November 2025",
    labels: [label("CSS"), label("studyLog")],
    excerpt: "Notes on placing the header, the list, and the footer on one grid.",
    body: `
      <p>The page shell is three grid areas: header, container, and footer.</p>
      <h2>Tracks</h2>
      <p>On a wide screen the header becomes three columns: title, menu, and tools.</p>
    `,
  }),
  article({
    slug: "local-preview",
    year: "2025",
    month: "10",
    title: "Local preview",
    date: "4 October 2025",
    labels: [label("projects"), label("Tooling")],
    excerpt: "Edit a template and refresh the sample blog before importing XML.",
    image: placeholder("#b45309", "Preview"),
    body: `
      <p>This project page exists so the projects label has a second card and an image.</p>
      <h2>Workflow</h2>
      <p>Use the dev server while editing, then build the XML when the layout looks right.</p>
    `,
  }),
];

export const pages = [
  page({
    slug: "about",
    title: "About",
    excerpt: "Notes on software, learning, and small tools.",
    body: `
      <p>tempKAEW is a notebook for software work: PHP, JavaScript, Rust, and the tools around them.</p>
      <h2>This preview</h2>
      <p>The articles on this server are sample data from <code>preview/fixtures.js</code>. They are not loaded from Blogger.</p>
    `,
  }),
  page({
    slug: "cookie-policy",
    title: "Cookie Policy",
    excerpt: "How this sample site would describe cookies.",
    body: `<p>This preview does not set tracking cookies. The imported Blogger theme can still be covered by your real policy.</p>`,
  }),
  page({
    slug: "privacy-policy",
    title: "Privacy Policy",
    excerpt: "How this sample site would describe privacy.",
    body: `<p>This preview keeps everything on your machine. Replace this page with the policy you publish on Blogger.</p>`,
  }),
];

export const previewLinks = [
  { href: "/", label: "Home" },
  { href: "/search?max-results=8", label: "Blog" },
  { href: "/search/label/projects", label: "Projects" },
  { href: "/search/label/studyLog", label: "StudyLog" },
  { href: "/2026/03/ownership-in-rust.html", label: "Post" },
  { href: "/p/about.html", label: "About" },
  { href: "/missing-page", label: "404" },
];

function pageHref(pathname, params, page) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, String(value));
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function viewFlags(overrides) {
  return {
    isHomepage: false,
    isPost: false,
    isPage: false,
    isSearch: false,
    isError: false,
    isSingleItem: false,
    isMultipleItems: false,
    isLayoutMode: false,
    search: { label: "", query: "" },
    title: blogTitle,
    ...overrides,
  };
}

export function createModel(requestUrl) {
  const url = new URL(requestUrl, "http://preview.local");
  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const requestedSize = Number(url.searchParams.get("max-results"));
  const pageSize = requestedSize > 0 ? requestedSize : 4;
  const query = url.searchParams.get("q")?.trim() ?? "";

  const blog = {
    title: blogTitle,
    description: "",
    encoding: "UTF-8",
    languageDirection: "ltr",
    locale: { language: "en" },
    homepageUrl: "/",
    metaDescription: "Notes on PHP, JavaScript, Rust, and the tools around them.",
    pageName: "",
    postImageUrl: "",
    blogspotFaviconUrl: placeholder("#111827", "K"),
    url: pathname,
    canonicalUrl: pathname,
  };

  const skin = { vars: { themeColor: "#0d1117" } };
  const listParams = {};
  if (url.searchParams.get("max-results")) listParams["max-results"] = url.searchParams.get("max-results");
  if (query) listParams.q = query;

  const finish = (view, extra = {}) => ({
    blogOrigin,
    blog,
    view,
    messages,
    skin,
    post: extra.post ?? null,
    blogWidget: extra.blogWidget ?? { posts: [], newerPageUrl: "", olderPageUrl: "", featuredPostIds: [] },
    previewLinks,
  });

  const list = (pathnameForLinks, { labelName = "", search = false, homepage = false, title, pageName }) => {
    const matched = posts.filter((post) => {
      if (labelName && !post.labels.some((item) => item.name === labelName)) return false;
      if (!query) return true;
      const haystack = `${post.title} ${post.snippet}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
    const start = (page - 1) * pageSize;
    const visible = matched.slice(start, start + pageSize);
    blog.pageName = pageName;
    blog.url = pageHref(pathnameForLinks, listParams, page);
    blog.canonicalUrl = blog.url;
    return finish(
      viewFlags({
        isHomepage: homepage,
        isSearch: search,
        isMultipleItems: true,
        search: { label: labelName, query },
        title,
      }),
      {
        blogWidget: {
          posts: visible,
          newerPageUrl: page > 1 ? pageHref(pathnameForLinks, listParams, page - 1) : "",
          olderPageUrl: start + pageSize < matched.length ? pageHref(pathnameForLinks, listParams, page + 1) : "",
          featuredPostIds: [],
        },
      },
    );
  };

  if (pathname === "/") {
    return list("/", {
      homepage: true,
      title: blogTitle,
      pageName: "",
    });
  }

  if (pathname === "/search") {
    const title = query || "Blog";
    return list("/search", {
      search: true,
      title,
      pageName: query,
    });
  }

  const labelMatch = pathname.match(/^\/search\/label\/([^/]+)$/);
  if (labelMatch) {
    const labelName = labelMatch[1];
    return list(pathname, {
      labelName,
      search: true,
      title: labelName,
      pageName: labelName,
    });
  }

  const post = posts.find((item) => item.url === pathname);
  if (post) {
    blog.pageName = post.title;
    blog.url = post.url;
    blog.canonicalUrl = post.url;
    blog.postImageUrl = post.featuredImage;
    return finish(
      viewFlags({ isPost: true, isSingleItem: true, title: post.title }),
      {
        post,
        blogWidget: { posts: [post], newerPageUrl: "", olderPageUrl: "", featuredPostIds: [] },
      },
    );
  }

  const staticPage = pages.find((item) => item.url === pathname);
  if (staticPage) {
    blog.pageName = staticPage.title;
    blog.url = staticPage.url;
    blog.canonicalUrl = staticPage.url;
    return finish(
      viewFlags({ isPage: true, isSingleItem: true, title: staticPage.title }),
      {
        post: staticPage,
        blogWidget: { posts: [staticPage], newerPageUrl: "", olderPageUrl: "", featuredPostIds: [] },
      },
    );
  }

  blog.pageName = "404";
  blog.url = pathname;
  blog.canonicalUrl = pathname;
  return finish(viewFlags({ isError: true, title: "Page not found" }));
}
