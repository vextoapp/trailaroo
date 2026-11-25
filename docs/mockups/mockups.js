// Shared behaviour for the mock-ups. Loaded as a classic script in <head>
// so the theme is set before first paint. No dependencies.
(function () {
  const APP_NAME = "Trailaroo"; // the one place the app name lives
  const KEY = "ot-mockup-theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: light)");

  function stored() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function store(mode) {
    try { localStorage.setItem(KEY, mode); } catch { /* private mode: theme just isn't remembered */ }
  }

  let mode = new URLSearchParams(location.search).get("theme") || stored() || "system";

  function apply() {
    const resolved = mode === "system" ? (media.matches ? "light" : "dark") : mode;
    root.dataset.theme = resolved;
    root.dataset.themeMode = mode;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.append(meta); }
    meta.content = getComputedStyle(root).getPropertyValue("--bg").trim(); // tokens.css is the one source
    document.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === mode)));
    document.querySelectorAll('input[name="theme"]').forEach((i) => { i.checked = i.value === mode; });
  }

  // Opened from disk the origin is "null", which postMessage can't target; use "*" then.
  const target = location.origin === "null" ? "*" : location.origin;
  const postTheme = (f) => f.contentWindow?.postMessage({ type: "theme", mode }, target);

  function setTheme(next, { persist = true } = {}) {
    mode = next;
    if (persist) store(mode);
    apply();
    document.querySelectorAll("iframe").forEach(postTheme);
  }

  media.addEventListener("change", () => { if (mode === "system") apply(); });
  window.addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data?.type === "theme") setTheme(e.data.mode, { persist: false });
  });
  apply();
  document.title += ` · ${APP_NAME}`; // titles hold only the page name

  // ---------- navigation (built once here so all six screens share it) ----------
  const NAV = [
    ["explore", "Explore", "i-explore"],
    ["saved", "Saved", "i-saved"],
    ["record", "Record", "i-record"],
    ["activity", "Activity", "i-activity"],
    ["profile", "You", "i-you"],
  ];
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`;

  function buildNav() {
    const nav = document.querySelector("nav.nav");
    if (!nav) return;
    const screen = document.body.dataset.screen;
    const current = screen === "trail" ? "explore" : screen; // a trail page sits under Explore
    nav.innerHTML =
      `<a class="brand" href="explore.html"><svg class="brand-mark" aria-hidden="true"><use href="icons.svg#i-mark"/></svg><span data-app-name translate="no"></span></a>` +
      `<ul>${NAV.map(([id, label, ic]) =>
        `<li><a href="${id}.html" class="nav-${id}"${id === current ? ' aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></a></li>`
      ).join("")}</ul>` +
      `<button type="button" class="nav-theme" data-theme-cycle>${icon("i-theme")}<span>Theme</span></button>`;
  }

  // ---------- small interactions ----------
  function init() {
    buildNav();
    document.querySelectorAll("[data-app-name]").forEach((el) => { el.textContent = APP_NAME; });
    apply();

    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t) return;

      if (t.matches("[data-theme-choice]")) setTheme(t.dataset.themeChoice);
      if (t.matches("[data-theme-cycle]")) setTheme(root.dataset.theme === "dark" ? "light" : "dark");

      // Chip: toggles on and off. In a [data-single] group, only one stays on.
      if (t.matches(".chip[aria-pressed], .chip-cat[aria-pressed]")) {
        const group = t.closest("[data-single]");
        if (group) group.querySelectorAll(".chip[aria-pressed], .chip-cat[aria-pressed]").forEach((c) => c.setAttribute("aria-pressed", "false"));
        t.setAttribute("aria-pressed", group ? "true" : String(t.getAttribute("aria-pressed") !== "true"));
      }

      // Save button: toggles on and off, swapping the outline icon for the filled one.
      if (t.matches("[data-save]")) {
        const on = t.getAttribute("aria-pressed") !== "true";
        t.setAttribute("aria-pressed", String(on));
        t.querySelector("use").setAttribute("href", `icons.svg#i-saved${on ? "-fill" : ""}`);
      }

      // data-set="view=map" sets <body data-view="map">; CSS decides what shows.
      if (t.dataset.set) {
        const [k, v] = t.dataset.set.split("=");
        document.body.dataset[k] = v;
        document.querySelectorAll(`[role="group"] [data-set^="${k}="]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === t.dataset.set)));
        document.querySelector(`[data-focus-on="${t.dataset.set}"]`)?.focus();
      }

      // data-toggle="id" shows or hides one element.
      if (t.dataset.toggle) {
        const target = document.getElementById(t.dataset.toggle);
        target.hidden = !target.hidden;
        t.setAttribute("aria-expanded", String(!target.hidden));
      }

      // Sheets are native <dialog>s: Escape and focus return come for free.
      if (t.dataset.openSheet) document.getElementById(t.dataset.openSheet).showModal();
      if (t.matches("[data-close]")) t.closest("dialog").close();
    });

    // Clicking the dimmed backdrop closes a sheet.
    document.querySelectorAll("dialog.sheet").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

    // Tabs: role="tablist" with buttons whose aria-controls name a panel.
    document.querySelectorAll('[role="tablist"]').forEach((list) => {
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      const select = (tab) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        });
        tab.focus();
      };
      list.addEventListener("click", (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
      list.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
        if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
      });
    });

    // Theme radios on the Profile screen.
    document.querySelectorAll('input[name="theme"]').forEach((i) => i.addEventListener("change", () => setTheme(i.value)));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.MockUps = { APP_NAME, setTheme, postTheme, themeMode: () => mode };
})();
