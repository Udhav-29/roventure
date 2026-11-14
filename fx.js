// Shared animation effects for every page
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(pointer: fine)").matches;
if (!REDUCED) document.documentElement.classList.add("js");

// call initFX() again whenever new cards are added to the page
function initFX() {
  if (REDUCED) {
    document.querySelectorAll("[data-count]").forEach(el => el.textContent = el.dataset.count);
    return;
  }

  // reveal on scroll
  if (!window._io) {
    window._io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      window._io.unobserve(e.target);
      setTimeout(() => e.target.classList.add("done"), 1400);
    }), { threshold: 0.12 });
  }
  document.querySelectorAll(".reveal:not([data-fx]), .card:not([data-fx]), .cat:not([data-fx])")
    .forEach((el, i) => {
      el.dataset.fx = "1";
      el.classList.add("reveal");
      el.style.setProperty("--d", (i % 8) * 70 + "ms");
      window._io.observe(el);
    });

  // 3D tilt on cards
  if (FINE) document.querySelectorAll(".card:not([data-tilt])").forEach(el => {
    el.dataset.tilt = "1";
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-8px)`;
    });
    el.addEventListener("mouseleave", () => el.style.transform = "");
  });

  // colour spotlight that follows the mouse on category tiles
  document.querySelectorAll(".cat:not([data-spot])").forEach(el => {
    el.dataset.spot = "1";
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", (e.clientX - r.left) + "px");
      el.style.setProperty("--y", (e.clientY - r.top) + "px");
    });
  });

  // numbers that count up
  document.querySelectorAll("[data-count]:not([data-cfx])").forEach(el => {
    el.dataset.cfx = "1";
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const end = Number(el.dataset.count), t0 = performance.now();
      (function tick(t) {
        const p = Math.min(1, (t - t0) / 1400);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
    io.observe(el);
  });
}

// effects that are set up once
(function () {
  const bar = document.querySelector(".progress");
  addEventListener("scroll", () => {
    const h = document.documentElement;
    if (bar) bar.style.transform =
      `scaleX(${h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)})`;
    document.querySelector(".nav")?.classList.toggle("scrolled", scrollY > 40);
  }, { passive: true });

  // cursor ring that follows the mouse
  if (FINE && !REDUCED) {
    const c = document.createElement("div");
    c.className = "cursor";
    document.body.appendChild(c);
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener("mousemove", e => {
      tx = e.clientX; ty = e.clientY;
      c.classList.toggle("big", !!e.target.closest("a, button"));
    });
    (function loop() {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      c.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(loop);
    })();
  }
})();
