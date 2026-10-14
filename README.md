# 🛒 Carrito Fantasma

Sitio estático que recrea la experiencia de comprar online (catálogo, carrito, pago y
seguimiento de envío) **sin cobrar nada, sin entregar nada y sin recoger datos**.
Basado en la tendencia de los *dopamine sites*.

## 🌐 En vivo

- **Web (dominio propio):** https://carritofantasma.app/
- **En inglés:** https://carritofantasma.app/?lang=en
- **Repositorio:** https://github.com/guillermoclaro-a11y/carrito-fantasma
- *(espejo GitHub Pages: https://guillermoclaro-a11y.github.io/carrito-fantasma/)*

> 🌎 El sitio es **bilingüe (ES/EN)**. El botón `EN`/`ES` de la cabecera cambia el idioma y
> se recuerda en el navegador. También puedes enlazar directo con `?lang=en` o `?lang=es`.

> 📣 ¿Quieres darlo a conocer? Tienes textos listos para copiar y pegar en
> Reddit, Hacker News, X y TikTok en [`DIFUSION.md`](DIFUSION.md).

## Estructura

```
carrito-fantasma/
├── index.html            # estructura de la página
├── styles.css            # estilos (modo claro/oscuro, responsive)
├── data.js               # catálogo y tiendas (edítalo para añadir productos)
├── i18n.js               # traducciones ES/EN (textos, tiendas y 44 productos)
├── app.js                # lógica: carrito, pago ficticio, seguimiento, ahorro
├── assets/img/           # fotos reales de los productos + credits.json
└── tools/fetch-images.mjs # script que descarga las fotos desde Wikimedia
```

No hay dependencias, ni build, ni backend. Abre `index.html` en el navegador y ya funciona.

## Idiomas (ES/EN)

El español es el idioma original. Los textos en inglés y las traducciones de los productos
viven en `i18n.js` (`UI`, `MODE_I18N`, `BADGE_I18N`, `PRODUCT_I18N`).

- Para **añadir un idioma nuevo**: duplica el bloque dentro de `UI`, `MODE_I18N`,
  `BADGE_I18N` y `PRODUCT_I18N`, y añade el botón correspondiente.
- Para **traducir un producto**: busca su `id` (p. ej. `m1`) en `PRODUCT_I18N`.
- Para **cambiar el texto de interfaz**: edita la clave en `UI.es` / `UI.en`.

## Imágenes de los productos

Las fotos son la **imagen principal de artículos de Wikipedia** (y archivos de Wikimedia
Commons), descargadas al propio proyecto para que el sitio siga siendo autocontenido y no
haga peticiones a terceros en tiempo de ejecución.

- Se guardan en `assets/img/<id>.jpg` (una por producto, `id` = el de `data.js`).
- Las atribuciones y licencias están en `assets/img/credits.json` y se muestran en el
  enlace **«Créditos de las imágenes»** del pie de página.
- Si una imagen no existe o no carga, se muestra el emoji del producto como respaldo.

Para **regenerar o cambiar** las fotos, edita el mapa `MAP` en `tools/fetch-images.mjs`
(producto → artículo de Wikipedia, o `File:Nombre exacto.jpg` de Commons para elegir un
archivo concreto) y ejecuta:

```bash
node tools/fetch-images.mjs
```

Requiere Node 18+ e ImageMagick (`magick`). Respeta las licencias de cada imagen si
reutilizas el proyecto: revisa `credits.json`.

## Personalización rápida

- **Nombre / marca**: cámbialo en `index.html` (`.brand-name` y `<title>`).
- **Productos**: añade objetos al array `PRODUCTS` en `data.js`.
  Campos: `id, mode, name, emoji, price, oldPrice?, rating, reviews, badge?, desc, calories?`.
  Si añades un producto, créale una imagen en `assets/img/<id>.jpg` (o deja el emoji de respaldo).
- **Tiendas/modos**: edita el array `MODES` en `data.js` (el `accent` es su color).
- **Colores**: en `styles.css`, las variables `--accent` por tienda al inicio del archivo.

## Publicar gratis

> ✅ **Ya está publicado:** https://carritofantasma.app/
> (GitHub Pages, rama `master`). Para actualizarlo: `git push`.

### Opción A — Netlify Drop (30 segundos, sin cuenta de código)
1. Entra en https://app.netlify.com/drop
2. Arrastra la carpeta `carrito-fantasma` completa a la ventana.
3. Listo: te da una URL pública. Puedes conectar tu dominio en ajustes.

### Opción B — GitHub Pages
```bash
cd carrito-fantasma
git init
git add .
git commit -m "Carrito Fantasma"
git branch -M main
# crea el repo vacío en github.com y copia la URL:
git remote add origin https://github.com/TU_USUARIO/carrito-fantasma.git
git push -u origin main
```
Luego en GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
En 1-2 minutos estará en `https://TU_USUARIO.github.io/carrito-fantasma/`.

### Opción C — Vercel
```bash
npx vercel --prod
```
(Es un sitio estático: acepta todos los valores por defecto.)

## Monetizar con donaciones (sin anuncios)

El sitio incluye una página de apoyo (`#/support`) pensada para **no romper la promesa de
privacidad**: son enlaces simples, sin scripts ni rastreadores de terceros.

Para activarla, crea tus cuentas y rellena el array `DONATIONS` al inicio de `data.js`:

```js
const DONATIONS = [
  { name: 'Cafecito',        emoji: '☕', url: 'https://cafecito.app/TU_USUARIO', hint: 'Invitame un cafecito', hint_en: 'Buy me a coffee' },
  { name: 'Ko-fi',           emoji: '🫖', url: '', hint: 'Donación puntual o mensual', hint_en: 'One-off or monthly donation' },
  { name: 'Buy Me a Coffee',  emoji: '🍩', url: '', hint: 'Rápido con tarjeta o PayPal', hint_en: 'Quick with card or PayPal' },
  { name: 'Liberapay',       emoji: '🤝', url: '', hint: 'Suscripción recurrente', hint_en: 'Recurring subscription' },
  { name: 'GitHub Sponsors', emoji: '💚', url: '', hint: 'Si alojas en GitHub', hint_en: 'If you host on GitHub' },
];
```

Las entradas con `url: ''` se ocultan. Si no hay ninguna, se muestra un mensaje de
"próximamente". Los enlaces aparecen en el pie de página y tras confirmar un pedido.
Cada entrada puede llevar un `hint` (español) y un `hint_en` (inglés).

> 💡 **Cafecito** va muy bien para el público hispano (especialmente Argentina/LatAm).
> Para el público inglés puedes añadir también Ko-fi o Buy Me a Coffee.
>
> ¿Quieres personalizar tu perfil de Cafecito con buenos textos? Mira
> [`CAFECITO.md`](CAFECITO.md) (descripción, objetivo, mensaje de agradecimiento… en ES y EN).

> 🌐 ¿Quieres tu propio dominio (`carritofantasma.es`)? Tienes la guía completa paso a paso
> en [`DOMINIO.md`](DOMINIO.md) y un verificador de DNS en `tools/check-domain.sh`.
>
> 📣 ¿Vas a difundirlo? Mira [`DIFUSION.md`](DIFUSION.md) (kit por canal) y
> [`MENSAJES.md`](MENSAJES.md) (textos listos para copiar y pegar en Facebook, X y WhatsApp).

**¿Por qué no anuncios?** Además del problema ético (anunciar consumo en una web
anti-consumo), la publicidad exige cookies y rastreadores, y AdSense suele **rechazar**
sitios sin artículos de contenido como este. Ver la conversación del proyecto para el
análisis completo y las alternativas (blog + AdSense, redes de bajo umbral, patrocinio).

## Notas legales y éticas

- El sitio **no debe** cobrar dinero real por "compras" ficticias ni pedir datos personales.
- Deja claro (como ya hace el footer) que es un experimento y que no sustituye ayuda profesional.
- Mantén la promesa de **cero cookies/rastreadores** si usas esta versión: es parte del atractivo.

## Ideas para ampliar

- Cuentas de usuario con historial de "pedidos fantasma".
- Modo "caja de la compra": suena un click al añadir.
- Compartir tu carrito imaginario por enlace.
- Rachas: "llevas 12 días sin gastar de verdad".
