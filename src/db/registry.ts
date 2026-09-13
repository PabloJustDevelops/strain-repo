import type { Repos } from './repos';

let current: Repos | null = null;

/**
 * Publica la capa de datos de producción.
 *
 * Sólo `bootstrap.ts` debería llamarla, y por eso no forma parte de la
 * superficie pública (`src/db/index.ts`).
 */
export function publishRepos(repos: Repos): void {
  current = repos;
}

/**
 * Punto de acceso de los call sites de la app.
 *
 * Los tests no lo usan: cruzan `createRepos()` directo, que es la seam real.
 */
export function getRepos(): Repos {
  if (!current) {
    throw new Error(
      'Data layer no inicializado. Suele ser que el árbol de pantallas se montó ' +
        'antes que el bootstrap, o que algo llama a getRepos() durante el render: ' +
        'usalo en un efecto o en un handler, nunca en render.'
    );
  }
  return current;
}
