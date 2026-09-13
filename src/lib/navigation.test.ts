import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard de rutas: recorre los destinos de navegación del código y comprueba que
 * cada uno corresponda a un fichero de ruta real.
 *
 * Habría cazado los tres casos del flujo central: `/routines/[id]/add-exercise`
 * y `/routines/new` no existían, y el segundo además casaba por accidente con la
 * ruta dinámica `routines/[id]`.
 *
 * Regla extra: un destino **sin** segmentos dinámicos tiene que casar con una
 * ruta estática exacta, no valer por el comodín de una ruta dinámica.
 */

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'app');

const SOURCE_DIRS = [APP_DIR, join(ROOT, 'src')];
const SOURCE_EXT = /\.(tsx|ts)$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Ficheros de ruta (`app/**`), sin layouts ni especiales. */
function routeFiles(): string[] {
  return walk(APP_DIR).filter((file) => {
    const rel = relative(APP_DIR, file).split('\\').join('/');
    if (!SOURCE_EXT.test(rel)) return false;
    if (/\.test\./.test(rel)) return false;
    return !rel.split('/').some((seg) => seg.startsWith('_') || seg.startsWith('+'));
  });
}

/** Convierte `app/(tabs)/routines/index.tsx` en `/routines`. */
function toPattern(file: string): string {
  const rel = relative(APP_DIR, file).split('\\').join('/');
  const withoutExt = rel.replace(SOURCE_EXT, '');
  const segments = withoutExt
    .split('/')
    .filter((seg) => !/^\(.*\)$/.test(seg)) // los grupos de expo-router no son path
    .filter((seg) => seg !== 'index');
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function isDynamic(seg: string): boolean {
  return /^\[.*\]$/.test(seg) || seg === '[*]';
}

function matches(target: string, pattern: string): boolean {
  const t = target.split('/').filter(Boolean);
  const p = pattern.split('/').filter(Boolean);
  if (t.length !== p.length) return false;
  return t.every((seg, i) => isDynamic(seg) || isDynamic(p[i]) || seg === p[i]);
}

/** Destinos internos usados en el código (`router.push/replace/navigate`, `<Link>`, `href`). */
function navigationTargets(): Map<string, string> {
  const found = new Map<string, string>();
  const patterns = [
    /router\.(?:push|replace|navigate)\(\s*(['"`])([^'"`]+)\1/g,
    /pathname:\s*(['"`])([^'"`]+)\1/g,
    /<Link[^>]*\bhref=(['"`])([^'"`]+)\1/g,
    /\bhref:\s*(['"`])([^'"`]+)\1/g,
  ];

  for (const dir of SOURCE_DIRS) {
    for (const file of walk(dir)) {
      if (!SOURCE_EXT.test(file)) continue;
      if (/\.test\./.test(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const regex of patterns) {
        for (const match of source.matchAll(regex)) {
          const raw = match[2];
          if (!raw.startsWith('/')) continue; // rutas relativas/externas: no aplican
          const normalized = raw.replace(/\$\{[^}]*\}/g, '[*]');
          found.set(normalized, relative(ROOT, file).split('\\').join('/'));
        }
      }
    }
  }
  return found;
}

describe('navegación · los destinos existen como ruta', () => {
  const allPatterns = routeFiles().map(toPattern);
  const staticPatterns = allPatterns.filter((p) => !p.split('/').some(isDynamic));
  const targets = navigationTargets();

  it('encuentra el catálogo de rutas y algunos destinos', () => {
    expect(allPatterns).toContain('/');
    expect(allPatterns).toContain('/routines/[id]');
    expect(allPatterns).toContain('/routines/[id]/add-exercise');
    expect(targets.size).toBeGreaterThan(5);
  });

  it.each([...navigationTargets().entries()])(
    '%s (en %s) corresponde a una ruta',
    (target) => {
      // Un destino estático no puede escudarse en una ruta dinámica.
      if (!target.split('/').some(isDynamic)) {
        expect(staticPatterns).toContain(target);
        return;
      }
      expect(allPatterns.some((pattern) => matches(target, pattern))).toBe(true);
    }
  );
});
