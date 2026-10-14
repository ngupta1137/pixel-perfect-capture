// Tiny helpers shared by the scenes. The runner calls window.__beat(i, durationMs) when narration line i starts.
window.$ = (s, r = document) => r.querySelector(s);
window.$$ = (s, r = document) => [...r.querySelectorAll(s)];
window.at = (ms, fn) => setTimeout(fn, Math.max(0, ms));
window.show = (el, ms = 0) => { if (typeof el === "string") el = $(el); at(ms, () => { el.classList.remove("hid", "out"); el.classList.add("in"); }); };
window.hide = (el, ms = 0) => { if (typeof el === "string") el = $(el); at(ms, () => { el.classList.add("out"); }); };
window.type = (el, text, ms, total) => { if (typeof el === "string") el = $(el); const step = total / text.length; [...text].forEach((c, i) => at(ms + i * step, () => { el.textContent = text.slice(0, i + 1); })); };
window.beats = {};
window.__beat = (i, d) => { const f = window.beats[i]; if (f) f(d); };
window.LOGO = (cls = "") => `<svg class="${cls}" viewBox="0 0 120 120"><g stroke="#4E8416" stroke-width="9" stroke-linecap="round"><line class="l1" x1="60" y1="100" x2="22" y2="22"/><line class="l2" x1="60" y1="100" x2="60" y2="16"/><line class="l3" x1="60" y1="100" x2="98" y2="22"/></g><g fill="#4E8416"><circle cx="22" cy="22" r="8"/><circle cx="60" cy="16" r="8"/><circle cx="98" cy="22" r="8"/></g><circle cx="60" cy="100" r="13" fill="#5EA908"/></svg>`;
// Flowing logo: information pulses travel from the bottom node (foundation) up to the three top nodes (consumption).
window.flowLogo = (svg, o = {}) => {
  const NS = "http://www.w3.org/2000/svg", root = [60, 100], ends = [[22, 22], [60, 16], [98, 22]];
  const g = document.createElementNS(NS, "g"); svg.appendChild(g);
  const nodes = [...svg.querySelectorAll("g:nth-of-type(2) circle")];
  const dots = []; ends.forEach((e, i) => [0, 1, 2].forEach((k) => { const c = document.createElementNS(NS, "circle"); c.setAttribute("r", 3.6); c.setAttribute("fill", o.color || "#d6f7a3"); g.appendChild(c); dots.push({ c, e, i, k }); }));
  const root0 = svg.querySelector("circle:last-of-type"); let run = true; const t0 = performance.now();
  const frame = (now) => {
    if (!run) return; const s = (now - t0) / 1000 * (o.speed || 0.55);
    dots.forEach(({ c, e, i, k }) => { const t = (s + k / 3 + i * 0.09) % 1, p = t * t * (3 - 2 * t); c.setAttribute("cx", root[0] + (e[0] - root[0]) * p); c.setAttribute("cy", root[1] + (e[1] - root[1]) * p); c.setAttribute("opacity", Math.sin(Math.PI * t) * 0.95); });
    nodes.forEach((n, i) => { const t = (s + 2 / 3 + i * 0.09) % 1; n.setAttribute("r", 8 + 4.5 * Math.max(0, 1 - Math.abs(t - 0.97) * 14)); });
    if (root0) root0.setAttribute("r", 13 + 2.5 * Math.sin(s * 6.28));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame); return () => { run = false; };
};
