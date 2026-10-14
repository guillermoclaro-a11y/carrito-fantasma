/* ============ Carrito Fantasma — lógica ============ */
(function () {
  'use strict';

  const LS_KEY = 'carrito-fantasma-v1';
  const SHIP_FREE = 50;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');

  const modeById = Object.fromEntries(MODES.map(m => [m.id, m]));
  const byId = new Map(PRODUCTS.map(p => [p.id, p]));
  const acc = p => (modeById[p.mode] || modeById.all).accent;
  const imgOf = p => `assets/img/${p.id}.jpg`;

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  })();
  // Permite enlazar directo a un idioma: ?lang=en  (útil para compartir)
  const urlLang = (() => {
    try { return (new URLSearchParams(location.search).get('lang') || '').toLowerCase(); } catch (e) { return ''; }
  })();

  const state = {
    view: 'home',
    mode: persisted.mode || 'all',
    lang: urlLang ? (urlLang === 'en' ? 'en' : 'es') : (persisted.lang === 'en' ? 'en' : 'es'),
    query: '',
    sort: 'pop',
    cart: Array.isArray(persisted.cart) ? persisted.cart : [],
    savings: Number(persisted.savings) || 0,
    calories: Number(persisted.calories) || 0,
    orders: Number(persisted.orders) || 0,
    product: null,
    checkout: { step: 1, address: {}, pay: 0 },
    lastOrder: null,
  };

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

  // imagen con foto real + emoji de respaldo (si la foto no carga)
  const photo = p => `<img class="photo" src="${imgOf(p)}" alt="${pname(p)}" loading="lazy" decoding="async" onerror="this.remove()">`;

  /* ---------- utilidades ---------- */
  function save() {
    const { cart, savings, calories, orders, mode, lang } = state;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cart, savings, calories, orders, mode, lang })); } catch (e) {}
  }
  function money(n) {
    const opts = Number.isInteger(n)
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return '$' + n.toLocaleString(locale(), opts);
  }
  const num = n => n.toLocaleString(locale());
  function stars(r) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  function pick(a) { return a[Math.random() * a.length | 0]; }

  function applyMeta() {
    document.documentElement.lang = dict().html_lang;
    document.title = t('title');
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
    setMeta('meta[name="description"]', t('meta_desc'));
    setMeta('meta[property="og:title"]', t('title'));
    setMeta('meta[property="og:description"]', t('meta_desc'));
  }
  function applyStatic() {
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
    const lt = $('#langToggle');
    if (lt) { lt.textContent = state.lang === 'es' ? 'EN' : 'ES'; lt.setAttribute('title', t('lang_toggle')); lt.setAttribute('aria-label', t('lang_toggle')); }
    applyMeta();
  }
  function setLang(l) { state.lang = l === 'en' ? 'en' : 'es'; save(); applyStatic(); render(); }

  /* ---------- carrito ---------- */
  const cartLines = () => state.cart
    .map(ci => { const p = byId.get(ci.id); return p ? { ...p, qty: ci.qty } : null; })
    .filter(Boolean);
  const cartCount   = () => state.cart.reduce((s, ci) => s + ci.qty, 0);
  const cartTotal   = () => cartLines().reduce((s, l) => s + l.price * l.qty, 0);
  const cartCalories = () => cartLines().reduce((s, l) => s + (l.calories || 0) * l.qty, 0);

  function addToCart(id, silent) {
    const found = state.cart.find(ci => ci.id === id);
    if (found) found.qty++; else state.cart.push({ id, qty: 1 });
    save(); renderCart();
    const btn = $('#cartBtn');
    if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    if (!silent) { const p = byId.get(id); toast(t('added', { emoji: p.emoji, name: pname(p) })); }
  }
  function setQty(id, delta) {
    const it = state.cart.find(ci => ci.id === id);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) state.cart = state.cart.filter(ci => ci.id !== id);
    save(); renderCart();
  }
  function removeItem(id) { state.cart = state.cart.filter(ci => ci.id !== id); save(); renderCart(); }
  function clearCart() { state.cart = []; save(); renderCart(); toast(t('cart_cleared')); }

  /* ---------- render principal ---------- */
  function render() {
    document.body.dataset.mode = state.mode;
    renderModesNav();
    updateTop();
    const views = { home: viewHome, catalog: viewCatalog, savings: viewSavings, checkout: viewCheckout, confirm: viewConfirm, tracking: viewTracking, credits: viewCredits, support: viewSupport };
    app.innerHTML = (views[state.view] || viewHome)();
    renderModal();
    renderCart();
    window.scrollTo(0, 0);
    if (state.view === 'tracking') startTracking();
    if (state.view === 'confirm') celebrate();
    if (state.view === 'credits') loadCredits();
  }

  function renderModesNav() {
    $('#modesNav').innerHTML = MODES.map(m => `
      <button class="mode-btn ${state.mode === m.id ? 'active' : ''}" data-action="mode" data-mode="${m.id}">
        <span>${m.emoji}</span> ${mname(m)}
      </button>`).join('');
  }

  function updateTop() {
    $('#savingsTop').textContent = money(state.savings);
    $('#cartCount').textContent = cartCount();
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
    let list = PRODUCTS.filter(p => state.mode === 'all' || p.mode === state.mode);
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter(p => (pname(p) + ' ' + pdesc(p)).toLowerCase().includes(q));
    }
    if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (state.sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else list = [...list].sort((a, b) => b.reviews - a.reviews);
    return list;
  }

  function card(p) {
    const old = p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : '';
    return `
    <article class="card" data-action="product" data-id="${p.id}">
      <div class="card-img" style="--c:${acc(p)}">
        <span class="emoji">${p.emoji}</span>
        ${photo(p)}
        ${p.badge ? `<span class="badge">${pbadge(p)}</span>` : ''}
      </div>
      <div class="card-body">
        <h3>${pname(p)}</h3>
        <p class="desc">${pdesc(p)}</p>
        <div class="rate">${stars(p.rating)} <span>${p.rating.toFixed(1)} (${num(p.reviews)})</span></div>
        <div class="price-row">
          <div class="price">${money(p.price)}${old}</div>
          <button class="add" data-action="add" data-id="${p.id}" aria-label="${t('add_aria', { name: pname(p) })}">＋</button>
        </div>
      </div>
    </article>`;
  }

  function gridHTML() {
    const list = filtered();
    if (!list.length) return `<div class="empty-grid">${t('empty_grid')}</div>`;
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
        <input id="searchInput" type="search" placeholder="${t('search_ph')}" value="${state.query.replace(/"/g, '&quot;')}" aria-label="${t('search_aria')}">
        <select id="sortSel" aria-label="${t('sort_aria')}">
          <option value="pop" ${state.sort === 'pop' ? 'selected' : ''}>${t('sort_pop')}</option>
          <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>${t('sort_asc')}</option>
          <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>${t('sort_desc')}</option>
          <option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>${t('sort_rating')}</option>
        </select>
      </div>
      <p class="results"><span id="resultCount">${filtered().length}</span> ${t('results', { n: '' }).trim()}</p>
      <div class="grid" id="grid">${gridHTML()}</div>
    </section>`;
  }

  function viewSavings() {
    return `
    <section class="page savings">
      <h1>${t('savings_h1')}</h1>
      <p class="muted">${t('savings_p')}</p>
      <div class="stat-grid">
        <div class="stat"><div class="n">${money(state.savings)}</div><div class="l">${t('stat_money')}</div></div>
        <div class="stat"><div class="n">${state.orders}</div><div class="l">${t('stat_orders')}</div></div>
        <div class="stat"><div class="n">${num(Math.round(state.calories))}</div><div class="l">${t('stat_cal')}</div></div>
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
        <button class="ghost" data-action="clear-history">${t('clear_history')}</button>
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
      <div class="steps-ind">${[1, 2, 3].map(n => `<span class="dot ${n <= step ? 'on' : ''}"></span>`).join('')}</div>

      ${step === 1 ? `
        <div class="panel">
          <h2>${t('st1')}</h2>
          <div class="field"><label for="f-name">${t('f_name')}</label><input id="f-name" placeholder="${t('f_name_ph')}" value="${a.name || ''}"></div>
          <div class="field"><label for="f-address">${t('f_address')}</label><input id="f-address" placeholder="${t('f_address_ph')}" value="${a.address || ''}"></div>
          <div class="field"><label for="f-city">${t('f_city')}</label><input id="f-city" placeholder="${t('f_city_ph')}" value="${a.city || ''}"></div>
          <button class="primary big" data-action="step" data-step="2">${t('continue')}</button>
        </div>` : ''}

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
      <ul class="track-list" id="tracking">
        ${steps.map((s, i) => `
          <li class="step" data-i="${i}">
            <span class="dot2">${i === 0 ? '📦' : i === 1 ? '🏭' : i === 2 ? '🚚' : '🛵'}</span>
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
  function renderModal() {
    const el = $('#modal');
    if (!state.product) { el.hidden = true; el.innerHTML = ''; return; }
    const p = byId.get(state.product);
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `
      <div class="modal-card">
        <div class="modal-img" style="--c:${acc(p)}"><span class="emoji">${p.emoji}</span>${photo(p)}</div>
        <div class="modal-info">
          <button class="icon" data-action="close-modal" aria-label="${t('close')}" style="align-self:flex-end">✕</button>
          ${p.badge ? `<span class="badge" style="position:static;align-self:flex-start;background:${acc(p)};color:#fff;padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:800">${pbadge(p)}</span>` : ''}
          <h2>${pname(p)}</h2>
          <div class="rate">${stars(p.rating)} <span>${t('reviews', { rating: p.rating.toFixed(1), n: num(p.reviews) })}</span></div>
          <p class="desc">${pdesc(p)}</p>
          <div class="price">${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ''}</div>
          <p class="muted tiny">${t('modal_note')}</p>
          <button class="primary big" data-action="add" data-id="${p.id}">${t('add_cart')}</button>
        </div>
      </div>`;
    el.onclick = e => { if (e.target === el) closeModal(); };
  }
  const closeModal = () => { state.product = null; renderModal(); };

  /* ---------- carrito (drawer) ---------- */
  function renderCart() {
    $('#cartCount').textContent = cartCount();
    const body = $('#cartBody');
    const lines = cartLines();
    if (!lines.length) {
      body.innerHTML = `<div class="empty">${t('cart_empty')}</div>`;
    } else {
      body.innerHTML = lines.map(l => `
        <div class="line">
          <div class="line-img" style="--c:${acc(l)}"><span class="emoji">${l.emoji}</span>${photo(l)}</div>
          <div class="line-info"><strong>${pname(l)}</strong><span class="muted tiny">${money(l.price)}</span></div>
          <div class="qty">
            <button data-action="dec" data-id="${l.id}" aria-label="${t('dec_aria')}">−</button>
            <span>${l.qty}</span>
            <button data-action="inc" data-id="${l.id}" aria-label="${t('inc_aria')}">＋</button>
          </div>
          <button class="rm" data-action="remove" data-id="${l.id}" aria-label="${t('remove_aria')}">✕</button>
        </div>`).join('');
    }
    const total = cartTotal();
    $('#cartSubtotal').textContent = money(total);
    $('#payBtn').disabled = !lines.length;
    const remaining = Math.max(0, SHIP_FREE - total);
    $('#shipText').innerHTML = total <= 0
      ? t('ship_add', { money: money(SHIP_FREE) })
      : (remaining > 0
        ? t('ship_left', { money: money(remaining) })
        : t('ship_free'));
    $('#shipFill').style.width = Math.min(100, (total / SHIP_FREE) * 100) + '%';
  }

  function openCart() { document.body.classList.add('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
  function closeCart() { document.body.classList.remove('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); }

  /* ---------- compartir ---------- */
  async function share() {
    const data = { title: 'Carrito Fantasma', text: t('share_text'), url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); toast(t('link_copied')); }
    } catch (e) { /* el usuario canceló */ }
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
      creditsCache = creditsCache || await (await fetch('assets/img/credits.json')).json();
      const rows = Object.entries(creditsCache).map(([id, c]) => {
        const p = byId.get(id);
        const lic = c.licenseUrl ? `<a href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license || 'licencia'}</a>` : (c.license || '');
        return `<tr>
          <td><img src="assets/img/${id}.jpg" alt="" loading="lazy"></td>
          <td>${p ? pname(p) : id}</td>
          <td>${c.author || '—'}</td>
          <td>${lic}</td>
          <td><a href="${c.source}" target="_blank" rel="noopener">${t('source_link')}</a></td>
        </tr>`;
      }).join('');
      box.innerHTML = `<table class="credits-table"><thead><tr><th></th><th>${t('th_product')}</th><th>${t('th_author')}</th><th>${t('th_license')}</th><th>${t('th_source')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) {
      box.innerHTML = `<p class="muted">${t('credits_error')}</p>`;
    }
  }

  /* ---------- pago ---------- */
  function pay() {
    if (!cartLines().length) { toast(t('cart_empty_toast')); return; }
    closeCart();
    showProcessing(() => {
      const total = cartTotal();
      state.savings += total;
      state.calories += cartCalories();
      state.orders += 1;
      state.lastOrder = {
        id: 'CF-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        total, lines: cartLines(), date: Date.now(),
      };
      state.cart = [];
      state.checkout = { step: 1, address: {}, pay: state.checkout.pay };
      save(); state.view = 'confirm'; render();
    });
  }

  function showProcessing(cb) {
    const box = $('#processing'); const txt = $('#procText');
    const msgs = state.lang === 'en'
      ? ['Connecting to the imaginary bank…', 'Verifying funds that do not exist…', 'Authorizing a fictional purchase…', 'Done! Nothing was charged.']
      : ['Conectando con el banco imaginario…', 'Verificando fondos que no existen…', 'Autorizando compra ficticia…', '¡Listo! Nada fue cobrado.'];
    let i = 0; txt.textContent = msgs[0];
    box.hidden = false;
    const iv = setInterval(() => { i++; if (msgs[i]) txt.textContent = msgs[i]; }, 550);
    setTimeout(() => { clearInterval(iv); box.hidden = true; cb(); }, 2400);
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
  function toast(msg) {
    const tst = $('#toast'); tst.textContent = msg; tst.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => tst.classList.remove('show'), 2200);
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

  /* ---------- contador de "oferta" ---------- */
  let flashLeft = 599;
  setInterval(() => {
    flashLeft--; if (flashLeft <= 0) flashLeft = 599;
    const el = $('.js-flash');
    if (el) {
      const m = String(Math.floor(flashLeft / 60)).padStart(2, '0');
      const s = String(flashLeft % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }
  }, 1000);

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const tgt = e.target.closest('[data-action]');
    if (!tgt) return;
    const a = tgt.dataset.action;
    switch (a) {
      case 'nav':
        e.preventDefault();
        state.view = tgt.dataset.view;
        if (state.view === 'catalog' && tgt.dataset.mode) state.mode = tgt.dataset.mode;
        render(); break;
      case 'mode':
        state.mode = tgt.dataset.mode; state.view = 'catalog'; render(); break;
      case 'product': state.product = tgt.dataset.id; renderModal(); break;
      case 'close-modal': closeModal(); break;
      case 'add': addToCart(tgt.dataset.id); break;
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'inc': setQty(tgt.dataset.id, 1); break;
      case 'dec': setQty(tgt.dataset.id, -1); break;
      case 'remove': removeItem(tgt.dataset.id); break;
      case 'clear-cart': clearCart(); break;
      case 'share': share(); break;
      case 'lang': setLang(state.lang === 'es' ? 'en' : 'es'); break;
      case 'checkout': closeCart(); state.checkout.step = 1; state.view = 'checkout'; render(); break;
      case 'step': {
        if (state.checkout.step === 1) {
          state.checkout.address = {
            name: ($('#f-name') || {}).value || '',
            address: ($('#f-address') || {}).value || '',
            city: ($('#f-city') || {}).value || '',
          };
        }
        state.checkout.step = +tgt.dataset.step; render(); break;
      }
      case 'pay': pay(); break;
      case 'clear-history':
        state.savings = 0; state.calories = 0; state.orders = 0; state.lastOrder = null;
        save(); render(); toast(t('history_cleared')); break;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { state.sort = e.target.value; updateGrid(); }
    if (e.target.name === 'pay') state.checkout.pay = +e.target.value;
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'searchInput') { state.query = e.target.value; updateGrid(); }
  });

  function updateGrid() {
    const g = $('#grid'); if (!g) return;
    g.innerHTML = gridHTML();
    const c = $('#resultCount'); if (c) c.textContent = filtered().length;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCart(); }
  });

  /* ---------- arranque ---------- */
  applyStatic();
  render();
})();
