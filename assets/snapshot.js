/*
 * Browser script for the static copy of PUBLIC RECORD (copied to assets/snapshot.js by
 * scripts/build-static-snapshot.mjs). It restores the small amount of interactivity the
 * server-rendered pages need without the app's JavaScript: portrait fade-in, party filters
 * and sort order, the mobile menu, and live search over assets/search-index.json.
 */
(function () {
  var S = window.__snapshot || { root: "" };

  // Portraits: reveal only once loaded; initials stay otherwise.
  document.querySelectorAll('[role="img"] img').forEach(function (img) {
    var reveal = function () {
      img.classList.remove("opacity-0");
      img.classList.add("opacity-100");
      var s = img.parentElement.querySelector("span");
      if (s) s.hidden = true;
    };
    if (img.complete && img.naturalWidth > 0) reveal();
    else img.addEventListener("load", reveal);
  });

  // Party filters and sort order for each politician directory.
  var ACTIVE = ["border-ink", "bg-ink", "text-paper"];
  var INACTIVE = ["border-line-strong", "bg-surface", "text-ink-muted", "hover:border-ink", "hover:text-ink"];
  document.querySelectorAll("[data-directory]").forEach(function (ul) {
    var wrap = ul.parentElement;
    var count = wrap.querySelector("[data-directory-count]");
    var current = "all";
    var items = Array.prototype.slice.call(ul.children);
    function apply() {
      var n = 0;
      items.forEach(function (li) {
        var show = current === "all" || li.getAttribute("data-party") === current;
        li.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = n + " profile" + (n === 1 ? "" : "s") + ". Profiles are never ranked; default order is alphabetical.";
    }
    wrap.querySelectorAll("[data-filter-party]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = btn.getAttribute("data-filter-party");
        wrap.querySelectorAll("[data-filter-party]").forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-pressed", on);
          ACTIVE.forEach(function (c) { b.classList.toggle(c, on); });
          INACTIVE.forEach(function (c) { b.classList.toggle(c, !on); });
        });
        apply();
      });
    });
    var sel = wrap.querySelector("[data-sort-select]");
    if (sel) {
      sel.addEventListener("change", function () {
        items.sort(function (a, b) {
          if (sel.value === "position") {
            var d = Number(a.getAttribute("data-rank")) - Number(b.getAttribute("data-rank"));
            if (d) return d;
          }
          return a.getAttribute("data-sort-name").localeCompare(b.getAttribute("data-sort-name"));
        });
        items.forEach(function (li) { ul.appendChild(li); });
      });
    }
  });

  // Mobile menu.
  var toggle = document.querySelector('button[aria-controls="mobile-nav"]');
  if (toggle) {
    var nav = document.getElementById("mobile-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "mobile-nav";
      nav.hidden = true;
      nav.className = "border-t border-line bg-paper lg:hidden";
      var list = document.createElement("ul");
      list.className = "mx-auto max-w-7xl px-4 py-2 sm:px-6";
      document.querySelectorAll('nav[aria-label="Primary"] a').forEach(function (a) {
        var li = document.createElement("li");
        var c = a.cloneNode(true);
        c.className = "block rounded px-2 py-2.5 text-sm text-ink hover:bg-paper-deep";
        li.appendChild(c);
        list.appendChild(li);
      });
      nav.appendChild(list);
      toggle.closest("header").appendChild(nav);
    }
    toggle.addEventListener("click", function () {
      nav.hidden = !nav.hidden;
      toggle.setAttribute("aria-expanded", String(!nav.hidden));
    });
  }

  function note(msg) {
    var n = document.createElement("div");
    n.setAttribute("role", "status");
    n.className = "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded bg-ink px-4 py-2 text-xs text-paper shadow";
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 4000);
  }

  // Live search: every search form navigates to the search page, which scores the index in the browser.
  document.querySelectorAll('form[role="search"]').forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (f.querySelector("input[name=q]").value || "").trim();
      if (q) location.href = S.root + "search/index.html?q=" + encodeURIComponent(q);
    });
  });

  var results = document.querySelector("[data-search-results]");
  if (results) {
    var query = (new URLSearchParams(location.search).get("q") || "").trim();
    if (query) {
      var input = document.querySelector('form[role="search"] input[name=q]');
      if (input) input.value = query;
      var examples = document.querySelector("[data-search-examples]");
      if (examples) examples.hidden = true;
      results.innerHTML = '<p class="mt-6 text-sm text-ink-muted">Searching…</p>';
      fetch(S.root + "assets/search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (ix) { renderSearch(query, ix.docs, results); })
        .catch(function () { results.innerHTML = '<p class="mt-6 text-sm text-ink-muted">Search is unavailable right now.</p>'; });
    }
  }

  function tokenize(t) {
    return t
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(function (x) { return x.length > 1; });
  }
  function score(text, q, tokens) {
    var s = 0;
    if (q.length > 2 && text.indexOf(q) >= 0) s += 4;
    tokens.forEach(function (t) { if (text.indexOf(t) >= 0) s += 1; });
    return s;
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var TONE = {
    green: ["bg-status-green-bg text-status-green", "bg-status-green"],
    "green-soft": ["bg-status-green-soft-bg text-status-green-soft", "bg-status-green-soft"],
    amber: ["bg-status-amber-bg text-status-amber", "bg-status-amber"],
    red: ["bg-status-red-bg text-status-red", "bg-status-red"],
    grey: ["bg-status-grey-bg text-status-grey", "bg-status-grey"],
    slate: ["bg-status-slate-bg text-status-slate", "bg-status-slate"],
    blue: ["bg-status-blue-bg text-status-blue", "bg-status-blue"],
  };
  function badge(st, prominent) {
    var t = TONE[st.tone] || TONE.grey;
    return '<span class="inline-flex items-center gap-1.5 rounded font-semibold leading-tight px-2 py-0.5 text-xs ' + t[0] + (prominent ? " border uppercase tracking-wide" : "") + '"><span class="h-1.5 w-1.5 shrink-0 rounded-full ' + t[1] + '"></span>' + esc(st.label) + "</span>";
  }
  function party(p) {
    return p ? '<span class="inline-flex items-center gap-1.5 text-xs text-ink-muted"><span class="h-2 w-2 shrink-0 rounded-full" style="background-color:' + esc(p.colour) + '"></span>' + esc(p.shortName) + "</span>" : "";
  }
  function demo(d) {
    return d ? '<span class="inline-flex items-center gap-1 rounded border border-dashed border-line-strong bg-paper px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">Demonstration data</span>' : "";
  }
  function href(d) {
    return S.root + d.href.replace(/^\//, "") + "/index.html";
  }
  function who(d) {
    return d.politician
      ? '<a href="' + S.root + "politicians/" + esc(d.politician.slug) + '/index.html" class="font-medium text-ink hover:underline">' + esc(d.politician.name) + '</a><span class="mx-1.5 text-ink-faint">·</span>' + party(d.party) + '<span class="mx-1.5 text-ink-faint">·</span>'
      : "";
  }
  function card(d) {
    if (d.type === "politician") {
      return '<li><a href="' + href(d) + '" class="flex h-full flex-col rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"><h3 class="font-semibold text-ink">' + esc(d.title) + '</h3><p class="mt-0.5">' + party(d.party) + '</p><p class="mt-1 text-xs text-ink-muted">' + esc(d.subtitle) + '</p><p class="mt-0.5 text-xs text-ink-faint">' + esc(d.excerpt) + "</p>" + (d.demo ? '<p class="mt-3">' + demo(true) + "</p>" : "") + "</a></li>";
    }
    if (d.type === "issue") {
      return '<li><a href="' + href(d) + '" class="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm hover:border-ink">' + esc(d.title) + "</a></li>";
    }
    var tags = (d.tags || []).map(function (t) { return '<span class="rounded bg-paper-deep px-1.5 py-0.5">' + esc(t) + "</span>"; }).join(" ");
    var head = '<div class="flex flex-wrap items-center gap-2">' + (d.status ? badge(d.status, d.type !== "claim") : "") + demo(d.demo) + "</div>";
    var title = '<h3 class="mt-3 font-serif text-xl leading-snug text-ink"><a href="' + href(d) + '" class="hover:underline hover:underline-offset-4">' + (d.type === "claim" ? "“" + esc(d.title) + "”" : esc(d.title)) + "</a></h3>";
    var meta = '<p class="mt-2 text-xs text-ink-muted">' + who(d) + esc(d.dateLabel || "") + (d.subtitle ? '<span class="mx-1.5 text-ink-faint">·</span>' + esc(d.subtitle) : "") + "</p>";
    var body;
    if (d.type === "claim") {
      body = '<div class="mt-3 border-l-2 border-line-strong pl-3"><p class="label-caps text-ink-faint">What the evidence shows</p><p class="mt-1 text-sm leading-relaxed text-ink">' + esc(d.excerpt) + "</p></div>";
    } else if (d.type === "conduct") {
      body = '<div class="mt-3 grid gap-3 md:grid-cols-2"><div><p class="label-caps text-ink-faint">What was alleged</p><p class="mt-1 text-sm leading-relaxed">' + esc(d.excerpt) + '</p></div><div class="rounded border px-3 py-2 ' + (TONE[d.status.tone] || TONE.grey)[0] + '"><p class="label-caps opacity-80">Current status</p><p class="mt-0.5 text-sm font-semibold uppercase tracking-wide">' + esc(d.status.banner) + "</p></div></div>";
    } else {
      body = '<p class="mt-3 text-sm leading-relaxed text-ink">' + esc(d.excerpt) + "</p>";
    }
    var foot = '<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">' + (tags ? '<span class="inline-flex flex-wrap items-center gap-1.5">' + tags + "</span>" : "") + '<a href="' + href(d) + '" class="ml-auto font-semibold tracking-wide text-ink hover:underline">SHOW THE EVIDENCE →</a></div>';
    return '<li><article class="rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">' + head + title + meta + body + foot + "</article></li>";
  }
  function renderSearch(q, docs, el) {
    var ql = q.toLowerCase();
    var tokens = tokenize(ql);
    var hits = docs
      .map(function (d) { return { d: d, s: score(d.text, ql, tokens) }; })
      .filter(function (h) { return h.s > 0; })
      .sort(function (a, b) { return b.s - a.s || String(b.d.date || "").localeCompare(String(a.d.date || "")); })
      .map(function (h) { return h.d; });
    var groups = [
      ["politician", "Politicians", "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"],
      ["issue", "Issues", "flex flex-wrap gap-2"],
      ["claim", "Claims", "space-y-4"],
      ["integrity", "Integrity matters", "space-y-4"],
      ["conduct", "Serious conduct matters", "space-y-4"],
    ];
    var html = '<p class="mt-6 text-sm text-ink-muted">' + (hits.length ? hits.length + " result" + (hits.length === 1 ? "" : "s") : "No results") + " for “" + esc(q) + "”.</p>";
    groups.forEach(function (g) {
      var items = hits.filter(function (d) { return d.type === g[0]; });
      if (!items.length) return;
      html += '<section class="mt-8"><h2 class="label-caps mb-3 flex items-center gap-2 text-ink-faint">' + g[1] + ' <span class="font-mono text-ink-muted">' + items.length + '</span></h2><ul class="' + g[2] + '">' + items.map(card).join("") + "</ul></section>";
    });
    el.innerHTML = html;
  }

  // Forms that need the server, and links to pages the static copy does not include.
  document.querySelectorAll("form:not([role=search])").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      note("Submissions and reviewer decisions need the running app.");
    });
  });
  document.querySelectorAll("[data-snapshot-missing]").forEach(function (a) {
    a.classList.add("opacity-60");
    a.addEventListener("click", function (e) {
      e.preventDefault();
      note("This filter combination is not included in the static copy.");
    });
  });
})();
