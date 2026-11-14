// ---------- connection to the database ----------
const CONFIG_OK = /^https:\/\//.test(SUPABASE_URL);
const sb = supabase.createClient(
  CONFIG_OK ? SUPABASE_URL : "https://example.supabase.co",
  CONFIG_OK ? SUPABASE_KEY : "missing"
);

// ---------- categories ----------
const CATS = [
  ["Adventure", "🪂"], ["Water Sports", "🌊"], ["Museums & Heritage", "🏛️"],
  ["Theme Parks", "🎢"], ["Wellness & Spa", "🌿"], ["Farm & Factory Tours", "☕"],
  ["Culture & Workshops", "🎭"], ["Nature & Wildlife", "🐅"]
];
const STAMP_COLOURS = ["var(--coral)", "var(--teal)", "var(--gold)", "var(--green2)"];
const catIcon = name => (CATS.find(c => c[0] === name) || ["", "📍"])[1];

// ---------- small helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = n => "₹" + Number(n).toLocaleString("en-IN");
const fmtTime = t => {
  const [h, m] = t.split(":").map(Number);
  return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " AM" : " PM");
};
const fmtDur = m => m < 60 ? m + " min"
  : (m % 60 ? Math.floor(m / 60) + " hr " + (m % 60) + " min" : (m / 60) + " hr");

function toast(msg, bad) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---------- who is logged in ----------
let _profile;
async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}
async function getProfile() {
  if (_profile !== undefined) return _profile;
  const user = await getUser();
  if (!user) return (_profile = null);
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (_profile = data ?? null);
}
function goLogin() {
  const here = location.pathname.split("/").pop() + location.search;
  location.href = "login.html?next=" + encodeURIComponent(here || "index.html");
}
async function logout() {
  await sb.auth.signOut();
  location.href = "index.html";
}

// ---------- header and footer on every page ----------
async function renderChrome() {
  let p = null;
  try { p = await getProfile(); } catch (e) { /* page still works when logged out */ }

  const panel = !p ? ""
    : p.role === "admin" ? '<a href="admin.html">Admin</a>'
    : p.role === "operator" ? '<a href="operator.html">Operator panel</a>' : "";
  const account = p
    ? `<a href="account.html">My bookings</a>${panel}
       <button class="btn alt small" onclick="logout()">Log out</button>`
    : `<a class="btn small" href="login.html">Log in</a>`;

  document.body.insertAdjacentHTML("afterbegin", `
    <header class="nav"><div class="wrap">
      <a class="brand" href="index.html">${esc(SITE.name.toUpperCase())}</a>
      <button class="menu-btn" aria-label="Open menu"
        onclick="document.querySelector('.links').classList.toggle('open')">☰</button>
      <nav class="links">
        <a href="explore.html">Explore</a>
        <a href="blog.html">Blog</a>
        <a href="partners.html">For operators</a>
        <a href="contact.html">Contact</a>
        ${account}
      </nav>
    </div></header>
    ${CONFIG_OK ? "" : '<p style="background:#a32c22;color:#fff;padding:12px 20px;margin:0">Setup needed: paste your Supabase Project URL and publishable key into config.js.</p>'}`);

  document.body.insertAdjacentHTML("beforeend", `
    <footer class="foot"><div class="wrap">
      <div>
        <h3>${esc(SITE.name)}</h3>
        <p>${esc(SITE.tagline)}. Timed-slot bookings for experiences across India,
        run by licensed operators and certified staff.</p>
      </div>
      <div>
        <h3>Explore</h3>
        <a href="explore.html">All experiences</a>
        <a href="blog.html">Blog</a>
        <a href="partners.html">List your activity</a>
        <a href="terms.html">Terms and conditions</a>
      </div>
      <div>
        <h3>Contact</h3>
        <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
        <a href="tel:${esc(SITE.phone.replace(/\s/g, ""))}">${esc(SITE.phone)}</a>
        <p>${esc(SITE.office)}</p>
      </div>
      <small>© ${new Date().getFullYear()} ${esc(SITE.name)}. Bookings are for experiences in India only.</small>
    </div></footer>`);
}

// ---------- wishlist ----------
let _wish;
async function getWishlist() {
  if (_wish) return _wish;
  _wish = new Set();
  if (await getUser()) {
    const { data } = await sb.from("wishlist").select("activity_id");
    (data || []).forEach(r => _wish.add(r.activity_id));
  }
  return _wish;
}
async function toggleWish(id, btn) {
  if (!(await getUser())) return goLogin();
  const w = await getWishlist();
  if (w.has(id)) {
    const { error } = await sb.from("wishlist").delete().eq("activity_id", id);
    if (error) return toast(error.message, true);
    w.delete(id); btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false");
    toast("Removed from your wishlist");
  } else {
    const { error } = await sb.from("wishlist").insert({ activity_id: id });
    if (error) return toast(error.message, true);
    w.add(id); btn.classList.add("on"); btn.setAttribute("aria-pressed", "true");
    toast("Saved to your wishlist");
  }
}

// ---------- one experience card ----------
function card(a, wish) {
  const link = "activity.html?slug=" + encodeURIComponent(a.slug);
  const on = wish && wish.has(a.id);
  return `
  <article class="card">
    <a class="card-img" href="${link}" tabindex="-1" aria-hidden="true">
      <span class="ph">${catIcon(a.category)}</span>
      <img src="${esc(a.image_url)}" alt="" loading="lazy" onerror="this.remove()">
      <span class="tag">${esc(a.category)}</span>
    </a>
    <button class="heart ${on ? "on" : ""}" aria-label="Save ${esc(a.title)} to wishlist"
      aria-pressed="${on ? "true" : "false"}" onclick="toggleWish('${a.id}', this)">♥</button>
    <div class="card-body">
      <p class="loc">${esc(a.city)}, ${esc(a.state)}</p>
      <h3><a href="${link}">${esc(a.title)}</a></h3>
      <p class="facts"><span>★ ${Number(a.rating).toFixed(1)}</span>
        <span>${fmtDur(a.duration_mins)}</span><span>${esc(a.difficulty)}</span></p>
      <p class="price"><b>${inr(a.price)}</b> per person</p>
    </div>
  </article>`;
}
