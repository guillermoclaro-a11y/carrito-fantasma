/**
 * Descarga la imagen principal de Wikipedia para cada producto,
 * la convierte a JPEG optimizado y guarda las atribuciones.
 *
 * Uso:  node tools/fetch-images.mjs
 * Requiere: node >= 18 e ImageMagick (`magick`) en el PATH.
 */
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const UA = 'CarritoFantasma/1.0 (https://example.org; guillermoclaro@gmail.com)';
const ROOT = new URL('../', import.meta.url);
const IMG_DIR = new URL('assets/img/', ROOT);
const OUT = id => new URL(`assets/img/${id}.jpg`, ROOT);

// producto -> artículo de Wikipedia (elegido a mano para máxima relevancia)
const MAP = {
  // moda
  m1: 'Sneakers', m2: 'File:Man Hoodie Salamanca (Unsplash).jpg', m3: 'Jeans',
  m4: 'Leather jacket', m5: 'Sunglasses', m6: 'File:Woman with handbag.jpg',
  m7: 'Baseball cap', m8: 'Watch',
  m9: 'File:Man modeling trench coat, by Günther Krampf (Getty 104D8S).jpg', m10: 'Sundress',
  // comida
  c1: 'Pizza', c2: 'Sushi', c3: 'Hamburger', c4: 'Taco', c5: 'Ramen', c6: 'Bubble tea',
  c7: 'Doughnut', c8: 'Caesar salad', c9: 'Buffalo wing', c10: 'Ice cream',
  c11: 'Burrito', c12: 'Coffee',
  // tecnología
  t1: 'Smartphone', t2: 'Laptop', t3: 'Headphones', t4: 'File:Xbox-360-Pro-wController.jpg',
  t5: 'File:Quadcopter Drone in flight.jpg', t6: 'Smartwatch', t7: 'Mirrorless camera',
  t8: 'File:Mechanical Keyboard.jpg', t9: 'Tablet computer', t10: 'Smart speaker',
  t11: 'Video projector', t12: 'Robotic vacuum cleaner',
  // absurdo
  a1: 'Moon', a2: 'File:Aerial of Coffee Caye from the south.jpg', a3: 'Business jet',
  a4: 'Luxury yacht', a5: 'Castle',
  a6: 'File:White Cumulus Clouds against Blue Sky (2).jpg', a7: 'Tyrannosaurus', a8: 'Gelato',
  a9: 'Black hole', a10: 'Oil painting',
};

async function api(params) {
  const u = new URL('https://en.wikipedia.org/w/api.php');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}

const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const tmp = await mkdtemp(path.join(tmpdir(), 'cf-img-'));
  const credits = {};
  let ok = 0;

  for (const [id, title] of Object.entries(MAP)) {
    try {
      let file;
      if (title.startsWith('File:')) {
        file = title.slice(5); // archivo concreto de Commons
      } else {
        const q1 = await api({ action: 'query', titles: title, prop: 'pageimages', piprop: 'name', redirects: '1', format: 'json' });
        const page = Object.values(q1.query.pages)[0];
        file = page.pageimage;
      }
      if (!file) { console.log('∅ sin imagen:', id, title); continue; }

      const q2 = await api({ action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1200', redirects: '1', format: 'json' });
      const ii = Object.values(q2.query.pages)[0].imageinfo[0];
      const src = ii.thumburl || ii.url;
      const em = ii.extmetadata || {};

      const r = await fetch(src, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('download ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const raw = path.join(tmp, id);
      await writeFile(raw, buf);

      await run('magick', [raw, '-auto-orient', '-resize', '1200x1200>', '-strip', '-quality', '82', OUT(id).pathname]);
      await rm(raw, { force: true });

      credits[id] = {
        title,
        article: title.startsWith('File:')
          ? 'https://commons.wikimedia.org/wiki/' + title.replace(/ /g, '_')
          : `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        file,
        license: strip(em.LicenseShortName?.value),
        licenseUrl: em.LicenseUrl?.value || '',
        author: strip(em.Artist?.value),
        source: ii.descriptionurl,
      };
      ok++;
      console.log('✓', id.padEnd(4), title.padEnd(24), '→', file);
      await new Promise(r => setTimeout(r, 120));
    } catch (e) {
      console.log('✗ error:', id, title, '·', e.message);
    }
  }

  await rm(tmp, { recursive: true, force: true });
  await writeFile(new URL('assets/img/credits.json', ROOT), JSON.stringify(credits, null, 2));
  console.log(`\nListo: ${ok}/${Object.keys(MAP).length} imágenes en assets/img/`);
}

main();
