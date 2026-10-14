#!/usr/bin/env bash
# Verifica que un dominio apunta correctamente a GitHub Pages.
#
# Uso:
#   ./tools/check-domain.sh carritofantasma.es
#   ./tools/check-domain.sh carritofantasma.es guillermoclaro-a11y
#
# Comprueba los registros A (raíz), el CNAME de www y el estado general.

set -u

DOMAIN="${1:-carritofantasma.es}"
OWNER="${2:-guillermoclaro-a11y}"
TARGET="$OWNER.github.io"

GH_A="185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153"

resolve() { # $1=name  $2=type  $3=type-number
  if command -v dig >/dev/null 2>&1; then
    dig +short "$2" "$1" 2>/dev/null
  else
    curl -s --max-time 15 "https://dns.google/resolve?name=$1&type=$2" \
      | jq -r --argjson t "${3:-1}" '.Answer[]? | select(.type==$t) | .data' 2>/dev/null
  fi
}

echo "== Comprobando $DOMAIN =="
echo

echo "--- Registros A de la raíz ($DOMAIN) ---"
A="$(resolve "$DOMAIN" A 1 | sort -u | tr '\n' ' ')"
echo "   Encontrados: ${A:-（ninguno）}"
ok=1
for ip in $GH_A; do
  echo "$A" | grep -q "$ip" || { ok=0; break; }
done
if [ "$ok" = 1 ]; then
  echo "   ✅ Los 4 A de GitHub Pages están presentes."
else
  echo "   ⚠️  Falta alguno de: $GH_A"
fi
echo

echo "--- www.$DOMAIN ---"
WWW="$(resolve "www.$DOMAIN" CNAME 5 | head -1)"
if [ -z "$WWW" ]; then WWW="$(resolve "www.$DOMAIN" A 1 | head -1)"; fi
echo "   Apunta a: ${WWW:-（nada）}"
echo "$WWW" | grep -qi "$TARGET" \
  && echo "   ✅ Correcto (-> $TARGET)." \
  || echo "   ⚠️  Debería apuntar a: $TARGET"
echo

echo "--- HTTPS ---"
code="$(curl -sL -o /dev/null -w '%{http_code}' --max-time 20 "https://$DOMAIN" 2>/dev/null || echo '000')"
echo "   https://$DOMAIN -> HTTP ${code}"
[ "$code" = "200" ] && echo "   ✅ Sirve correctamente." || echo "   ⏳ Aún no responde (el DNS o el certificado pueden tardar hasta 24 h)."
echo
echo "Recuerda: en Settings → Pages, marca 'Enforce HTTPS' cuando esté disponible."
