/* Catálogo y configuración de Carrito Fantasma.
   Todo es ficticio. Los precios son de mentira (obviamente). */

/* ============================================================
   DONACIONES — ¡RELLENA TUS ENLACES AQUÍ!
   Crea tus cuentas en las plataformas que quieras y pega tu URL.
   Deja url:'' en las que no uses (se ocultan solas).
   Se muestran como enlaces simples: sin scripts ni rastreadores.
   ============================================================ */
const DONATIONS = [
  { name: 'Cafecito',       emoji: '☕', url: 'https://cafecito.app/c4rrofantasma', hint: 'Invitame un cafecito (donación puntual o mensual)', hint_en: 'Buy me a coffee (one-off or monthly)' },
  { name: 'Ko-fi',          emoji: '🫖', url: '', hint: 'Donación puntual o mensual', hint_en: 'One-off or monthly donation' },
  { name: 'Buy Me a Coffee', emoji: '🍩', url: '', hint: 'Rápido con tarjeta o PayPal', hint_en: 'Quick with card or PayPal' },
  { name: 'Liberapay',      emoji: '🤝', url: '', hint: 'Suscripción recurrente, sin ánimo de lucro', hint_en: 'Recurring subscription, non-profit' },
  { name: 'GitHub Sponsors', emoji: '💚', url: '', hint: 'Si alojas el proyecto en GitHub', hint_en: 'If you host the project on GitHub' },
];

const MODES = [
  { id: 'all',      name: 'Todo',       emoji: '✨', tagline: 'Todo el catálogo',        accent: '#6d5efc' },
  { id: 'moda',     name: 'Moda',       emoji: '👕', tagline: 'Ropa, calzado, accesorios', accent: '#ff4d8d' },
  { id: 'comida',   name: 'Comida',     emoji: '🍕', tagline: 'Delivery que nunca llega', accent: '#ff8a3d' },
  { id: 'tech',     name: 'Tecnología', emoji: '💻', tagline: 'Gadgets y electrónica',   accent: '#2fa8ff' },
  { id: 'absurdo',  name: 'Absurdo',    emoji: '🚀', tagline: 'Caprichos imposibles',    accent: '#e8b64c' },
];

const PRODUCTS = [
  // ---------------- MODA ----------------
  { id: 'm1',  mode: 'moda', name: 'Zapatillas Nube',      emoji: '👟', price: 89.99,  oldPrice: 129.99, rating: 4.8, reviews: 2143, badge: 'Oferta',   desc: 'Caminas por las nubes. Nunca tocarás el suelo real.' },
  { id: 'm2',  mode: 'moda', name: 'Sudadera Oversize',    emoji: '🧥', price: 45.00,  rating: 4.6, reviews: 812,  desc: 'Comodidad absoluta para no salir de casa.' },
  { id: 'm3',  mode: 'moda', name: 'Vaquero Perfecto',     emoji: '👖', price: 59.90,  rating: 4.4, reviews: 1330, desc: 'El que nunca te quedará igual que en la foto.' },
  { id: 'm4',  mode: 'moda', name: 'Chaqueta de Cuero',    emoji: '🧥', price: 149.00, oldPrice: 199.00, rating: 4.7, reviews: 402, badge: 'Top ventas', desc: 'Actitud instantánea, cero gasto real.' },
  { id: 'm5',  mode: 'moda', name: 'Gafas de Sol Retro',   emoji: '🕶️', price: 29.99,  rating: 4.3, reviews: 967,  desc: 'Para mirar tus finanzas con estilo.' },
  { id: 'm6',  mode: 'moda', name: 'Bolso de Mano',        emoji: '👜', price: 120.00, rating: 4.9, reviews: 289,  desc: 'Espacioso para llevar todas tus compras imaginarias.' },
  { id: 'm7',  mode: 'moda', name: 'Gorra Minimal',        emoji: '🧢', price: 19.90,  rating: 4.2, reviews: 1540, desc: 'Un clásico. También de mentira.' },
  { id: 'm8',  mode: 'moda', name: 'Reloj Elegante',       emoji: '⌚', price: 210.00, oldPrice: 260.00, rating: 4.8, reviews: 176, badge: 'Oferta', desc: 'Marca la hora de no comprar nada.' },
  { id: 'm9',  mode: 'moda', name: 'Abrigo de Invierno',   emoji: '🧥', price: 99.00,  rating: 4.5, reviews: 623,  desc: 'Calentito, aunque el frío de la tarjeta no existe.' },
  { id: 'm10', mode: 'moda', name: 'Vestido de Verano',    emoji: '👗', price: 39.99,  rating: 4.6, reviews: 1888, desc: 'Ligero como tu cartera después de ir de compras.' },

  // ---------------- COMIDA ----------------
  { id: 'c1',  mode: 'comida', name: 'Pizza Familiar',      emoji: '🍕', price: 14.99, calories: 2200, rating: 4.7, reviews: 5210, badge: 'Top ventas', desc: '8 porciones que no engordan porque no existen.' },
  { id: 'c2',  mode: 'comida', name: 'Sushi Premium',       emoji: '🍣', price: 24.50, calories: 980,  rating: 4.8, reviews: 3104, desc: 'Salmón fresco, cero mercurio y cero entrega.' },
  { id: 'c3',  mode: 'comida', name: 'Hamburguesa Doble',   emoji: '🍔', price: 11.90, calories: 1420, rating: 4.5, reviews: 8890, desc: 'Jugosa, enorme y absolutamente imaginaria.' },
  { id: 'c4',  mode: 'comida', name: 'Tacos al Pastor',     emoji: '🌮', price: 8.75,  calories: 760,  rating: 4.9, reviews: 12045, badge: 'Favorito', desc: 'Cinco tacos que jamás tocarán tu mesa.' },
  { id: 'c5',  mode: 'comida', name: 'Ramen Tonkotsu',      emoji: '🍜', price: 13.20, calories: 1100, rating: 4.7, reviews: 2870, desc: 'Caldo cremoso que se queda en la pantalla.' },
  { id: 'c6',  mode: 'comida', name: 'Bubble Tea',          emoji: '🧋', price: 5.50,  calories: 320,  rating: 4.6, reviews: 6402, desc: 'Perlas de tapioca sin calorías reales. Magia.' },
  { id: 'c7',  mode: 'comida', name: 'Donut Glaseado',      emoji: '🍩', price: 2.90,  calories: 450,  rating: 4.4, reviews: 3390, desc: 'El antojo de las 3 de la mañana, resuelto.' },
  { id: 'c8',  mode: 'comida', name: 'Ensalada César',      emoji: '🥗', price: 9.40,  calories: 380,  rating: 4.1, reviews: 720,  desc: 'La opción sana que tampoco vas a comer.' },
  { id: 'c9',  mode: 'comida', name: 'Alitas BBQ',          emoji: '🍗', price: 10.99, calories: 1340, rating: 4.7, reviews: 4120, desc: 'Pegajosas, adictivas y 100% digitales.' },
  { id: 'c10', mode: 'comida', name: 'Helado Artesanal',    emoji: '🍦', price: 4.50,  calories: 290,  rating: 4.8, reviews: 2980, desc: 'Se derrite en tu imaginación.' },
  { id: 'c11', mode: 'comida', name: 'Burrito Grande',      emoji: '🌯', price: 9.80,  calories: 1180, rating: 4.6, reviews: 3670, desc: 'Enorme, aunque pese exactamente 0 gramos.' },
  { id: 'c12', mode: 'comida', name: 'Café de Especialidad', emoji: '☕', price: 3.20, calories: 5,    rating: 4.5, reviews: 5010, desc: 'Aroma digital, cafeína cero.' },

  // ---------------- TECNOLOGÍA ----------------
  { id: 't1',  mode: 'tech', name: 'Smartphone Pro Max',    emoji: '📱', price: 1299.00, oldPrice: 1449.00, rating: 4.8, reviews: 15230, badge: 'Oferta', desc: 'Cámara de 200 MP para no fotografiar nada.' },
  { id: 't2',  mode: 'tech', name: 'Portátil Ultraligero',  emoji: '💻', price: 1899.00, rating: 4.9, reviews: 4210, badge: 'Top ventas', desc: 'Tan ligero como tu cartera al final del mes.' },
  { id: 't3',  mode: 'tech', name: 'Auriculares ANC',       emoji: '🎧', price: 249.00, oldPrice: 299.00, rating: 4.7, reviews: 9840, desc: 'Modo "no escuches tus gastos".' },
  { id: 't4',  mode: 'tech', name: 'Consola Next-Gen',      emoji: '🎮', price: 499.00, rating: 4.9, reviews: 22310, badge: 'Favorito', desc: 'Sin stock en la vida real. Aquí, siempre disponible.' },
  { id: 't5',  mode: 'tech', name: 'Drone 4K',              emoji: '🛰️', price: 799.00, rating: 4.6, reviews: 1560, desc: 'Para ver tu dinero desde las alturas.' },
  { id: 't6',  mode: 'tech', name: 'Smartwatch Sensor',     emoji: '⌚', price: 379.00, oldPrice: 429.00, rating: 4.5, reviews: 6720, badge: 'Oferta', desc: 'Mide pasos del sofá a la nevera.' },
  { id: 't7',  mode: 'tech', name: 'Cámara Mirrorless',     emoji: '📷', price: 1450.00, rating: 4.9, reviews: 890, desc: 'Fotos increíbles de los productos que no compras.' },
  { id: 't8',  mode: 'tech', name: 'Teclado Mecánico',      emoji: '⌨️', price: 139.00, rating: 4.7, reviews: 3410, desc: 'Escribe "no lo necesito" con satisfacción táctil.' },
  { id: 't9',  mode: 'tech', name: 'Tablet Creativa',       emoji: '📲', price: 649.00, rating: 4.6, reviews: 2130, desc: 'Diseña todo lo que no vas a fabricar.' },
  { id: 't10', mode: 'tech', name: 'Altavoz Inteligente',   emoji: '🔊', price: 199.00, calories: 0, rating: 4.4, reviews: 4520, desc: '"Oye Siri, enséñame cosas que no puedo pagar."' },
  { id: 't11', mode: 'tech', name: 'Proyector Cine',        emoji: '📽️', price: 890.00, rating: 4.7, reviews: 1180, desc: 'Tu cine en casa, sin la butaca real.' },
  { id: 't12', mode: 'tech', name: 'Robot Aspirador',       emoji: '🤖', price: 429.00, oldPrice: 499.00, rating: 4.6, reviews: 7740, badge: 'Oferta', desc: 'Limpia una casa que no tiene polvo real.' },

  // ---------------- ABSURDO ----------------
  { id: 'a1',  mode: 'absurdo', name: 'Una Luna',           emoji: '🌕', price: 99000000, rating: 5.0, reviews: 42,  badge: 'Exclusivo', desc: 'Fases incluidas. Impacto ambiental, ninguno.' },
  { id: 'a2',  mode: 'absurdo', name: 'Isla Privada',       emoji: '🏝️', price: 45000000, rating: 4.9, reviews: 88,  desc: 'Con playa, sin vecinos y sin impuestos.' },
  { id: 'a3',  mode: 'absurdo', name: 'Jet Privado',        emoji: '✈️', price: 38500000, oldPrice: 42000000, rating: 4.8, reviews: 130, badge: 'Oferta', desc: 'Aparcamiento gratis. Cobarde, pero gratis.' },
  { id: 'a4',  mode: 'absurdo', name: 'Yate de Lujo',       emoji: '🛥️', price: 12000000, rating: 4.7, reviews: 205, desc: 'Para navegar mares que no existen.' },
  { id: 'a5',  mode: 'absurdo', name: 'Castillo Histórico', emoji: '🏰', price: 8750000,  rating: 4.6, reviews: 64,  desc: 'Con foso y dragón imaginario de serie.' },
  { id: 'a6',  mode: 'absurdo', name: 'Nube Personal',      emoji: '☁️', price: 1200000,  rating: 4.4, reviews: 310, desc: 'Almacenamiento infinito. Clima, discutible.' },
  { id: 'a7',  mode: 'absurdo', name: 'Dinosaurio Clonado', emoji: '🦖', price: 3400000,  rating: 5.0, reviews: 27,  badge: 'Nuevo', desc: 'Advertencia: puede comerse el carrito.' },
  { id: 'a8',  mode: 'absurdo', name: 'Helado de Oro',      emoji: '🍨', price: 6500,    rating: 4.2, reviews: 1400, desc: 'Se derrite igual de rápido que tu sueldo.' },
  { id: 'a9',  mode: 'absurdo', name: 'Agujero Negro',      emoji: '🕳️', price: 999999999, rating: 3.9, reviews: 9, badge: 'Peligro', desc: 'Envío en 1-2 eones. No reembolsable.' },
  { id: 'a10', mode: 'absurdo', name: 'Obra de Arte',       emoji: '🖼️', price: 250000,  rating: 4.5, reviews: 73,  desc: 'Un cuadro de un perro triste. Invaluable.' },
];
