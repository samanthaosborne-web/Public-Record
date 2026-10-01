#!/usr/bin/env node
/**
 * Builds a static, read-only copy of the site for hosting on GitHub Pages
 * (or any static host). It crawls the running app, strips the client-side
 * JavaScript, rewrites every link to a relative file, bundles the stylesheet
 * and official portraits, and adds a small script for the party filters,
 * sort order, mobile menu and portrait fade-in.
 *
 * What the static copy cannot do: live search (only the example searches are
 * pre-rendered), right-of-reply submissions and reviewer decisions. Those
 * need the running app (npm run dev) or a server deployment.
 *
 *   node scripts/build-static-snapshot.mjs --serve --out out-static
 *   node scripts/build-static-snapshot.mjs --base http://localhost:3000 --out out-static
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const PORT = Number(opt("--port", "3100"));
const BASE = opt("--base", `http://localhost:${PORT}`);
const OUT = path.resolve(opt("--out", "out-static"));
const SERVE = args.includes("--serve");
const MAX_PAGES = Number(opt("--max-pages", "1000"));
const GENERATED = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" }).format(new Date());
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 PublicRecordSnapshot/1.0";

let server = null;
if (SERVE) {
  // Run the production server in its own process group so it can be stopped cleanly afterwards.
  const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { stdio: ["ignore", "inherit", "inherit"], detached: process.platform !== "win32" });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE); if (r.ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

try {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "assets", "portraits"), { recursive: true });

  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

  function allowed(url) {
    const u = new URL(url, BASE);
    if (u.origin !== new URL(BASE).origin) return false;
    const p = u.pathname;
    if (p.startsWith("/_next") || p.startsWith("/api") || p === "/favicon.ico") return false;
    const params = [...u.searchParams.keys()];
    if (p === "/search") return params.length === 0; // queries are answered client-side (assets/search.js)
    if (p === "/claims") return params.length <= 1; // single filters only; combinations explode
    if (p === "/submit") return params.length <= 2;
    return params.length <= 1;
  }

  function canonical(url) {
    const u = new URL(url, BASE);
    u.hash = "";
    const keys = [...u.searchParams.keys()].sort();
    const sp = new URLSearchParams();
    for (const k of keys) sp.set(k, u.searchParams.get(k));
    const q = sp.toString();
    return (u.pathname.replace(/\/$/, "") || "/") + (q ? `?${q}` : "");
  }

  function fileFor(canon) {
    const [p, q] = canon.split("?");
    const base = p === "/" ? "" : p.replace(/^\//, "");
    if (q) return `${base ? `${base}/` : ""}q-${q.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}.html`;
    return base ? `${base}/index.html` : "index.html";
  }

  const pages = new Map();
  const queue = ["/"];
  while (queue.length && pages.size < MAX_PAGES) {
    const canon = canonical(queue.shift());
    if (pages.has(canon)) continue;
    const res = await fetch(BASE + canon);
    if (!res.ok) { console.warn("skip", canon, res.status); pages.set(canon, null); continue; }
    const html = await res.text();
    pages.set(canon, html);
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = decode(m[1]);
      if (!href.startsWith("/") || href.startsWith("//") || !allowed(href)) continue;
      const c = canonical(href);
      if (!pages.has(c)) queue.push(c);
    }
  }
  const crawled = [...pages.entries()].filter(([, h]) => h).map(([c]) => c);
  console.log(`crawled ${crawled.length} pages`);

  // Search index for client-side live search.
  const indexRes = await fetch(`${BASE}/api/search-index`);
  if (!indexRes.ok) throw new Error(`search index: HTTP ${indexRes.status}`);
  fs.writeFileSync(path.join(OUT, "assets", "search-index.json"), await indexRes.text());

  // Stylesheet: drop self-hosted @font-face rules (fonts come from Google Fonts in the static copy).
  const first = pages.get("/");
  const cssUrls = [...new Set([...first.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]))];
  let css = "";
  for (const u of cssUrls) css += (await (await fetch(BASE + u)).text()) + "\n";
  css = css.replace(/@font-face\{[^}]*\}/g, "").replace(/\.__variable_[a-z0-9]+\{[^}]*\}/g, "").replace(/\.__className_[a-z0-9]+\{[^}]*\}/g, "");
  fs.writeFileSync(path.join(OUT, "assets", "site.css"), css);
  const fontStyle = `:root{--font-inter:'Inter',ui-sans-serif,system-ui,sans-serif;--font-newsreader:'Newsreader',Georgia,serif}html{-webkit-font-smoothing:antialiased}`;

  // Official portraits (Parliament of Australia), with the initials fallback if any cannot be fetched.
  const portraitIds = new Set();
  for (const html of pages.values()) if (html) for (const m of html.matchAll(/https:\/\/www\.aph\.gov\.au\/api\/parliamentarian\/([A-Za-z0-9]+)\/image/g)) portraitIds.add(m[1]);
  const portraitOk = new Set();
  for (const id of portraitIds) {
    try {
      const r = await fetch(`https://www.aph.gov.au/api/parliamentarian/${id}/image`, { headers: { "User-Agent": UA } });
      if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) {
        fs.writeFileSync(path.join(OUT, "assets", "portraits", `${id}.jpg`), Buffer.from(await r.arrayBuffer()));
        portraitOk.add(id);
      }
    } catch (e) { console.warn("portrait failed", id, e.message); }
  }
  console.log(`portraits: ${portraitOk.size}/${portraitIds.size}`);

  const banner = `<div data-preview-banner class="bg-ink px-4 py-2 text-center text-xs text-paper">Static copy of the PUBLIC RECORD prototype, generated ${GENERATED}. Submitting corrections and reviewer decisions need the running app.</div>`;
  const fonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">`;

  function transform(canon, html) {
    const file = fileFor(canon);
    const dir = path.posix.dirname(file);
    const rel = (target) => path.posix.relative(dir === "." ? "" : dir, target) || "index.html";
    const rootRel = dir === "." ? "" : `${path.posix.relative(dir, "")}/`;
    let out = html;
    out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    out = out.replace(/<link[^>]+rel="(preload|modulepreload|icon)"[^>]*>/g, "");
    out = out.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, "");
    out = out.replace(/<meta name="next-size-adjust"[^>]*>/g, "");
    out = out.replace(/https:\/\/www\.aph\.gov\.au\/api\/parliamentarian\/([A-Za-z0-9]+)\/image/g, (m, id) => (portraitOk.has(id) ? rel(`assets/portraits/${id}.jpg`) : m));
    out = out.replace(/(href|action)="(\/[^"]*)"/g, (m, attr, raw) => {
      const href = decode(raw);
      if (href.startsWith("//")) return m;
      const c = canonical(href);
      const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
      if (c.startsWith("/search?")) return `${attr}="${rel("search/index.html")}?${c.slice("/search?".length)}"`;
      if (pages.get(c)) return `${attr}="${rel(fileFor(c))}${hash}"`;
      if (href.startsWith("/_next") || href === "/favicon.ico") return m;
      return `${attr}="#" data-snapshot-missing="${href}"`;
    });
    out = out.replace("</head>", `${fonts}<link rel="stylesheet" href="${rel("assets/site.css")}"><style>${fontStyle}</style></head>`);
    out = out.replace(/<body([^>]*)>/, (m, attrs) => `<body${attrs}>${banner}`);
    out = out.replace("</body>", `<script>window.__snapshot={root:${JSON.stringify(rootRel)}};</script><script src="${rel("assets/snapshot.js")}"></script></body>`);
    return { file, out };
  }

  for (const canon of crawled) {
    const { file, out } = transform(canon, pages.get(canon));
    const abs = path.join(OUT, file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, out);
  }
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  fs.writeFileSync(path.join(OUT, "404.html"), transform("/", pages.get("/")).out.replace(/<main[\s\S]*<\/main>/, `<main id="main" class="flex-1"><div class="mx-auto max-w-3xl px-4 py-20 text-center"><p class="label-caps text-ink-faint">404</p><h1 class="mt-2 font-serif text-3xl">No record at this address.</h1><p class="mt-3 text-sm text-ink-muted">Use the navigation above to find politicians, claims and matters.</p></div></main>`));

  fs.writeFileSync(path.join(OUT, "assets", "snapshot.js"), `(function () {
  var S = window.__snapshot || { root: "", searches: {} };
  document.querySelectorAll('[role="img"] img').forEach(function (img) {
    var reveal = function () { img.classList.remove("opacity-0"); img.classList.add("opacity-100"); var s = img.parentElement.querySelector("span"); if (s) s.hidden = true; };
    if (img.complete && img.naturalWidth > 0) reveal(); else img.addEventListener("load", reveal);
  });
  var ACTIVE = ["border-ink", "bg-ink", "text-paper"], INACTIVE = ["border-line-strong", "bg-surface", "text-ink-muted", "hover:border-ink", "hover:text-ink"];
  document.querySelectorAll("[data-directory]").forEach(function (ul) {
    var wrap = ul.parentElement, count = wrap.querySelector("[data-directory-count]"), current = "all";
    var items = Array.prototype.slice.call(ul.children);
    function apply() {
      var n = 0;
      items.forEach(function (li) { var show = current === "all" || li.getAttribute("data-party") === current; li.hidden = !show; if (show) n++; });
      if (count) count.textContent = n + " profile" + (n === 1 ? "" : "s") + ". Profiles are never ranked; default order is alphabetical.";
    }
    wrap.querySelectorAll("[data-filter-party]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = btn.getAttribute("data-filter-party");
        wrap.querySelectorAll("[data-filter-party]").forEach(function (b) { var on = b === btn; b.setAttribute("aria-pressed", on); ACTIVE.forEach(function (c) { b.classList.toggle(c, on); }); INACTIVE.forEach(function (c) { b.classList.toggle(c, !on); }); });
        apply();
      });
    });
    var sel = wrap.querySelector("[data-sort-select]");
    if (sel) sel.addEventListener("change", function () {
      items.sort(function (a, b) {
        if (sel.value === "position") { var d = Number(a.getAttribute("data-rank")) - Number(b.getAttribute("data-rank")); if (d) return d; }
        return a.getAttribute("data-sort-name").localeCompare(b.getAttribute("data-sort-name"));
      });
      items.forEach(function (li) { ul.appendChild(li); });
    });
  });
  var toggle = document.querySelector('button[aria-controls="mobile-nav"]');
  if (toggle) {
    var nav = document.getElementById("mobile-nav");
    if (!nav) {
      nav = document.createElement("nav"); nav.id = "mobile-nav"; nav.hidden = true; nav.className = "border-t border-line bg-paper lg:hidden";
      var list = document.createElement("ul"); list.className = "mx-auto max-w-7xl px-4 py-2 sm:px-6";
      document.querySelectorAll('nav[aria-label="Primary"] a').forEach(function (a) { var li = document.createElement("li"); var c = a.cloneNode(true); c.className = "block rounded px-2 py-2.5 text-sm text-ink hover:bg-paper-deep"; li.appendChild(c); list.appendChild(li); });
      nav.appendChild(list); toggle.closest("header").appendChild(nav);
    }
    toggle.addEventListener("click", function () { nav.hidden = !nav.hidden; toggle.setAttribute("aria-expanded", String(!nav.hidden)); });
  }
  function note(msg) { var n = document.createElement("div"); n.setAttribute("role", "status"); n.className = "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded bg-ink px-4 py-2 text-xs text-paper shadow"; n.textContent = msg; document.body.appendChild(n); setTimeout(function () { n.remove(); }, 4000); }
  // Live search: every search form navigates to the search page; the search page scores the index in the browser.
  document.querySelectorAll('form[role="search"]').forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (f.querySelector("input[name=q]").value || "").trim();
      if (q) location.href = S.root + "search/index.html?q=" + encodeURIComponent(q);
    });
  });
  var results = document.querySelector("[data-search-results]");
  if (results) {
    var q = (new URLSearchParams(location.search).get("q") || "").trim();
    if (q) {
      var input = document.querySelector('form[role="search"] input[name=q]');
      if (input) input.value = q;
      var examples = document.querySelector("[data-search-examples]");
      if (examples) examples.hidden = true;
      results.innerHTML = '<p class="mt-6 text-sm text-ink-muted">Searching…</p>';
      fetch(S.root + "assets/search-index.json").then(function (r) { return r.json(); }).then(function (ix) { renderSearch(q, ix.docs, results); }).catch(function () { results.innerHTML = '<p class="mt-6 text-sm text-ink-muted">Search is unavailable right now.</p>'; });
    }
  }
  function tokenize(t) { return t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(function (x) { return x.length > 1; }); }
  function score(text, q, tokens) { var s = 0; if (q.length > 2 && text.indexOf(q) >= 0) s += 4; tokens.forEach(function (t) { if (text.indexOf(t) >= 0) s += 1; }); return s; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var TONE = { green: ["bg-status-green-bg text-status-green", "bg-status-green"], "green-soft": ["bg-status-green-soft-bg text-status-green-soft", "bg-status-green-soft"], amber: ["bg-status-amber-bg text-status-amber", "bg-status-amber"], red: ["bg-status-red-bg text-status-red", "bg-status-red"], grey: ["bg-status-grey-bg text-status-grey", "bg-status-grey"], slate: ["bg-status-slate-bg text-status-slate", "bg-status-slate"], blue: ["bg-status-blue-bg text-status-blue", "bg-status-blue"] };
  function badge(st, prominent) { var t = TONE[st.tone] || TONE.grey; return '<span class="inline-flex items-center gap-1.5 rounded font-semibold leading-tight px-2 py-0.5 text-xs ' + t[0] + (prominent ? ' border uppercase tracking-wide' : '') + '"><span class="h-1.5 w-1.5 shrink-0 rounded-full ' + t[1] + '"></span>' + esc(st.label) + '</span>'; }
  function party(p) { return p ? '<span class="inline-flex items-center gap-1.5 text-xs text-ink-muted"><span class="h-2 w-2 shrink-0 rounded-full" style="background-color:' + esc(p.colour) + '"></span>' + esc(p.shortName) + '</span>' : ""; }
  function demo(d) { return d ? '<span class="inline-flex items-center gap-1 rounded border border-dashed border-line-strong bg-paper px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">Demonstration data</span>' : ""; }
  function href(d) { return S.root + d.href.replace(/^\//, "") + "/index.html"; }
  function who(d) { return d.politician ? '<a href="' + S.root + "politicians/" + esc(d.politician.slug) + '/index.html" class="font-medium text-ink hover:underline">' + esc(d.politician.name) + '</a><span class="mx-1.5 text-ink-faint">·</span>' + party(d.party) + '<span class="mx-1.5 text-ink-faint">·</span>' : ""; }
  function card(d) {
    if (d.type === "politician") return '<li><a href="' + href(d) + '" class="flex h-full flex-col rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"><h3 class="font-semibold text-ink">' + esc(d.title) + '</h3><p class="mt-0.5">' + party(d.party) + '</p><p class="mt-1 text-xs text-ink-muted">' + esc(d.subtitle) + '</p><p class="mt-0.5 text-xs text-ink-faint">' + esc(d.excerpt) + '</p>' + (d.demo ? '<p class="mt-3">' + demo(true) + '</p>' : '') + '</a></li>';
    if (d.type === "issue") return '<li><a href="' + href(d) + '" class="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm hover:border-ink">' + esc(d.title) + '</a></li>';
    var tags = (d.tags || []).map(function (t) { return '<span class="rounded bg-paper-deep px-1.5 py-0.5">' + esc(t) + '</span>'; }).join(" ");
    var head = '<div class="flex flex-wrap items-center gap-2">' + (d.status ? badge(d.status, d.type !== "claim") : "") + demo(d.demo) + '</div>';
    var title = '<h3 class="mt-3 font-serif text-xl leading-snug text-ink"><a href="' + href(d) + '" class="hover:underline hover:underline-offset-4">' + (d.type === "claim" ? "“" + esc(d.title) + "”" : esc(d.title)) + '</a></h3>';
    var meta = '<p class="mt-2 text-xs text-ink-muted">' + who(d) + esc(d.dateLabel || "") + (d.subtitle ? '<span class="mx-1.5 text-ink-faint">·</span>' + esc(d.subtitle) : "") + '</p>';
    var body = d.type === "claim"
      ? '<div class="mt-3 border-l-2 border-line-strong pl-3"><p class="label-caps text-ink-faint">What the evidence shows</p><p class="mt-1 text-sm leading-relaxed text-ink">' + esc(d.excerpt) + '</p></div>'
      : d.type === "conduct"
        ? '<div class="mt-3 grid gap-3 md:grid-cols-2"><div><p class="label-caps text-ink-faint">What was alleged</p><p class="mt-1 text-sm leading-relaxed">' + esc(d.excerpt) + '</p></div><div class="rounded border px-3 py-2 ' + (TONE[d.status.tone] || TONE.grey)[0] + '"><p class="label-caps opacity-80">Current status</p><p class="mt-0.5 text-sm font-semibold uppercase tracking-wide">' + esc(d.status.banner) + '</p></div></div>'
        : '<p class="mt-3 text-sm leading-relaxed text-ink">' + esc(d.excerpt) + '</p>';
    var foot = '<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">' + (tags ? '<span class="inline-flex flex-wrap items-center gap-1.5">' + tags + '</span>' : "") + '<a href="' + href(d) + '" class="ml-auto font-semibold tracking-wide text-ink hover:underline">SHOW THE EVIDENCE →</a></div>';
    return '<li><article class="rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">' + head + title + meta + body + foot + '</article></li>';
  }
  function renderSearch(q, docs, el) {
    var ql = q.toLowerCase(), tokens = tokenize(ql);
    var hits = docs.map(function (d) { return { d: d, s: score(d.text, ql, tokens) }; }).filter(function (h) { return h.s > 0; }).sort(function (a, b) { return b.s - a.s || String(b.d.date || "").localeCompare(String(a.d.date || "")); }).map(function (h) { return h.d; });
    var groups = [["politician", "Politicians", "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"], ["issue", "Issues", "flex flex-wrap gap-2"], ["claim", "Claims", "space-y-4"], ["integrity", "Integrity matters", "space-y-4"], ["conduct", "Serious conduct matters", "space-y-4"]];
    var html = '<p class="mt-6 text-sm text-ink-muted">' + (hits.length ? hits.length + " result" + (hits.length === 1 ? "" : "s") : "No results") + ' for “' + esc(q) + '”.</p>';
    groups.forEach(function (g) {
      var items = hits.filter(function (d) { return d.type === g[0]; });
      if (!items.length) return;
      html += '<section class="mt-8"><h2 class="label-caps mb-3 flex items-center gap-2 text-ink-faint">' + g[1] + ' <span class="font-mono text-ink-muted">' + items.length + '</span></h2><ul class="' + g[2] + '">' + items.map(card).join("") + '</ul></section>';
    });
    el.innerHTML = html;
  }
  document.querySelectorAll("form:not([role=search])").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); note("Submissions and reviewer decisions need the running app."); });
  });
  document.querySelectorAll("[data-snapshot-missing]").forEach(function (a) {
    a.classList.add("opacity-60");
    a.addEventListener("click", function (e) { e.preventDefault(); note("This filter combination is not included in the static copy."); });
  });
})();
`);
  const total = crawled.length;
  console.log(`wrote ${total} pages to ${OUT}`);
} finally {
  if (server) {
    try { process.platform === "win32" ? server.kill() : process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGKILL"); }
  }
}
process.exit(0);
