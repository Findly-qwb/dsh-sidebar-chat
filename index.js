/**
 * Host half of the sidebar-chat bundle.
 *
 * One read-only route backs the rail's `@` completion: given a Session, walk
 * that Session's working directory (bounded, ignoring build and vendor trees)
 * and return the paths whose name matches the typed fragment. The rail falls
 * back to conversation-local paths when this route is unavailable, so a leaner
 * composition loses the search, not the feature.
 */
import { promises as fsp } from 'node:fs'
import path from 'node:path'

const ROUTE = '/sidebar-chat/files'

/** Directories that never belong in a completion list. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', 'target',
  '.next', '.nuxt', '.svelte-kit', '.venv', 'venv', '__pycache__', '.cache',
  'coverage', '.idea', '.vscode', '.turbo', '.parcel-cache',
])

const MAX_DEPTH = 8
const MAX_ENTRIES = 20000
const MAX_RESULTS = 60
const BUDGET_MS = 800

const sendJson = (res, status, payload) => {
  try {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(payload))
  } catch {}
}

/**
 * Resolve the directory a completion should search.
 * @param ctx - Host context.
 * @param sessionId - requesting Session, when the rail knows it.
 * @returns an absolute directory, or null when nothing is known.
 */
const resolveRoot = (ctx, sessionId) => {
  const working = ctx.get?.('workingDirectory') ?? ctx.workingDirectory
  try {
    const session = sessionId.length > 0 ? ctx.get?.('sessions')?.get?.(sessionId) : undefined
    if (session !== undefined && working !== undefined) return working.get(session)
  } catch {}
  if (typeof working?.defaultDirectory === 'string' && working.defaultDirectory.length > 0) {
    return working.defaultDirectory
  }
  return null
}

/**
 * Walk a directory breadth-first, collecting relative file paths and the
 * directories that could be entered next. Bounded by depth, entry count and a
 * wall-clock budget so a huge tree cannot stall the shared Host event loop.
 * @param root - absolute directory.
 * @param needle - lowercase fragment; empty matches everything.
 * @returns `{ files, dirs }`, each best-first; directories end with `/`.
 */
const search = async (root, needle) => {
  const started = Date.now()
  const files = []
  const dirs = []
  const queue = [{ dir: root, depth: 0 }]
  let visited = 0

  while (queue.length > 0) {
    if (visited >= MAX_ENTRIES || Date.now() - started > BUDGET_MS) break
    const { dir, depth } = queue.shift()
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (visited >= MAX_ENTRIES) break
      if (entry.name.startsWith('.')) continue
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        visited += 1
        const relativeDir = `${path.relative(root, absolute).split(path.sep).join('/')}/`
        if (needle.length === 0 || relativeDir.toLowerCase().includes(needle)) dirs.push(relativeDir)
        if (depth < MAX_DEPTH) queue.push({ dir: absolute, depth: depth + 1 })
        continue
      }
      if (!entry.isFile()) continue
      visited += 1
      const relative = path.relative(root, absolute).split(path.sep).join('/')
      if (needle.length > 0 && !relative.toLowerCase().includes(needle)) continue
      files.push(relative)
    }
  }

  const best = (a, b) => a.length - b.length || a.localeCompare(b)
  files.sort(best)
  dirs.sort(best)
  return {
    files: files.slice(0, MAX_RESULTS),
    dirs: dirs.slice(0, Math.floor(MAX_RESULTS / 2)),
  }
}

const handle = async (ctx, req, res) => {
  try {
    const url = new URL(req.url ?? '', 'http://127.0.0.1')
    const needle = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const sessionId = url.searchParams.get('session') ?? ''
    const root = resolveRoot(ctx, sessionId)
    if (root === null) {
      sendJson(res, 200, { ok: false, error: 'no working directory for this Session', files: [], dirs: [] })
      return
    }
    const { files, dirs } = await search(root, needle)
    sendJson(res, 200, { ok: true, root, files, dirs })
  } catch (error) {
    sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error), files: [], dirs: [] })
  }
}

/** Mount the file index route. */
export function apply(ctx) {
  ctx.inject(['webServer'], (scope) => {
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'exact',
          path: ROUTE,
          handler: (req, res) => handle(ctx, req, res),
        }),
      'sidebar-chat: file index route',
    )
  })
}

/** Internal surface used by the regression suite; not part of the bundle API. */
export const __test = { search }
