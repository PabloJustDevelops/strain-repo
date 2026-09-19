#!/usr/bin/env node
// Presupuesto de tamaño de bundle (specs/005, ticket 2).
//
// Mide los dos artefactos de `bun run build` y falla si alguno supera su
// umbral. Subir un umbral NO es un cambio de este fichero: exige una decisión
// registrada en docs/07-decisions.md (ver D16).
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BUDGET_BYTES = 650_000 // 650 kB (1 kB = 1000 bytes) para los dos targets

const BUNDLES = [
  { artifact: 'main.lynx.bundle', target: 'lynx (nativo)' },
  { artifact: 'main.web.bundle', target: 'web' },
]

const distDir = fileURLToPath(new URL('../dist/', import.meta.url))

const kB = (bytes) => (bytes / 1000).toFixed(1)

let exceeded = false

for (const { artifact, target } of BUNDLES) {
  const path = `${distDir}${artifact}`

  let size
  try {
    size = statSync(path).size
  } catch {
    console.error(`No existe ${path}. Ejecuta \`bun run build\` antes de comprobar.`)
    process.exit(1)
  }

  const ratio = ((size / BUDGET_BYTES) * 100).toFixed(1)
  const marker = size > BUDGET_BYTES ? 'FUERA' : 'ok'

  console.log(`${marker.padEnd(5)} ${target.padEnd(12)} ${kB(size).padStart(8)} kB / ${kB(BUDGET_BYTES)} kB (${ratio}%)`)

  if (size > BUDGET_BYTES) {
    exceeded = true
  }
}

if (exceeded) {
  console.error(
    '\nPresupuesto de bundle excedido. Si el crecimiento es legítimo, registra una ' +
      'decisión en docs/07-decisions.md y sube el umbral ahí y en el workflow; ' +
      'si no, reduce el bundle.',
  )
  process.exit(1)
}

console.log('\nPresupuesto de bundle: dentro del umbral.')
