# 🌐 Poner un dominio propio a Carrito Fantasma

Guía para servir la tienda en un dominio propio en lugar de
`guillermoclaro-a11y.github.io/carrito-fantasma/`.

## ✅ Estado: HECHO

- **Dominio:** `carritofantasma.app` (comprado en Cloudflare).
- **DNS:** gestionado por Cloudflare (NS `duke`/`athena.ns.cloudflare.com`).
- **GitHub Pages:** dominio personalizado configurado y archivo `CNAME` en el repo.
- **En vivo:** https://carritofantasma.app/ · https://carritofantasma.app/?lang=en
- **`www`:** redirige a la raíz. ✔

> 🔧 **Pendiente de un ajuste opcional de DNS** (ver sección 3):
> con la nube **naranja** (proxy) de Cloudflare activada, el HTTPS funciona con el
> certificado de Cloudflare, pero GitHub no puede emitir el suyo. Lo ideal es poner los
> registros en **DNS only (nube gris)** para que GitHub gestione el certificado solo.

> ⚠️ **Recuerda:** comprar el dominio solo puede hacerlo el dueño (conlleva pago). El resto
> ya está automatizado.

---

## 0. Estado de disponibilidad (comprobado)

> ❌ **`.es` no está disponible** (ya registrado), y además **Cloudflare Registrar no vende `.es`**
> (tiene una petición abierta, aún sin soporte). Si algún día quieres `.es`, tendrías que
> comprarlo en otro registrador (DonDominio, IONOS, Nominalia…).

✅ **Alternativas libres que SÍ puedes comprar en Cloudflare** (comprobado):

| Dominio | Estado | Notas |
|---------|--------|-------|
| `carrito-fantasma.com` | ✅ Libre | Un `.com` con guion (lo más reconocible) |
| `carritofantasma.app` | ✅ Libre | Sin guion · obliga HTTPS · moderno |
| `carritofantasma.dev` | ✅ Libre | Sin guion · obliga HTTPS · público técnico |
| `carritofantasma.org` | ✅ Libre | Buena imagen "proyecto sin ánimo de lucro" |
| `carritofantasma.net` | ✅ Libre | Clásico |
| `carritofantasma.shop` | ✅ Libre | Temático (¡es una tienda!) |
| `carritofantasma.store` | ✅ Libre | Temático |
| `carritofantasma.io` | ✅ Libre | Moderno pero **caro** |
| `carritofantasma.xyz` | ✅ Libre | Barato, pero menos de fiar |
| `carritofantasma.website` · `.site` · `.online` · `.space` · `.page` · `.blog` · `.link` · `.tienda` | ✅ Libres | Alternativas baratas |

❌ **Ocupados:** `carritofantasma.com`, `tiendafantasma.com`, `ghostcart.com`, `ghostcart.app`,
`ghostcart.io`, `theghostcart.com`.

**Mi recomendación:** si quieres `.com` → **`carrito-fantasma.com`**; si prefieres sin guion →
**`carritofantasma.app`** o **`carritofantasma.org`**.

> La disponibilidad final la confirma el registrador al comprar.

**Registrador:** como ya tienes **Cloudflare**, cómpralo ahí (vende **a coste, sin sobreprecio**;
lo malo: no hay descuentos de primer año). Para `.es` necesitarías otro registrador.


---

## 1. (Recomendado) Verifica el dominio en GitHub

Antes de tocar el DNS, para evitar *domain takeovers*:

1. GitHub → **Settings** (de tu cuenta) → **Pages** → **Add a domain**.
2. Escribe tu dominio y copia el **TXT** que te da.
3. Añádelo en el DNS de tu registrador como registro **TXT** con nombre `_github-pages-challenge-guillermoclaro-a11y` y el valor indicado.
4. Pulsa **Verify**.

*(Opcional pero muy recomendable.)*

---

## 2. Configura el dominio en el repositorio

1. Ve al repo: https://github.com/guillermoclaro-a11y/carrito-fantasma → **Settings** → **Pages**.
2. En **Custom domain**, escribe tu dominio (p. ej. `carritofantasma.es`) y **Save**.
   - GitHub creará un archivo **`CNAME`** en la raíz de la rama `master`.
   - *(Ese archivo ya te lo dejo preparado como `CNAME.example`: solo hay que renombrarlo
     o dejar que GitHub lo cree.)*

---

## 3. Crea los registros DNS en tu registrador

> ### 🧡 Si usas Cloudflare (tu caso)
>
> 1. Entra en **Cloudflare → tu dominio → DNS → Records**.
> 2. Crea los registros de abajo.
> 3. **Deja la nube en GRIS ("DNS only")**, no naranja. Con el proxy naranja activo, GitHub
>    Pages suele fallar al emitir el certificado HTTPS. Cuando funcione todo (paso 5),
>    puedes activar el proxy naranja si quieres (SSL/TLS → **Full (strict)**).
> 4. Borra cualquier registro A/AAAA por defecto que Cloudflare haya creado.

### Dominio raíz (apex, `carritofantasma.es`)

Crea **4 registros A** (nombre `@` o vacío):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

…y opcionalmente **4 registros AAAA** (IPv6):

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

> Si tu registrador soporta **ALIAS** o **ANAME**, puedes usar uno solo apuntando a
> `guillermoclaro-a11y.github.io`.

### Subdominio `www`

Crea **1 registro CNAME**:

```
Nombre:  www
Valor:   guillermoclaro-a11y.github.io
```

> No incluyas el nombre del repo en el valor. Y **no uses comodines** (`*.tudominio`).

---

## 4. Espera y verifica

El DNS puede tardar de minutos a 24 h. Para comprobar:

```bash
./tools/check-domain.sh carritofantasma.es
```

O a mano:

```bash
dig carritofantasma.es +noall +answer -t A
dig www.carritofantasma.es +nostats +nocomments +nocmd
```

Los **A** deben devolver las 4 IPs de GitHub; `www` debe apuntar a `guillermoclaro-a11y.github.io`.

---

## 5. Activa HTTPS

En **Settings → Pages**, cuando GitHub termine de emitir el certificado (puede tardar
hasta 24 h), marca **Enforce HTTPS**. A partir de ahí el sitio va por `https://` con
redirección automática desde `http://` y desde `www`.

---

## 6. Mejoras opcionales

- **`www` y raíz:** GitHub redirige automáticamente entre ambos si están configurados.
- **Cloudflare delante:** puedes poner Cloudflare como DNS (plan gratis) para tener CDN,
  analítica anónima y más control. Si lo haces, usa los mismos registros (A/CNAME) pero
  con el proxy en gris/morado según prefieras.
- **Correo:** un dominio te permite también un email tipo `hola@carritofantasma.es`
  (gratis con Cloudflare Email Routing reenviando a tu correo).

---

## 7. Qué hago yo cuando tengas el dominio

1. Renombro/creo el archivo `CNAME` con tu dominio.
2. Hago commit y push.
3. Compruebo con `dig` que el DNS está bien.
4. Verifico que `https://tudominio` sirve la tienda y redirige desde `http` y `www`.
5. Actualizo el `README.md`, `DIFUSION.md` y los textos de Cafecito con la nueva dirección.

Solo tienes que darme el **dominio exacto** que compraste.
