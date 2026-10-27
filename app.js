/* ============ Carrito Fantasma — lógica ============ */
(function () {
  'use strict';

  const LS_KEY = 'carrito-fantasma-v1';
  const SHIP_FREE = 50;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');

  // Cada idioma vive en su propia URL (/ y /en/). El HTML estático declara
  // data-lang y data-root; así los recursos y la navegación funcionan igual
  // en el dominio propio y en el espejo de GitHub Pages.
  const pageLang = document.documentElement.dataset.lang === 'en' ? 'en'
    : (document.documentElement.dataset.lang === 'es' ? 'es' : '');
  const ROOT = document.documentElement.dataset.root || '';

  const modeById = Object.fromEntries(MODES.map(m => [m.id, m]));

  /* ============================================================
     TIENDA VIVA — rotación automática del catálogo
     Cada día cambian solas las ofertas y las insignias. Todo se
     calcula en el navegador a partir de la FECHA LOCAL, así que:
       · no hace falta servidor ni proceso que se ejecute por ahí,
       · la "oferta del día" es la misma para todo el mundo ese día,
       · no se guarda ni se envía ningún dato de quien visita.
     ============================================================ */

  // clave del día en hora local: "2026-10-15"
  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // generador pseudoaleatorio determinista (mulberry32) sembrado con el día
  function seededRandom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // precio "de tienda": siempre termina en ,99
  const pretty = n => {
    const base = n >= 1000 ? Math.round(n / 50) * 50 : n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
    return Math.max(0.49, +(base - 0.01).toFixed(2));
  };

  let DAILY = null;
  function buildDaily() {
    if (DAILY && DAILY.key === dayKey()) return DAILY;
    const rnd = seededRandom('carrito-fantasma|' + dayKey());
    const shuffle = arr => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };

    // 2 chollos por tienda, con descuento del 20 % al 55 %
    const deals = new Map();
    MODES.filter(m => m.id !== 'all').forEach(m => {
      shuffle(PRODUCTS.filter(p => p.mode === m.id)).slice(0, 2).forEach(p => {
        const off = 0.2 + rnd() * 0.35;
        deals.set(p.id, { price: Math.min(pretty(p.price * (1 - off)), p.price - 0.01), oldPrice: p.price });
      });
    });

    // 2 "recién llegados" del día (solo productos sin insignia propia, para no pisarla)
    const nuevos = new Set(
      shuffle(PRODUCTS.filter(p => !p.badge && !deals.has(p.id))).slice(0, 2).map(p => p.id)
    );

    DAILY = { key: dayKey(), deals, nuevos, count: deals.size };
    return DAILY;
  }

  // copia del producto con los valores de HOY aplicados
  function dailyAdjust(p) {
    const d = buildDaily();
    const of = d.deals.get(p.id);
    if (of) return { ...p, price: of.price, oldPrice: of.oldPrice, badge: 'Oferta', daily: true };
    if (d.nuevos.has(p.id)) return { ...p, badge: 'Nuevo', daily: true };
    return { ...p };
  }

  let CATALOG = PRODUCTS.map(dailyAdjust);
  let byId = new Map(CATALOG.map(p => [p.id, p]));

  // ofertas de hoy, de mayor a menor descuento
  const todayDeals = () =>
    [...buildDaily().deals.keys()]
      .map(id => byId.get(id))
      .sort((a, b) => (a.price / a.oldPrice) - (b.price / b.oldPrice));

  // vuelve a calcular el catálogo (se usa al cambiar el día, a medianoche)
  function rotateDaily() {
    DAILY = null;
    CATALOG = PRODUCTS.map(dailyAdjust);
    byId = new Map(CATALOG.map(p => [p.id, p]));
  }
  const acc = p => (modeById[p.mode] || modeById.all).accent;
  const imgOf = p => `${ROOT}assets/img/${p.id}.jpg`;

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  })();
  // Compatibilidad con enlaces antiguos: ?lang=en / ?lang=es redirigen a la
  // URL real del idioma (/en/ o /). Si ya coincide, solo se limpia el parámetro.
  const urlLang = (() => {
    try { return (new URLSearchParams(location.search).get('lang') || '').toLowerCase(); } catch (e) { return ''; }
  })();
  if (urlLang && pageLang && location.protocol.startsWith('http')) {
    const targetLang = urlLang === 'en' ? 'en' : 'es';
    if (targetLang !== pageLang) {
      const siteRoot = new URL(ROOT || './', location.href);
      const target = new URL(targetLang === 'en' ? 'en/' : './', siteRoot);
      location.replace(target.href + location.hash);
      return;
    }
    try {
      const u = new URL(location.href);
      u.searchParams.delete('lang');
      history.replaceState(history.state, '', u);
    } catch (e) {}
  }

  const state = {
    view: 'home',
    mode: modeById[persisted.mode] ? persisted.mode : 'all',
    lang: pageLang || (urlLang === 'en' ? 'en' : (persisted.lang === 'en' ? 'en' : 'es')),
    query: '',
    sort: 'pop',
    dealsOnly: false,
    cart: Array.isArray(persisted.cart) ? persisted.cart
      .filter(ci => ci && byId.has(ci.id))
      .map(ci => ({ id: ci.id, qty: Math.min(999, Math.max(1, Math.floor(Number(ci.qty) || 1))) })) : [],
    savings: Number.isFinite(Number(persisted.savings)) ? Math.max(0, Number(persisted.savings)) : 0,
    calories: Number.isFinite(Number(persisted.calories)) ? Math.max(0, Number(persisted.calories)) : 0,
    orders: Number.isFinite(Number(persisted.orders)) ? Math.max(0, Math.floor(Number(persisted.orders))) : 0,
    product: null,
    checkout: { step: 1, address: {}, pay: 0 },
    lastOrder: persisted.lastOrder && Array.isArray(persisted.lastOrder.lines) ? persisted.lastOrder : null,
    achievements: Array.isArray(persisted.achievements) ? persisted.achievements : [],
  };
  let isProcessing = false;

  /* ---------- idioma / i18n ---------- */
  const locale = () => (state.lang === 'en' ? 'en-US' : 'es-ES');
  const dict = () => (UI[state.lang] || UI.es);

  function t(key, vars) {
    let s = dict()[key] != null ? dict()[key] : (UI.es[key] != null ? UI.es[key] : key);
    if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), () => String(vars[k]));
    return s;
  }
  // campos localizados de un producto / tienda / insignia
  const tr = (map, id, field, fallback) => {
    const e = map && map[state.lang] && map[state.lang][id];
    return (e && e[field]) || fallback;
  };
  const pname  = p => tr(PRODUCT_I18N, p.id, 'name', p.name);
  const pdesc  = p => tr(PRODUCT_I18N, p.id, 'desc', p.desc);
  const mname  = m => tr(MODE_I18N, m.id, 'name', m.name);
  const mtag   = m => tr(MODE_I18N, m.id, 'tagline', m.tagline);
  const pbadge = p => (state.lang === 'en' && BADGE_I18N.en[p.badge]) || p.badge;
  const dHint  = d => (state.lang === 'en' && d.hint_en) || d.hint || '';

  // imagen decorativa: el nombre ya está junto a la tarjeta o en el título del modal
  const photo = p => `<img class="photo" src="${imgOf(p)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`;

  /* ---------- utilidades ---------- */
  function save() {
    const { cart, savings, calories, orders, mode, lang, lastOrder, achievements } = state;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cart, savings, calories, orders, mode, lang, lastOrder, achievements })); } catch (e) {}
  }

  function getAchievements() {
    const list = [
      { id: 'first', icon: '👻', title: t('ach_first_title'), desc: t('ach_first_desc'), unlocked: state.orders >= 1 },
      { id: 'five', icon: '🛵', title: t('ach_five_title'), desc: t('ach_five_desc'), unlocked: state.orders >= 5 },
      { id: 'ten', icon: '🏆', title: t('ach_ten_title'), desc: t('ach_ten_desc'), unlocked: state.orders >= 10 },
      { id: 'saver25', icon: '💸', title: t('ach_saver25_title'), desc: t('ach_saver25_desc'), unlocked: state.savings >= 25 },
      { id: 'saver100', icon: '💰', title: t('ach_saver100_title'), desc: t('ach_saver100_desc'), unlocked: state.savings >= 100 },
      { id: 'saver250', icon: '🤑', title: t('ach_saver250_title'), desc: t('ach_saver250_desc'), unlocked: state.savings >= 250 },
    ];
    // guardar nuevos desbloqueados
    const newly = list.filter(a => a.unlocked && !state.achievements.includes(a.id));
    if (newly.length) {
      newly.forEach(a => state.achievements.push(a.id));
      save();
      // mostrar toast del primer nuevo logro
      const a = newly[0];
      toast(t('ach_unlocked', { icon: a.icon, title: a.title }), { label: t('ach_view'), action: 'view-achievements' });
    }
    return list;
  }
  function money(n) {
    const opts = Number.isInteger(n)
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return '$' + n.toLocaleString(locale(), opts);
  }
  const num = n => n.toLocaleString(locale());
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const resultText = n => t(n === 1 ? 'results_one' : 'results', { n: num(n) });
  function stars(r) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  function pick(a) { return a[Math.random() * a.length | 0]; }

  function applyMeta() {
    document.documentElement.lang = dict().html_lang;
    document.title = t('title');
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
    setMeta('meta[name="description"]', t('meta_desc'));
    setMeta('meta[property="og:title"]', t('title'));
    setMeta('meta[property="og:description"]', t('meta_desc'));
    setMeta('meta[name="twitter:title"]', t('title'));
    setMeta('meta[name="twitter:description"]', t('meta_desc'));
    // og:locale tiene que seguir al idioma activo, igual que <html lang>.
    setMeta('meta[property="og:locale"]', state.lang === 'en' ? 'en_US' : 'es_ES');
    setMeta('meta[property="og:locale:alternate"]', state.lang === 'en' ? 'es_ES' : 'en_US');
    // El canonical es estático y autorreferencial en cada página (/ y /en/).
    // No se modifica por JS: Google lo lee del HTML y así hreflang es válido.
  }
  function applyStatic() {
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
    const lt = $('#langToggle');
    if (lt) { lt.textContent = state.lang === 'es' ? 'EN' : 'ES'; lt.setAttribute('title', t('lang_toggle')); lt.setAttribute('aria-label', t('lang_toggle')); }
    applyMeta();
  }
  function setLang(l) {
    const next = l === 'en' ? 'en' : 'es';
    if (next === state.lang) return;
    // Cada idioma tiene su URL propia (/ y /en/): navegar (en lugar de
    // reescribir el canonical con JS) es lo que permite indexar ambas.
    const siteRoot = new URL(ROOT || './', location.href);
    const target = new URL(next === 'en' ? 'en/' : './', siteRoot);
    location.href = target.href + location.hash;
  }

  /* ---------- navegación con enlaces profundos y botones atrás/adelante ---------- */
  const ROUTES = new Set(['home', 'catalog', 'savings', 'checkout', 'confirm', 'tracking', 'credits', 'support']);
  function routeFor(view = state.view, mode = state.mode) {
    return '#/' + view + (view === 'catalog' && mode !== 'all' ? '/' + mode : '');
  }
  function applyRoute() {
    const match = location.hash.match(/^#\/([a-z]+)(?:\/([a-z]+))?$/);
    state.view = match && ROUTES.has(match[1]) ? match[1] : 'home';
    if (state.view === 'catalog' && match && modeById[match[2]]) state.mode = match[2];
    if (state.view === 'checkout' && !cartLines().length) state.view = 'catalog';
    if (state.view === 'confirm' && !state.lastOrder) state.view = 'home';
  }
  function navigate(view, options = {}) {
    state.view = ROUTES.has(view) ? view : 'home';
    if (options.mode && modeById[options.mode]) state.mode = options.mode;
    if (typeof options.dealsOnly === 'boolean') state.dealsOnly = options.dealsOnly;
    if (state.view === 'checkout' && !cartLines().length) state.view = 'catalog';
    if (state.view === 'confirm' && !state.lastOrder) state.view = 'home';
    closeModal(); closeCart(); save();
    const next = routeFor();
    if (location.hash === next) render({ focus: true });
    else location.hash = next;
  }

  /* ---------- carrito ---------- */
  const cartLines = () => state.cart
    .map(ci => { const p = byId.get(ci.id); return p ? { ...p, qty: ci.qty } : null; })
    .filter(Boolean);
  const cartCount   = () => state.cart.reduce((s, ci) => s + ci.qty, 0);
  const cartTotal   = () => cartLines().reduce((s, l) => s + l.price * l.qty, 0);
  const cartCalories = () => cartLines().reduce((s, l) => s + (l.calories || 0) * l.qty, 0);

  function afterCartMutation() {
    save(); renderCart();
    // El resumen siempre debe coincidir con lo que realmente se va a "pagar".
    if (state.view === 'checkout' && state.checkout.step === 3) {
      if (!cartLines().length) state.checkout.step = 1;
      render({ scroll: false });
    }
  }
  function addToCart(id, silent) {
    if (isProcessing || !byId.has(id)) return;
    const found = state.cart.find(ci => ci.id === id);
    if (found) found.qty = Math.min(999, found.qty + 1); else state.cart.push({ id, qty: 1 });
    afterCartMutation();
    const btn = $('#cartBtn');
    if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    if (!silent) { const p = byId.get(id); toast(t('added', { emoji: p.emoji, name: pname(p) }), { label: t('view_cart'), action: 'open-cart' }); }
  }
  function setQty(id, delta) {
    if (isProcessing) return;
    const it = state.cart.find(ci => ci.id === id);
    if (!it) return;
    it.qty = Math.min(999, it.qty + delta);
    if (it.qty <= 0) state.cart = state.cart.filter(ci => ci.id !== id);
    afterCartMutation();
  }
  function removeItem(id) { if (!isProcessing) { state.cart = state.cart.filter(ci => ci.id !== id); afterCartMutation(); } }
  function clearCart() {
    if (isProcessing || !state.cart.length || !window.confirm(t('clear_cart_confirm'))) return;
    state.cart = []; afterCartMutation(); toast(t('cart_cleared'));
  }

  /* ---------- render principal ---------- */
  function render(options = {}) {
    const { focus = false, scroll = true } = options;
    document.body.dataset.mode = state.mode;
    renderModesNav();
    updateTop();
    const views = { home: viewHome, catalog: viewCatalog, savings: viewSavings, checkout: viewCheckout, confirm: viewConfirm, tracking: viewTracking, credits: viewCredits, support: viewSupport };
    app.innerHTML = (views[state.view] || viewHome)();
    tickFlash();
    renderModal();
    renderCart();
    if (scroll) window.scrollTo(0, 0);
    if (focus) {
      const heading = app.querySelector('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    const activeMode = $('#modesNav .mode-btn.active');
    const nav = $('#modesNav');
    if (activeMode && nav && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: activeMode.offsetLeft - (nav.clientWidth - activeMode.offsetWidth) / 2, behavior: 'auto' });
    }
    if (state.view === 'tracking') startTracking();
    if (state.view === 'confirm') celebrate();
    if (state.view === 'credits') loadCredits();
  }

  function renderModesNav() {
    $('#modesNav').innerHTML = MODES.map(m => `
      <button class="mode-btn ${state.mode === m.id ? 'active' : ''}" data-action="mode" data-mode="${m.id}" aria-current="${state.mode === m.id ? 'page' : 'false'}">
        <span>${m.emoji}</span> ${mname(m)}
      </button>`).join('');
  }

  function updateTop() {
    $('#savingsTop').textContent = money(state.savings);
    const count = cartCount();
    $('#cartCount').textContent = count;
    $('#cartCount').setAttribute('aria-hidden', 'true');
    $('#cartBtn').setAttribute('aria-label', t('cart_open_count', { n: num(count) }));
  }

  /* ---------- vistas ---------- */
  function viewHome() {
    const saved = state.savings > 0
      ? `<div class="saved-pill">${t('saved_pill', { money: money(state.savings), n: state.orders })}</div>`
      : '';
    return `
    <section class="page">
      <div class="hero">
        <h1>${t('home_h1')}</h1>
        <p>${t('home_p')}</p>
        <div class="row">
          <button class="primary" data-action="nav" data-view="catalog">${t('home_cta_catalog')}</button>
          <button class="ghost" data-action="nav" data-view="savings">${t('home_cta_savings')}</button>
        </div>
        ${saved}
      </div>

      <div class="daily-head">
        <h2>${t('daily_title')}</h2>
        <span class="flash">${t('flash')}</span>
      </div>
      <p class="muted">${t('daily_sub', { n: buildDaily().count })}</p>
      <div class="grid">${todayDeals().slice(0, 4).map(card).join('')}</div>
      <div class="row" style="margin-top:16px">
        <button class="ghost" data-action="deals">${t('daily_cta')}</button>
      </div>

      <h2 class="section-title">${t('choose_store')}</h2>
      <div class="mode-grid">
        ${MODES.filter(m => m.id !== 'all').map(m => `
          <button class="mode-card" data-action="mode" data-mode="${m.id}">
            <span class="stripe" style="--m:${m.accent}"></span>
            <span class="big-emoji">${m.emoji}</span>
            <h3>${mname(m)}</h3>
            <p>${mtag(m)}</p>
          </button>`).join('')}
      </div>

      <h2 class="section-title">${t('how_it_works')}</h2>
      <div class="features">
        <div class="feature"><b>${t('f1t')}</b><span>${t('f1s')}</span></div>
        <div class="feature"><b>${t('f2t')}</b><span>${t('f2s')}</span></div>
        <div class="feature"><b>${t('f3t')}</b><span>${t('f3s')}</span></div>
        <div class="feature"><b>${t('f4t')}</b><span>${t('f4s')}</span></div>
      </div>

      <div class="manifesto">
        <h3>${t('commitment')}</h3>
        <ul>
          <li>${t('c1')}</li>
          <li>${t('c2')}</li>
          <li>${t('c3')}</li>
          <li>${t('c4')}</li>
        </ul>
      </div>
    </section>`;
  }

  function filtered() {
    let list = CATALOG.filter(p => state.mode === 'all' || p.mode === state.mode);
    if (state.dealsOnly) list = list.filter(p => p.oldPrice && p.oldPrice > p.price);
    if (normalize(state.query)) {
      const q = normalize(state.query);
      list = list.filter(p => normalize(pname(p) + ' ' + pdesc(p) + ' ' + mname(modeById[p.mode] || modeById.all)).includes(q));
    }
    if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (state.sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else list = [...list].sort((a, b) => b.reviews - a.reviews);
    return list;
  }

  function card(p) {
    const old = p.oldPrice ? `<s><span class="sr-only">${t('price_was')} </span>${money(p.oldPrice)}</s>` : '';
    return `
    <article class="card" data-id="${p.id}">
      <button class="card-open" data-action="product" data-id="${p.id}" aria-label="${t('view_aria', { name: pname(p) })}">
        <span class="card-img" style="--c:${acc(p)}">
          <span class="emoji">${p.emoji}</span>
          ${photo(p)}
          ${p.badge ? `<span class="badge">${pbadge(p)}</span>` : ''}
        </span>
        <span class="card-body">
          <span class="card-title">${pname(p)}</span>
          <span class="desc">${pdesc(p)}</span>
          <span class="rate"><span class="stars" aria-hidden="true">${stars(p.rating)}</span><span class="sr-only">${t('rating_aria', { rating: p.rating.toFixed(1), n: num(p.reviews) })}</span><span class="rate-num" aria-hidden="true">${p.rating.toFixed(1)} (${num(p.reviews)})</span></span>
          <span class="price-row"><span class="price">${money(p.price)}${old}</span></span>
        </span>
      </button>
      <button class="add" data-action="add" data-id="${p.id}" aria-label="${t('add_aria', { name: pname(p) })}">＋</button>
    </article>`;
  }

  function gridHTML() {
    const list = filtered();
    if (!list.length) return `<div class="empty-grid"><span class="big" aria-hidden="true">🔍</span><p>${t('empty_grid')}</p><button class="ghost" data-action="reset-filters">${t('reset_filters')}</button></div>`;
    return list.map(card).join('');
  }

  function viewCatalog() {
    const m = modeById[state.mode] || modeById.all;
    return `
    <section class="page">
      <div class="catalog-head">
        <h1>${m.emoji} ${mname(m)}</h1>
        <span class="flash">${t('flash')}</span>
      </div>
      <p class="muted">${t('catalog_sub', { tagline: mtag(m) })}</p>
      <div class="toolbar">
        <input id="searchInput" type="search" placeholder="${t('search_ph')}" value="${esc(state.query)}" aria-label="${t('search_aria')}">
        <select id="sortSel" aria-label="${t('sort_aria')}">
          <option value="pop" ${state.sort === 'pop' ? 'selected' : ''}>${t('sort_pop')}</option>
          <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>${t('sort_asc')}</option>
          <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>${t('sort_desc')}</option>
          <option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>${t('sort_rating')}</option>
        </select>
        <label class="filter-check"><input id="dealsOnly" type="checkbox" ${state.dealsOnly ? 'checked' : ''}><span>${t('deals_only')}</span></label>
      </div>
      <p class="results" id="resultCount" role="status" aria-live="polite" aria-atomic="true">${resultText(filtered().length)}</p>
      <h2 class="sr-only">${t('catalog_products')}</h2>
      <div class="grid" id="grid">${gridHTML()}</div>
    </section>`;
  }

  function viewSavings() {
    const hasHistory = state.orders > 0 || state.savings > 0 || !!state.lastOrder;
    const ach = getAchievements();
    const unlocked = ach.filter(a => a.unlocked).length;
    return `
    <section class="page savings">
      <h1>${t('savings_h1')}</h1>
      <p class="muted">${t('savings_p')}</p>
      <div class="stat-grid">
        <div class="stat"><div class="n">${money(state.savings)}</div><div class="l">${t('stat_money')}</div></div>
        <div class="stat"><div class="n">${state.orders}</div><div class="l">${t('stat_orders')}</div></div>
        <div class="stat"><div class="n">${num(Math.round(state.calories))}</div><div class="l">${t('stat_cal')}</div></div>
      </div>
      ${hasHistory ? `<div class="row share-row">
        <button class="primary big" data-action="share-savings">${t('share_savings')}</button>
      </div>` : ''}
      <h2 class="section-title" id="achievements">${t('ach_title')} · ${unlocked}/${ach.length}</h2>
      <div class="ach-grid">
        ${ach.map(a => `
          <div class="ach-card ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-info">
              <b>${a.title}</b>
              <span class="muted tiny">${a.desc}</span>
            </div>
            <span class="ach-badge">${a.unlocked ? t('ach_done') : t('ach_locked')}</span>
          </div>
        `).join('')}
      </div>
      <div class="manifesto">
        <h3>${t('remember')}</h3>
        <ul>
          <li>${t('s1')}</li>
          <li>${t('s2')}</li>
          <li>${t('s3')}</li>
        </ul>
      </div>
      <div class="row">
        <button class="primary" data-action="nav" data-view="catalog">${t('keep_shopping')}</button>
        ${state.lastOrder ? `<button class="ghost" data-action="nav" data-view="tracking">${t('view_last_order')}</button>` : ''}
        ${hasHistory ? `<button class="ghost danger" data-action="clear-history">${t('clear_history')}</button>` : ''}
      </div>
    </section>`;
  }

  function methodList() {
    return state.lang === 'en'
      ? ['Ghost card •••• 4242', 'Imaginary instant transfer', 'Monopoly cash', 'A chocolate bill']
      : ['Tarjeta fantasma •••• 4242', 'Bizum imaginario', 'Efectivo de Monopoly', 'Un billete de chocolate'];
  }

  function viewCheckout() {
    const step = state.checkout.step;
    const lines = cartLines();
    const total = cartTotal();
    const a = state.checkout.address;
    const methods = methodList();
    return `
    <section class="page checkout">
      <button class="link-back" data-action="open-cart">${t('back_cart')}</button>
      <h1>${t('checkout_h1')}</h1>
      <div class="steps-ind" aria-label="${t('step_progress', { n: step })}"><span class="sr-only">${t('step_progress', { n: step })}</span>${[1, 2, 3].map(n => `<span class="dot ${n <= step ? 'on' : ''}" aria-hidden="true"></span>`).join('')}</div>

      ${step === 1 ? `
        <form class="panel" id="addressForm" autocomplete="off">
          <h2>${t('st1')}</h2>
          <p class="form-note muted tiny">${t('fake_data_note')}</p>
          <div class="field"><label for="f-name">${t('f_name')}</label><input id="f-name" name="name" autocomplete="off" enterkeyhint="next" required maxlength="80" placeholder="${t('f_name_ph')}" value="${esc(a.name)}"></div>
          <div class="field"><label for="f-address">${t('f_address')}</label><input id="f-address" name="address" autocomplete="off" enterkeyhint="next" required maxlength="120" placeholder="${t('f_address_ph')}" value="${esc(a.address)}"></div>
          <div class="field"><label for="f-city">${t('f_city')}</label><input id="f-city" name="city" autocomplete="off" enterkeyhint="done" required maxlength="80" placeholder="${t('f_city_ph')}" value="${esc(a.city)}"></div>
          <button class="link fill-fake" type="button" data-action="fill-fake">${t('fill_fake')}</button>
          <button class="primary big" type="submit">${t('continue')}</button>
        </form>` : ''}

      ${step === 2 ? `
        <div class="panel">
          <h2>${t('st2')}</h2>
          ${methods.map((m, i) => `<label class="radio"><input type="radio" name="pay" value="${i}" ${state.checkout.pay === i ? 'checked' : ''}> ${m}</label>`).join('')}
          <div class="row">
            <button class="ghost" data-action="step" data-step="1">${t('back')}</button>
            <button class="primary" data-action="step" data-step="3">${t('continue')}</button>
          </div>
        </div>` : ''}

      ${step === 3 ? `
        <div class="panel">
          <h2>${t('st3')}</h2>
          <ul class="review">${lines.map(l => `<li><span>${l.emoji} ${pname(l)} ×${l.qty}</span><b>${money(l.price * l.qty)}</b></li>`).join('')}</ul>
          <div class="total-row"><span>${t('total')}</span><b>${money(total)}</b></div>
          <p class="muted">${t('method_note', { pay: methods[state.checkout.pay] || methods[0] })}</p>
          <div class="row">
            <button class="ghost" data-action="step" data-step="2">${t('back')}</button>
            <button class="primary big" data-action="pay">${t('pay_btn', { money: money(total) })}</button>
          </div>
        </div>` : ''}
    </section>`;
  }

  function viewConfirm() {
    const o = state.lastOrder;
    if (!o) return viewHome();
    return `
    <section class="page confirm">
      <div class="tick">🎉</div>
      <h1>${t('confirm_h1')}</h1>
      <p class="muted">${t('confirm_p')}</p>
      <div class="order-box">
        <p>${t('order_label', { id: `<span class="order-id">${o.id}</span>` })}</p>
        <ul class="review">${o.lines.map(l => `<li><span>${l.emoji} ${pname(l)} ×${l.qty}</span><b>${money(l.price * l.qty)}</b></li>`).join('')}</ul>
        <div class="total-row"><span>${t('saved_label2')}</span><b>${money(o.total)}</b></div>
      </div>
      <div class="row" style="justify-content:center">
        <button class="primary" data-action="nav" data-view="tracking">${t('track_btn')}</button>
        <button class="ghost" data-action="nav" data-view="catalog">${t('keep_shopping')}</button>
      </div>
      <p class="muted tiny" style="margin-top:18px">${t('try_it')} <button class="link" data-action="nav" data-view="support">${t('footer_support')}</button></p>
    </section>`;
  }

  function viewTracking() {
    const o = state.lastOrder;
    if (!o) {
      return `
      <section class="page tracking">
        <h1>${t('tracking_h1', { id: '' }).trim()}</h1>
        <p class="muted">${t('tracking_none')}</p>
        <div class="row">
          <button class="primary" data-action="nav" data-view="catalog">${t('keep_shopping')}</button>
        </div>
      </section>`;
    }
    const steps = [
      [t('ts1t'), t('ts1s')],
      [t('ts2t'), t('ts2s')],
      [t('ts3t'), t('ts3s')],
      [t('ts4t'), t('ts4s')],
    ];
    return `
    <section class="page tracking">
      <h1>${t('tracking_h1', { id: o ? `<span class="order-id">${o.id}</span>` : '' })}</h1>
      <p class="muted">${t('tracking_p')}</p>
      <div class="ghost-map" aria-hidden="true">
        <svg class="ghost-map-route" viewBox="0 0 100 60" preserveAspectRatio="none">
          <path d="M 18 42 C 28 34, 38 26, 48 20 C 58 16, 68 14, 78 14"></path>
        </svg>
        <span class="ghost-map-pin start"></span>
        <span class="ghost-map-pin end"></span>
        <span class="ghost-map-rider">🛵👻</span>
      </div>
      <ul class="track-list" id="tracking">
        ${steps.map((s, i) => `
          <li class="step" data-i="${i}">
            <span class="dot2">${i === 0 ? '📦' : i === 1 ? '🔍' : i === 2 ? '🛵' : '👻'}</span>
            <div><b>${s[0]}</b><small>${s[1]}</small></div>
          </li>`).join('')}
      </ul>
      <div class="track-note" id="tracknote" hidden>
        ${t('track_note')}
      </div>
      <div class="row">
        <button class="primary" data-action="nav" data-view="savings">${t('view_savings_btn')}</button>
        <button class="ghost" data-action="nav" data-view="catalog">${t('keep_shopping')}</button>
      </div>
    </section>`;
  }

  /* ---------- modal de producto ---------- */
  let modalFocus = null;
  function renderModal() {
    const el = $('#modal');
    if (!state.product) { el.hidden = true; el.inert = true; el.innerHTML = ''; syncOverlayState(); return; }
    const p = byId.get(state.product);
    if (!p) { state.product = null; el.hidden = true; el.inert = true; syncOverlayState(); return; }
    el.hidden = false;
    el.inert = false;
    el.innerHTML = `
      <div class="modal-card">
        <button class="icon modal-close" data-action="close-modal" aria-label="${t('close')}">✕</button>
        <div class="modal-img" style="--c:${acc(p)}"><span class="emoji">${p.emoji}</span>${photo(p)}</div>
        <div class="modal-info">
          ${p.badge ? `<span class="badge modal-badge" style="background:${acc(p)}">${pbadge(p)}</span>` : ''}
          <h2 id="productModalTitle">${pname(p)}</h2>
          <div class="rate"><span class="stars" aria-hidden="true">${stars(p.rating)}</span><span>${t('reviews', { rating: p.rating.toFixed(1), n: num(p.reviews) })}</span></div>
          <p class="desc">${pdesc(p)}</p>
          <div class="price">${money(p.price)} ${p.oldPrice ? `<s><span class="sr-only">${t('price_was')} </span>${money(p.oldPrice)}</s>` : ''}</div>
          <p class="muted tiny">${t('modal_note')}</p>
          <button class="primary big" data-action="add" data-id="${p.id}">${t('add_cart')}</button>
        </div>
      </div>`;
    el.onclick = e => { if (e.target === el) closeModal(); };
    syncOverlayState();
    const closeBtn = el.querySelector('[data-action="close-modal"]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  const closeModal = () => {
    const wasOpen = !!state.product;
    state.product = null;
    renderModal();
    if (wasOpen && modalFocus && document.contains(modalFocus)) modalFocus.focus({ preventScroll: true });
  };

  /* ---------- carrito (drawer) ---------- */
  function renderCart() {
    updateTop();
    const body = $('#cartBody');
    const active = document.activeElement;
    const focusAction = body.contains(active) && active.dataset.action
      ? { action: active.dataset.action, id: active.dataset.id } : null;
    const lines = cartLines();
    if (!lines.length) {
      body.innerHTML = `<div class="empty"><p>${t('cart_empty')}</p><button class="primary" data-action="nav" data-view="catalog">${t('cart_empty_cta')}</button></div>`;
    } else {
      body.innerHTML = lines.map(l => `
        <div class="line">
          <div class="line-img" style="--c:${acc(l)}"><span class="emoji">${l.emoji}</span>${photo(l)}</div>
          <div class="line-info"><strong>${pname(l)}</strong><span class="muted tiny">${money(l.price)}</span></div>
          <div class="qty">
            <button data-action="dec" data-id="${l.id}" aria-label="${t('dec_aria', { name: pname(l) })}">−</button>
            <span class="qty-value">${l.qty}</span>
            <button data-action="inc" data-id="${l.id}" aria-label="${t('inc_aria', { name: pname(l) })}">＋</button>
          </div>
          <button class="rm" data-action="remove" data-id="${l.id}" aria-label="${t('remove_aria', { name: pname(l) })}">✕</button>
        </div>`).join('');
    }
    if (focusAction) {
      const same = $$('[data-action]', body).find(el => el.dataset.action === focusAction.action && el.dataset.id === focusAction.id);
      const fallback = $('[data-action="inc"]', body) || $('.drawer-head .icon');
      (same || fallback).focus({ preventScroll: true });
    }
    const total = cartTotal();
    $('#cartSubtotal').textContent = money(total);
    $('#payBtn').disabled = !lines.length || isProcessing;
    $('[data-action="clear-cart"]', $('#cartDrawer')).disabled = !lines.length || isProcessing;
    const remaining = Math.max(0, SHIP_FREE - total);
    $('#shipText').innerHTML = total <= 0
      ? t('ship_add', { money: money(SHIP_FREE) })
      : (remaining > 0
        ? t('ship_left', { money: money(remaining) })
        : t('ship_free'));
    $('#shipFill').style.width = Math.min(100, (total / SHIP_FREE) * 100) + '%';
  }

  let cartFocus = null;
  function openCart() {
    if (isProcessing) return;
    if (state.product) closeModal();
    hideToast();
    cartFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : $('#cartBtn');
    const drawer = $('#cartDrawer');
    document.body.classList.add('cart-open');
    drawer.setAttribute('aria-hidden', 'false');
    const btn = $('#cartBtn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    syncOverlayState();
    const closeBtn = drawer.querySelector('.drawer-head .icon');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  function closeCart() {
    const wasOpen = document.body.classList.contains('cart-open');
    const drawer = $('#cartDrawer');
    document.body.classList.remove('cart-open');
    drawer.setAttribute('aria-hidden', 'true');
    const btn = $('#cartBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    syncOverlayState();
    if (wasOpen) {
      const target = cartFocus && document.contains(cartFocus) ? cartFocus : btn;
      cartFocus = null;
      if (target) target.focus({ preventScroll: true });
    }
  }

  function syncOverlayState() {
    const modalOpen = !$('#modal').hidden;
    const cartOpen = document.body.classList.contains('cart-open');
    const processingOpen = !$('#processing').hidden;
    const locked = modalOpen || cartOpen || processingOpen;
    document.body.classList.toggle('overlay-open', locked);
    $('#cartDrawer').inert = !cartOpen;
    $('#modal').inert = !modalOpen;
    [$('.topbar'), app, $('.site-footer')].forEach(el => { if (el) el.inert = locked; });
  }

  function activeOverlay() {
    if (!$('#processing').hidden) return $('#processing');
    if (!$('#modal').hidden) return $('#modal');
    if (document.body.classList.contains('cart-open')) return $('#cartDrawer');
    return null;
  }
  function trapFocus(e) {
    const overlay = activeOverlay();
    if (!overlay || e.key !== 'Tab') return;
    const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', overlay)
      .filter(el => el.getClientRects().length && !el.closest('[inert]'));
    if (!focusable.length) { e.preventDefault(); overlay.focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!overlay.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- compartir ---------- */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.className = 'sr-only';
    document.body.appendChild(area); area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('copy failed');
  }
  async function share() {
    const data = { title: 'Carrito Fantasma', text: t('share_text'), url: location.href };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await copyText(location.href); toast(t('link_copied'));
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      try { await copyText(location.href); toast(t('link_copied')); }
      catch (copyError) { toast(t('link_copy_error')); }
    }
  }

  /* ---------- imagen compartible de tu ahorro (bucle viral) ----------
     Dibuja una tarjeta cuadrada 1080x1080 con el ahorro total y, si el
     navegador lo permite, la comparte con la Web Share API (móvil).
     Si no, la descarga como PNG para que la suba a mano. Todo local:
     no se sube nada a ningún servidor. */
  function rr(x, px, py, w, h, r) {
    if (x.roundRect) { x.beginPath(); x.roundRect(px, py, w, h, r); return; }
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }
  function drawCartGlyph(x, cx, cy, s, color) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.strokeStyle = color; x.lineWidth = 2.1; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(-9, -8); x.lineTo(-6.6, -8); x.lineTo(-4.2, 4.3);
    x.lineTo(6.1, 6); x.lineTo(9.5, -3); x.lineTo(-6, -3);
    x.stroke();
    x.lineWidth = 2.4;
    x.beginPath(); x.arc(-4, 8.4, 1.4, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(4.5, 8.4, 1.4, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  function drawSavingsCard() {
    const S = 1080, ACC = '#6d5efc', INK = '#15142b', MUT = '#5b5a78';
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const face = '"Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

    // fondo
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f0fb');
    x.fillStyle = g; x.fillRect(0, 0, S, S);

    // manchas de color
    const blob = (cx, cy, r, col) => {
      const rg = x.createRadialGradient(cx, cy, 10, cx, cy, r);
      rg.addColorStop(0, col); rg.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
      x.fillStyle = rg; x.fillRect(0, 0, S, S);
    };
    blob(S * 0.9, 70, 640, 'rgba(109,94,252,.30)');
    blob(40, S, 560, 'rgba(255,77,141,.20)');
    blob(S * 0.12, S * 0.34, 380, 'rgba(47,168,255,.14)');

    // rejilla de puntos
    x.fillStyle = 'rgba(216,214,238,.7)';
    for (let px = 46; px < S; px += 46)
      for (let py = 46; py < S; py += 46) { x.beginPath(); x.arc(px, py, 1.6, 0, Math.PI * 2); x.fill(); }

    // marca
    const rx = 84, ry = 92, rs = 106;
    x.fillStyle = ACC; rr(x, rx, ry, rs, rs, 26); x.fill();
    drawCartGlyph(x, rx + rs / 2, ry + rs / 2, 2.4, '#fff');
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = '800 56px ' + face;
    x.fillStyle = INK;
    x.fillText('Carrito ', rx + rs + 28, ry + rs / 2);
    const w1 = x.measureText('Carrito ').width;
    x.fillStyle = ACC;
    x.fillText('Fantasma', rx + rs + 28 + w1, ry + rs / 2);

    // etiqueta + cifra
    x.textAlign = 'center';
    x.fillStyle = MUT;
    x.font = '600 46px ' + face;
    x.fillText(t('card_label'), S / 2, 420);
    // la cifra se reduce sola si el ahorro es muy alto (nunca se sale del lienzo)
    const amount = money(state.savings);
    let size = 160;
    x.font = '800 ' + size + 'px ' + face;
    while (x.measureText(amount).width > 880 && size > 72) { size -= 6; x.font = '800 ' + size + 'px ' + face; }
    x.fillStyle = ACC;
    x.fillText(amount, S / 2, 566);

    // estadísticas
    x.fillStyle = INK;
    x.font = '700 42px ' + face;
    x.fillText(`${num(state.orders)} ${t('card_orders')}   ·   ${num(Math.round(state.calories))} ${t('card_cal')}`, S / 2, 668);

    // panel inferior con la dirección
    const pw = 780, ph = 190, px2 = (S - pw) / 2, py2 = 760;
    x.fillStyle = '#ffffff'; rr(x, px2, py2, pw, ph, 34); x.fill();
    x.fillStyle = 'rgba(109,94,252,.14)'; x.lineWidth = 3; x.strokeStyle = 'rgba(109,94,252,.35)';
    rr(x, px2, py2, pw, ph, 34); x.stroke();
    x.fillStyle = ACC; x.font = '800 58px ' + face;
    x.fillText('carritofantasma.app', S / 2, py2 + 74);
    x.fillStyle = MUT; x.font = '500 32px ' + face;
    x.fillText(t('card_note'), S / 2, py2 + 134);

    return c;
  }
  async function shareSavings() {
    const text = t('share_savings_text', { amount: money(state.savings) });
    try {
      const canvas = drawSavingsCard();
      const done = async blob => {
        if (!blob) { toast(t('share_error')); return; }
        const file = new File([blob], 'carrito-fantasma-ahorro.png', { type: 'image/png', lastModified: Date.now() });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], text, title: 'Carrito Fantasma' }); return; }
          catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'carrito-fantasma-ahorro.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 6000);
        toast(t('savings_img_saved'));
      };
      if (canvas.toBlob) canvas.toBlob(done, 'image/png');
      else done(dataURLtoBlob(canvas.toDataURL('image/png')));
    } catch (e) {
      toast(t('share_error'));
    }
  }
  function dataURLtoBlob(d) {
    const [head, b64] = d.split(',');
    const mime = (head.match(/:(.*?);/) || [, 'image/png'])[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ---------- apoyo / donaciones ---------- */
  function viewSupport() {
    const links = (typeof DONATIONS !== 'undefined' ? DONATIONS : []).filter(d => d.url);
    return `
    <section class="page support">
      <div class="tick">❤️</div>
      <h1>${t('support_h1')}</h1>
      <p class="muted">${t('support_p')}</p>
      ${links.length ? `
        <div class="support-grid">
          ${links.map(d => `
            <a class="support-card" href="${d.url}" target="_blank" rel="noopener noreferrer">
              <span class="big-emoji">${d.emoji}</span>
              <b>${d.name}</b>
              ${dHint(d) ? `<span class="muted tiny">${dHint(d)}</span>` : ''}
            </a>`).join('')}
        </div>
        <p class="muted tiny">${t('support_ext_note')}</p>`
      : `<div class="panel"><p class="muted">${t('support_none')}</p></div>`}
      <div class="manifesto">
        <h3>${t('why_no_ads')}</h3>
        <ul>
          <li>${t('ads1')}</li>
          <li>${t('ads2')}</li>
          <li>${t('ads3')}</li>
        </ul>
      </div>
      <div class="row" style="justify-content:center">
        <button class="primary" data-action="nav" data-view="catalog">${t('support_back')}</button>
        <button class="ghost" data-action="share">${t('support_share')}</button>
      </div>
    </section>`;
  }

  /* ---------- créditos de imágenes ---------- */
  function viewCredits() {
    return `
    <section class="page credits">
      <button class="link-back" data-action="nav" data-view="home">${t('credits_back')}</button>
      <h1>${t('credits_h1')}</h1>
      <p class="muted">${t('credits_p')}</p>
      <div id="creditsList" class="credits-list">${t('credits_loading')}</div>
    </section>`;
  }
  let creditsCache = null;
  async function loadCredits() {
    const box = $('#creditsList');
    if (!box) return;
    try {
      creditsCache = creditsCache || await (await fetch(ROOT + 'assets/img/credits.json')).json();
      const rows = Object.entries(creditsCache).map(([id, c]) => {
        const p = byId.get(id);
        const lic = c.licenseUrl ? `<a href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license || t('license_fallback')}</a>` : (c.license || '');
        return `<tr>
          <td><img src="${ROOT}assets/img/${id}.jpg" alt="" loading="lazy"></td>
          <td>${p ? pname(p) : id}</td>
          <td>${c.author || '—'}</td>
          <td>${lic}</td>
          <td><a href="${c.source}" target="_blank" rel="noopener">${t('source_link')}</a></td>
        </tr>`;
      }).join('');
      box.innerHTML = `<table class="credits-table"><thead><tr><th></th><th>${t('th_product')}</th><th>${t('th_author')}</th><th>${t('th_license')}</th><th>${t('th_source')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) {
      box.innerHTML = `<p class="muted">${t('credits_error')}</p><button class="ghost" data-action="retry-credits">${t('retry')}</button>`;
    }
  }

  /* ---------- pago ---------- */
  function pay() {
    if (isProcessing) return;
    if (!cartLines().length) { toast(t('cart_empty_toast')); return; }
    isProcessing = true;
    $$('[data-action="pay"]').forEach(btn => { btn.disabled = true; });
    closeCart();
    // Congela el pedido revisado: el cobro ficticio usa exactamente esta instantánea.
    const lines = cartLines().map(l => ({ ...l }));
    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const calories = lines.reduce((sum, l) => sum + (l.calories || 0) * l.qty, 0);
    showProcessing(() => {
      state.savings += total;
      state.calories += calories;
      state.orders += 1;
      state.lastOrder = {
        id: 'CF-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        total, lines, date: Date.now(),
      };
      state.cart = [];
      state.checkout = { step: 1, address: {}, pay: state.checkout.pay };
      isProcessing = false;
      save(); navigate('tracking');
    });
  }

  function showProcessing(cb) {
    const box = $('#processing'); const txt = $('#procText');
    const msgs = state.lang === 'en'
      ? ['Connecting to the imaginary bank…', 'Verifying funds that do not exist…', 'Authorizing a fictional purchase…', 'Done! Nothing was charged.']
      : ['Conectando con el banco imaginario…', 'Verificando fondos que no existen…', 'Autorizando compra ficticia…', '¡Listo! Nada fue cobrado.'];
    let i = 0; txt.textContent = msgs[0];
    box.hidden = false; box.tabIndex = -1;
    app.setAttribute('aria-busy', 'true');
    syncOverlayState(); box.focus({ preventScroll: true });
    const shortMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const iv = setInterval(() => { i++; if (msgs[i]) txt.textContent = msgs[i]; }, shortMotion ? 150 : 500);
    setTimeout(() => {
      clearInterval(iv); box.hidden = true; app.removeAttribute('aria-busy'); syncOverlayState(); cb();
    }, shortMotion ? 600 : 2000);
  }

  /* ---------- tracking animado ---------- */
  let trackTimer = null;
  function startTracking() {
    clearInterval(trackTimer);
    const steps = $$('#tracking .step');
    if (!steps.length) return;
    steps.forEach((s, i) => s.classList.toggle('active', i === 0));
    let i = 0;
    trackTimer = setInterval(() => {
      if (i < steps.length - 1) {
        steps[i].classList.remove('active'); steps[i].classList.add('done');
        i++;
        steps[i].classList.add('active');
      } else {
        clearInterval(trackTimer);
        const note = $('#tracknote'); if (note) note.hidden = false;
      }
    }, 1400);
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function hideToast() {
    clearTimeout(toastTimer);
    const tst = $('#toast');
    tst.classList.remove('show');
    $('#toastText').textContent = '';
    $$('.toast-action', tst).forEach(btn => btn.remove());
  }
  function toast(msg, action) {
    const tst = $('#toast');
    clearTimeout(toastTimer);
    $$('.toast-action', tst).forEach(btn => btn.remove());
    $('#toastText').textContent = msg;
    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'toast-action'; btn.dataset.action = action.action; btn.textContent = action.label;
      tst.appendChild(btn);
    }
    tst.classList.add('show');
    toastTimer = setTimeout(hideToast, action ? 4500 : 2400);
  }

  /* ---------- confeti ---------- */
  const canvas = $('#confetti'); const ctx = canvas.getContext('2d');
  let parts = []; let raf = null;
  function sizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function celebrate() {
    if (reduce) return;
    const colors = ['#ff4d8d', '#ff8a3d', '#2fa8ff', '#e8b64c', '#6d5efc', '#43d9a3'];
    parts = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * .3,
      vx: (Math.random() - .5) * 2.4, vy: 2 + Math.random() * 4,
      s: 6 + Math.random() * 9, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .25,
      c: pick(colors),
    }));
    if (!raf) loopConfetti();
    setTimeout(() => { parts = []; }, 3400);
  }
  function loopConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += .03; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); }
    parts = parts.filter(p => p.y < canvas.height + 40);
    if (parts.length) { raf = requestAnimationFrame(loopConfetti); }
    else { raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  /* ---------- contador: las ofertas duran hasta medianoche ---------- */
  function msToMidnight() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0) - d;
  }
  function hms(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
      .map(n => String(n).padStart(2, '0')).join(':');
  }
  function tickFlash() {
    const txt = hms(msToMidnight());
    $$('.js-flash').forEach(el => { el.textContent = txt; });
    // al cambiar el día, el catálogo se renueva solo
    if (DAILY && DAILY.key !== dayKey()) { rotateDaily(); render(); }
  }
  setInterval(tickFlash, 1000);

  /* ---------- eventos ---------- */
  function saveAddress() {
    state.checkout.address = {
      name: ($('#f-name') || {}).value || '',
      address: ($('#f-address') || {}).value || '',
      city: ($('#f-city') || {}).value || '',
    };
  }

  document.addEventListener('click', e => {
    const skip = e.target.closest('.skip-link');
    if (skip) {
      e.preventDefault();
      app.focus({ preventScroll: true });
      app.scrollIntoView({ block: 'start' });
      return;
    }

    const tgt = e.target.closest('[data-action]');
    if (!tgt) return;
    const a = tgt.dataset.action;
    switch (a) {
      case 'nav':
        e.preventDefault();
        navigate(tgt.dataset.view, { mode: tgt.dataset.mode });
        break;
      case 'mode':
        navigate('catalog', { mode: tgt.dataset.mode, dealsOnly: false });
        break;
      case 'deals':
        state.query = ''; state.sort = 'pop';
        navigate('catalog', { mode: 'all', dealsOnly: true });
        break;
      case 'product':
        modalFocus = document.activeElement;
        state.product = tgt.dataset.id;
        renderModal();
        break;
      case 'close-modal': closeModal(); break;
      case 'add': addToCart(tgt.dataset.id); break;
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'inc': setQty(tgt.dataset.id, 1); break;
      case 'dec': setQty(tgt.dataset.id, -1); break;
      case 'remove': removeItem(tgt.dataset.id); break;
      case 'clear-cart': clearCart(); break;
      case 'share': share(); break;
      case 'share-savings': shareSavings(); break;
      case 'view-achievements': {
        navigate('savings');
        setTimeout(() => {
          const el = document.getElementById('achievements');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        break;
      }
      case 'lang': setLang(state.lang === 'es' ? 'en' : 'es'); break;
      case 'checkout':
        state.checkout.step = 1;
        navigate('checkout');
        break;
      case 'step': {
        const next = +tgt.dataset.step;
        if (next === 2 && !cartLines().length) { toast(t('cart_empty_toast')); break; }
        state.checkout.step = next;
        render({ scroll: false, focus: true });
        break;
      }
      case 'fill-fake':
        $('#f-name').value = t('f_name_ph');
        $('#f-address').value = t('f_address_ph');
        $('#f-city').value = t('f_city_ph');
        $('#f-name').focus();
        toast(t('fake_filled'));
        break;
      case 'reset-filters':
        state.query = ''; state.dealsOnly = false; state.sort = 'pop';
        render({ scroll: false });
        if ($('#searchInput')) $('#searchInput').focus();
        break;
      case 'retry-credits':
        creditsCache = null;
        loadCredits();
        break;
      case 'pay': pay(); break;
      case 'clear-history':
        if (!window.confirm(t('clear_history_confirm'))) break;
        state.savings = 0; state.calories = 0; state.orders = 0; state.lastOrder = null;
        save(); render({ focus: true }); toast(t('history_cleared'));
        break;
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.id !== 'addressForm') return;
    e.preventDefault();
    saveAddress();
    state.checkout.step = 2;
    render({ scroll: false, focus: true });
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { state.sort = e.target.value; updateGrid(); }
    if (e.target.id === 'dealsOnly') { state.dealsOnly = e.target.checked; updateGrid(); }
    if (e.target.name === 'pay') state.checkout.pay = +e.target.value;
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'searchInput') { state.query = e.target.value; updateGrid(); }
  });

  function updateGrid() {
    const g = $('#grid'); if (!g) return;
    g.innerHTML = gridHTML();
    const c = $('#resultCount'); if (c) c.textContent = resultText(filtered().length);
  }

  document.addEventListener('keydown', e => {
    trapFocus(e);
    if (e.key !== 'Escape') return;
    const overlay = activeOverlay();
    if (!overlay || overlay === $('#processing')) return;
    e.preventDefault();
    if (overlay === $('#modal')) closeModal();
    else if (overlay === $('#cartDrawer')) closeCart();
  });

  addEventListener('hashchange', () => {
    applyRoute();
    render({ focus: true });
  });

  /* ---------- arranque ---------- */
  applyStatic();
  applyRoute();
  render();
})();
