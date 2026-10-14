# 🛒 Carrito Fantasma

Sitio estático que recrea la experiencia de comprar online (catálogo, carrito, pago y
seguimiento de envío) **sin cobrar nada, sin entregar nada y sin recoger datos**.
Basado en la tendencia de los *dopamine sites*.

## Estructura

```
carrito-fantasma/
├── index.html            # estructura de la página
├── styles.css            # estilos (modo claro/oscuro, responsive)
├── data.js               # catálogo y tiendas (edítalo para añadir productos)
├── app.js                # lógica: carrito, pago ficticio, seguimiento, ahorro
├── assets/img/           # fotos reales de los productos + credits.json
└── tools/fetch-images.mjs # script que descarga las fotos desde Wikimedia
```

No hay dependencias, ni build, ni backend. Abre `index.html` en el navegador y ya funciona.

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

## Notas legales y éticas

- El sitio **no debe** cobrar dinero real por "compras" ficticias ni pedir datos personales.
- Deja claro (como ya hace el footer) que es un experimento y que no sustituye ayuda profesional.
- Mantén la promesa de **cero cookies/rastreadores** si usas esta versión: es parte del atractivo.

## Ideas para ampliar

- Cuentas de usuario con historial de "pedidos fantasma".
- Modo "caja de la compra": suena un click al añadir.
- Compartir tu carrito imaginario por enlace.
- Rachas: "llevas 12 días sin gastar de verdad".
