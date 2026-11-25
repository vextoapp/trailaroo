// Helpers for the Golden hour mock-ups (home, explore, trail): real trails from data.js, photos, the elevation scrub. No dependencies.
(function () {
  const T = window.TRAILS;
  const credits = window.PHOTO_CREDITS;
  const byName = (n) => T.find((t) => t.name === n);
  const photo = (id) => `photos/${id}.jpg`;
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  // SAMPLE elevation profile until M1 computes real ones: smooth, deterministic, totals about t.up metres of climb.
  function profile(t, n = 64) {
    let seed = hash(t.name);
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const k = [rnd(), rnd(), rnd()];
    const raw = Array.from({ length: n }, (_, i) => {
      const x = i / (n - 1);
      return Math.sin(x * Math.PI * (0.8 + k[0])) * 0.6 + Math.sin(x * Math.PI * (2 + k[1] * 3)) * 0.25 + x * (k[2] - 0.3) * 0.5;
    });
    let climb = 0;
    for (let i = 1; i < n; i++) climb += Math.max(0, raw[i] - raw[i - 1]);
    const scale = climb ? t.up / climb : 0;
    const base = 560 + (hash(t.name) % 300);
    const min = Math.min(...raw);
    return raw.map((v) => Math.round(base + (v - min) * scale));
  }

  function profilePath(pts, w, h, pad = 4) {
    const lo = Math.min(...pts), hi = Math.max(...pts), span = Math.max(hi - lo, 20);
    const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - pad - ((v - lo) / span) * (h - 2 * pad)]);
    const line = `M${xy.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join("L")}`;
    return { line, area: `${line}L${w} ${h}L0 ${h}Z`, lo, hi };
  }

  const route = (t, cls = "route") => `<svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><path class="${cls}-casing" d="${t.path}"/><path class="${cls}" d="${t.path}"/></svg>`;
  const credit = (id) => { const c = credits[id]; return c ? `Photo: <a href="${c.page}">${c.author}</a>, ${c.licence}` : ""; };
  const km = (t) => `${t.km.toLocaleString("en-AU")} km`;

  // Signature interaction: scrub the elevation profile (pointer, touch or keyboard) and a dot follows the route.
  function wireScrub(root) {
    const t = byName(root.dataset.trail);
    const pts = profile(t);
    const range = root.querySelector("input[type=range]");
    const routePath = root.querySelector(".scrub-route");
    const dot = root.querySelector(".scrub-dot");
    const cursor = root.querySelector(".scrub-cursor");
    const readout = root.querySelector(".scrub-readout");
    const len = routePath.getTotalLength();
    const update = () => {
      const f = range.valueAsNumber / 1000;
      const p = routePath.getPointAtLength(f * len);
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      root.style.setProperty("--f", f);
      const elev = pts[Math.round(f * (pts.length - 1))];
      const dist = (f * t.km).toFixed(1);
      readout.textContent = `${dist} km · ${elev} m`;
      range.setAttribute("aria-valuetext", `${dist} kilometres in, ${elev} metres elevation`);
    };
    range.addEventListener("input", update);
    update();
  }

  // Screens inside one direction: #first-visit, #explore, #trail.
  function wireScreens() {
    const show = () => {
      const id = location.hash.slice(1) || "first-visit";
      document.querySelectorAll("[data-screen-panel]").forEach((s) => { s.hidden = s.dataset.screenPanel !== id; });
      document.querySelectorAll("[data-screen-link]").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === `#${id}` ? "page" : "false"));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", show);
    show();
  }

  // Images are written as data-photo="id" and filled here, so every page shares one photo folder.
  const fillPhotos = (root = document) => {
    root.querySelectorAll("img[data-photo]").forEach((img) => { img.src = photo(img.dataset.photo); });
    root.querySelectorAll("img[data-mapimg]").forEach((img) => { img.src = `maps/${img.dataset.mapimg}.jpg`; });
    // A map image that follows the theme: data-themed-map="act" -> maps/act-light.jpg or act-dark.jpg.
    const themed = () => root.querySelectorAll("img[data-themed-map]").forEach((img) => { img.src = `maps/${img.dataset.themedMap}-${document.documentElement.dataset.theme === "dark" ? "dark" : "light"}.jpg`; });
    themed();
    new MutationObserver(themed).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };

  // A real rendered map (light and dark) with the route drawn on top in the direction's own colour.
  function trailMap(name, mapId) {
    const r = window.ROUTE_PX[name];
    const m = r.path.match(/M([\d.]+) ([\d.]+)/);
    return `<img class="map-img only-light" data-mapimg="${mapId}-light" alt=""><img class="map-img only-dark" data-mapimg="${mapId}-dark" alt="">
      <svg class="map-overlay" viewBox="0 0 ${r.w} ${r.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path class="route-casing" d="${r.path}"/><path class="route scrub-route" d="${r.path}"/>
        <circle class="start-pin" cx="${m[1]}" cy="${m[2]}" r="9"/><circle class="scrub-dot" r="11"/></svg>`;
  }

  // A Golden hour trail card: photo with a mini route map, or a drawn cover when there's no photo.
  const label = { easy: "Easy", moderate: "Moderate", hard: "Hard" };
  window.cardHtml = (t) => `<article class="pcard">
      <div class="cover${t.photos.length ? "" : " drawn"}">${t.photos.length ? `<img data-photo="${t.photos[0]}" alt="" loading="lazy"><span class="chip-map">${route(t)}</span>` : route(t)}</div>
      <button type="button" class="heart" data-save aria-pressed="false" aria-label="Save ${t.name}"><svg class="icon-s" aria-hidden="true"><use href="icons.svg#i-saved"/></svg></button>
      <div><h3><a class="title-link" href="trail.html">${t.name}</a></h3><p class="meta num">${t.away} km away · ${km(t)} · ${t.time} · ${label[t.diff]}</p></div></article>`;

  window.Dir = { fillPhotos, trailMap, T, byName, photo, profile, profilePath, route, credit, km, wireScrub, wireScreens };
})();
