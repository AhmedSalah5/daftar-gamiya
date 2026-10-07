const APP_NAME = "دفتر الجمعية";
const STORAGE_KEY = "daftar_gamiya_v1";
const THEME_KEY = "daftar_theme";

const ACCENT_KEY = "daftar_accent";

const ACCENTS = [
  { key: "teal",   label: "أخضر مزرق", l: "#0f766e", d: "#2dd4bf" },
  { key: "blue",   label: "أزرق",       l: "#1d4ed8", d: "#60a5fa" },
  { key: "purple", label: "بنفسجي",     l: "#7c3aed", d: "#a78bfa" },
  { key: "rose",   label: "وردي",       l: "#be123c", d: "#fb7185" },
  { key: "orange", label: "برتقالي",    l: "#c2410c", d: "#fb923c" },
  { key: "green",  label: "أخضر",       l: "#15803d", d: "#4ade80" },
];


// بيانات المطوّر (عدّلها)
const SHOW_CREDIT = true;
const DEV_NAME = "احمد صلاح";
// const DEV_URL = "https://dev-a-salah.vercel.app/";   // بدون علامات اقتباس داخل الرابط
const DEV_URL = "https://wa.me/201140927066";   // بدون علامات اقتباس داخل الرابط

document.getElementById("appName").textContent = APP_NAME;
document.title = APP_NAME;

// ---------- التخزين ----------
function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gamiyat));
}
let gamiyat = load();
let currentId = null;
let viewRound = 0;

// ---------- المظهر ----------
function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || "auto"; } catch { return "auto"; }
}
// function setTheme(t) {
//   try { localStorage.setItem(THEME_KEY, t); } catch {}
//   const root = document.documentElement;
//   if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
//   else root.removeAttribute("data-theme");
// }

function setTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch { }
    const root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme");
    syncThemeColor();
}

function getAccent() {
    try {
        const a = localStorage.getItem(ACCENT_KEY);
        return ACCENTS.some(x => x.key === a) ? a : "teal";
    } catch { return "teal"; }
}

function setAccent(a) {
    try { localStorage.setItem(ACCENT_KEY, a); } catch { }
    const root = document.documentElement;
    if (a === "teal") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", a);
    syncThemeColor();
}

// يجعل شريط الحالة في الهاتف بنفس لون التطبيق
function syncThemeColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const m = document.querySelector('meta[name="theme-color"]');
    if (m && c) m.setAttribute("content", c);
}

// ---------- أدوات ----------
function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}
const money = n => Number(n).toLocaleString("en-US");
const freqLabel = f => (f === "weekly" ? "أسبوعي" : "شهري");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- التواريخ ----------
function turnDateObj(g, i) {
    const [y, m, d] = g.startDate.split("-").map(Number);
    if (g.frequency === "weekly") return new Date(y, m - 1, d + 7 * i);
    const lastDay = new Date(y, m + i, 0).getDate();
    return new Date(y, m - 1 + i, Math.min(d, lastDay));
}
function turnDate(g, i) {
    return turnDateObj(g, i).toLocaleDateString("ar-EG-u-nu-latn", {
        year: "numeric", month: "long", day: "numeric",
    });
}
function currentRound(g) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cur = -1;
    for (let i = 0; i < g.members; i++) {
        if (turnDateObj(g, i) <= today) cur = i;
        else break;
    }
    return cur;
}
function roundToView(g) {
    return Math.min(Math.max(currentRound(g), 0), g.members - 1);
}

// ---------- الدفعات ----------
function isPaid(g, round, pid) {
    return !!(g.payments && g.payments[round] && g.payments[round].includes(pid));
}
function paidCount(g, round) {
    return (g.people || []).filter(m => isPaid(g, round, m.id)).length;
}
function togglePay(g, round, pid) {
    g.payments = g.payments || {};
    const arr = g.payments[round] || (g.payments[round] = []);
    const k = arr.indexOf(pid);
    if (k >= 0) arr.splice(k, 1);
    else arr.push(pid);
}

// ---------- واتساب ----------
// يحوّل الأرقام المصرية (01x...) إلى الصيغة الدولية (201x...)
function waNumber(phone) {
    let d = (phone || "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    else if (d.startsWith("0")) d = "20" + d.slice(1);
    return d.length >= 8 ? d : "";
}
function waLink(g, m, round) {
    const num = waNumber(m.phone);
    if (!num) return "";
    const text =
        `السلام عليكم ${m.name}،\n` +
        `تذكير بقسط جمعية "${g.name}" - الدور ${round + 1} (${turnDate(g, round)})\n` +
        `القيمة: ${money(g.amount)} جنيه.\nشكراً لك 🌷`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// ---------- الشاشات ----------
const listScreen = document.getElementById("listScreen");
const detailScreen = document.getElementById("detailScreen");
const settingsScreen = document.getElementById("settingsScreen");
const navBtns = document.querySelectorAll(".bottom-nav button");

function setActiveTab(tab) {
    navBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
}

function showList() {
    currentId = null;
    detailScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
    listScreen.classList.remove("hidden");
    setActiveTab("home");
    renderList();
}

function showSettings() {
    currentId = null;
    listScreen.classList.add("hidden");
    detailScreen.classList.add("hidden");
    settingsScreen.classList.remove("hidden");
    setActiveTab("settings");
    renderSettings();
    window.scrollTo(0, 0);
}

function openDetail(id) {
    currentId = id;
    const g = gamiyat.find(x => x.id === id);
    viewRound = roundToView(g);
    listScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
    detailScreen.classList.remove("hidden");
    setActiveTab("home");
    renderDetail();
    window.scrollTo(0, 0);
}

navBtns.forEach(b =>
    b.addEventListener("click", () =>
        b.dataset.tab === "settings" ? showSettings() : showList()
    )
);

// ---------- قائمة الجمعيات ----------
const listEl = document.getElementById("list");

function dueSummary(g) {
    const p = g.people || [];
    if (!p.length) return "";
    const c = currentRound(g);
    if (c < 0) return "لم تبدأ الجمعية بعد<br>";
    let late = 0;
    for (let r = 0; r < c; r++) late += p.length - paidCount(g, r);
    const unpaid = p.length - paidCount(g, c);
    return `الدور الحالي: ${c + 1} · لم يدفع: ${unpaid}<br>` +
        (late ? `<span class="late">متأخرات سابقة: ${late} دفعة</span><br>` : "");
}

function renderList() {
    if (gamiyat.length === 0) {
        listEl.innerHTML = `
      <section class="card">
        <h2>أهلاً بك 👋</h2>
        <p>لا توجد جمعيات بعد. ابدأ بإنشاء أول جمعية.</p>
      </section>`;
        return;
    }

    listEl.innerHTML = gamiyat.map(g => `
    <section class="card">
      <div class="gamiya-head">
        <h3>${esc(g.name)}</h3>
        <div class="row">
          <button class="btn sm primary" data-open="${g.id}">فتح</button>
          <button class="btn sm danger" data-del="${g.id}">حذف</button>
        </div>
      </div>
      <div class="meta">
        القسط: ${money(g.amount)} ج.م · ${freqLabel(g.frequency)}<br>
        الأعضاء: ${(g.people || []).length} / ${g.members}<br>
        البداية: ${esc(g.startDate)}<br>
        ${dueSummary(g)}
        <span class="pot">قيمة القبضة: ${money(g.amount * g.members)} ج.م</span>
      </div>
    </section>
  `).join("");
}

listEl.addEventListener("click", e => {
    const openId = e.target.dataset.open;
    if (openId) return openDetail(openId);

    const delId = e.target.dataset.del;
    if (delId && confirm("هل تريد حذف هذه الجمعية نهائياً؟")) {
        gamiyat = gamiyat.filter(g => g.id !== delId);
        save();
        renderList();
    }
});

// ---------- نموذج جمعية جديدة ----------
const form = document.getElementById("gamiyaForm");
const toggleBtn = document.getElementById("toggleForm");

function showForm(show) {
    form.classList.toggle("hidden", !show);
    toggleBtn.classList.toggle("hidden", show);
    if (show) form.name.focus();
}

toggleBtn.addEventListener("click", () => showForm(true));
document.getElementById("cancelForm").addEventListener("click", () => {
    form.reset();
    showForm(false);
});

form.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(form);
    gamiyat.unshift({
        id: uid(),
        name: f.get("name").trim(),
        amount: Number(f.get("amount")),
        members: Number(f.get("members")),
        startDate: f.get("startDate"),
        frequency: f.get("frequency"),
        people: [],
        payments: {},
    });
    save();
    form.reset();
    showForm(false);
    renderList();
});

// ---------- لوحة المتابعة ----------
function dashboardHtml(g) {
    const p = g.people || [];
    if (!p.length) {
        return `<section class="card">
      <h2>متابعة الدفعات</h2>
      <p>أضف الأعضاء أولاً لتبدأ تسجيل الدفعات.</p>
    </section>`;
    }

    const cur = currentRound(g);
    const r = viewRound;
    const recipient = p[r];
    const paid = paidCount(g, r);
    const pct = Math.round((paid / p.length) * 100);

    let note;
    if (cur < 0) note = "لم تبدأ الجمعية بعد";
    else if (r === cur) note = "هذا هو الدور الحالي";
    else if (r < cur) note = "دور سابق";
    else note = "دور قادم";

    let nextLine;
    if (r + 1 >= g.members) {
        nextLine = "هذا آخر دور في الجمعية";
    } else {
        const n = p[r + 1];
        nextLine = `الدور القادم: ${n ? esc(n.name) : "لم يُحدد"} (${turnDate(g, r + 1)})`;
    }

    const items = p.map(m => {
        const done = isPaid(g, r, m.id);
        let tag = "دفع", cls = "ok";
        if (!done) {
            if (r < cur) { tag = "متأخر"; cls = "late"; }
            else if (r === cur) { tag = "مستحق الآن"; cls = "due"; }
            else { tag = "قادم"; cls = "soon"; }
        }
        const link = !done && r <= cur ? waLink(g, m, r) : "";
        return `
      <li>
        <label class="pay ${done ? "paid" : ""}">
          <input type="checkbox" data-act="pay" data-pid="${m.id}" ${done ? "checked" : ""}>
          <span class="pname">${esc(m.name)}${recipient && recipient.id === m.id ? " 🎁" : ""}</span>
          <span class="tag ${cls}">${tag}</span>
        </label>
        ${link ? `<a class="btn sm wa" href="${link}" target="_blank" rel="noopener">تذكير</a>` : ""}
      </li>`;
    }).join("");

    return `
    <section class="card">
      <h2>متابعة الدفعات</h2>

      <div class="round-nav">
        <button class="btn sm" data-act="prevRound" ${r === 0 ? "disabled" : ""}>→ السابق</button>
        <strong>الدور ${r + 1} من ${g.members}</strong>
        <button class="btn sm" data-act="nextRound" ${r >= g.members - 1 ? "disabled" : ""}>التالي ←</button>
      </div>

      <div class="meta">
        ${note} · ${turnDate(g, r)}<br>
        المستلم: <strong>${recipient ? esc(recipient.name) : "لم يُحدد"}</strong><br>
        ${nextLine}
      </div>

      <div class="bar"><div style="width:${pct}%"></div></div>
      <div class="meta">
        دفع ${paid} من ${p.length} · تم تحصيل ${money(paid * g.amount)} من ${money(p.length * g.amount)} ج.م
      </div>

      <ul class="pay-list">${items}</ul>
    </section>`;
}

// ---------- صفحة التفاصيل ----------
function renderDetail(focusInput = false) {
    const g = gamiyat.find(x => x.id === currentId);
    if (!g) return showList();
    const y = window.scrollY;
    const p = g.people || [];
    const full = p.length >= g.members;

    const peopleHtml = p.map((m, i) => `
    <li>
      <div class="person">
        <div>
          ${esc(m.name)}
          ${m.phone ? `<small>${esc(m.phone)}</small>` : ""}
        </div>
        <div class="actions">
          <button class="btn sm" data-act="up" data-idx="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="btn sm" data-act="down" data-idx="${i}" ${i === p.length - 1 ? "disabled" : ""}>↓</button>
          <button class="btn sm danger" data-act="remove" data-idx="${i}">✕</button>
        </div>
      </div>
    </li>
  `).join("");

    let rows = "";
    for (let i = 0; i < g.members; i++) {
        const who = p[i]
            ? esc(p[i].name)
            : `<span class="empty-slot">— لم يُحدد</span>`;
        rows += `<tr><td>${i + 1}</td><td>${turnDate(g, i)}</td><td>${who}</td></tr>`;
    }

    detailScreen.innerHTML = `
    <button class="btn" data-act="back">← رجوع</button>

    <section class="card">
      <h2>${esc(g.name)}</h2>
      <div class="meta">
        القسط: ${money(g.amount)} ج.م · ${freqLabel(g.frequency)}<br>
        <span class="pot">قيمة القبضة: ${money(g.amount * g.members)} ج.م</span>
      </div>
    </section>

    ${dashboardHtml(g)}

    <section class="card">
      <h2>الأعضاء (${p.length}/${g.members})</h2>
      ${full ? "<p>اكتمل عدد الأعضاء.</p>" : `
        <form id="memberForm" class="row-form">
          <input name="mname" required maxlength="40" placeholder="اسم العضو">
          <input name="mphone" type="tel" placeholder="الهاتف (اختياري) مثال: 01012345678">
          <button type="submit" class="btn primary">إضافة عضو</button>
        </form>`}
      ${p.length ? `<ol class="people">${peopleHtml}</ol>` : ""}
      ${p.length > 1 ? `<button class="btn" data-act="shuffle">🎲 قرعة عشوائية</button>` : ""}
    </section>

    <section class="card">
      <h2>جدول الأدوار</h2>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>الدور</th><th>التاريخ</th><th>المستلم</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;

    window.scrollTo(0, y);
    if (focusInput) {
        const input = detailScreen.querySelector('input[name="mname"]');
        if (input) input.focus();
    }
}

detailScreen.addEventListener("submit", e => {
    if (e.target.id !== "memberForm") return;
    e.preventDefault();
    const g = gamiyat.find(x => x.id === currentId);
    const f = new FormData(e.target);
    g.people = g.people || [];
    if (g.people.length >= g.members) return;
    g.people.push({
        id: uid(),
        name: f.get("mname").trim(),
        phone: f.get("mphone").trim(),
    });
    save();
    renderDetail(true);
});

detailScreen.addEventListener("click", e => {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === "back") return showList();

    const g = gamiyat.find(x => x.id === currentId);
    const p = g.people || (g.people = []);

    if (act === "prevRound") {
        if (viewRound > 0) viewRound--;
        return renderDetail();
    }
    if (act === "nextRound") {
        if (viewRound < g.members - 1) viewRound++;
        return renderDetail();
    }
    if (act === "pay") {
        togglePay(g, viewRound, e.target.dataset.pid);
        save();
        return renderDetail();
    }

    const i = Number(e.target.dataset.idx);

    if (act === "up" && i > 0) {
        [p[i - 1], p[i]] = [p[i], p[i - 1]];
    } else if (act === "down" && i < p.length - 1) {
        [p[i + 1], p[i]] = [p[i], p[i + 1]];
    } else if (act === "remove") {
        if (!confirm(`حذف "${p[i].name}" من الجمعية؟ سيتم حذف دفعاته أيضاً.`)) return;
        const pid = p[i].id;
        p.splice(i, 1);
        Object.keys(g.payments || {}).forEach(r => {
            g.payments[r] = g.payments[r].filter(x => x !== pid);
        });
    } else if (act === "shuffle") {
        if (!confirm("سيتم تغيير ترتيب الأدوار عشوائياً. متأكد؟")) return;
        for (let k = p.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [p[k], p[j]] = [p[j], p[k]];
        }
    }
    save();
    renderDetail();
});

// ---------- النسخ الاحتياطي ----------
function exportData() {
    const data = {
        app: "daftar-gamiya",
        version: 1,
        exportedAt: new Date().toISOString(),
        gamiyat,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-gamiya-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// تنظيف وفحص كل جمعية مستوردة
function cleanGamiya(g) {
    if (!g || typeof g.name !== "string") return null;
    if (typeof g.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(g.startDate)) return null;
    const amount = Number(g.amount);
    const members = Math.floor(Number(g.members));
    if (!(amount > 0) || !(members >= 2)) return null;

    const people = (Array.isArray(g.people) ? g.people : [])
        .filter(m => m && typeof m.name === "string")
        .slice(0, Math.min(members, 100))
        .map(m => ({
            id: typeof m.id === "string" && m.id ? m.id : uid(),
            name: m.name.slice(0, 40),
            phone: typeof m.phone === "string" ? m.phone.slice(0, 20) : "",
        }));

    const payments = {};
    if (g.payments && typeof g.payments === "object") {
        for (const [r, arr] of Object.entries(g.payments)) {
            if (Array.isArray(arr)) payments[r] = arr.filter(x => typeof x === "string");
        }
    }

    return {
        id: typeof g.id === "string" && g.id ? g.id : uid(),
        name: g.name.slice(0, 40),
        amount,
        members: Math.min(members, 100),
        startDate: g.startDate,
        frequency: g.frequency === "weekly" ? "weekly" : "monthly",
        people,
        payments,
    };
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const arr = Array.isArray(data) ? data : data.gamiyat;
            if (!Array.isArray(arr)) throw new Error("bad");
            const clean = arr.map(cleanGamiya).filter(Boolean);
            if (!clean.length) throw new Error("empty");
            if (!confirm(`سيتم استبدال البيانات الحالية بـ ${clean.length} جمعية. متابعة؟`)) return;
            gamiyat = clean;
            save();
            renderSettings();
            alert("تم الاستيراد بنجاح ✅");
        } catch {
            alert("الملف غير صالح. اختر ملف نسخة احتياطية من التطبيق.");
        }
    };
    reader.readAsText(file);
}

async function swDiagnostics() {
  const out = [];
  out.push("HTTPS: " + (location.protocol === "https:"));
  out.push("الرابط: " + location.href);

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    out.push("عدد التسجيلات: " + regs.length);
    regs.forEach(r => {
      const w = r.active || r.waiting || r.installing;
      out.push("النطاق: " + r.scope);
      out.push("الحالة: " + (w ? w.state : "لا يوجد"));
      out.push("مفعّل: " + !!r.active + " · منتظر: " + !!r.waiting);
    });
    out.push("يتحكم بهذه الصفحة: " + !!navigator.serviceWorker.controller);
  } else {
    out.push("المتصفح لا يدعم service worker");
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    out.push("الذاكرات: " + (keys.join(", ") || "لا يوجد"));
    for (const k of keys) {
      const c = await caches.open(k);
      const reqs = await c.keys();
      out.push(k + ": " + reqs.length + " ملف");
    }
  }

  if (navigator.storage && navigator.storage.persisted) {
    out.push("تخزين دائم: " + (await navigator.storage.persisted()));
  }
  return out.join("\n");
}

// ---------- الإعدادات ----------
function renderSettings() {
    const t = getTheme();
    const a = getAccent();

    const opt = (v, label) =>
        `<button class="btn ${t === v ? "active" : ""}" data-theme-set="${v}">${label}</button>`;

    const swatches = ACCENTS.map(x => `
    <button class="swatch ${a === x.key ? "active" : ""}" data-accent-set="${x.key}"
            style="--sw-l:${x.l};--sw-d:${x.d}" aria-label="${x.label}" title="${x.label}"></button>
  `).join("");

    const credit = SHOW_CREDIT && DEV_URL.startsWith("https://")
        ? `<p class="credit">تطوير: <a href="${DEV_URL}" target="_blank" rel="noopener noreferrer">${esc(DEV_NAME)}</a></p>`
        : "";

    settingsScreen.innerHTML = `
    <section class="card">
      <h2>المظهر</h2>
      <div class="seg">
        ${opt("auto", "تلقائي")}${opt("light", "فاتح")}${opt("dark", "داكن")}
      </div>
    </section>

    <section class="card">
      <h2>لون التطبيق</h2>
      <div class="swatches">${swatches}</div>
    </section>

    <section class="card">
      <h2>النسخ الاحتياطي</h2>
      <p>بياناتك محفوظة على هذا الجهاز فقط. خذ نسخة احتياطية بشكل دوري، خاصة قبل مسح بيانات المتصفح أو تغيير الهاتف.</p>
      <div class="stack">
        <button class="btn primary" data-act="export">⬇️ تصدير نسخة احتياطية</button>
        <button class="btn" data-act="import">⬆️ استيراد نسخة احتياطية</button>
        <input type="file" id="importFile" accept="application/json,.json" class="hidden">
      </div>
    </section>

    <section class="card">
      <h2>عن التطبيق</h2>
      <p>${esc(APP_NAME)} · عدد الجمعيات: ${gamiyat.length}</p>
      ${credit}
      <button class="btn danger" data-act="wipe">حذف كل البيانات</button>
      <button class="btn" data-act="diag">🔍 تشخيص العمل بدون إنترنت</button>
      <pre id="diagOut" class="diag hidden"></pre>
    </section>
  `;
}

settingsScreen.addEventListener("click", e => {
    const theme = e.target.dataset.themeSet;
    if (theme) {
        setTheme(theme);
        return renderSettings();
    }


    const accent = e.target.dataset.accentSet;
    if (accent) {
        setAccent(accent);
        return renderSettings();
    }

    const act = e.target.dataset.act;
    if (act === "export") {
        exportData();
    } else if (act === "import") {
        document.getElementById("importFile").click();
    } else if (act === "wipe") {
        if (confirm("سيتم حذف كل الجمعيات نهائياً. هل أنت متأكد؟") &&
            confirm("تأكيد أخير: هل أخذت نسخة احتياطية؟")) {
            gamiyat = [];
            save();
            renderSettings();
        }
    }else if (act === "diag") {
        const box = document.getElementById("diagOut");
        box.classList.remove("hidden");
        box.textContent = "جارٍ الفحص...";
        swDiagnostics().then(t => (box.textContent = t));
    }

});

settingsScreen.addEventListener("change", e => {
    if (e.target.id === "importFile" && e.target.files[0]) {
        importData(e.target.files[0]);
        e.target.value = "";
    }
});

renderList();

syncThemeColor();

// ---------- PWA ----------
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(console.error);
    });
}