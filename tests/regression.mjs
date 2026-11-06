import fs from 'node:fs'
const src = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')

const stub = {
  'process.joinTwo': '{first}并{second}', 'process.comma': '，', 'process.sharedPrefix': '已', 'process.more': '{title}等',
  'rail.tool': '工具',
  'process.done.commands': '执行了命令', 'process.done.read': '已读取文件',
  'process.done.edit': '修改了文件', 'process.done.search': '已搜索代码', 'process.done.thinking': '已完成分析',
  'duration.seconds': '用时 {seconds}秒', 'duration.minutes': '用时 {minutes}分{seconds}秒',
}
const t = (k, v) => { const s = stub[k] ?? k; return v ? s.replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m)) : s }
const h = (tag, props, ...kids) => ({ tag, props: props ?? {}, kids: kids.flat(Infinity) })
const CodeBlock = (p) => ({ tag: 'CodeBlock', props: p })

const collectStart = src.indexOf('    const textOf =')
const collectEnd = src.indexOf('    const useEventWindow =')
const api = new Function('t', 'h', 'CodeBlock', `${src.slice(collectStart, collectEnd)}\nreturn { collectMessages, toolKind, processTitle, formatDuration }`)(t, h, CodeBlock)

const hStart = src.indexOf('    const HIGHLIGHT_LANGS')
const hEnd = src.indexOf('    const CodeBlock = ')
const hl = new Function('h', `${src.slice(hStart, hEnd)}\nreturn { highlight, HIGHLIGHT_LANGS }`)(h)

const mdStart = src.indexOf('    const INLINE =')
const mdEnd = src.indexOf('    const readAsDataUrl =')
const md = new Function('h', 'CodeBlock', `${src.slice(mdStart, mdEnd)}\nreturn { renderMarkdown }`)(h, CodeBlock)

let failures = 0
const check = (name, fn) => {
  try { fn(); console.log('ok   ', name) } catch (e) { failures++; console.log('FAIL ', name, '→', e.message) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

check('collect: empty window', () => { const r = api.collectMessages(null); assert(Array.isArray(r) && r.length === 0, 'empty') })
check('collect: no entries', () => { const r = api.collectMessages({ entries: [] }); assert(r.length === 0, 'empty') })
check('collect: malformed entries', () => {
  const r = api.collectMessages({ entries: [null, {}, { type: 'event' }, { type: 'event', event: {} }, { type: 'transient' }] })
  assert(r.length === 0, 'should ignore')
})
check('collect: user only', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } } } }] })
  assert(r.length === 1 && r[0].kind === 'user' && r[0].text === 'hi', 'user block')
})
check('collect: injected user filtered', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: 'ctx' }], source: { kind: 'time-context' } } } }] })
  assert(r.length === 0, 'filtered')
})
check('collect: tool result without pending', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'tool/result', seq: 2, data: { message: { toolCallId: 'x', content: [] } } } }] })
  assert(r.length === 0, 'ignored')
})
check('collect: todo without pending', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'todo/write', seq: 3, data: { todos: [{ content: 'a', status: 'pending' }] } } }] })
  assert(r.length === 1 && r[0].segments.length === 0, 'todo block')
})
check('collect: assistant + tool + result', () => {
  const entries = [
    { type: 'event', event: { type: 'assistant/message', seq: 4, data: { message: { content: [
      { type: 'text', text: 'hello' },
      { type: 'tool-call', id: 'c1', name: 'bash', arguments: '{"command":"ls"}' },
      { type: 'text', text: 'done' },
    ] } } } },
    { type: 'event', event: { type: 'tool/result', seq: 5, data: { message: { toolCallId: 'c1', content: [{ type: 'text', text: 'file.txt' }] } } } },
  ]
  const r = api.collectMessages({ entries })
  assert(r.length === 1, 'one block')
  const m = r[0]
  assert(m.text === 'hello\ndone', 'merged text: ' + JSON.stringify(m.text))
  assert(m.segments.length === 3, 'segments ' + m.segments.length)
  assert(m.segments[1].kind === 'tools' && m.segments[1].tools[0].result === 'file.txt', 'result joined')
})
check('collect: turn error', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'turn/end', seq: 6, data: { reason: { kind: 'error', error: { message: 'boom' } } } } }] })
  assert(r.length === 1 && r[0].error === 'boom', 'error block')
})
check('collect: stop reasons become badges', () => {
  for (const kind of ['aborted', 'interrupted', 'blocked', 'max-tokens', 'forked']) {
    const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'turn/end', seq: 9, data: { reason: { kind } } } }] })
    assert(r.length === 1 && r[0].stopReason === kind, kind + ' → ' + JSON.stringify(r))
  }
})
check('collect: completed adds no badge', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'turn/end', seq: 9, data: { reason: { kind: 'completed' } } } }] })
  assert(r.length === 0, 'completed silent')
})
check('collect: turn/end without reason', () => {
  const r = api.collectMessages({ entries: [{ type: 'event', event: { type: 'turn/end', seq: 7, data: {} } }] })
  assert(r.length === 0, 'no block')
})
check('collect: duration', () => {
  const r = api.collectMessages({ entries: [
    { type: 'event', event: { type: 'turn/start', seq: 8, time: 1000, data: {} } },
    { type: 'event', event: { type: 'assistant/message', seq: 9, time: 1100, data: { message: { content: [{ type: 'text', text: 'x' }] } } } },
    { type: 'event', event: { type: 'turn/end', seq: 10, time: 61000, data: {} } },
  ] })
  assert(r[0].durationMs === 60000, 'duration ' + r[0].durationMs)
})
check('tool summaries pick the right field', () => {
  const src = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const start = src.indexOf('    const textOf =')
  const end = src.indexOf('    const useEventWindow =')
  const api = new Function('t', `${src.slice(start, end)}\nreturn { toolSummary }`)(t)
  const call = (name, args) => api.toolSummary({ id: 'c', name, arguments: JSON.stringify(args) })
  assert(call('ask_user_question', { questions: [{ question: '要重启吗？' }] }).detail === '要重启吗？', 'question')
  assert(call('todo_write', { todos: [{ status: 'completed' }, { status: 'pending' }, { status: 'completed' }] }).detail === '2/3', 'todo')
  assert(call('read', { path: 'src/a.ts' }).detail === 'src/a.ts', 'read path')
  assert(call('grep', { pattern: 'TODO' }).detail === 'TODO', 'grep pattern')
  assert(call('bash', { command: 'ls -la' }).detail === 'ls -la', 'bash command')
  assert(call('web_fetch', { url: 'https://x.y' }).detail === 'https://x.y', 'url')
  assert(call('unknown_tool', { description: 'do it' }).detail === 'do it', 'fallback')
  assert(call('read', {}).detail === '', 'empty args')
  assert(api.toolSummary({ name: 'read', arguments: 'not json' }).detail === 'not json', 'raw fallback')
})
check('toolKind mapping', () => {
  const pairs = [['bash','commands'],['read','read'],['read_image','readImage'],['write','write'],['edit','edit'],['grep','search'],['web_search','webSearch'],['subagent','subagents'],['todo_write','plan'],['ask_user_question','questions'],['present','tools']]
  for (const [wire, kind] of pairs) assert(api.toolKind(wire) === kind, wire + ' → ' + api.toolKind(wire))
})
check('processTitle 1/2/3+', () => {
  assert(api.processTitle(['commands']) === '执行了命令', 'single')
  assert(api.processTitle(['commands','read']) === '执行了命令并已读取文件', 'two')
  assert(api.processTitle(['commands','read','edit','search']) === '执行了命令，已读取文件，修改了文件等', 'many: ' + api.processTitle(['commands','read','edit','search']))
})
check('formatDuration', () => {
  assert(api.formatDuration(undefined) === '', 'undefined')
  assert(api.formatDuration(500) === '', 'sub-second')
  assert(api.formatDuration(69000) === '用时 1分9秒', api.formatDuration(69000))
})
check('highlight: no throw + covers langs', () => {
  for (const lang of ['bash','js','json','python','yaml','css','html','rust','unknown']) hl.highlight('const a = "x" # c 1', lang)
  assert(!hl.HIGHLIGHT_LANGS.has('unknown'), 'unknown excluded')
})
check('markdown: empty / plain / fences', () => {
  md.renderMarkdown('', 'k')
  md.renderMarkdown('plain', 'k')
  md.renderMarkdown('```js\nconst a = 1\n```', 'k')
  md.renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', 'k')
  md.renderMarkdown('- [x] done\n- [ ] todo', 'k')
  md.renderMarkdown('**b** _i_ `c` [l](https://x.y)', 'k')
  md.renderMarkdown('# h\n> q\n---\n1. one', 'k')
})
check('markdown: unterminated fence does not hang', () => {
  md.renderMarkdown('```js\nconst a = 1', 'k')
})


// @-mention path harvesting: decimals and version numbers must not appear.
{
  const src = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const start = src.indexOf('    const readAsDataUrl =')
  const end = src.indexOf('    const shortId = (sessionId) => {')
  const paths = new Function(`${src.slice(start, end)}\nreturn { collectPaths }`)().collectPaths([
    { kind: 'assistant', text: 'tools.json 0.62 0.91 world.interact 1.4', tools: [] },
    { kind: 'assistant', text: '', tools: [{ name: 'read', detail: 'base_climb.png' }] },
  ])
  if (paths.includes('0.62') || paths.includes('0.91') || paths.includes('1.4')) {
    console.log('FAIL  mentions: decimals filtered')
    process.exitCode = 1
  } else {
    console.log('ok    mentions: decimals filtered')
  }
  if (!paths.includes('tools.json') || !paths.includes('base_climb.png') || !paths.includes('world.interact')) {
    console.log('FAIL  mentions: real paths kept →', paths)
    process.exitCode = 1
  } else {
    console.log('ok    mentions: real paths kept')
  }
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
