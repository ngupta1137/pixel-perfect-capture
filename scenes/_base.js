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
