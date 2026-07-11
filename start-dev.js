#!/usr/bin/env node

const { createHash } = require('node:crypto')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const root = __dirname
const backendDir = join(root, 'backend')
const requirements = join(backendDir, 'requirements.txt')
const venvDir = join(root, '.venv')
const venvPython = join(venvDir, 'bin', 'python')
const stampFile = join(venvDir, '.requirements.sha256')
const backendOnly = process.argv.includes('--backend-only')
const children = new Set()
let shuttingDown = false

function log(service, message) {
  console.log(`[${service}] ${message}`)
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`)
}

function systemPython() {
  for (const candidate of ['python3', 'python']) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' })
    if (!result.error && result.status === 0) return candidate
  }
  throw new Error('Python 3 is required but was not found')
}

function prepareBackend() {
  if (!existsSync(venvPython)) {
    log('setup', 'Creating .venv...')
    run(systemPython(), ['-m', 'venv', venvDir])
  }

  const hash = createHash('sha256').update(readFileSync(requirements)).digest('hex')
  const installedHash = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : ''
  if (hash !== installedHash) {
    log('setup', 'Installing backend dependencies...')
    run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirements])
    writeFileSync(stampFile, `${hash}\n`)
  }
}

function start(service, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  children.add(child)
  child.on('error', (error) => stop(1, `${service} failed: ${error.message}`))
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (!shuttingDown) stop(1, `${service} stopped unexpectedly (${signal || `code ${code}`})`)
  })
  return child
}

async function isBackendHealthy() {
  try {
    const response = await fetch('http://127.0.0.1:8000/health', {
      signal: AbortSignal.timeout(1000),
    })
    return response.ok
  } catch {
    return false
  }
}

async function waitForBackend(child) {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Backend exited with code ${child.exitCode}`)
    if (await isBackendHealthy()) return
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error('Backend did not become healthy within 30 seconds')
}

function terminate(child) {
  if (child.exitCode !== null || child.killed) return
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM')
    else child.kill('SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') console.error(`[startup] Shutdown error: ${error.message}`)
  }
}

function stop(code = 0, message) {
  if (shuttingDown) return
  shuttingDown = true
  if (message) console.error(`[startup] ${message}`)
  for (const child of children) terminate(child)
  setTimeout(() => process.exit(code), 500).unref()
}

async function main() {
  log('startup', 'Preparing frontend and backend...')
  prepareBackend()

  if (await isBackendHealthy()) {
    log('backend', 'Already healthy on port 8000.')
  } else {
    log('backend', 'Starting FastAPI on port 8000...')
    const backend = start(
      'backend',
      venvPython,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      backendDir,
    )
    await waitForBackend(backend)
    log('backend', 'Ready on port 8000.')
  }

  if (backendOnly) return

  log('frontend', 'Starting Vite on port 3000...')
  start(
    'frontend',
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--workspace=frontend', '--', '--host', '0.0.0.0', '--port', '3000', '--strictPort'],
    root,
  )
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
main().catch((error) => stop(1, error.message))
