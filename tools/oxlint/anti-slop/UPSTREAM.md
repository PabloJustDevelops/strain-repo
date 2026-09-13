# UPSTREAM

Plugin de Oxlint vendorizado desde `dmmulroy/anti-slop`. Es código nuestro: se
mantiene aquí y viaja con el repo, no es una dependencia npm.

- Fuente: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10)
- Instalado con `skills/install-anti-slop/scripts/install.mjs` (copia `assets/anti-slop`)
- Entry point registrado: `tools/oxlint/anti-slop/index.ts` (plugin `anti-slop`)
- Config: `.oxlintrc.json` en la raíz del repo

## Desviaciones intencionales

- Se añadió `package.json` con `{ "type": "module" }` para silenciar el aviso
  `MODULE_TYPELESS_PACKAGE_JSON` de Node al cargar el plugin en TS.
- El plugin opcional de Effect (`effect/`) viene vendorizado pero **no** se registra:
  el repo no depende de `effect`.
- Reglas desactivadas en `.oxlintrc.json` por ruido en este código:
  `require-readable-spacing` (531 hallazgos de formato),
  `require-safety-comment-for-type-assertion` (40 asserts legítimos) y
  `no-module-mocking` (14, los tests mockean módulos nativos a propósito).
