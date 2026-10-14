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
  // imagen con foto real + emoji de respaldo (si la foto no carga)
  const photo = p => `<img class="photo" src="${imgOf(p)}" alt="${p.name}" loading="lazy" decoding="async" onerror="this.remove()">`;

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  })();

  const state = {
    view: 'home',
    mode: persisted.mode || 'all',
    query: '',
    sort: 'pop',
    cart: Array.isArray(persisted.cart) ? persisted.cart : [],
    savings: Number(persisted.savings) || 0,
    calories: Number(persisted.calories) || 0,
    orders: Number(persisted.orders) || 0,
    product: null,
    checkout: { step: 1, address: {}, pay: 'Tarjeta fantasma •••• 4242' },
    lastOrder: null,
  };

  /* ---------- utilidades ---------- */
  function save() {
    const { cart, savings, calories, orders, mode } = state;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cart, savings, calories, orders, mode })); } catch (e) {}
  }
  function money(n) {
    const opts = Number.isInteger(n)
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return '$' + n.toLocaleString('es-ES', opts);
  }
  function stars(r) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pick(a) { return a[Math.random() * a.length | 0]; }

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
    if (!silent) { const p = byId.get(id); toast(`${p.emoji} ${p.name} añadido`); }
  }
  function setQty(id, delta) {
    const it = state.cart.find(ci => ci.id === id);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) state.cart = state.cart.filter(ci => ci.id !== id);
    save(); renderCart();
  }
  function removeItem(id) { state.cart = state.cart.filter(ci => ci.id !== id); save(); renderCart(); }
  function clearCart() { state.cart = []; save(); renderCart(); toast('Carrito vaciado 🧹'); }

  /* ---------- render principal ---------- */
  function render() {
    document.body.dataset.mode = state.mode;
    renderModesNav();
    updateTop();
    const views = { home: viewHome, catalog: viewCatalog, savings: viewSavings, checkout: viewCheckout, confirm: viewConfirm, tracking: viewTracking, credits: viewCredits };
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
        <span>${m.emoji}</span> ${m.name}
      </button>`).join('');
  }

  function updateTop() {
    $('#savingsTop').textContent = money(state.savings);
    $('#cartCount').textContent = cartCount();
  }

  /* ---------- vistas ---------- */
  function viewHome() {
    const saved = state.savings > 0
      ? `<div class="saved-pill">💸 Ya te has ahorrado <b>${money(state.savings)}</b> en ${state.orders} pedido(s) fantasma</div>`
      : '';
    return `
    <section class="page">
      <div class="hero">
        <h1>Compra todo lo que quieras.<br>No pagues nada.<br>No llegará nada.</h1>
        <p>Carrito Fantasma replica todo el ritual de comprar online —catálogo, carrito, pago y hasta el seguimiento del repartidor— y se detiene justo antes de la parte que te cuesta dinero. La dopamina, sin arruinarte y sin que nadie te estafe.</p>
        <div class="row">
          <button class="primary" data-action="nav" data-view="catalog">Empezar a llenar el carrito 🛒</button>
          <button class="ghost" data-action="nav" data-view="savings">Ver cuánto ahorras 💸</button>
        </div>
        ${saved}
      </div>

      <h2 class="section-title">Elige tu tienda</h2>
      <div class="mode-grid">
        ${MODES.filter(m => m.id !== 'all').map(m => `
          <button class="mode-card" data-action="mode" data-mode="${m.id}">
            <span class="stripe" style="--m:${m.accent}"></span>
            <span class="big-emoji">${m.emoji}</span>
            <h3>${m.name}</h3>
            <p>${m.tagline}</p>
          </button>`).join('')}
      </div>

      <h2 class="section-title">Cómo funciona</h2>
      <div class="features">
        <div class="feature"><b>1 · Llena el carrito</b><span>Añade ropa, comida, tecnología o caprichos imposibles sin límite.</span></div>
        <div class="feature"><b>2 · Paga de mentira</b><span>Dirección ficticia y "tarjeta fantasma". El botón de pagar no cobra nada.</span></div>
        <div class="feature"><b>3 · Sigue el envío</b><span>Mira cómo tu pedido avanza… y se queda para siempre "en reparto".</span></div>
        <div class="feature"><b>4 · Cuenta tu ahorro</b><span>La app suma todo lo que no gastaste y las calorías que no te comiste.</span></div>
      </div>

      <div class="manifesto">
        <h3>Nuestro compromiso</h3>
        <ul>
          <li>✅ Cero pagos reales. Cero entregas. Cero artículos.</li>
          <li>✅ Cero cookies, cero anuncios, cero rastreadores. Nada sale de tu navegador.</li>
          <li>✅ Gratis y sin registro. No hay letra pequeña.</li>
          <li>💡 Funciona mejor para un antojo puntual, no como escape de tus emociones.</li>
        </ul>
      </div>
    </section>`;
  }

  function filtered() {
    let list = PRODUCTS.filter(p => state.mode === 'all' || p.mode === state.mode);
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter(p => (p.name + ' ' + p.desc).toLowerCase().includes(q));
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
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <p class="desc">${p.desc}</p>
        <div class="rate">${stars(p.rating)} <span>${p.rating.toFixed(1)} (${p.reviews.toLocaleString('es-ES')})</span></div>
        <div class="price-row">
          <div class="price">${money(p.price)}${old}</div>
          <button class="add" data-action="add" data-id="${p.id}" aria-label="Añadir ${p.name} al carrito">＋</button>
        </div>
      </div>
    </article>`;
  }

  function gridHTML() {
    const list = filtered();
    if (!list.length) return `<div class="empty-grid"><span class="big">🔍</span>No encontramos nada con ese nombre. Prueba otra búsqueda.</div>`;
    return list.map(card).join('');
  }

  function viewCatalog() {
    const m = modeById[state.mode] || modeById.all;
    return `
    <section class="page">
      <div class="catalog-head">
        <h1>${m.emoji} ${m.name}</h1>
        <span class="flash">⚡ Oferta fantasma termina en <b class="js-flash">09:59</b></span>
      </div>
      <p class="muted">${m.tagline}. Precios de mentira, satisfacción real.</p>
      <div class="toolbar">
        <input id="searchInput" type="search" placeholder="Buscar productos…" value="${state.query.replace(/"/g, '&quot;')}" aria-label="Buscar">
        <select id="sortSel" aria-label="Ordenar">
          <option value="pop" ${state.sort === 'pop' ? 'selected' : ''}>Más populares</option>
          <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>Precio: menor a mayor</option>
          <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>Precio: mayor a menor</option>
          <option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>Mejor valorados</option>
        </select>
      </div>
      <p class="results"><span id="resultCount">${filtered().length}</span> productos</p>
      <div class="grid" id="grid">${gridHTML()}</div>
    </section>`;
  }

  function viewSavings() {
    return `
    <section class="page savings">
      <h1>Tu ahorro fantasma 💸</h1>
      <p class="muted">Todo lo que has "comprado" sin gastar un centavo.</p>
      <div class="stat-grid">
        <div class="stat"><div class="n">${money(state.savings)}</div><div class="l">Dinero que no gastaste</div></div>
        <div class="stat"><div class="n">${state.orders}</div><div class="l">Pedidos fantasma</div></div>
        <div class="stat"><div class="n">${Math.round(state.calories).toLocaleString('es-ES')}</div><div class="l">Calorías que no comiste</div></div>
      </div>
      <div class="manifesto">
        <h3>Recuerda</h3>
        <ul>
          <li>Esto es un juego. Los pedidos no existen y no salvan tu presupuesto real por sí solos.</li>
          <li>Si el antojo de comprar es constante, habla con alguien de confianza o un profesional.</li>
          <li>Aquí nunca se ha enviado ni un solo dato tuyo a ningún servidor. Lo prometemos.</li>
        </ul>
      </div>
      <div class="row">
        <button class="primary" data-action="nav" data-view="catalog">Seguir comprando</button>
        <button class="ghost" data-action="clear-history">Borrar historial</button>
      </div>
    </section>`;
  }

  function viewCheckout() {
    const step = state.checkout.step;
    const lines = cartLines();
    const total = cartTotal();
    const a = state.checkout.address;
    const methods = ['Tarjeta fantasma •••• 4242', 'Bizum imaginario', 'Efectivo de Monopoly', 'Un billete de chocolate'];
    return `
    <section class="page checkout">
      <button class="link-back" data-action="open-cart">← Volver al carrito</button>
      <h1>Tramitar pedido (de mentira)</h1>
      <div class="steps-ind">${[1, 2, 3].map(n => `<span class="dot ${n <= step ? 'on' : ''}"></span>`).join('')}</div>

      ${step === 1 ? `
        <div class="panel">
          <h2>1 · ¿A dónde nunca llegará?</h2>
          <div class="field"><label for="f-name">Nombre</label><input id="f-name" placeholder="Tu nombre" value="${a.name || ''}"></div>
          <div class="field"><label for="f-address">Dirección</label><input id="f-address" placeholder="Calle Imaginaria 123" value="${a.address || ''}"></div>
          <div class="field"><label for="f-city">Ciudad</label><input id="f-city" placeholder="Neverlandia" value="${a.city || ''}"></div>
          <button class="primary big" data-action="step" data-step="2">Continuar</button>
        </div>` : ''}

      ${step === 2 ? `
        <div class="panel">
          <h2>2 · Método de pago ficticio</h2>
          ${methods.map(m => `<label class="radio"><input type="radio" name="pay" value="${m}" ${state.checkout.pay === m ? 'checked' : ''}> ${m}</label>`).join('')}
          <div class="row">
            <button class="ghost" data-action="step" data-step="1">Atrás</button>
            <button class="primary" data-action="step" data-step="3">Continuar</button>
          </div>
        </div>` : ''}

      ${step === 3 ? `
        <div class="panel">
          <h2>3 · Revisa tu pedido imaginario</h2>
          <ul class="review">${lines.map(l => `<li><span>${l.emoji} ${l.name} ×${l.qty}</span><b>${money(l.price * l.qty)}</b></li>`).join('')}</ul>
          <div class="total-row"><span>Total</span><b>${money(total)}</b></div>
          <p class="muted">Método: ${state.checkout.pay}. No se cobrará nada. Nunca.</p>
          <div class="row">
            <button class="ghost" data-action="step" data-step="2">Atrás</button>
            <button class="primary big" data-action="pay">Pagar ${money(total)} 💳</button>
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
      <h1>¡Pedido realizado!</h1>
      <p class="muted">En tu imaginación. No te hemos cobrado nada y no recibirás nada.</p>
      <div class="order-box">
        <p>Pedido <span class="order-id">${o.id}</span></p>
        <ul class="review">${o.lines.map(l => `<li><span>${l.emoji} ${l.name} ×${l.qty}</span><b>${money(l.price * l.qty)}</b></li>`).join('')}</ul>
        <div class="total-row"><span>Te has ahorrado</span><b>${money(o.total)}</b></div>
      </div>
      <div class="row" style="justify-content:center">
        <button class="primary" data-action="nav" data-view="tracking">Seguir el envío fantasma 🚚</button>
        <button class="ghost" data-action="nav" data-view="catalog">Seguir comprando</button>
      </div>
    </section>`;
  }

  function viewTracking() {
    const o = state.lastOrder;
    const steps = [
      ['Pedido confirmado', 'Recibimos tu pedido que no existe'],
      ['Preparando el paquete', 'Alguien en algún lugar no está haciendo nada'],
      ['En camino', 'Tu paquete fantasma avanza a toda velocidad'],
      ['En reparto', 'El repartidor se detuvo a ver una serie. Puede tardar.'],
    ];
    return `
    <section class="page tracking">
      <h1>Seguimiento del pedido ${o ? `<span class="order-id">${o.id}</span>` : ''}</h1>
      <p class="muted">Spoiler: nunca llegará. Pero qué bien se siente mirarlo.</p>
      <ul class="track-list" id="tracking">
        ${steps.map((s, i) => `
          <li class="step" data-i="${i}">
            <span class="dot2">${i === 0 ? '📦' : i === 1 ? '🏭' : i === 2 ? '🚚' : '🛵'}</span>
            <div><b>${s[0]}</b><small>${s[1]}</small></div>
          </li>`).join('')}
      </ul>
      <div class="track-note" id="tracknote" hidden>
        📭 Tu paquete sigue "en reparto" desde hace 47 minutos. Tómalo como una señal. 😌
      </div>
      <div class="row">
        <button class="primary" data-action="nav" data-view="savings">Ver mi ahorro 💸</button>
        <button class="ghost" data-action="nav" data-view="catalog">Seguir comprando</button>
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
          <button class="icon" data-action="close-modal" aria-label="Cerrar" style="align-self:flex-end">✕</button>
          ${p.badge ? `<span class="badge" style="position:static;align-self:flex-start;background:${acc(p)};color:#fff;padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:800">${p.badge}</span>` : ''}
          <h2>${p.name}</h2>
          <div class="rate">${stars(p.rating)} <span>${p.rating.toFixed(1)} · ${p.reviews.toLocaleString('es-ES')} reseñas</span></div>
          <p class="desc">${p.desc}</p>
          <div class="price">${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ''}</div>
          <p class="muted tiny">Envío fantasma gratis · Llega nunca · Devoluciones: tampoco</p>
          <button class="primary big" data-action="add" data-id="${p.id}">Añadir al carrito 🛒</button>
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
      body.innerHTML = `<div class="empty">Tu carrito está vacío.<br><br>Llena el carrito todo lo que quieras.<br>Luego cierra la pestaña. 😌</div>`;
    } else {
      body.innerHTML = lines.map(l => `
        <div class="line">
          <div class="line-img" style="--c:${acc(l)}"><span class="emoji">${l.emoji}</span>${photo(l)}</div>
          <div class="line-info"><strong>${l.name}</strong><span class="muted tiny">${money(l.price)}</span></div>
          <div class="qty">
            <button data-action="dec" data-id="${l.id}" aria-label="Quitar uno">−</button>
            <span>${l.qty}</span>
            <button data-action="inc" data-id="${l.id}" aria-label="Añadir uno">＋</button>
          </div>
          <button class="rm" data-action="remove" data-id="${l.id}" aria-label="Eliminar">✕</button>
        </div>`).join('');
    }
    const total = cartTotal();
    $('#cartSubtotal').textContent = money(total);
    $('#payBtn').disabled = !lines.length;
    const remaining = Math.max(0, SHIP_FREE - total);
    $('#shipText').innerHTML = total <= 0
      ? `Añade ${money(SHIP_FREE)} para el envío fantasma gratis`
      : (remaining > 0
        ? `Te faltan <b>${money(remaining)}</b> para el envío fantasma gratis`
        : `🎉 Envío fantasma gratis desbloqueado`);
    $('#shipFill').style.width = Math.min(100, (total / SHIP_FREE) * 100) + '%';
  }

  function openCart() { document.body.classList.add('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
  function closeCart() { document.body.classList.remove('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); }

  /* ---------- créditos de imágenes ---------- */
  function viewCredits() {
    return `
    <section class="page credits">
      <button class="link-back" data-action="nav" data-view="home">← Inicio</button>
      <h1>Créditos de las imágenes</h1>
      <p class="muted">Las fotos son la imagen principal de artículos de Wikipedia y archivos de Wikimedia Commons, usadas bajo sus respectivas licencias. Se descargaron al propio sitio: tu navegador no pide nada a terceros.</p>
      <div id="creditsList" class="credits-list">Cargando…</div>
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
          <td>${p ? p.name : id}</td>
          <td>${c.author || '—'}</td>
          <td>${lic}</td>
          <td><a href="${c.source}" target="_blank" rel="noopener">fuente</a></td>
        </tr>`;
      }).join('');
      box.innerHTML = `<table class="credits-table"><thead><tr><th></th><th>Producto</th><th>Autor</th><th>Licencia</th><th>Origen</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) {
      box.innerHTML = '<p class="muted">No se pudieron cargar los créditos.</p>';
    }
  }

  /* ---------- pago ---------- */
  function pay() {
    if (!cartLines().length) { toast('El carrito está vacío'); return; }
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
    const msgs = ['Conectando con el banco imaginario…', 'Verificando fondos que no existen…', 'Autorizando compra ficticia…', '¡Listo! Nada fue cobrado.'];
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
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
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
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    switch (a) {
      case 'nav':
        e.preventDefault();
        state.view = t.dataset.view;
        if (state.view === 'catalog' && t.dataset.mode) state.mode = t.dataset.mode;
        render(); break;
      case 'mode':
        state.mode = t.dataset.mode; state.view = 'catalog'; render(); break;
      case 'product': state.product = t.dataset.id; renderModal(); break;
      case 'close-modal': closeModal(); break;
      case 'add': addToCart(t.dataset.id); break;
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'inc': setQty(t.dataset.id, 1); break;
      case 'dec': setQty(t.dataset.id, -1); break;
      case 'remove': removeItem(t.dataset.id); break;
      case 'clear-cart': clearCart(); break;
      case 'checkout': closeCart(); state.checkout.step = 1; state.view = 'checkout'; render(); break;
      case 'step': {
        if (state.checkout.step === 1) {
          state.checkout.address = {
            name: ($('#f-name') || {}).value || '',
            address: ($('#f-address') || {}).value || '',
            city: ($('#f-city') || {}).value || '',
          };
        }
        state.checkout.step = +t.dataset.step; render(); break;
      }
      case 'pay': pay(); break;
      case 'clear-history':
        state.savings = 0; state.calories = 0; state.orders = 0; state.lastOrder = null;
        save(); render(); toast('Historial borrado'); break;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { state.sort = e.target.value; updateGrid(); }
    if (e.target.name === 'pay') state.checkout.pay = e.target.value;
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
  render();
})();
