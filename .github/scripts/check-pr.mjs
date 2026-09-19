#!/usr/bin/env node
// Comprobación de la propuesta de cambio (specs/005, ticket 5).
//
// Valida el título con Conventional Commits —el mismo vocabulario que los
// commits del repo— y avisa si faltan etiquetas de triaje
// (docs/agents/triage-labels.md).
//
// Fase 1: AVISA, no bloquea. El repo todavía no tiene reglas de protección de
// rama, así que este trabajo sale en verde y deja los avisos como anotaciones.
// Para convertirlo en puerta, basta con terminar con un código de salida
// distinto de 0 cuando `problems` no esté vacío (ver el final del fichero).
import { readFileSync, appendFileSync } from 'node:fs'

const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]

const TITLE_PATTERN = new RegExp(
  `^(${CONVENTIONAL_TYPES.join('|')})(\\([a-z0-9._/-]+\\))?!?: .+`,
)

const TRIAGE_LABELS = [
  'needs-triage',
  'needs-info',
  'ready-for-agent',
  'ready-for-human',
  'wontfix',
]

const sanitize = (text) => text.replace(/[\r\n]+/g, ' ').replace(/%/g, '%25')

const annotate = (level, message) => {
  console.log(`::${level}::${sanitize(message)}`)
}

const summarize = (markdown) => {
  const path = process.env.GITHUB_STEP_SUMMARY

  if (path) {
    appendFileSync(path, `${markdown}\n`)
  }
}

const eventPath = process.env.GITHUB_EVENT_PATH

if (!eventPath) {
  console.log('Sin GITHUB_EVENT_PATH: no hay propuesta de cambio que comprobar.')
  process.exit(0)
}

const event = JSON.parse(readFileSync(eventPath, 'utf8'))

if (event.pull_request === undefined) {
  console.log(`Evento "${event.action ?? 'desconocido'}" sin pull_request: nada que comprobar.`)
  process.exit(0)
}

const title = event.pull_request.title ?? ''

const labels = (event.pull_request.labels ?? []).map((label) => label.name)

console.log(`Título: ${title}`)

console.log(`Etiquetas: ${labels.length > 0 ? labels.join(', ') : '(ninguna)'}`)

const problems = []

const titleOk = TITLE_PATTERN.test(title)

if (!titleOk) {
  problems.push(
    `El título no sigue Conventional Commits (${CONVENTIONAL_TYPES.join('/')}), con scope opcional. ` +
      `Ejemplo: "ci: anadir el trabajo de Lynx". Título actual: "${title}".`,
  )
  annotate('warning', problems.at(-1))
} else {
  console.log('Título válido (Conventional Commits).')
}

const triageLabels = TRIAGE_LABELS.filter((label) => labels.includes(label))

if (triageLabels.length === 0) {
  const message =
    'La propuesta no tiene ninguna etiqueta de triaje ' +
    `(${TRIAGE_LABELS.join(', ')}); ver docs/agents/triage-labels.md.`

  problems.push(message)
  annotate('warning', message)
} else {
  console.log(`Etiquetas de triaje: ${triageLabels.join(', ')}.`)
}

summarize(['## Comprobación de la propuesta', ''])

if (problems.length === 0) {
  summarize(['Título y triaje correctos.'])
} else {
  summarize(['Avisos (la comprobación no bloquea todavía):', '', ...problems.map((p) => `- ${p}`)])
}

if (problems.length === 0) {
  console.log('Todo correcto.')
}

// Fase 1: siempre en verde. Para convertirlo en puerta:
//   if (problems.length > 0) process.exit(1)
process.exit(0)
