#!/usr/bin/env node
// Abre en el navegador la página de preview del bucle de Lynx (nivel "iterar" de
// docs/12-entorno-desarrollo-lynx.md).
//
// Rspeedy sirve la página y el bundle web en el mismo origen, así que basta con
// apuntar a la ruta del shell de Lynx for Web. Requiere el dev server en marcha
// (`bun run dev`); el puerto debe coincidir con el suyo.
//
//   bun run preview:web
//   bun run preview:web --port 3100
import { spawn } from 'node:child_process'

const portFlag = process.argv.indexOf('--port')
const port = portFlag !== -1 ? process.argv[portFlag + 1] : (process.env.PORT ?? '3000')

const url = `http://localhost:${port}/__web_preview?casename=main.web.bundle`

let reachable = false
try {
  reachable = (await fetch(url)).ok
} catch {
  reachable = false
}

if (!reachable) {
  console.error(`La página de preview no responde en ${url}.`)
  console.error('Levanta el dev server primero: `bun run dev`.')
  process.exit(1)
}

const [command, args] =
  process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]]

spawn(command, args, { stdio: 'ignore', detached: true }).unref()

console.log(`Preview abierta en ${url}`)
