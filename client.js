/**
 * Sidebar conversations — browser half.
 *
 * Adds one row to a Session's "..." menu that opens that Session in a rail on
 * the right edge of the window: the conversation is read from the Session's own
 * event source and a submission goes through the same `session.prompt()` the
 * main composer uses, so the rail and the main surface stay one conversation.
 *
 * Hand-written ModuleLoader bundle: plain JavaScript, no build step, and no
 * import beyond the React the shell already provides.
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-chat',
  factory(require) {
    const React = require('react')
    const { createElement: h, Fragment, useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } = React

    const NS = 'sidebarChat'
    const DOCK_KEY = 'dsh-sidebar-chat.dock'
    const BALL_SIZE = 52
    const PANEL_WIDTH = 420
    const PANEL_HEIGHT = 600
    const PANEL_MIN_WIDTH = 320
    const PANEL_MIN_HEIGHT = 360
    const MAX_MESSAGES = 400
    const MAX_ATTACHMENTS = 4
    const MAX_IMAGE_BYTES = 8 * 1024 * 1024
    const MAX_FILE_BYTES = 24 * 1024 * 1024
    const CODE_COLLAPSE_LINES = 14

    // ── copy ────────────────────────────────────────────────────────────────
    const DICT = {
      zh: {
        'meta.title': '侧栏会话',
        'meta.description': '把任意会话开在右侧栏：直接读它的对话、接着回复，不用离开当前正在进行的会话。',
        'menu.open': '弹窗打开',
        'rail.title': '侧栏会话',
        'rail.empty': '从左侧会话列表的「⋯」菜单开一个会话',
        'rail.collapse': '收起到边缘',
        'rail.expand': '展开侧栏会话',
        'rail.close': '关闭侧栏',
        'rail.closeTab': '关闭这个会话',
        'rail.toMain': '在主面板打开',
        'rail.loading': '正在读取对话…',
        'rail.noMessages': '这个会话还没有消息',
        'rail.loadOlder': '加载更早的消息',
        'rail.truncated': '仅显示最近 {count} 条',
        'rail.moreTools': '还有 {count} 个工具调用',
        'rail.attach': '添加图片',
        'rail.model': '切换模型',
        'rail.removeImage': '移除这张图片',
        'error.model': '切换模型失败：{message}',
        'error.turnTitle': '处理失败',
        'error.fileTooLarge': '{name} 超过 {size} MB，没有添加',
        'error.fileUnsupported': '当前环境不支持添加文件，只能添加图片',
        'error.upload': '附件上传失败：{message}',
        'error.turnFailed': '本轮运行失败',
        'process.done.thinking': '已完成分析',
        'process.done.read': '已读取文件',
        'process.done.readImage': '已读取图片',
        'process.done.write': '已写入文件',
        'process.done.search': '已搜索代码',
        'process.done.edit': '修改了文件',
        'process.done.commands': '执行了命令',
        'process.done.code': '运行了代码',
        'process.done.webSearch': '已搜索网页',
        'process.done.webFetch': '已访问网页',
        'process.done.subagents': '已协调子智能体',
        'process.done.plan': '更新了计划',
        'process.done.questions': '向用户提出了问题',
        'process.done.tools': '已调用工具',
        'process.joinTwo': '{first}并{second}',
        'process.comma': '，',
        'process.sharedPrefix': '已',
        'process.more': '{title}等',
        'duration.seconds': '用时 {seconds}秒',
        'duration.minutes': '用时 {minutes}分{seconds}秒',
        'code.copy': '复制',
        'code.copied': '已复制',
        'code.expand': '展开（共 {lines} 行）',
        'code.collapse': '收起',
        'image.failed': '图片无法预览',
        'rail.jumpBottom': '回到底部',
        'dock.open': '打开侧栏对话',
        'dock.collapse': '收起到悬浮球',
        'dock.hint': '右键会话打开',
        'dock.emptyTitle': '还没有打开的会话',
        'dock.emptyHint': '在左侧会话列表的「⋯」菜单里选「弹窗打开」',
        'dock.switch': '切换会话',
        'dock.switchSearch': '搜索会话…',
        'dock.switchEmpty': '没有匹配的会话',
        'dock.switchHint': '点标题栏的标题可以切换会话',
        'rail.fileLinkHint': '文件链接需要在原对话里打开——点标题栏的 ↗ 回到原对话',
        'rail.waiting': '这个会话正在等你回答',
        'rail.effort': '推理强度',
        'rail.searchModel': '搜索模型…',
        'rail.noModelMatch': '没有匹配的模型',
        'rail.unread': '有新回复',
        'rail.pinned': '已固定',
        'rail.recent': '最近使用',
        'rail.pin': '固定到顶部',
        'rail.unpin': '取消固定',
        'rail.searching': '搜索中…',
        'rail.noFileMatch': '没有匹配的文件',
        'stop.aborted': '已停止',
        'stop.interrupted': '已中断',
        'stop.blocked': '已被阻止',
        'stop.max-tokens': '达到长度上限',
        'stop.forked': '已分叉',
        'todo.title': '任务',
        'todo.done': '{count} 已完成',
        'todo.active': '{count} 进行中',
        'todo.pending': '{count} 待处理',
        'rail.loadingOlder': '加载中…',
        'rail.tool': '工具',
        'rail.stop': '停止',
        'rail.send': '发送',
        'rail.placeholder': '接着这个会话说点什么…（Enter 发送，Shift+Enter 换行，@ 引用文件）',
        'rail.sending': '发送中…',
        'error.load': '读取会话失败：{message}',
        'error.send': '发送失败：{message}',
        'hint.readonly': '这个会话当前不能接收新消息。',
      },
      en: {
        'meta.title': 'Sidebar conversations',
        'meta.description': 'Opens any Session in a rail on the right edge: read its conversation and keep replying without leaving the Session you are already in.',
        'menu.open': 'Open in popup',
        'rail.title': 'Sidebar conversation',
        'rail.empty': 'Open a Session from its "⋯" menu on the left',
        'rail.collapse': 'Collapse to the edge',
        'rail.expand': 'Expand the side rail',
        'rail.close': 'Close the rail',
        'rail.closeTab': 'Close this Session',
        'rail.toMain': 'Open in the main panel',
        'rail.loading': 'Loading the conversation…',
        'rail.noMessages': 'This Session has no messages yet',
        'rail.loadOlder': 'Load older messages',
        'rail.truncated': 'Showing the latest {count}',
        'rail.moreTools': '{count} more tool calls',
        'rail.attach': 'Add an image',
        'rail.model': 'Switch model',
        'rail.removeImage': 'Remove this image',
        'error.model': 'Could not switch model: {message}',
        'error.turnTitle': 'Run failed',
        'error.fileTooLarge': '{name} is over {size} MB and was skipped',
        'error.fileUnsupported': 'This build cannot attach files — images only',
        'error.upload': 'Attachment upload failed: {message}',
        'error.turnFailed': 'This turn failed:',
        'process.done.thinking': 'Finished analysis',
        'process.done.read': 'Read files',
        'process.done.readImage': 'Read images',
        'process.done.write': 'Wrote files',
        'process.done.search': 'Searched code',
        'process.done.edit': 'Edited files',
        'process.done.commands': 'Ran commands',
        'process.done.code': 'Ran code',
        'process.done.webSearch': 'Searched the web',
        'process.done.webFetch': 'Fetched pages',
        'process.done.subagents': 'Coordinated subagents',
        'process.done.plan': 'Updated the plan',
        'process.done.questions': 'Asked the user',
        'process.done.tools': 'Called tools',
        'process.joinTwo': '{first} and {second}',
        'process.comma': ', ',
        'process.sharedPrefix': '',
        'process.more': '{title}, and more',
        'duration.seconds': '{seconds}s',
        'duration.minutes': '{minutes}m {seconds}s',
        'code.copy': 'Copy',
        'code.copied': 'Copied',
        'code.expand': 'Show all {lines} lines',
        'code.collapse': 'Collapse',
        'image.failed': 'Image unavailable',
        'rail.jumpBottom': 'Jump to the bottom',
        'dock.open': 'Open the conversation dock',
        'dock.collapse': 'Collapse to the ball',
        'dock.hint': 'Open a Session from its menu',
        'dock.emptyTitle': 'No conversation open yet',
        'dock.emptyHint': 'Pick "Open in popup" from a Session menu',
        'dock.switch': 'Switch Session',
        'dock.switchSearch': 'Search Sessions…',
        'dock.switchEmpty': 'No matching Session',
        'dock.switchHint': 'Click the title to switch Session',
        'rail.fileLinkHint': 'File links open in the original conversation — use ↗ in the title bar.',
        'rail.waiting': 'This Session is waiting for your answer',
        'rail.effort': 'Reasoning effort',
        'rail.searchModel': 'Search models…',
        'rail.noModelMatch': 'No matching model',
        'rail.unread': 'New reply',
        'rail.pinned': 'Pinned',
        'rail.recent': 'Recent',
        'rail.pin': 'Pin to top',
        'rail.unpin': 'Unpin',
        'rail.searching': 'Searching…',
        'rail.noFileMatch': 'No matching file',
        'stop.aborted': 'Stopped',
        'stop.interrupted': 'Interrupted',
        'stop.blocked': 'Blocked',
        'stop.max-tokens': 'Hit the length limit',
        'stop.forked': 'Forked',
        'todo.title': 'Tasks',
        'todo.done': '{count} done',
        'todo.active': '{count} in progress',
        'todo.pending': '{count} pending',
        'rail.loadingOlder': 'Loading…',
        'rail.tool': 'Tool',
        'rail.stop': 'Stop',
        'rail.send': 'Send',
        'rail.placeholder': 'Reply in this Session… (Enter sends, Shift+Enter adds a line, @ references a file)',
        'rail.sending': 'Sending…',
        'error.load': 'Could not read the Session: {message}',
        'error.send': 'Could not send: {message}',
        'hint.readonly': 'This Session cannot accept new messages right now.',
      },
    }

    // ── plugin context ──────────────────────────────────────────────────────
    let scopeRef = null
    let fileUploadRef = null
    let uiWorkspaceRef = null
    let modelDirsRef = null

    const localeId = () => {
      try {
        const snapshot = scopeRef?.locale?.getSnapshot?.() ?? scopeRef?.locale?.getLocale?.()
        const raw = snapshot?.active ?? snapshot?.id ?? snapshot?.locale ?? snapshot?.resolved
        return typeof raw === 'string' ? raw : 'zh'
      } catch {
        return 'zh'
      }
    }

    const t = (key, vars) => {
      const id = localeId()
      const dict = /^en/i.test(id) ? DICT.en : DICT.zh
      const template = dict[key] ?? DICT.zh[key] ?? key
      if (vars === undefined) return template
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    }

    // ── transient notice ────────────────────────────────────────────────────
    let notice = null
    let noticeTimer = 0
    const showNotice = (text) => {
      notice = { text, id: Date.now() }
      for (const fn of listeners) fn()
      window.clearTimeout(noticeTimer)
      noticeTimer = window.setTimeout(() => {
        notice = null
        for (const fn of listeners) fn()
      }, 3600)
    }
    const getNotice = () => notice

    // ── rail state ──────────────────────────────────────────────────────────
    const listeners = new Set()
    const readDock = () => {
      try {
        const raw = JSON.parse(window.localStorage.getItem(DOCK_KEY) ?? 'null')
        return raw !== null && typeof raw === 'object' ? raw : null
      } catch {
        return null
      }
    }
    const savedDock = readDock()

    const clampPoint = (value, max) => Math.min(Math.max(value, 8), Math.max(8, max))

    // A saved position belongs to the window it was dragged in. On a smaller
    // window it would sit outside the viewport, which reads as "the ball is
    // gone" — so restore it clamped instead of trusting it verbatim. `hidden`
    // is a per-session mood, not a saved state: a fresh launch always shows it.
    const restoreBall = () => {
      const ball = savedDock?.ball
      if (!ball || typeof ball.x !== 'number' || typeof ball.y !== 'number') return null
      return {
        x: clampPoint(ball.x, window.innerWidth - BALL_SIZE - 8),
        y: clampPoint(ball.y, window.innerHeight - BALL_SIZE - 8),
      }
    }
    const restorePanel = () => {
      const panel = savedDock?.panel
      if (!panel || typeof panel.x !== 'number' || typeof panel.y !== 'number') return null
      const w = Math.min(Math.max(PANEL_MIN_WIDTH, Number(panel.w) || PANEL_WIDTH), Math.max(PANEL_MIN_WIDTH, window.innerWidth - 16))
      const h = Math.min(Math.max(PANEL_MIN_HEIGHT, Number(panel.h) || PANEL_HEIGHT), Math.max(PANEL_MIN_HEIGHT, window.innerHeight - 16))
      return {
        x: clampPoint(panel.x, window.innerWidth - w - 8),
        y: clampPoint(panel.y, window.innerHeight - h - 8),
        w,
        h,
      }
    }

    let state = {
      mode: savedDock?.mode === 'panel' ? 'panel' : 'ball',
      tabs: [],
      active: null,
      openError: null,
      ball: restoreBall(),
      panel: restorePanel(),
    }

    // ── model preferences ───────────────────────────────────────────────────
    // Pinned models and the last few used ones, keyed `provider\u0000model`.
    const PIN_KEY = 'dsh-sidebar-chat.pins'
    const RECENT_KEY = 'dsh-sidebar-chat.recent'
    const RECENT_MAX = 5

    const modelKey = (provider, model) => `${provider}\u0000${model}`

    const readJson = (key, fallback) => {
      try {
        const raw = JSON.parse(window.localStorage.getItem(key) ?? 'null')
        return raw === null ? fallback : raw
      } catch {
        return fallback
      }
    }

    const writeJson = (key, value) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    }

    const readPins = () => {
      const raw = readJson(PIN_KEY, [])
      return new Set(Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [])
    }
    const readRecent = () => {
      const raw = readJson(RECENT_KEY, [])
      return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : []
    }

    const getState = () => state
    const subscribe = (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }
    const setState = (next) => {
      state = typeof next === 'function' ? next(state) : { ...state, ...next }
      for (const fn of listeners) fn()
    }
    const useStore = () => useSyncExternalStore(subscribe, getState, getState)
    const useNotice = () => useSyncExternalStore(subscribe, getNotice, getNotice)

    // One retained reference per open tab: the rail and the main surface share
    // the same Session generation, so neither can diverge from the other.
    const references = new Map()

    const retain = (sessionId) => {
      const existing = references.get(sessionId)
      if (existing) return existing
      let reference
      try {
        reference = scopeRef.sessions.retain(sessionId, { source: 'gateway' })
      } catch {
        try {
          reference = scopeRef.sessions.retain(sessionId, { source: 'controllerOperation' })
        } catch (error) {
          report('retain', error)
          throw error
        }
      }
      references.set(sessionId, reference)
      return reference
    }

    const release = (sessionId) => {
      const reference = references.get(sessionId)
      if (!reference) return
      references.delete(sessionId)
      try {
        reference.release()
      } catch {}
    }

    // ── unread ──────────────────────────────────────────────────────────────
    // A mark is the seq of the last reply the reader has actually seen. Anything
    // newer in a tab that is not on screen is unread.
    const readMarks = new Map()

    const lastSeqOf = (entries) => {
      let last = 0
      for (const entry of entries) {
        const seq = entry?.event?.seq
        if (typeof seq === 'number' && seq > last) last = seq
      }
      return last
    }

    const countRepliesAfter = (entries, mark) => {
      let count = 0
      for (const entry of entries) {
        const event = entry?.event
        if (event?.type !== 'assistant/message') continue
        if (typeof event.seq === 'number' && event.seq > mark) count += 1
      }
      return count
    }

    const snapshotEntries = (reference) => {
      try {
        return reference?.binding?.eventSource?.getSnapshot?.()?.entries ?? []
      } catch {
        return []
      }
    }

    /**
     * Unread reply counts for every retained tab.
     * @param activeSessionId - the tab currently on screen.
     * @param viewed - whether that tab is actually visible to the reader.
     * @param tabIds - the open tabs, used to re-subscribe when the set changes.
     * @returns a map of sessionId to unread reply count.
     */
    const useUnread = (activeSessionId, viewed, tabIds) => {
      const [counts, setCounts] = useState({})
      useEffect(() => {
        let alive = true
        const compute = () => {
          if (!alive) return
          const next = {}
          for (const [sessionId, reference] of references) {
            const entries = snapshotEntries(reference)
            const last = lastSeqOf(entries)
            if (viewed && sessionId === activeSessionId) {
              readMarks.set(sessionId, last)
              continue
            }
            const mark = readMarks.get(sessionId) ?? 0
            const count = countRepliesAfter(entries, mark)
            if (count > 0) next[sessionId] = count
          }
          setCounts(next)
        }
        const offs = []
        for (const reference of references.values()) {
          try {
            const source = reference?.binding?.eventSource
            if (typeof source?.subscribe === 'function') {
              const off = source.subscribe(compute)
              if (typeof off === 'function') offs.push(off)
            }
          } catch {}
        }
        compute()
        return () => {
          alive = false
          for (const off of offs) {
            try {
              off()
            } catch {}
          }
        }
      }, [activeSessionId, viewed, tabIds])
      return counts
    }

    /**
     * The shipped session list, newest first, for the switcher.
     * @returns `{ sessionId, title }` rows the rail can open.
     */
    const useSessionChoices = (open, query) => {
      const [rows, setRows] = useState([])
      useEffect(() => {
        if (!open) return undefined
        const list = scopeRef.sessions?.list
        if (list === undefined || typeof list.getSnapshot !== 'function') return undefined
        const update = () => {
          let snapshot
          try {
            snapshot = list.getSnapshot()
          } catch {
            return
          }
          const byId = snapshot?.byId ?? {}
          const ids = Array.isArray(snapshot?.ids) ? snapshot.ids : Object.keys(byId)
          const next = []
          for (const sessionId of ids) {
            const summary = byId[sessionId]
            if (summary === undefined) continue
            if (summary.origin === 'subagent') continue
            const title = summary.displayTitle ?? summary.title ?? ''
            next.push({
              sessionId,
              title: typeof title === 'string' ? title : '',
              updatedAt: typeof summary.updatedAt === 'number' ? summary.updatedAt : 0,
            })
          }
          // The list arrives in Host order; the switcher reads newest first.
          next.sort((left, right) => right.updatedAt - left.updatedAt)
          setRows(next)
        }
        update()
        const off = typeof list.subscribe === 'function' ? list.subscribe(update) : undefined
        return () => {
          try {
            if (typeof off === 'function') off()
          } catch {}
        }
      }, [open])

      return useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (needle.length === 0) return rows.slice(0, 40)
        return rows
          .filter((row) => row.title.toLowerCase().includes(needle) || row.sessionId.includes(needle))
          .slice(0, 40)
      }, [rows, query])
    }

    const openSession = (sessionId, title) => {
      if (typeof sessionId !== 'string' || sessionId.length === 0) return
      let failure = null
      try {
        retain(sessionId)
      } catch (cause) {
        failure = cause
      }
      setState((current) => {
        const known = current.tabs.some((tab) => tab.sessionId === sessionId)
        const tabs = known
          ? current.tabs.map((tab) => (tab.sessionId === sessionId && title ? { ...tab, title } : tab))
          : [...current.tabs, { sessionId, title: title || '' }]
        return {
          ...current,
          mode: 'panel',
          tabs,
          active: sessionId,
          openError: failure ? t('error.load', { message: failure?.message ?? String(failure) }) : null,
        }
      })
    }

    const closeTab = (sessionId) => {
      setState((current) => {
        const tabs = current.tabs.filter((tab) => tab.sessionId !== sessionId)
        const active = current.active === sessionId ? (tabs.length > 0 ? tabs[tabs.length - 1].sessionId : null) : current.active
        return { ...current, tabs, active, openError: tabs.length > 0 ? current.openError : null }
      })
      release(sessionId)
    }

    const closeRail = () => {
      const open = state.tabs.map((tab) => tab.sessionId)
      setState((current) => ({ ...current, tabs: [], active: null, openError: null }))
      for (const sessionId of open) release(sessionId)
    }

    // ── diagnostics ─────────────────────────────────────────────────────────
    const report = (kind, cause) => {
      try {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        console.warn(`[dsh-sidebar-chat] ${kind}: ${error.message}`, error.stack)
      } catch {}
    }

    // ── session data ────────────────────────────────────────────────────────
    const textOf = (content) => {
      if (!Array.isArray(content)) return ''
      const parts = []
      for (const part of content) {
        if (!part || typeof part !== 'object') continue
        if (part.type === 'text' && typeof part.text === 'string') parts.push(part.text)
      }
      return parts.join('\n').trim()
    }

    const firstString = (...values) => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) return value
      }
      return ''
    }

    /**
     * Extract the one line worth showing for a call. Generic keys lose to a
     * tool-specific one: a question's text beats its `description`, a pattern
     * beats a path, and so on.
     */
    const summarizeArgs = (name, args) => {
      if (args === null || typeof args !== 'object') return ''
      switch (name) {
        case 'ask_user_question': {
          const questions = Array.isArray(args.questions) ? args.questions : []
          return firstString(questions[0]?.question, args.question, args.description)
        }
        case 'todo_write': {
          const todos = Array.isArray(args.todos) ? args.todos : []
          if (todos.length === 0) return ''
          const done = todos.filter((item) => item?.status === 'completed').length
          return `${done}/${todos.length}`
        }
        case 'read':
        case 'read_image':
        case 'write':
        case 'edit':
          return firstString(args.path, args.file_path, args.filePath, args.image_path, args.target)
        case 'grep':
        case 'glob':
          return firstString(args.pattern, args.query, args.glob)
        case 'web_search':
          return firstString(args.query, args.q)
        case 'web_fetch':
          return firstString(args.url, args.href)
        case 'bash':
        case 'pwsh':
          return firstString(args.command, args.script)
        case 'subagent':
        case 'send_message':
        case 'spawn_teammate':
          return firstString(args.description, args.task, args.message, args.prompt)
        case 'present':
          return firstString(args.title, args.name, args.summary)
        default:
          return firstString(
            args.description,
            args.command,
            args.query,
            args.path,
            args.prompt,
            args.name,
            args.title,
          )
      }
    }

    const toolSummary = (part) => {
      const name = typeof part?.name === 'string' ? part.name : ''
      let args = part?.arguments
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args)
        } catch {
          args = undefined
        }
      }
      const candidate = summarizeArgs(name, args)
      const fallback = typeof part?.arguments === 'string' && args === undefined ? part.arguments : ''
      const detail = (candidate || fallback).replace(/\s+/g, ' ').slice(0, 96)
      return {
        name: name.length > 0 ? name : t('rail.tool'),
        detail,
        callId: typeof part?.id === 'string' ? part.id : undefined,
      }
    }

    /**
     * Map a wire tool name onto the Chat surface's own work categories, so the
     * rail speaks the same language as the main conversation.
     */
    const toolKind = (name) => {
      const wire = String(name ?? '')
      if (wire === 'bash' || wire === 'pwsh' || wire === 'terminal' || wire === 'job_output' || wire === 'job_list' || wire === 'job_kill') return 'commands'
      if (wire === 'read') return 'read'
      if (wire === 'read_image') return 'readImage'
      if (wire === 'write') return 'write'
      if (wire === 'edit') return 'edit'
      if (wire === 'glob' || wire === 'grep' || wire === 'lsp') return 'search'
      if (wire === 'web_search') return 'webSearch'
      if (wire === 'web_fetch') return 'webFetch'
      if (wire === 'subagent' || wire === 'wait_agent' || wire === 'send_message' || wire === 'list_agents' || wire === 'interrupt_agent' || wire === 'list_subagent_models') return 'subagents'
      if (wire === 'todo_write' || wire === 'create_goal' || wire === 'update_goal' || wire === 'get_goal') return 'plan'
      if (wire === 'ask_user_question') return 'questions'
      return 'tools'
    }

    const CATEGORY_ORDER = [
      'commands', 'code', 'read', 'readImage', 'write', 'edit', 'search',
      'webSearch', 'webFetch', 'subagents', 'plan', 'questions', 'tools',
    ]

    /**
     * The closed-group title the main Chat renders: up to three categories,
     * joined with the shared prefix rule, "等" once more than three appear.
     */
    const processTitle = (kinds) => {
      const ranked = CATEGORY_ORDER.filter((kind) => kinds.includes(kind))
      const labels = ranked.slice(0, 3).map((kind) => t(`process.done.${kind}`))
      const first = labels[0]
      if (first === undefined) return t('process.done.thinking')
      if (labels.length === 1) return first
      const continuation = (label) => (label.length > 0 ? label.charAt(0).toLowerCase() + label.slice(1) : label)
      const prefix = t('process.sharedPrefix')
      if (labels.length === 2) {
        const second = labels[1]
        const trimmed = prefix.length > 0 && first.startsWith(prefix) && second.startsWith(prefix) ? second.slice(prefix.length) : second
        return t('process.joinTwo', { first, second: continuation(trimmed) })
      }
      const title = [first, ...labels.slice(1).map(continuation)].join(t('process.comma'))
      return ranked.length > 3 ? t('process.more', { title }) : title
    }

    const formatDuration = (ms) => {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 1000) return ''
      const seconds = Math.round(ms / 1000)
      if (seconds < 60) return t('duration.seconds', { seconds })
      return t('duration.minutes', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
    }

    /**
     * Fold the event window into one entry per speaker turn. The session log
     * stores an assistant turn as many `assistant/message` steps (text, tool
     * call, text, …); this rail reads as a conversation, so they are merged back
     * into one block per turn, with its work categories and elapsed time.
     */
    const collectMessages = (window) => {
      const entries = window?.entries
      if (!Array.isArray(entries)) return []
      const out = []
      let pending = null
      let turnStartedAt = 0

      const flush = () => {
        if (pending === null) return
        const text = pending.texts.join('\n\n').trim()
        const hasTodos = Array.isArray(pending.todos) && pending.todos.length > 0
        const hasStop = typeof pending.stopReason === 'string'
        if (text.length > 0 || pending.tools.length > 0 || typeof pending.error === 'string' || hasTodos || hasStop) {
          out.push({
            kind: 'assistant',
            id: pending.id,
            text,
            segments: pending.segments,
            tools: pending.tools,
            kinds: [...new Set(pending.tools.map((tool) => tool.kind))],
            durationMs: pending.durationMs,
            todos: pending.todos,
            error: pending.error,
            stopReason: pending.stopReason,
          })
        }
        pending = null
      }

      for (const entry of entries) {
        if (!entry || entry.type !== 'event') continue
        const event = entry.event
        if (!event || typeof event.type !== 'string') continue

        if (event.type === 'turn/start') {
          turnStartedAt = typeof event.time === 'number' ? event.time : 0
          continue
        }

        if (event.type === 'turn/end') {
          const reason = event.data?.reason
          const failure = reason?.kind === 'error' ? reason.error?.message : undefined
          // Every other terminal reason is a state worth naming; silently ending
          // the block would look like the turn simply stopped mid-thought.
          const stopped = reason?.kind
          if (typeof stopped === 'string' && stopped !== 'completed' && stopped !== 'error') {
            if (pending === null) {
              pending = { id: `e${event.seq}`, texts: [], segments: [], tools: [], durationMs: undefined }
            }
            pending.stopReason = stopped
          }
          if (typeof failure === 'string' && failure.length > 0) {
            // A failed turn may have produced no assistant message at all, and
            // the failure is the only thing worth showing for it.
            if (pending === null) {
              pending = { id: `e${event.seq}`, texts: [], segments: [], tools: [], durationMs: undefined }
            }
            pending.error = failure
          }
          if (pending !== null && turnStartedAt > 0 && typeof event.time === 'number') {
            pending.durationMs = event.time - turnStartedAt
          }
          turnStartedAt = 0
          continue
        }

        if (event.type === 'user/message') {
          // Injected context (`runtime-context`, `time-context`, `skill-catalog`,
          // …) is stored as a user/message too; only what the person typed belongs
          // in this rail.
          const sourceKind = event.data?.source?.kind
          if (typeof sourceKind === 'string' && sourceKind !== 'user') continue
          const content = event.data?.content
          const text = textOf(content)
          const images = Array.isArray(content)
            ? content.filter((part) => part && part.type === 'image' && part.attachment).map((part) => part.attachment)
            : []
          if (text.length === 0 && images.length === 0) continue
          flush()
          out.push({ kind: 'user', id: `u${event.seq}`, text, images })
          continue
        }

        if (event.type === 'tool/result') {
          if (pending === null) continue
          const callId = event.data?.toolCallId ?? event.data?.message?.toolCallId
          const result = textOf(event.data?.message?.content)
          const target = pending.tools.find((tool) => tool.callId !== undefined && tool.callId === callId)
          if (target !== undefined) target.result = result
          continue
        }

        if (event.type === 'todo/write') {
          const list = Array.isArray(event.data?.todos) ? event.data.todos : []
          if (pending === null) pending = { id: `t${event.seq}`, texts: [], segments: [], tools: [], durationMs: undefined }
          pending.todos = list
          continue
        }

        if (event.type === 'assistant/message') {
          const content = event.data?.message?.content
          if (!Array.isArray(content)) continue
          if (pending === null) {
            pending = { id: `a${event.seq}`, texts: [], segments: [], tools: [], durationMs: undefined }
          }
          const text = textOf(content)
          if (text.length > 0) pending.texts.push(text)

          // Walk the step's parts in order so a tool stays where it happened:
          // prose, then the call, then more prose — not everything at the end.
          let buffer = []
          const flushText = () => {
            const joined = buffer.join('\n').trim()
            buffer = []
            if (joined.length > 0) pending.segments.push({ kind: 'text', text: joined })
          }
          for (const part of content) {
            if (!part || typeof part !== 'object') continue
            if (part.type === 'text') {
              if (typeof part.text === 'string') buffer.push(part.text)
              continue
            }
            if (part.type === 'tool-call') {
              flushText()
              const summary = toolSummary(part)
              const entry = { ...summary, kind: toolKind(summary.name) }
              pending.tools.push(entry)
              const last = pending.segments[pending.segments.length - 1]
              if (last !== undefined && last.kind === 'tools') last.tools.push(entry)
              else pending.segments.push({ kind: 'tools', tools: [entry] })
            }
          }
          flushText()
          continue
        }
      }

      flush()
      return out
    }

    const useEventWindow = (reference) => {
      const [window, setWindow] = useState(null)
      useEffect(() => {
        if (!reference) {
          setWindow(null)
          return undefined
        }
        let alive = true
        const source = reference.binding?.eventSource
        if (!source || typeof source.getSnapshot !== 'function') return undefined
        const update = () => {
          if (alive) setWindow(source.getSnapshot())
        }
        update()
        const off = typeof source.subscribe === 'function' ? source.subscribe(update) : undefined
        return () => {
          alive = false
          try {
            if (typeof off === 'function') off()
          } catch {}
        }
      }, [reference])
      return window
    }

    const useSnapshot = (observable) => {
      const [snapshot, setSnapshot] = useState(() => {
        try {
          return observable?.getSnapshot?.() ?? null
        } catch {
          return null
        }
      })
      useEffect(() => {
        if (!observable || typeof observable.getSnapshot !== 'function') {
          setSnapshot(null)
          return undefined
        }
        const update = () => {
          try {
            setSnapshot(observable.getSnapshot())
          } catch {}
        }
        update()
        const off = typeof observable.subscribe === 'function' ? observable.subscribe(update) : undefined
        return () => {
          try {
            if (typeof off === 'function') off()
          } catch {}
        }
      }, [observable])
      return snapshot
    }

    // ── small view helpers ──────────────────────────────────────────────────
    // ── markdown ────────────────────────────────────────────────────────────
    // A compact renderer for what a Session actually contains: headings, fenced
    // code, lists, tables, quotes, rules, and the inline emphasis/code/link set.
    // It renders React nodes instead of HTML so nothing is injected as markup.
    const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]\n]+)\]\(([^)\s]+)\)/g

    const inlineNodes = (text, keyPrefix) => {
      const nodes = []
      let last = 0
      let index = 0
      let match
      INLINE.lastIndex = 0
      while ((match = INLINE.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const key = `${keyPrefix}-i${index++}`
        if (match[1] !== undefined) {
          nodes.push(h('code', { key }, match[1]))
        } else if (match[2] !== undefined || match[3] !== undefined) {
          nodes.push(h('strong', { key }, match[2] ?? match[3]))
        } else if (match[4] !== undefined || match[5] !== undefined) {
          nodes.push(h('em', { key }, match[4] ?? match[5]))
        } else if (match[6] !== undefined) {
          const href = match[7]
          nodes.push(
            h(
              'a',
              {
                key,
                href,
                target: '_blank',
                rel: 'noreferrer noopener',
                onClick: (event) => {
                  // A file reference cannot be resolved here: the rail has no
                  // file opener, and pretending otherwise is worse than saying so.
                  if (/^https?:\/\//i.test(href)) return
                  event.preventDefault()
                  showNotice(t('rail.fileLinkHint'))
                },
              },
              match[6],
            ),
          )
        }
        last = match.index + match[0].length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    const tableCells = (row) =>
      row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())

    const isBlockStart = (line) =>
      /^\s*```/.test(line) ||
      /^\s{0,3}#{1,6}\s+/.test(line) ||
      /^\s*>\s?/.test(line) ||
      /^\s*([-*+])\s+/.test(line) ||
      /^\s*\d+[.)]\s+/.test(line) ||
      /^\s*([-*_])\1{2,}\s*$/.test(line) ||
      /^\s*\|.*\|\s*$/.test(line)

    const renderMarkdown = (text, keyPrefix) => {
      const lines = String(text).split(/\r?\n/)
      const blocks = []
      let index = 0
      let counter = 0
      const nextKey = () => `${keyPrefix}-m${counter++}`

      while (index < lines.length) {
        const line = lines[index]

        const fence = line.match(/^\s*```([A-Za-z0-9_+-]*)\s*$/)
        if (fence !== null) {
          const body = []
          index += 1
          while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
            body.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push(h(CodeBlock, { key: nextKey(), code: body.join('\n'), lang: fence[1] }))
          continue
        }

        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/)
        if (heading !== null) {
          const level = Math.min(heading[1].length + 2, 6)
          blocks.push(h(`h${level}`, { key: nextKey() }, ...inlineNodes(heading[2], nextKey())))
          index += 1
          continue
        }

        if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
          blocks.push(h('hr', { key: nextKey() }))
          index += 1
          continue
        }

        if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?/.test(lines[index + 1])) {
          const header = tableCells(line)
          index += 2
          const rows = []
          while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
            rows.push(tableCells(lines[index]))
            index += 1
          }
          blocks.push(
            h(
              'div',
              { key: nextKey(), className: 'dsc-md-scroll' },
              h(
                'table',
                null,
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    header.map((cell, cellIndex) =>
                      h('th', { key: `h${cellIndex}` }, ...inlineNodes(cell, `${keyPrefix}-th${cellIndex}`)),
                    ),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  rows.map((row, rowIndex) =>
                    h(
                      'tr',
                      { key: `r${rowIndex}` },
                      row.map((cell, cellIndex) =>
                        h('td', { key: `c${cellIndex}` }, ...inlineNodes(cell, `${keyPrefix}-td${rowIndex}-${cellIndex}`)),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          )
          continue
        }

        if (/^\s*>\s?/.test(line)) {
          const quoted = []
          while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
            quoted.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          blocks.push(
            h('blockquote', { key: nextKey() }, ...renderMarkdown(quoted.join('\n'), nextKey())),
          )
          continue
        }

        const bullet = line.match(/^\s*([-*+])\s+(.*)$/)
        if (bullet !== null) {
          const items = []
          while (index < lines.length) {
            const current = lines[index].match(/^\s*([-*+])\s+(.*)$/)
            if (current === null) break
            items.push(current[2])
            index += 1
            while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !isBlockStart(lines[index])) {
              items[items.length - 1] += ` ${lines[index].trim()}`
              index += 1
            }
          }
          blocks.push(
            h(
              'ul',
              { key: nextKey() },
              items.map((item, itemIndex) => {
                const task = item.match(/^\[([ xX])\]\s+(.*)$/)
                if (task !== null) {
                  return h(
                    'li',
                    { key: `li${itemIndex}` },
                    h('input', { type: 'checkbox', checked: task[1].toLowerCase() === 'x', readOnly: true, disabled: true }),
                    ...inlineNodes(task[2], `${keyPrefix}-li${itemIndex}`),
                  )
                }
                return h('li', { key: `li${itemIndex}` }, ...inlineNodes(item, `${keyPrefix}-li${itemIndex}`))
              }),
            ),
          )
          continue
        }

        const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
        if (ordered !== null) {
          const items = []
          while (index < lines.length) {
            const current = lines[index].match(/^\s*(\d+)[.)]\s+(.*)$/)
            if (current === null) break
            items.push(current[2])
            index += 1
          }
          blocks.push(
            h(
              'ol',
              { key: nextKey() },
              items.map((item, itemIndex) =>
                h('li', { key: `li${itemIndex}` }, ...inlineNodes(item, `${keyPrefix}-oli${itemIndex}`)),
              ),
            ),
          )
          continue
        }

        if (line.trim().length === 0) {
          index += 1
          continue
        }

        const paragraph = [line.trim()]
        index += 1
        while (index < lines.length && lines[index].trim().length > 0 && !isBlockStart(lines[index])) {
          paragraph.push(lines[index].trim())
          index += 1
        }
        blocks.push(h('p', { key: nextKey() }, ...inlineNodes(paragraph.join(' '), nextKey())))
      }

      return blocks
    }

    const readAsDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => reject(reader.error ?? new Error('read failed'))
        reader.readAsDataURL(file)
      })

    const PATH_PATTERN =
      /(?:^|[\s`'"(（\[])((?:\.{0,2}\/)?[\w@%+.,\-]+(?:\/[\w@%+.,\-]+)*\.[A-Za-z0-9]{1,12})/g

    /**
     * Paths the conversation has already named, newest first: an `@` suggestion
     * list that needs no extra Host surface and matches what the reader is
     * looking at.
     */
    const collectPaths = (messages) => {
      const seen = new Map()
      for (const message of messages) {
        const text = `${message.text ?? ''}\n${(message.tools ?? []).map((tool) => tool.detail ?? '').join('\n')}`
        PATH_PATTERN.lastIndex = 0
        let match
        while ((match = PATH_PATTERN.exec(text)) !== null) {
          const candidate = match[1].replace(/^[.,(（[\]@]+/, '').replace(/[.,]+$/, '')
          if (candidate.length < 3 || candidate.length > 160) continue
          // `0.62` is a decimal, not a file named `0` with extension `.62`.
          if (!/[A-Za-z]/.test(candidate)) continue
          if (/^\d+(\.\d+)+$/.test(candidate)) continue
          if (seen.has(candidate)) seen.delete(candidate)
          seen.set(candidate, candidate)
        }
      }
      return [...seen.keys()].slice(-60).reverse()
    }

    const shortId = (sessionId) => {
      const id = typeof sessionId === 'string' ? sessionId : ''
      return id.length > 14 ? id.slice(-12) : id
    }

    const shortTitle = (tab) => {
      const title = (tab?.title ?? '').trim()
      if (title.length > 0) return title
      const id = tab?.sessionId ?? ''
      return id.length > 12 ? `…${id.slice(-8)}` : id
    }

    // ── icons ───────────────────────────────────────────────────────────────
    const icon = (path, size = 16) =>
      h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', flex: 'none' },
        },
        ...path.map((d, i) => h('path', { key: i, d })),
      )

    const ICONS = {
      chat: icon(['M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.3-.6L4 21l1.7-4.6A8.2 8.2 0 0 1 4.5 11.5 8.4 8.4 0 0 1 13 3.1a8.4 8.4 0 0 1 8 8.4Z']),
      chevronLeft: icon(['M15 18l-6-6 6-6']),
      chevronRight: icon(['M9 18l6-6-6-6']),
      chevronDown: icon(['M6 9l6 6 6-6']),
      close: icon(['M18 6 6 18M6 6l12 12']),
      external: icon(['M14 4h6v6', 'M20 4 10 14', 'M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5']),
      send: icon(['M12 19V5', 'M6 11l6-6 6 6']),
      plus: icon(['M12 5v14', 'M5 12h14']),
      list: icon(['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']),
      user: icon(['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z']),
      terminal: icon(['M4 17l6-6-6-6', 'M12 19h8']),
      file: icon(['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5']),
      pencil: icon(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z']),
      search: icon(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3']),
      globe: icon(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z']),
      users: icon(['M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.9']),
      check: icon(['M20 6 9 17l-5-5']),
      help: icon(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4', 'M12 17h.01']),
      wrench: icon(['M14.7 6.3a4 4 0 0 0 5 5L20 21H4l8.7-9.7a4 4 0 0 0 2-5z']),
      image: icon(['M3 5h18v14H3z', 'M8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z', 'M21 15l-5-5L5 19']),
      braces: icon(['M8 3H7a2 2 0 0 0-2 2v4l-2 3 2 3v4a2 2 0 0 0 2 2h1', 'M16 3h1a2 2 0 0 1 2 2v4l2 3-2 3v4a2 2 0 0 1-2 2h-1']),
      fileText: icon(['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4']),
      folder: icon(['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']),
      star: icon(['M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z']),
      code: icon(['M9 18l-6-6 6-6', 'M15 6l6 6-6 6']),
      stop: icon(['M7 7h10v10H7z']),
    }

    // ── the Session menu row ────────────────────────────────────────────────
    const dismissMenu = (menu) => {
      try {
        if (!menu) return
        if (typeof menu === 'function') {
          menu(false)
          return
        }
        if (Array.isArray(menu) && typeof menu[1] === 'function') {
          menu[1](false)
          return
        }
        if (typeof menu.close === 'function') menu.close()
        else if (typeof menu.dismiss === 'function') menu.dismiss()
        else if (typeof menu.setOpen === 'function') menu.setOpen(false)
      } catch {}
    }

    const MenuRowView = ({ sessionId, displayTitle, menu }) => {
      const [hover, setHover] = useState(false)
      const onClick = () => {
        openSession(sessionId, displayTitle)
        dismissMenu(menu)
      }
      return h(
        'button',
        {
          type: 'button',
          role: 'menuitem',
          className: 'dsc-menu-row',
          onClick,
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '7px 10px',
            margin: '0',
            border: '0',
            borderRadius: '8px',
            background: hover ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
            color: 'var(--dsw-alias-label-primary)',
            font: 'inherit',
            fontSize: '13px',
            lineHeight: '20px',
            textAlign: 'left',
            cursor: 'pointer',
          },
        },
        h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-secondary)' } }, ICONS.chat),
        h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('menu.open')),
      )
    }

    /**
     * `useMenuOpenState` is an owner-injected hook: the owner hands its open-state
     * pair back to the entry so a row can dismiss the menu after acting. A hook
     * cannot be called conditionally, so the wrapper picks one component by the
     * prop's presence and every component calls it unconditionally.
     */
    function MenuRowWithHook(props) {
      const menu = props.useMenuOpenState()
      return h(MenuRowView, { sessionId: props.sessionId, displayTitle: props.displayTitle, menu })
    }

    function MenuRowWithoutHook(props) {
      const raw = props.menuOpenState
      const menu = typeof raw === 'function' ? raw() : raw
      return h(MenuRowView, { sessionId: props.sessionId, displayTitle: props.displayTitle, menu })
    }

    function MenuRow(props) {
      return typeof props.useMenuOpenState === 'function' ? h(MenuRowWithHook, props) : h(MenuRowWithoutHook, props)
    }

    // ── rail ────────────────────────────────────────────────────────────────
    const CSS = `
.dsc-layer, .dsc-layer * { box-sizing: border-box; }
/* The overlay layer is frame-wide and click-through: this shell re-asserts
   right alignment without assuming anything about the host's positioning
   context, and the rail keeps its own width in a variable so the inline
   fallback and the stylesheet agree. */
.dsc-notice {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  max-width: min(520px, 82vw);
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px; line-height: 1.55;
  pointer-events: auto; z-index: 6;
}
.dsc-layer {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 40;
  /* The desktop shell marks its title strip as a window-drag region; anything of
     ours that lands on top of it must opt out or a press moves the whole app. */
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
/* Floating ball: the resting form. Drag to move, click to open the panel,
   right-click to hide until the next "open in popup". */
.dsc-ball {
  -webkit-app-region: no-drag;
  app-region: no-drag;
  position: absolute;
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; padding: 0;
  border: 0; border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  color: #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.24);
  cursor: grab; pointer-events: auto;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.dsc-ball:hover { transform: scale(1.06); box-shadow: 0 10px 30px rgba(0,0,0,0.28); }
.dsc-ball:active { cursor: grabbing; }
.dsc-ball-ring {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--dsw-alias-brand-primary);
  border-right-color: var(--dsw-alias-brand-primary);
  animation: dsc-spin 0.9s linear infinite;
  opacity: 0.9;
  pointer-events: none;
}
.dsc-ball-badge {
  position: absolute; top: -3px; right: -3px;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font-size: 11px; line-height: 16px; text-align: center;
  pointer-events: none;
}
/* The open panel: a card, not a column. */
.dsc-panel {
  -webkit-app-region: no-drag;
  app-region: no-drag;
  position: absolute;
  display: flex; flex-direction: column;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(0,0,0,0.26);
  overflow: hidden;
  pointer-events: auto;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
}
.dsc-panel.is-dragging { cursor: grabbing; }
.dsc-resize {
  position: absolute; right: 0; bottom: 0;
  width: 16px; height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 52%, var(--dsw-alias-border-l2) 52%, var(--dsw-alias-border-l2) 62%, transparent 62%);
  opacity: 0.6;
}
.dsc-resize:hover { opacity: 1; }
.dsc-empty {
  flex: 1 1 auto;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 24px; text-align: center;
}
.dsc-empty-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsc-empty-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.dsc-head, .dsc-tabs, .dsc-body, .dsc-foot { width: 100%; min-width: 0; }
.dsc-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex: none;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.dsc-panel.is-dragging .dsc-head { cursor: grabbing; }
.dsc-head-title { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1 1 auto; }
.dsc-head-name {
  font-weight: 600; font-size: 13px; line-height: 18px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary);
}
.dsc-head-sub { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsc-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0;
  border: 0; border-radius: 7px; background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer; flex: none;
}
.dsc-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsc-btn:disabled { opacity: 0.45; cursor: default; }
.dsc-tabs { display: flex; align-items: center; gap: 4px; padding: 8px 14px; overflow-x: auto; flex: none; }
.dsc-tab {
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 180px; padding: 3px 6px 3px 9px;
  border-radius: 8px; background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px; line-height: 18px; cursor: pointer;
  border: 1px solid transparent; flex: none;
}
.dsc-tab:hover { background: var(--dsw-alias-bg-layer-1); }
.dsc-tab.is-active {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l1);
}
.dsc-tab-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsc-tab-dot {
  flex: none; width: 6px; height: 6px; border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
}
.dsc-tab-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border: 0; border-radius: 4px;
  background: transparent; color: inherit; cursor: pointer; padding: 0; opacity: 0.6;
}
.dsc-tab-close:hover { opacity: 1; background: var(--dsw-alias-bg-layer-1); }
.dsc-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 18px 20px 10px; }
/* A widened panel should not stretch prose to 1200px: the thread keeps the
   Chat's own reading width and centres itself in whatever room it has. */
.dsc-thread { display: flex; flex-direction: column; width: 100%; max-width: 760px; margin: 0 auto; }
.dsc-msg { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.dsc-msg.is-group-start { margin-top: 14px; }
.dsc-msg-user { flex-direction: row-reverse; }
.dsc-msg-assistant .dsc-msg-body { flex: 1 1 auto; }
.dsc-msg-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dsc-msg-user .dsc-msg-body { align-items: flex-end; }
.dsc-msg-body > .dsc-process { align-self: flex-start; }
.dsc-avatar {
  flex: none; width: 26px; height: 26px; margin-top: 2px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
}
.dsc-avatar svg { width: 14px; height: 14px; }
.dsc-avatar-ai {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-brand-primary);
}
.dsc-avatar-user { background: var(--dsw-alias-brand-primary); color: #fff; }
.dsc-avatar-spacer { background: transparent; }
.dsc-msg-user .dsc-bubble {
  max-width: 88%;
  background: var(--dsw-alias-bg-layer-2);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, var(--dsw-alias-bg-base));
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); overflow-wrap: anywhere; padding: 8px 11px; border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
  white-space: pre-wrap; word-break: break-word; line-height: 1.6;
}
.dsc-msg-assistant .dsc-bubble { max-width: 100%; line-height: 1.65; overflow-wrap: anywhere; }
.dsc-text { white-space: pre-wrap; word-break: break-word; }

.dsc-msg { position: relative; content-visibility: auto; contain-intrinsic-size: auto 120px; }
.dsc-thread > .dsc-msg:last-child { margin-bottom: 4px; }
.dsc-msg-assistant .dsc-bubble { font-size: 14px; line-height: 24px; }
.dsc-msg-user .dsc-bubble { font-size: 13.5px; }
.dsc-process {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%; margin-top: 7px;
  font-size: 12.5px; line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer; user-select: none;
}
.dsc-process.is-static { cursor: default; }
.dsc-process:not(.is-static):hover { color: var(--dsw-alias-label-primary); }
.dsc-process-chevron { display: inline-flex; transition: transform 0.14s ease; }
.dsc-process:not(.is-static):hover .dsc-process-chevron { transform: translateX(1px); }
.dsc-process.is-open .dsc-process-chevron { transform: rotate(90deg); }
.dsc-process-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsc-process-meta { margin-left: 2px; font-size: 11.5px; opacity: 0.72; white-space: nowrap; }
.dsc-tools { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 6px; }
/* A tool row reads as a line of the conversation, not as a button: no box at
   rest, a quiet tint on hover, and the disclosure caret on the leading edge. */
.dsc-tool-entry { max-width: 100%; border-radius: 8px; }
.dsc-tool-line {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 5px 8px;
  border: 0; border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 12.5px; line-height: 18px;
  text-align: left; cursor: default;
  transition: background 0.12s ease, color 0.12s ease;
}
.dsc-tool-line[data-openable] { cursor: pointer; }
.dsc-tool-line[data-openable]:hover {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.dsc-tool-name { flex: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: 0.9; }
.dsc-tool-detail { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsc-tool-chevron { order: -1; flex: none; display: inline-flex; transition: transform 0.12s ease; opacity: 0.75; }
.dsc-tool-icon { order: -1; flex: none; display: inline-flex; opacity: 0.65; }
.dsc-tool-icon svg { width: 13px; height: 13px; }
.dsc-tool-chevron.is-open { transform: rotate(90deg); }
.dsc-tool-output {
  margin: 2px 0 4px; padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px; line-height: 1.55;
  color: var(--dsw-alias-label-secondary);
  white-space: pre-wrap; word-break: break-word;
  max-height: 220px; overflow: auto;
}
.dsc-msg-actions { display: flex; justify-content: flex-start; gap: 6px; margin-top: 2px; }
.dsc-badges { display: flex; gap: 6px; margin-top: 6px; }
.dsc-badge {
  display: inline-flex; align-items: center;
  padding: 1px 8px; border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px; line-height: 18px;
}
.dsc-waiting {
  display: flex; align-items: center; gap: 10px;
  flex: none;
  margin: 0 16px 6px; padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 28%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, var(--dsw-alias-bg-base));
  font-size: 12px; line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dsc-waiting > span { flex: 1 1 auto; min-width: 0; }
.dsc-turn-error {
  margin-top: 10px; padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsc-turn-error-head {
  font-size: 12px; line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  margin-bottom: 8px;
}
.dsc-turn-error-body {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 12.5px; line-height: 1.65;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}
.dsc-turn-error-dot {
  flex: none; width: 6px; height: 6px; margin-top: 7px;
  border-radius: 50%; background: var(--dsw-alias-state-error-primary);
}
.dsc-seg-tools { display: flex; flex-direction: column; align-items: stretch; gap: 2px; }
.dsc-seg-text:not(:last-child),
.dsc-seg-tools:not(:last-child) { margin-bottom: 10px; }
.dsc-action {
  padding: 1px 7px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; line-height: 16px; cursor: pointer;
}
.dsc-action:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.dsc-code-more {
  display: block; width: 100%; padding: 4px 9px;
  border: 0; border-top: 1px solid var(--dsw-alias-border-l1);
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; line-height: 16px; cursor: pointer;
}
.dsc-code-more:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsc-imgs { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; margin-bottom: 6px; }
.dsc-img {
  display: block; max-width: 220px; max-height: 180px;
  border-radius: 9px; border: 1px solid var(--dsw-alias-border-l1);
  cursor: zoom-in; object-fit: cover;
}
.dsc-img-loading { width: 120px; height: 80px; cursor: default; background: var(--dsw-alias-bg-layer-1); }
.dsc-img-failed {
  font-size: 11px; color: var(--dsw-alias-label-secondary);
  border: 1px dashed var(--dsw-alias-border-l1); border-radius: 8px;
  padding: 6px 10px;
}
.dsc-lightbox {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.72); cursor: zoom-out; pointer-events: auto;
}
.dsc-lightbox img { max-width: 92vw; max-height: 88vh; border-radius: 10px; }
.dsc-todo {
  margin-top: 12px; padding: 10px 13px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 11px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.dsc-spinner { flex: none; display: block; margin-top: 1px; animation: dsc-spin 0.85s linear infinite; will-change: transform; }
.dsc-todo-head {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 0; border: 0; background: transparent;
  font: inherit; font-size: 12px; color: var(--dsw-alias-label-secondary);
  text-align: left; cursor: pointer;
}
.dsc-todo-head:hover { color: var(--dsw-alias-label-primary); }
.dsc-todo-meta { margin-left: auto; font-size: 11.5px; opacity: 0.85; }
.dsc-todo-list { display: flex; flex-direction: column; gap: 5px; margin: 7px 0 0; padding: 0; list-style: none; }
.dsc-todo-item { display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; line-height: 1.5; }
.dsc-todo-dot {
  position: relative;
  flex: none; width: 13px; height: 13px; margin-top: 2px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1.5px solid var(--dsw-alias-label-secondary);
  background: transparent;
  opacity: 0.4;
}
.dsc-todo-dot.is-stalled { border-color: var(--dsw-alias-label-secondary); opacity: 0.7; }
.dsc-todo-dot.is-done {
  opacity: 1;
  background: var(--dsw-alias-state-success-primary);
  border-color: transparent;
}
.dsc-todo-dot.is-done::after {
  content: '';
  position: absolute; inset: 0;
  background: var(--dsw-alias-bg-layer-1);
  clip-path: polygon(26% 52%, 42% 68%, 76% 30%, 82% 38%, 42% 80%, 19% 58%);
}
.dsc-todo-item.is-done .dsc-todo-text { color: var(--dsw-alias-label-secondary); }
.dsc-todo-item.is-active .dsc-todo-text {
  font-weight: 500;
  background: linear-gradient(
    90deg,
    var(--dsw-alias-label-primary) 0%,
    var(--dsw-alias-brand-primary) 42%,
    var(--dsw-alias-label-primary) 78%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: dsc-shimmer 2.4s linear infinite;
}
@keyframes dsc-spin { to { transform: rotate(360deg); } }
@keyframes dsc-shimmer {
  from { background-position: 140% 0; }
  to { background-position: -60% 0; }
}

/* A code block sits on a tinted surface with no outline: the same weight the
   main conversation gives it. */
.dsc-codeblock {
  margin: 14px 0; border-radius: 10px; overflow: hidden;
  border: 0;
  background: var(--dsw-alias-bg-layer-1);
}
.dsc-codebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px 2px;
  font-size: 11px; color: var(--dsw-alias-label-secondary);
  border-bottom: 0;
}
.dsc-codelang { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: 0.8; }
.dsc-codecopy {
  border: 0; background: transparent; padding: 1px 5px; border-radius: 5px;
  color: inherit; font: inherit; font-size: 11px; cursor: pointer;
  opacity: 0.85;
}
.dsc-codecopy:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); opacity: 1; }
.dsc-codeblock .dsc-code { margin: 0; border: 0; border-radius: 0; background: transparent; padding: 4px 12px 12px; }
.dsc-code {
  margin: 6px 0; padding: 8px 10px; border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre;
}
.dsc-tok-kw { color: #8250df; }
.dsc-tok-str { color: #0a7d33; }
.dsc-tok-num { color: #b35900; }
.dsc-tok-com { color: var(--dsw-alias-label-secondary); opacity: 0.7; font-style: italic; }
.dsc-tok-cmd { color: #0550ae; }
.dsc-tools { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
.dsc-note { font-size: 12px; color: var(--dsw-alias-label-secondary); text-align: center; padding: 10px 0; }
.dsc-error {
  font-size: 12px; line-height: 1.5; color: var(--dsw-alias-state-error-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px; padding: 6px 9px; margin: 6px 0 10px;
  word-break: break-word;
}
.dsc-foot { position: relative; flex: none; padding: 10px 16px 16px; }
.dsc-composer {
  width: 100%; max-width: 760px; margin: 0 auto;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 8px 8px 6px;
}
.dsc-composer:focus-within { border-color: var(--dsw-alias-border-l2); }
.dsc-input {
  width: 100%; min-height: 44px; max-height: 180px; resize: none;
  padding: 4px 6px; border-radius: 8px;
  border: 0; background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; line-height: 1.55;
  outline: none;
}
.dsc-input::placeholder { color: var(--dsw-alias-label-secondary); }
.dsc-foot-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.dsc-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsc-tools-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1 1 auto; }
.dsc-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0; flex: none;
  border: 0; border-radius: 7px; background: transparent;
  color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.dsc-icon-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsc-icon-btn:disabled { opacity: 0.4; cursor: default; }
.dsc-model {
  display: inline-flex; align-items: center; gap: 4px;
  max-width: 168px; padding: 2px 8px; flex: none;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11.5px; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsc-model:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.dsc-menu {
  position: fixed;
  overflow-y: auto;
  padding: 4px; z-index: 8;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.14);
}
.dsc-menu-item {
  display: flex; flex-direction: column; gap: 1px; width: 100%;
  padding: 6px 9px; border: 0; border-radius: 7px;
  background: transparent; text-align: left; cursor: pointer;
  color: var(--dsw-alias-label-primary); font: inherit;
}
.dsc-menu-item:hover, .dsc-menu-item.is-active { background: var(--dsw-alias-bg-layer-2); }
.dsc-menu-search {
  position: sticky; top: -4px; z-index: 1;
  width: calc(100% - 0px); padding: 5px 9px; margin-bottom: 2px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; line-height: 18px;
  outline: none;
}
.dsc-menu-search:focus { border-color: var(--dsw-alias-border-l2); }
.dsc-menu-empty {
  padding: 10px 9px; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
}
.dsc-menu-group {
  padding: 7px 9px 3px;
  font-size: 10.5px; letter-spacing: 0.02em;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.85;
}
.dsc-menu-item { flex-direction: row; align-items: center; gap: 8px; }
.dsc-menu-name {
  flex: 1 1 auto; min-width: 0;
  font-size: 12.5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsc-menu-check { flex: none; display: inline-flex; color: var(--dsw-alias-brand-primary); }
.dsc-menu-check svg { width: 13px; height: 13px; }
.dsc-menu-row { display: flex; align-items: center; gap: 2px; border-radius: 7px; }
.dsc-menu-row:hover, .dsc-menu-row.is-active { background: var(--dsw-alias-bg-layer-2); }
.dsc-menu-row .dsc-menu-item { flex: 1 1 auto; min-width: 0; border-radius: 7px 0 0 7px; }
.dsc-menu-row .dsc-menu-item:hover, .dsc-menu-row .dsc-menu-item.is-active { background: transparent; }
.dsc-menu-pin {
  flex: none; width: 24px; height: 24px; padding: 0; margin-right: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 6px; background: transparent;
  color: var(--dsw-alias-label-secondary); cursor: pointer; opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease;
}
.dsc-menu-pin svg { width: 12px; height: 12px; }
.dsc-menu-pin.is-on { opacity: 1; color: var(--dsw-alias-brand-primary); }
.dsc-menu-pin.is-on svg { fill: currentColor; }
.dsc-menu-row:hover .dsc-menu-pin { opacity: 1; }
.dsc-menu-pin:hover { background: var(--dsw-alias-bg-layer-1); }
.dsc-menu-sub { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsc-menu-effort {
  position: sticky; bottom: -4px;
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  margin: 4px -4px -4px; padding: 8px 12px;
  background: var(--dsw-alias-bg-overlay);
  border-top: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0 0 10px 10px;
}
.dsc-menu-effort-label { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-right: 2px; }
.dsc-effort {
  padding: 2px 9px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; line-height: 16px; cursor: pointer;
}
.dsc-effort:hover:not(.is-active) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsc-effort.is-active { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; }
.dsc-effort.is-static { cursor: default; }
.dsc-composer.is-drop {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, var(--dsw-alias-bg-layer-1));
}
.dsc-mention-empty {
  padding: 8px 9px; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
}
.dsc-attach-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 2px 6px; }
.dsc-attach {
  position: relative; width: 56px; height: 56px;
  border-radius: 8px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
}
.dsc-attach-img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dsc-attach-file {
  display: inline-flex; align-items: center; gap: 6px;
  width: auto; max-width: 220px; height: 34px; padding: 0 6px 0 8px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsc-attach-file .dsc-attach-x { position: static; width: 18px; height: 18px; }
.dsc-attach-glyph { flex: none; display: inline-flex; color: var(--dsw-alias-label-secondary); }
.dsc-attach-glyph svg { width: 14px; height: 14px; }
.dsc-attach-name {
  display: flex; flex-direction: column; min-width: 0;
  font-size: 11.5px; line-height: 1.3; color: var(--dsw-alias-label-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsc-attach-size { font-size: 10px; color: var(--dsw-alias-label-secondary); }
.dsc-attach-x {
  position: absolute; top: 2px; right: 2px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; padding: 0;
  border: 0; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; cursor: pointer;
}
.dsc-mention {
  display: flex; flex-direction: column; gap: 1px;
  margin: 0 2px 4px; padding: 3px;
  max-height: 180px; overflow-y: auto;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px;
}
.dsc-mention-item {
  width: 100%; padding: 4px 7px;
  border: 0; border-radius: 6px; background: transparent; text-align: left;
  color: var(--dsw-alias-label-primary); cursor: pointer;
  font-size: 11.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsc-mention-item:hover,
.dsc-mention-item.is-active { background: var(--dsw-alias-bg-base); }
.dsc-mention-item { display: flex; align-items: center; gap: 7px; width: 100%; }
.dsc-mention-icon { flex: none; display: inline-flex; opacity: 0.5; }
.dsc-mention-icon svg { width: 13px; height: 13px; }
.dsc-mention-path { min-width: 0; display: inline-flex; align-items: baseline; overflow: hidden; }
.dsc-mention-dir { color: var(--dsw-alias-label-secondary); opacity: 0.75; }
.dsc-mention-base { color: var(--dsw-alias-label-primary); }
.dsc-actions { display: flex; align-items: center; gap: 6px; flex: none; }
.dsc-send {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; padding: 0; border-radius: 50%;
  border: 0; background: var(--dsw-alias-brand-primary); color: #fff;
  cursor: pointer; flex: none;
}
.dsc-send:disabled {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  cursor: default;
}
.dsc-ghost {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 9px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 12px; cursor: pointer;
}
.dsc-ghost:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.dsc-body-wrap { position: relative; display: flex; flex: 1 1 auto; min-height: 0; }
.dsc-jump {
  position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 50%;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-secondary);
  box-shadow: 0 2px 10px rgba(0,0,0,0.10);
  cursor: pointer; z-index: 2;
  transition: transform 0.12s ease, color 0.12s ease;
}
.dsc-jump:hover { color: var(--dsw-alias-label-primary); transform: translateX(-50%) translateY(-2px); }
.dsc-running {
  position: relative; flex: none; height: 2px; overflow: hidden;
  background: var(--dsw-alias-bg-layer-2);
}
.dsc-running::after {
  content: '';
  position: absolute; top: 0; bottom: 0; width: 38%;
  background: linear-gradient(90deg, transparent, var(--dsw-alias-brand-primary), transparent);
  animation: dsc-run 1.5s ease-in-out infinite;
}
@keyframes dsc-run {
  from { left: -38%; }
  to { left: 100%; }
}
.dsc-body { scrollbar-width: thin; }
.dsc-body::-webkit-scrollbar { width: 8px; }
.dsc-body::-webkit-scrollbar-track { background: transparent; }
.dsc-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-border-l2);
  background-clip: content-box;
  border: 2px solid transparent;
  border-radius: 4px;
}
.dsc-body::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-label-secondary); background-clip: content-box; }
.dsc-msg-user .dsc-bubble { border-radius: 14px; }
.dsc-send { transition: transform 0.12s ease, filter 0.12s ease; }
.dsc-send:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.06); }
.dsc-send:not(:disabled):active { transform: translateY(0); }
.dsc-head-name { font-size: 13.5px; letter-spacing: -0.01em; }
.dsc-head-switch {
  display: flex; align-items: center; gap: 3px;
  max-width: 100%; padding: 0; margin: 0;
  border: 0; background: transparent; color: inherit;
  font: inherit; letter-spacing: inherit;
  -webkit-app-region: no-drag; app-region: no-drag;
  cursor: pointer; text-align: left;
}
.dsc-head-switch-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsc-head-switch-caret { flex: none; display: inline-flex; opacity: 0.55; }
.dsc-head-switch-caret svg { width: 12px; height: 12px; }
.dsc-head-switch:hover { color: var(--dsw-alias-label-primary); }
.dsc-head-switch:hover .dsc-head-switch-caret { opacity: 1; }
.dsc-switch {
  position: absolute; left: 12px; right: 12px; top: 52px; z-index: 7;
  max-height: 300px; overflow-y: auto;
  padding: 5px;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.18);
}
.dsc-switch-search {
  width: 100%; padding: 5px 9px; margin-bottom: 3px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; line-height: 18px; outline: none;
}
.dsc-switch-search:focus { border-color: var(--dsw-alias-border-l2); }
.dsc-switch-empty { padding: 10px 9px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.dsc-switch-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 5px 9px; border: 0; border-radius: 7px;
  background: transparent; text-align: left; cursor: pointer;
  color: var(--dsw-alias-label-primary); font: inherit;
}
.dsc-switch-item:hover, .dsc-switch-item.is-active { background: var(--dsw-alias-bg-layer-2); }
.dsc-switch-name {
  flex: 1 1 auto; min-width: 0; font-size: 12.5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsc-switch-id { flex: none; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.dsc-tab { transition: background 0.12s ease, color 0.12s ease; }
.dsc-md{min-width:0;overflow-wrap:anywhere;font:var(--dsw-font-markdown-base);color:var(--dsw-alias-label-primary)}.dsc-md strong{font-weight:600}.dsc-md h1{font:var(--dsw-font-markdown-h1);margin:32px 0 16px}.dsc-md h2{font:var(--dsw-font-markdown-h2);margin:32px 0 16px}.dsc-md h3{font:var(--dsw-font-markdown-h3);margin:32px 0 16px}.dsc-md h4{font:var(--dsw-font-markdown-h4);margin:16px 0}.dsc-md :where(h5,h6){font:var(--dsw-font-markdown-base-strong);margin:16px 0}.dsc-md :where(h1,h2,h3,h4,h5,h6) strong{font-weight:inherit}.dsc-md p{margin:16px 0}.dsc-md :where(h4,h5,h6)+:where(ul,ol){margin-top:8px}.dsc-md :where(h4,h5,h6):has(+:where(ul,ol)){margin-bottom:8px}.dsc-md a,.dsc-md .dsc-md-fileLink{color:var(--dsw-alias-link);font-weight:500;transition:box-shadow var(--ds-transition-duration) var(--ds-ease-in-out);position:relative;text-decoration:none;border-left:3px solid rgb(255 255 255 / 0);border-right:3px solid rgb(255 255 255 / 0);border-top:2px solid rgb(255 255 255 / 0);border-bottom:2px solid rgb(255 255 255 / 0);margin-left:-3px;margin-right:-3px}.dsc-md a:focus{outline:none;text-decoration:underline dotted var(--dsw-alias-link);text-underline-offset:3px}@media(hover:hover){.dsc-md a:hover{outline:none;text-decoration:underline dotted var(--dsw-alias-link);text-underline-offset:3px}}.dsc-md a:focus-visible,.dsc-md-fileMention:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))}.dsc-md-linkIcon{flex:none;width:1.1em;height:1.1em;vertical-align:-.25em;margin-right:5px}.dsc-md :where(ul,ol){margin:16px 0;padding-left:18px}.dsc-md li:not(:first-child){margin-top:6px}.dsc-md li>:where(ul,ol){margin-top:4px}.dsc-md li::marker{line-height:24px;color:var(--dsw-alias-label-secondary)}.dsc-md :where(ul,ol) ol{list-style-position:inside;padding-left:0}.dsc-md :where(ul,ol) ol li p{display:inline}.dsc-md li>p{margin:8px 0}.dsc-md li>*:first-child{margin-top:0}.dsc-md li>*:last-child:not(.md-code-block){margin-bottom:0}.dsc-md hr{display:block;border:none;height:.5px;margin:32px 0;background:var(--dsw-alias-border-l2)}.dsc-md blockquote{border-left:2px solid var(--dsw-alias-label-caption);margin:16px 0 0;padding-left:14px}.dsc-md pre{margin:16px 0;font-family:var(--ds-font-family-code);overflow:auto}.dsc-md :not(pre)>code{display:inline-flex;align-items:center;box-sizing:border-box;font:var(--dsw-font-markdown-code);font-family:var(--ds-font-family-code);font-size:.875em!important;background-color:var(--dsw-alias-markdown-inline-code);border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);padding:0 5px}.dsc-md :where(h1,h2,h3,h4,h5,h6) code{font:inherit;font-family:var(--ds-font-family-code)}.dsc-md .katex-display{max-width:100%;overflow-x:auto;overflow-y:hidden}.dsc-md input[type=checkbox]{margin:0 8px 0 0;accent-color:var(--dsw-alias-label-secondary)}.dsc-md-tableScroll{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}.dsc-md-tableScroll.md-table-wide:focus-visible{overflow-x:scroll;padding-bottom:0}@media(hover:hover){.dsc-md-tableScroll.md-table-wide{overflow-x:hidden;padding-bottom:var(--dsh-scrollbar-width, 5px)}.dsc-md-tableScroll.md-table-wide:hover{overflow-x:scroll;padding-bottom:0}}.dsc-md-tableScroll.md-table-wide:hover{overflow-x:scroll;padding-bottom:0}.dsc-md-tableScroll:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))}.dsc-md-tableScroll table{border-collapse:collapse;width:max-content;max-width:max-content}.dsc-md-tableFill table{width:100%;max-width:none}.dsc-md-tableScroll th{text-align:start;padding:10px 16px;border-bottom:.5px solid var(--dsw-alias-border-l3);border-top:none;font:var(--dsw-font-markdown-table-head);max-width:320px;max-width:min(30vw,320px);min-width:100px}.dsc-md-tableScroll td{padding:10px 16px;border-bottom:.5px solid var(--dsw-alias-border-l2);font:var(--dsw-font-markdown-table);max-width:320px;max-width:min(30vw,320px);min-width:100px}.dsc-md-tableScroll th:first-child,.dsc-md-tableScroll td:first-child{padding-left:0}.dsc-md-tableScroll td:last-child{padding-right:0}.dsc-md-tableScroll table code{font-size:11px}.dsc-md>*:first-child,.dsc-md p:first-child{margin-top:0!important}.dsc-md>*:last-child,.dsc-md p:last-child{margin-bottom:0!important}.dsc-md-imageAlt{color:var(--dsw-alias-label-tertiary);font-style:italic}.dsc-md-image{display:block;width:auto;max-width:100%;height:auto;margin:0;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);object-fit:contain}.dsc-md-fileMention{margin:0;padding:0;border:none;background:none;font:inherit;font-weight:500;color:var(--dsw-alias-link);text-decoration:none;cursor:pointer}.dsc-md-fileLink{max-width:100%;text-align:inherit}.dsc-md-fileMention:focus{outline:none;text-decoration:underline dotted var(--dsw-alias-link);text-underline-offset:3px}@media(hover:hover){.dsc-md-fileMention:hover{outline:none;text-decoration:underline dotted var(--dsw-alias-link);text-underline-offset:3px}}.dsc-md-compact{max-width:100%;font-size:var(--dsh-content-font-size-secondary, 13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary, 0px));color:var(--dsw-alias-label-tertiary)}.dsc-md-compact :is(h1,h2,h3,h4,h5,h6){margin:8px 0 4px;font:inherit;font-weight:600;color:inherit}.dsc-md-compact :is(p,ul,ol,blockquote){margin:4px 0}.dsc-md-compact li:not(:first-child){margin-top:2px}.dsc-md-compact li>p{margin:4px 0}.dsc-md-compact li::marker{line-height:inherit;color:inherit}.dsc-md-compact blockquote{padding-left:8px}.dsc-md-compact hr{margin:8px 0}.dsc-md-compact a,.dsc-md-compact .dsc-md-fileMention{font-weight:inherit;color:inherit;text-decoration:underline dotted}.dsc-md-compact a:focus,.dsc-md-compact .dsc-md-fileMention:focus{text-decoration-color:currentColor}@media(hover:hover){.dsc-md-compact a:hover,.dsc-md-compact .dsc-md-fileMention:hover{text-decoration-color:currentColor}}.dsc-md-compact :not(pre)>code{display:inline;font:inherit;font-family:var(--ds-font-family-code);font-size:1em!important;border-radius:var(--dsw-radius-xs);padding:0 3px;box-decoration-break:clone}.dsc-md.dsc-md-compact .md-code-block{margin:4px 0;color:inherit}.dsc-md-compact .md-code-block>:has(>[data-code-block-banner]){position:static;z-index:auto}.dsc-md-compact pre,.dsc-md-compact pre :is(code,span){color:inherit!important}.dsc-md.dsc-md-compact .dsc-md-tableScroll{width:100%;max-width:100%;margin:4px 0;padding-left:0}.dsc-md.dsc-md-compact .dsc-md-tableScroll>table{z-index:auto}.dsc-md-compact :is(th,td){padding:4px 8px;font:inherit}.dsc-md-compact th{font-weight:600}.dsc-md-compact .katex{font-size:1em}.dsc-md-compact :is(p,h1,h2,h3,h4,h5,h6,ul,ol):has(.katex){overflow-x:auto;overflow-y:hidden;padding-bottom:1px}.dsc-md-compact .katex-display{margin:4px 0}.dsc-md-imageButton{display:inline-block;max-width:100%;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;vertical-align:middle;cursor:zoom-in}.dsc-md-imageButton .dsc-md-image{max-width:min(100%,640px);max-height:360px}.dsc-md-imageButton:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));outline-offset:3px}.dsc-md-previewName{display:block;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsc-md-tableScroll th:first-child,
.dsc-md-tableScroll td:first-child { padding-left: 12px; }
.dsc-md-tableScroll th:last-child,
.dsc-md-tableScroll td:last-child { padding-right: 12px; }
/* The shipped markdown rhythm is tuned for a full-width column; in a 400px
   dock it reads as airy. Tighten the block spacing one notch. */
.dsc-md p { margin: 10px 0; }
.dsc-md :where(ul, ol) { margin: 10px 0; }
.dsc-md :where(h1, h2, h3) { margin: 20px 0 10px; }
.dsc-md :where(h4, h5, h6) { margin: 12px 0 8px; }
.dsc-md blockquote { margin: 10px 0 0; }
.dsc-md hr { margin: 20px 0; }
.dsc-md pre { margin: 10px 0; }
.dsc-md .dsc-codeblock { margin: 10px 0; }
.dsc-md .dsc-codeblock pre { margin: 0; }
.dsc-md :where(ul,ol) input[type="checkbox"] { margin: 0 8px 0 0; accent-color: var(--dsw-alias-label-secondary); }
`

    const HIGHLIGHT_LANGS = new Set([
      'bash', 'sh', 'shell', 'zsh', 'js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx',
      'json', 'python', 'py', 'yaml', 'yml', 'css', 'html', 'xml', 'sql', 'go', 'rust', 'rs',
      'java', 'c', 'cpp', 'h', 'diff', 'toml', 'ini',
    ])

    const KEYWORDS = new Set([
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'elif', 'for', 'while', 'do',
      'class', 'import', 'export', 'from', 'default', 'async', 'await', 'new', 'try', 'catch',
      'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this', 'super', 'null', 'undefined',
      'true', 'false', 'def', 'lambda', 'pass', 'with', 'as', 'yield', 'None', 'True', 'False',
      'public', 'private', 'static', 'void', 'int', 'float', 'string', 'bool', 'struct', 'impl',
      'fn', 'mut', 'pub', 'use', 'mod', 'match', 'select', 'insert', 'update', 'delete', 'where',
    ])

    const SHELL_WORDS = new Set([
      'cd', 'ls', 'll', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'cat', 'head', 'tail', 'grep',
      'sed', 'awk', 'find', 'git', 'npm', 'pnpm', 'npx', 'yarn', 'node', 'deno', 'python', 'pip',
      'curl', 'wget', 'docker', 'make', 'cargo', 'go', 'rustc', 'chmod', 'chown', 'export', 'echo',
      'source', 'which', 'ps', 'kill', 'open', 'code', 'ssh', 'scp', 'tar', 'zip', 'unzip',
    ])

    const TOKEN_PATTERN =
      /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)|([\s\S])/g

    /**
     * A deliberately small highlighter: comments, strings, numbers, keywords and
     * shell command words. It is not a parser — it exists so a code block reads
     * with the same colour hierarchy as the main conversation instead of a wall
     * of grey.
     */
    const highlight = (code, lang) => {
      const isShell = lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'zsh'
      const nodes = []
      let index = 0
      let key = 0
      TOKEN_PATTERN.lastIndex = 0
      let match
      while ((match = TOKEN_PATTERN.exec(code)) !== null) {
        const [text, comment, string, number, word] = match
        let className = null
        if (comment !== undefined) className = 'dsc-tok-com'
        else if (string !== undefined) className = 'dsc-tok-str'
        else if (number !== undefined) className = 'dsc-tok-num'
        else if (word !== undefined) {
          if (isShell && SHELL_WORDS.has(word)) className = 'dsc-tok-cmd'
          else if (KEYWORDS.has(word)) className = 'dsc-tok-kw'
        }
        if (className === null) nodes.push(text)
        else nodes.push(h('span', { key: `t${key++}`, className }, text))
        index += text.length
        if (TOKEN_PATTERN.lastIndex <= index - text.length) TOKEN_PATTERN.lastIndex = index
      }
      return nodes
    }

    const CodeBlock = ({ code, lang }) => {
      const [copied, setCopied] = useState(false)
      const [expanded, setExpanded] = useState(false)
      const lines = String(code).split('\n')
      const collapsible = lines.length > CODE_COLLAPSE_LINES
      const shown = collapsible && !expanded ? lines.slice(0, CODE_COLLAPSE_LINES).join('\n') : code
      const copy = useCallback(
        (event) => {
          event.stopPropagation()
          const done = () => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          }
          try {
            const pending = navigator.clipboard?.writeText?.(code)
            if (pending && typeof pending.then === 'function') pending.then(done, () => {})
            else done()
          } catch {}
        },
        [code],
      )
      return h(
        'div',
        { className: 'dsc-codeblock' },
        h(
          'div',
          { className: 'dsc-codebar' },
          h('span', { className: 'dsc-codelang' }, lang && lang.length > 0 ? lang : 'text'),
          h('button', { type: 'button', className: 'dsc-codecopy', onClick: copy }, copied ? t('code.copied') : t('code.copy')),
        ),
        h(
          'pre',
          { className: 'dsc-code' },
          h('code', null, HIGHLIGHT_LANGS.has(String(lang ?? '').toLowerCase()) ? highlight(shown, String(lang).toLowerCase()) : shown),
        ),
        collapsible
          ? h(
              'button',
              { type: 'button', className: 'dsc-code-more', onClick: () => setExpanded((value) => !value) },
              expanded ? t('code.collapse') : t('code.expand', { lines: lines.length }),
            )
          : null,
      )
    }

    const AttachmentImage = ({ attachment, session }) => {
      const [src, setSrc] = useState(null)
      const [failed, setFailed] = useState(false)
      const [zoomed, setZoomed] = useState(false)

      useEffect(() => {
        let alive = true
        let objectUrl = null
        const load = async () => {
          try {
            const result = await session.readAttachment(attachment)
            if (!alive) return
            if (!result || result.ok === false) {
              setFailed(true)
              return
            }
            const raw = result.value?.data
            if (raw === undefined || raw === null) {
              setFailed(true)
              return
            }
            const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
            objectUrl = URL.createObjectURL(new Blob([bytes], { type: attachment.mediaType ?? 'image/png' }))
            setSrc(objectUrl)
          } catch {
            if (alive) setFailed(true)
          }
        }
        load()
        return () => {
          alive = false
          if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
        }
      }, [attachment, session])

      if (failed) return h('div', { className: 'dsc-img-failed' }, t('image.failed'))
      if (src === null) return h('div', { className: 'dsc-img dsc-img-loading' })

      return h(
        Fragment,
        null,
        h('img', {
          className: 'dsc-img',
          src,
          alt: attachment.name ?? '',
          onClick: () => setZoomed(true),
        }),
        zoomed
          ? h(
              'div',
              { className: 'dsc-lightbox', onClick: () => setZoomed(false) },
              h('img', { src, alt: attachment.name ?? '' }),
            )
          : null,
      )
    }

    const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'bmp', 'avif'])
    const DATA_EXT = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'lock', 'csv', 'tsv'])
    const TEXT_EXT = new Set(['md', 'txt', 'rst', 'log'])
    const CODE_EXT = new Set([
      'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'kt', 'swift',
      'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'gd', 'sh', 'zsh', 'bash', 'ps1',
      'css', 'scss', 'less', 'html', 'htm', 'xml', 'vue', 'svelte', 'sql', 'lua', 'dart',
    ])

    /** A file's icon follows its extension; anything unknown stays a plain file. */
    const fileGlyph = (name) => {
      const dot = name.lastIndexOf('.')
      const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
      if (IMAGE_EXT.has(ext)) return ICONS.image
      if (DATA_EXT.has(ext)) return ICONS.braces
      if (TEXT_EXT.has(ext)) return ICONS.fileText
      if (CODE_EXT.has(ext)) return ICONS.code
      return ICONS.file
    }

    const Avatar = ({ kind, show }) =>
      show === false
        ? h('div', { className: 'dsc-avatar dsc-avatar-spacer', 'aria-hidden': true })
        : h(
            'div',
            { className: `dsc-avatar dsc-avatar-${kind}`, 'aria-hidden': true },
            kind === 'user' ? ICONS.user : ICONS.chat,
          )

    const UserBlock = ({ message, session, showAvatar }) => {
      const images = Array.isArray(message.images) ? message.images : []
      return h(
        'div',
        { className: `dsc-msg dsc-msg-user${showAvatar ? ' is-group-start' : ''}` },
        h(Avatar, { kind: 'user', show: showAvatar }),
        h(
          'div',
          { className: 'dsc-msg-body' },
          images.length > 0
            ? h(
                'div',
                { className: 'dsc-imgs' },
                images.map((attachment, index) =>
                  h(AttachmentImage, { key: `${message.id}-img-${index}`, attachment, session }),
                ),
              )
            : null,
          message.text.length > 0
            ? h('div', { className: 'dsc-bubble' }, h('div', { className: 'dsc-text' }, message.text))
            : null,
        ),
      )
    }

    /**
     * A real ring: an SVG track plus a quarter arc that rotates. Border sides
     * cannot keep the full circle while only part of it moves, so the shape is
     * drawn instead of composed.
     */
    const Spinner = ({ size = 13 }) => {
      const radius = 6.5
      const circumference = 2 * Math.PI * radius
      const arc = circumference * 0.26
      return h(
        'svg',
        { className: 'dsc-spinner', width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true },
        h('circle', {
          cx: 8, cy: 8, r: radius, fill: 'none',
          stroke: 'currentColor', strokeOpacity: 0.22, strokeWidth: 1.6,
        }),
        h('circle', {
          cx: 8, cy: 8, r: radius, fill: 'none',
          stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.6, strokeLinecap: 'round',
          strokeDasharray: `${arc} ${circumference - arc}`,
        }),
      )
    }

    /**
     * One tool call: the wire name and its argument summary stay on one line,
     * and the output it produced opens below only when asked for. A page of
     * command output is not something to read by scrolling past.
     */
    const toolGlyph = (kind) => {
      switch (kind) {
        case 'commands':
        case 'code':
          return ICONS.terminal
        case 'read':
        case 'readImage':
          return ICONS.file
        case 'write':
        case 'edit':
          return ICONS.pencil
        case 'search':
          return ICONS.search
        case 'webSearch':
        case 'webFetch':
          return ICONS.globe
        case 'subagents':
          return ICONS.users
        case 'plan':
          return ICONS.check
        case 'questions':
          return ICONS.help
        default:
          return ICONS.wrench
      }
    }

    const ToolEntry = ({ tool, id }) => {
      const [open, setOpen] = useState(false)
      const output = typeof tool.result === 'string' ? tool.result : ''
      const openable = output.length > 0
      return h(
        'div',
        { className: 'dsc-tool-entry' },
        h(
          'button',
          {
            type: 'button',
            className: 'dsc-tool-line',
            'data-openable': openable ? 'true' : undefined,
            onClick: openable ? () => setOpen((value) => !value) : undefined,
            title: tool.detail,
          },
          h('span', { className: 'dsc-tool-name' }, tool.name),
          tool.detail ? h('span', { className: 'dsc-tool-detail' }, tool.detail) : null,
          openable
            ? h('span', { className: `dsc-tool-chevron${open ? ' is-open' : ''}` }, ICONS.chevronRight)
            : null,
          h('span', { className: 'dsc-tool-icon', 'aria-hidden': true }, toolGlyph(tool.kind)),
        ),
        open && openable ? h('pre', { className: 'dsc-tool-output' }, output) : null,
      )
    }

    const TodoCard = ({ todos, running }) => {
      const [open, setOpen] = useState(true)
      if (!Array.isArray(todos) || todos.length === 0) return null
      const done = todos.filter((item) => item?.status === 'completed').length
      const active = todos.filter((item) => item?.status === 'in_progress').length
      const waiting = todos.length - done - active
      // A snapshot keeps whatever status the model last wrote. Once the turn is
      // over nothing is advancing, so an `in_progress` row must stop claiming it
      // is: only a live session animates.
      const live = running === true
      const parts = []
      if (done > 0) parts.push(t('todo.done', { count: done }))
      if (active > 0) parts.push(t('todo.active', { count: active }))
      if (waiting > 0) parts.push(t('todo.pending', { count: waiting }))

      return h(
        'div',
        { className: 'dsc-todo' },
        h(
          'button',
          {
            type: 'button',
            className: 'dsc-todo-head',
            onClick: () => setOpen((value) => !value),
            'aria-expanded': open,
          },
          ICONS.list,
          h('span', null, t('todo.title')),
          active > 0 && live ? h(Spinner, { size: 12 }) : null,
          h('span', { className: 'dsc-todo-meta' }, parts.join(' · ')),
          h('span', { className: `dsc-tool-chevron${open ? ' is-open' : ''}` }, ICONS.chevronRight),
        ),
        open ? h(
          'ul',
          { className: 'dsc-todo-list' },
          todos.map((item, index) =>
            h(
              'li',
              {
                key: `${index}-${item?.content ?? ''}`.slice(0, 60),
                className: `dsc-todo-item is-${
                  item?.status === 'completed' ? 'done' : item?.status === 'in_progress' ? 'active' : 'pending'
                }`,
              },
              item?.status === 'in_progress'
                ? live
                  ? h(Spinner, { size: 13 })
                  : h('span', { className: 'dsc-todo-dot is-stalled' })
                : h('span', {
                    className: `dsc-todo-dot is-${item?.status === 'completed' ? 'done' : 'pending'}`,
                  }),
              h('span', { className: 'dsc-todo-text' }, item?.content ?? ''),
            ),
          ),
        ) : null,
      )
    }

    const AssistantBlock = ({ message, running, showAvatar }) => {
      const [openTools, setOpenTools] = useState(false)
      const [hover, setHover] = useState(false)
      const [copied, setCopied] = useState(false)
      const tools = message.tools ?? []
      const duration = formatDuration(message.durationMs)
      const title = tools.length > 0 ? processTitle(message.kinds ?? []) : ''
      const interactive = tools.length > 0

      const renderSegments = () => {
        const segments =
          Array.isArray(message.segments) && message.segments.length > 0
            ? message.segments
            : [{ kind: 'text', text: message.text }]
        return segments.map((segment, index) => {
          const key = `${message.id}-seg-${index}`
          if (segment.kind === 'text') {
            return h('div', { className: 'dsc-seg-text', key }, renderMarkdown(segment.text, key))
          }
          return h(
            'div',
            { className: 'dsc-seg-tools', key },
            segment.tools.map((tool, toolIndex) =>
              h(ToolEntry, { key: `${key}-t${toolIndex}`, tool }),
            ),
          )
        })
      }

      const copyText = (event) => {
        event.stopPropagation()
        const done = () => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        }
        try {
          const pending = navigator.clipboard?.writeText?.(message.text)
          if (pending && typeof pending.then === 'function') pending.then(done, () => {})
          else done()
        } catch {}
      }

      return h(
        'div',
        {
          className: `dsc-msg dsc-msg-assistant${showAvatar ? ' is-group-start' : ''}`,
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
        },

        h(
          'div',
          { className: 'dsc-msg-body dsc-msg-body-full' },
        // The summary row opens at the head of the turn, so expanding it reveals
        // the work directly beneath the control that was pressed.
        interactive || duration.length > 0
          ? h(
              'div',
              {
                className: `dsc-process${openTools ? ' is-open' : ''}${interactive ? '' : ' is-static'}`,
                role: interactive ? 'button' : undefined,
                tabIndex: interactive ? 0 : undefined,
                onClick: interactive ? () => setOpenTools((open) => !open) : undefined,
                onKeyDown: interactive
                  ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      setOpenTools((open) => !open)
                    }
                  : undefined,
              },
              interactive ? h('span', { className: 'dsc-process-chevron' }, ICONS.chevronRight) : null,
              title.length > 0 ? h('span', { className: 'dsc-process-title' }, title) : null,
              duration.length > 0 ? h('span', { className: 'dsc-process-meta' }, duration) : null,
            )
          : null,
        openTools
          ? h('div', { className: 'dsc-bubble' }, renderSegments())
          : message.text.length > 0
            ? h('div', { className: 'dsc-bubble' }, h('div', { className: 'dsc-md' }, renderMarkdown(message.text, message.id)))
            : null,
        typeof message.stopReason === 'string'
          ? h('div', { className: 'dsc-badges' }, h('span', { className: 'dsc-badge' }, t(`stop.${message.stopReason}`)))
          : null,
        typeof message.error === 'string' && message.error.length > 0
          ? h(
              'div',
              { className: 'dsc-turn-error' },
              h('div', { className: 'dsc-turn-error-head' }, t('error.turnTitle')),
              h(
                'div',
                { className: 'dsc-turn-error-body' },
                h('span', { className: 'dsc-turn-error-dot', 'aria-hidden': true }),
                h('span', null, `${t('error.turnFailed')} ${message.error}`),
              ),
            )
          : null,
        h(TodoCard, { todos: message.todos, running }),
        hover && message.text.length > 0
          ? h(
              'div',
              { className: 'dsc-msg-actions' },
              h(
                'button',
                { type: 'button', className: 'dsc-action', onClick: copyText },
                copied ? t('code.copied') : t('code.copy'),
              ),
            )
          : null,
        ),
      )
    }

    const Composer = ({ session, sessionId, running, disabled, paths }) => {
      const [draft, setDraft] = useState('')
      const [images, setImages] = useState([])
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState(null)
      const [modelOpen, setModelOpen] = useState(false)
      const [modelQuery, setModelQuery] = useState('')
      const [modelBusy, setModelBusy] = useState(false)
      const [mention, setMention] = useState(null)
      const [dropActive, setDropActive] = useState(false)
      const [remoteLoading, setRemoteLoading] = useState(false)
      const areaRef = useRef(null)
      const fileRef = useRef(null)
      const wrapRef = useRef(null)
      const menuRef = useRef(null)
      const modelBtnRef = useRef(null)

      // Model seat: the shipped per-session directory, the same one the main
      // composer reads, so a switch here is visible there and vice versa.
      const directory = useMemo(() => {
        if (modelDirsRef === null || typeof sessionId !== 'string') return null
        try {
          return modelDirsRef.directoryFor(sessionId)
        } catch (cause) {
          report('directoryFor', cause)
          return null
        }
      }, [sessionId])

      // `directoryFor()` hands back a face: `store` is the observable, `load`
      // and `select` are its actions.
      const directoryStore = directory?.store ?? null
      const directoryState = useSnapshot(directoryStore)

      useEffect(() => {
        if (directory === null) return
        try {
          const pending = directory.load?.()
          if (pending && typeof pending.catch === 'function') pending.catch(() => {})
        } catch {}
      }, [directory])

      const currentModel = directoryState?.current ?? null
      const modelRows = useMemo(() => {
        const rows = []
        for (const group of directoryState?.groups ?? []) {
          for (const model of group.models ?? []) rows.push({ provider: group.id, model })
        }
        return rows
      }, [directoryState])

      /**
       * The effort levels for one model come from the catalog, not from the
       * directory snapshot: `modelDirectories.catalog.reasoningFor()` returns
       * `{ defaultEffort?, efforts: [{ id, name }] }` for the Host generation.
       * The snapshot only carries the retained effort's display name.
       */
      const effortLevels = (row) => {
        const model = row?.model
        if (model === null || typeof model !== 'object') return { levels: [], defaultEffort: undefined }
        const read = (value) => {
          if (!Array.isArray(value)) return []
          return value
            .map((entry) => {
              if (typeof entry === 'string') return { id: entry, name: entry }
              const id = entry?.id
              if (typeof id !== 'string' || id.length === 0) return null
              return { id, name: typeof entry?.name === 'string' && entry.name.length > 0 ? entry.name : id }
            })
            .filter((entry) => entry !== null)
        }
        try {
          const catalog = modelDirsRef?.catalog
          const reasoning = catalog?.reasoningFor?.({ provider: row.provider, model: model.id })
          const levels = read(reasoning?.efforts)
          if (levels.length > 0) return { levels, defaultEffort: reasoning?.defaultEffort }
        } catch {}
        for (const list of [model.reasoning?.efforts, model.reasoning?.levels, model.reasoningEfforts, model.efforts]) {
          const levels = read(list)
          if (levels.length > 0) return { levels, defaultEffort: model.reasoning?.defaultEffort }
        }
        return { levels: [], defaultEffort: undefined }
      }

      const modelGroups = useMemo(() => {
        const byProvider = new Map()
        for (const row of modelRows) {
          const key = String(row.provider ?? '').trim()
          if (key.length === 0) continue
          let group = byProvider.get(key)
          if (group === undefined) {
            group = { provider: key, rows: [], seen: new Set() }
            byProvider.set(key, group)
          }
          const modelId = String(row.model?.id ?? '')
          if (group.seen.has(modelId)) continue
          group.seen.add(modelId)
          group.rows.push(row)
        }
        return [...byProvider.values()]
      }, [modelRows])

      const currentRow = useMemo(
        () =>
          modelRows.find(
            (row) => currentModel !== null && currentModel.provider === row.provider && currentModel.model === row.model.id,
          ) ?? null,
        [modelRows, currentModel],
      )
      const [pins, setPins] = useState(() => readPins())
      const [recent, setRecent] = useState(() => readRecent())

      const togglePin = useCallback((row) => {
        const key = modelKey(row.provider, row.model.id)
        setPins((previous) => {
          const next = new Set(previous)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          writeJson(PIN_KEY, [...next])
          return next
        })
      }, [])

      const noteRecent = useCallback((row) => {
        const key = modelKey(row.provider, row.model.id)
        setRecent((previous) => {
          const next = [key, ...previous.filter((item) => item !== key)].slice(0, RECENT_MAX)
          writeJson(RECENT_KEY, next)
          return next
        })
      }, [])

      const isPinned = (row) => pins.has(modelKey(row.provider, row.model.id))

      const filteredGroups = useMemo(() => {
        const query = modelQuery.trim().toLowerCase()
        if (query.length === 0) return modelGroups
        return modelGroups
          .map((group) => ({
            provider: group.provider,
            rows: group.rows.filter((row) => {
              const id = String(row.model?.id ?? '').toLowerCase()
              const label = String(row.model?.label ?? '').toLowerCase()
              return id.includes(query) || label.includes(query) || group.provider.toLowerCase().includes(query)
            }),
          }))
          .filter((group) => group.rows.length > 0)
      }, [modelGroups, modelQuery])

      // Pinned rows float into an always-first group; the rest keep their
      // provider grouping so the list still reads like the shipped menu.
      const pinnedRows = useMemo(
        () => modelRows.filter((row) => pins.has(modelKey(row.provider, row.model.id))),
        [modelRows, pins],
      )

      const recentRows = useMemo(() => {
        const byKey = new Map(modelRows.map((row) => [modelKey(row.provider, row.model.id), row]))
        const rows = []
        for (const key of recent) {
          const row = byKey.get(key)
          if (row === undefined || pins.has(key)) continue
          rows.push(row)
        }
        return rows
      }, [modelRows, recent, pins])

      const currentLevels = useMemo(
        () => effortLevels(currentRow),
        [currentRow, directoryState],
      )
      const currentEfforts = currentLevels.levels
      const currentEffort = typeof currentModel?.reasoningEffort === 'string' ? currentModel.reasoningEffort : ''

      const closeMenus = useCallback(() => {
        setModelOpen(false)
        setMention(null)
      }, [])

      const [menuBox, setMenuBox] = useState(null)
      useEffect(() => {
        if (!modelOpen) {
          setMenuBox(null)
          setModelQuery('')
          return undefined
        }
        const rect = wrapRef.current?.getBoundingClientRect?.()
        if (rect === undefined) return undefined
        const width = Math.min(320, Math.max(220, rect.width - 24))
        setMenuBox({
          left: Math.max(12, Math.min(rect.right - width - 12, window.innerWidth - width - 12)),
          bottom: window.innerHeight - rect.top + 6,
          width,
          maxHeight: Math.min(360, Math.max(180, rect.top - 24)),
        })
        return undefined
      }, [modelOpen])

      useEffect(() => {
        if (!modelOpen) return undefined
        const target = (event) => (event.target instanceof Node ? event.target : null)
        const onDown = (event) => {
          const node = target(event)
          if (node === null) {
            setModelOpen(false)
            return
          }
          // Both the popup and the button that opens it are "inside": the button
          // toggles on click, and closing here would fight that.
          if (menuRef.current !== null && menuRef.current.contains(node)) return
          if (modelBtnRef.current !== null && modelBtnRef.current.contains(node)) return
          setModelOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setModelOpen(false)
        }
        // Capture: the conversation panel and the sidebar handle their own
        // pointerdown and stop it, so a bubble-phase listener never sees a
        // click that lands outside this composer.
        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('keydown', onKey, true)
        return () => {
          document.removeEventListener('pointerdown', onDown, true)
          document.removeEventListener('keydown', onKey, true)
        }
      }, [modelOpen])

      const pickModel = useCallback(
        async (row) => {
          if (directory === null || row === null || modelBusy) return
          setModelBusy(true)
          setError(null)
          try {
            if (currentModel !== null && currentModel.provider === row.provider && currentModel.model === row.model.id) {
              setModelOpen(false)
              setModelBusy(false)
              return
            }
            const selection = { provider: row.provider, model: row.model.id }
            // The effort is per model: keep it only when the new model offers it,
            // otherwise fall back to that model's own default.
            const { levels, defaultEffort } = effortLevels(row)
            if (levels.length > 0) {
              const ids = levels.map((level) => level.id)
              const keep = currentModel !== null && typeof currentModel.reasoningEffort === 'string' ? currentModel.reasoningEffort : ''
              const chosen =
                (keep.length > 0 && ids.includes(keep) ? keep : '') ||
                (typeof defaultEffort === 'string' && ids.includes(defaultEffort) ? defaultEffort : '') ||
                ids[0]
              if (chosen.length > 0) selection.reasoningEffort = chosen
            }
            const result = await directory.select?.(selection)
            if (result !== undefined && result !== null && result.ok === false) {
              setError(t('error.model', { message: result.error?.message ?? result.error?.code ?? 'unknown' }))
            } else {
              noteRecent(row)
              setModelOpen(false)
            }
          } catch (cause) {
            setError(t('error.model', { message: cause?.message ?? String(cause) }))
          } finally {
            setModelBusy(false)
          }
        },
        [directory, currentModel, modelBusy],
      )

      const pickEffort = useCallback(
        async (effortId) => {
          if (directory === null || currentModel === null || modelBusy) return
          if (typeof effortId !== 'string' || effortId.length === 0) return
          if (effortId === currentEffort) return
          setModelBusy(true)
          setError(null)
          try {
            const result = await directory.select?.({
              provider: currentModel.provider,
              model: currentModel.model,
              reasoningEffort: effortId,
            })
            if (result !== undefined && result !== null && result.ok === false) {
              setError(t('error.model', { message: result.error?.message ?? result.error?.code ?? 'unknown' }))
            }
          } catch (cause) {
            setError(t('error.model', { message: cause?.message ?? String(cause) }))
          } finally {
            setModelBusy(false)
          }
        },
        [directory, currentModel, currentEffort, modelBusy],
      )

      const modelRow = (row, pinnedSection) => {
        const key = `${row.provider}:${row.model.id}`
        const active =
          currentModel !== null && currentModel.provider === row.provider && currentModel.model === row.model.id
        const pinned = isPinned(row)
        return h(
          'div',
          {
            key: pinnedSection ? `pin:${key}` : key,
            className: `dsc-menu-row${active ? ' is-active' : ''}${modelBusy ? ' is-busy' : ''}`,
          },
          h(
            'button',
            {
              type: 'button',
              className: 'dsc-menu-item',
              onClick: () => pickModel(row),
              disabled: modelBusy,
              title: `${row.provider} / ${row.model.id}`,
            },
            h('span', { className: 'dsc-menu-name' }, row.model.label ?? row.model.id),
            active ? h('span', { className: 'dsc-menu-check' }, ICONS.check) : null,
          ),
          h(
            'button',
            {
              type: 'button',
              className: `dsc-menu-pin${pinned ? ' is-on' : ''}`,
              title: pinned ? t('rail.unpin') : t('rail.pin'),
              onClick: (event) => {
                event.stopPropagation()
                togglePin(row)
              },
            },
            ICONS.star,
          ),
        )
      }

      const onPickFiles = useCallback(async (event) => {
        const files = Array.from(event.target.files ?? [])
        if (event.target !== undefined && 'value' in event.target) event.target.value = ''
        if (files.length === 0) return
        const accepted = []
        for (const file of files) {
          const isImage = typeof file.type === 'string' && file.type.startsWith('image/')
          if (isImage) {
            if (file.size > MAX_IMAGE_BYTES) continue
            try {
              const dataUrl = await readAsDataUrl(file)
              const comma = dataUrl.indexOf(',')
              if (comma < 0) continue
              accepted.push({
                kind: 'image',
                id: `${Date.now()}-${accepted.length}-${file.name}`,
                name: file.name,
                mediaType: file.type,
                data: dataUrl.slice(comma + 1),
                previewUrl: dataUrl,
              })
            } catch (cause) {
              report('readImage', cause)
            }
            continue
          }
          if (file.size > MAX_FILE_BYTES) {
            setError(t('error.fileTooLarge', { name: file.name, size: Math.round(MAX_FILE_BYTES / 1024 / 1024) }))
            continue
          }
          if (fileUploadRef === null) {
            setError(t('error.fileUnsupported'))
            continue
          }
          accepted.push({
            kind: 'file',
            id: `${Date.now()}-${accepted.length}-${file.name}`,
            name: file.name,
            bytes: file.size,
            file,
          })
        }
        if (accepted.length > 0) setImages((previous) => [...previous, ...accepted].slice(0, MAX_ATTACHMENTS))
      }, [])

      const submit = useCallback(async () => {
        const text = draft.trim()
        if ((text.length === 0 && images.length === 0) || busy || disabled || !session) return
        setBusy(true)
        setError(null)
        const content = []
        if (text.length > 0) content.push({ type: 'text', text })
        try {
          for (const attachment of images) {
            if (attachment.kind === 'image') {
              content.push({
                type: 'image',
                mediaType: attachment.mediaType,
                data: attachment.data,
                name: attachment.name,
              })
              continue
            }
            // Files are staged first: the prompt carries the receipt, not bytes.
            const uploaded = await fileUploadRef.upload(sessionId, attachment.file, attachment.name)
            if (uploaded === null || uploaded === undefined || uploaded.ok !== true) {
              setError(
                t('error.upload', {
                  name: attachment.name,
                  message: uploaded?.error?.message ?? 'unknown',
                }),
              )
              setBusy(false)
              return
            }
            content.push({ type: 'file', receiptId: uploaded.value.receiptId })
          }
        } catch (cause) {
          setError(t('error.upload', { message: cause?.message ?? String(cause) }))
          setBusy(false)
          return
        }
        try {
          const result = await session.prompt(content, 'queue')
          if (result && result.ok === false) {
            setError(t('error.send', { message: result.error?.message ?? 'unknown' }))
          } else {
            setDraft('')
            setImages([])
            setMention(null)
          }
        } catch (cause) {
          setError(t('error.send', { message: cause?.message ?? String(cause) }))
        } finally {
          setBusy(false)
        }
      }, [draft, images, busy, disabled, session, sessionId])

      // A fragment of one character is enough to ask the Host; an empty one
      // would scan the whole tree on every `@`, so the local paths answer that.
      const [remotePaths, setRemotePaths] = useState([])
      const [remoteDirs, setRemoteDirs] = useState([])
      useEffect(() => {
        if (mention === null || mention.query.length === 0) {
          setRemotePaths([])
          setRemoteDirs([])
          return undefined
        }
        const controller = new AbortController()
        setRemoteLoading(true)
        const timer = window.setTimeout(async () => {
          try {
            const url = new URL('sidebar-chat/files', document.baseURI)
            url.searchParams.set('q', mention.query)
            if (typeof sessionId === 'string' && sessionId.length > 0) url.searchParams.set('session', sessionId)
            const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' })
            if (!response.ok) return
            const payload = await response.json()
            if (payload !== null && payload.ok === true) {
              if (Array.isArray(payload.files)) setRemotePaths(payload.files)
              if (Array.isArray(payload.dirs)) setRemoteDirs(payload.dirs)
            }
          } catch {
          } finally {
            setRemoteLoading(false)
          }
        }, 180)
        return () => {
          controller.abort()
          window.clearTimeout(timer)
          setRemoteLoading(false)
        }
      }, [mention === null ? '' : mention.query, sessionId])

      const mentionItems = useMemo(() => {
        const query = mention === null ? '' : mention.query.toLowerCase()
        const merged = []
        const seen = new Set()
        const push = (candidate) => {
          if (typeof candidate !== 'string' || candidate.length === 0 || seen.has(candidate)) return
          if (query.length > 0 && !candidate.toLowerCase().includes(query)) return
          seen.add(candidate)
          merged.push(candidate)
        }
        for (const candidate of remoteDirs) push(candidate)
        for (const candidate of paths) push(candidate)
        for (const candidate of remotePaths) push(candidate)
        return merged.slice(0, 8)
      }, [mention === null ? '' : mention.query, paths, remotePaths, remoteDirs])

      const mentionIndex = mention === null ? 0 : Math.min(mention.index ?? 0, Math.max(0, mentionItems.length - 1))

      const applyMention = (path) => {
        if (mention === null || typeof path !== 'string') return
        if (path.endsWith('/')) {
          const entered = `${draft.slice(0, mention.start)}@${path}${draft.slice(mention.end)}`
          const caret = mention.start + 1 + path.length
          setDraft(entered)
          setMention({ start: mention.start, end: caret, query: path, index: 0 })
          window.requestAnimationFrame(() => {
            const element = areaRef.current
            if (element === null) return
            element.focus()
            element.setSelectionRange(caret, caret)
          })
          return
        }
        const next = `${draft.slice(0, mention.start)}@${path} ${draft.slice(mention.end)}`
        setDraft(next)
        setMention(null)
        try {
          areaRef.current?.focus?.()
        } catch {}
      }

      const onChange = (event) => {
        const value = event.target.value
        setDraft(value)
        const caret = event.target.selectionStart ?? value.length
        const before = value.slice(0, caret)
        const match = before.match(/(?:^|\s)@([^\s@]*)$/)
        if (match === null) {
          setMention(null)
          return
        }
        setMention({ start: caret - match[1].length - 1, end: caret, query: match[1], index: 0 })
      }

      const onKeyDown = (event) => {
        if (event.key === 'Escape' && (mention !== null || modelOpen)) {
          event.preventDefault()
          closeMenus()
          return
        }
        if (mention !== null && mentionItems.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setMention((previous) =>
              previous === null ? previous : { ...previous, index: (previous.index + 1) % previous.items.length },
            )
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setMention((previous) =>
              previous === null
                ? previous
                : { ...previous, index: (previous.index - 1 + previous.items.length) % previous.items.length },
            )
            return
          }
          if (event.key === 'Enter' && !event.shiftKey && event.nativeEvent?.isComposing !== true) {
            event.preventDefault()
            applyMention(mentionItems[mentionIndex] ?? mentionItems[0])
            return
          }
        }
        if (event.key !== 'Enter' || event.shiftKey) return
        if (event.nativeEvent?.isComposing === true) return
        event.preventDefault()
        submit()
      }

      const canSend = (draft.trim().length > 0 || images.length > 0) && !disabled && !busy && session

      return h(
        'div',
        { className: 'dsc-foot', ref: wrapRef },
        error ? h('div', { className: 'dsc-error' }, error) : null,
        h(
          'div',
          {
            className: `dsc-composer${dropActive ? ' is-drop' : ''}`,
            onDragOver: (event) => {
              if (!event.dataTransfer?.types?.includes('Files')) return
              event.preventDefault()
              setDropActive(true)
            },
            onDragLeave: () => setDropActive(false),
            onDrop: (event) => {
              const files = Array.from(event.dataTransfer?.files ?? [])
              if (files.length === 0) return
              event.preventDefault()
              setDropActive(false)
              onPickFiles({ target: { files, value: '' } }).catch(() => {})
            },
          },
          images.length > 0
            ? h(
                'div',
                { className: 'dsc-attach-row' },
                images.map((attachment) =>
                  attachment.kind === 'file'
                    ? h(
                        'div',
                        { className: 'dsc-attach dsc-attach-file', key: attachment.id, title: attachment.name },
                        h('span', { className: 'dsc-attach-glyph', 'aria-hidden': true }, fileGlyph(attachment.name)),
                        h(
                          'span',
                          { className: 'dsc-attach-name' },
                          attachment.name,
                          h(
                            'span',
                            { className: 'dsc-attach-size' },
                            attachment.bytes >= 1024 * 1024
                              ? `${(attachment.bytes / 1024 / 1024).toFixed(1)} MB`
                              : `${Math.max(1, Math.round(attachment.bytes / 1024))} KB`,
                          ),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsc-attach-x',
                            'aria-label': t('rail.removeImage'),
                            onClick: () => setImages((previous) => previous.filter((item) => item.id !== attachment.id)),
                          },
                          ICONS.close,
                        ),
                      )
                    : h(
                        'div',
                        { className: 'dsc-attach', key: attachment.id, title: attachment.name },
                        h('img', { src: attachment.previewUrl, alt: attachment.name, className: 'dsc-attach-img' }),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsc-attach-x',
                            'aria-label': t('rail.removeImage'),
                            onClick: () => setImages((previous) => previous.filter((item) => item.id !== attachment.id)),
                          },
                          ICONS.close,
                        ),
                      ),
                ),
              )
            : null,
          mention !== null
            ? h(
                'div',
                { className: 'dsc-mention' },
                mentionItems.length === 0
                  ? h('div', { className: 'dsc-mention-empty' }, remoteLoading ? t('rail.searching') : t('rail.noFileMatch'))
                  : null,
                mentionItems.map((path, index) => {
                  const isDir = path.endsWith('/')
                  const base = isDir ? path : path.split('/').pop() ?? path
                  const dir = path.slice(0, path.length - base.length)
                  return h(
                    'button',
                    {
                      type: 'button',
                      key: path,
                      className: `dsc-mention-item${index === mentionIndex ? ' is-active' : ''}`,
                      onMouseEnter: () =>
                        setMention((previous) => (previous === null ? previous : { ...previous, index })),
                      onClick: () => applyMention(path),
                    },
                    h('span', { className: 'dsc-mention-icon', 'aria-hidden': true }, isDir ? ICONS.folder : fileGlyph(base)),
                    h(
                      'span',
                      { className: 'dsc-mention-path' },
                      dir.length > 0 ? h('span', { className: 'dsc-mention-dir' }, dir) : null,
                      h('span', { className: 'dsc-mention-base' }, base),
                    ),
                  )
                }),
              )
            : null,
          h('textarea', {
            ref: areaRef,
            className: 'dsc-input',
            value: draft,
            placeholder: disabled ? t('hint.readonly') : t('rail.placeholder'),
            disabled,
            rows: 2,
            onChange,
            onKeyDown,
            onPaste: (event) => {
              const files = Array.from(event.clipboardData?.files ?? [])
              if (files.length === 0) return
              event.preventDefault()
              onPickFiles({ target: { files, value: '' } }).catch(() => {})
            },
          }),
          h(
            'div',
            { className: 'dsc-foot-row' },
            h(
              'div',
              { className: 'dsc-tools-left' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsc-icon-btn',
                  title: t('rail.attach'),
                  'aria-label': t('rail.attach'),
                  onClick: () => fileRef.current?.click?.(),
                  disabled,
                },
                ICONS.plus,
              ),
              h('input', {
                ref: fileRef,
                type: 'file',
                accept: undefined,
                multiple: true,
                style: { display: 'none' },
                onChange: onPickFiles,
              }),
              directory !== null && currentModel !== null
                ? h(
                    'button',
                    {
                      ref: modelBtnRef,
                      type: 'button',
                      className: 'dsc-model',
                      title: t('rail.model'),
                      onClick: () => setModelOpen((open) => !open),
                      disabled: modelBusy || disabled,
                    },
                    currentEffort.length > 0 ? `${currentModel.model} · ${currentEffort}` : currentModel.model,
                  )
                : null,
              busy ? h('span', { className: 'dsc-hint' }, t('rail.sending')) : null,
            ),
            h(
              'div',
              { className: 'dsc-actions' },
              running
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsc-ghost',
                      onClick: () => {
                        try {
                          Promise.resolve(session.cancel()).catch((cause) => setError(t('error.send', { message: cause?.message ?? String(cause) })))
                        } catch (cause) {
                          setError(t('error.send', { message: cause?.message ?? String(cause) }))
                        }
                      },
                    },
                    ICONS.stop,
                    t('rail.stop'),
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsc-send',
                  'aria-label': t('rail.send'),
                  title: t('rail.send'),
                  disabled: !canSend,
                  onClick: submit,
                },
                ICONS.send,
              ),
            ),
          ),
        ),
        modelOpen && modelRows.length > 0
          ? h(
              'div',
              {
                ref: menuRef,
                className: 'dsc-menu',
                style:
                  menuBox === null
                    ? undefined
                    : { left: `${menuBox.left}px`, bottom: `${menuBox.bottom}px`, width: `${menuBox.width}px`, maxHeight: `${menuBox.maxHeight}px` },
              },
              h('input', {
                className: 'dsc-menu-search',
                value: modelQuery,
                placeholder: t('rail.searchModel'),
                onChange: (event) => setModelQuery(event.target.value),
                onPointerDown: (event) => event.stopPropagation(),
              }),
              filteredGroups.length === 0
                ? h('div', { className: 'dsc-menu-empty' }, t('rail.noModelMatch'))
                : null,
              pinnedRows.length > 0 && modelQuery.trim().length === 0
                ? h(
                    Fragment,
                    null,
                    h('div', { className: 'dsc-menu-group' }, t('rail.pinned')),
                    pinnedRows.map((row) => modelRow(row, true)),
                )
                : null,
              recentRows.length > 0 && modelQuery.trim().length === 0
                ? h(
                    Fragment,
                    null,
                    h('div', { className: 'dsc-menu-group' }, t('rail.recent')),
                    recentRows.map((row) => modelRow(row, false)),
                  )
                : null,
              filteredGroups.map((group) =>
                h(
                  Fragment,
                  { key: group.provider },
                  h('div', { className: 'dsc-menu-group' }, group.provider),
                  group.rows.map((row) => modelRow(row, false)),
                ),
              ),
              currentEfforts.length > 0 || currentEffort.length > 0
                ? h(
                    'div',
                    { className: 'dsc-menu-effort' },
                    h('span', { className: 'dsc-menu-effort-label' }, t('rail.effort')),
                    currentEfforts.length === 0 && currentEffort.length > 0
                      ? h('span', { className: 'dsc-effort is-active is-static' }, currentEffort)
                      : null,
                    currentEfforts.map((level) =>
                      h(
                        'button',
                        {
                          type: 'button',
                          key: level.id,
                          className: `dsc-effort${level.id === currentEffort ? ' is-active' : ''}`,
                          disabled: modelBusy,
                          title: level.id,
                          onClick: () => pickEffort(level.id),
                        },
                        level.name,
                      ),
                    ),
                  )
                : null,
            )
          : null,
      )
    }

    const Conversation = ({ sessionId }) => {
      const reference = references.get(sessionId)
      const [ready, setReady] = useState(false)
      const [loadError, setLoadError] = useState(null)
      const [loadingOlder, setLoadingOlder] = useState(false)
      const [atBottom, setAtBottom] = useState(true)
      const bodyRef = useRef(null)
      const stickToBottom = useRef(true)

      useEffect(() => {
        let alive = true
        if (!reference) return undefined
        reference.ready.then(
          () => {
            if (alive) setReady(true)
          },
          (cause) => {
            if (alive) setLoadError(t('error.load', { message: cause?.message ?? String(cause) }))
          },
        )
        return () => {
          alive = false
        }
      }, [reference])

      const eventWindow = useEventWindow(reference)
      const session = reference?.binding?.session
      const snapshot = useSnapshot(session)

      // A Session opens with a tail window. The rail is meant to show the whole
      // conversation, so it walks the older pages once, bounded, instead of
      // stopping at whatever the first open happened to include.
      const autoLoaded = useRef(false)
      useEffect(() => {
        if (!ready || !session || autoLoaded.current) return undefined
        autoLoaded.current = true
        let cancelled = false
        const pump = async () => {
          for (let page = 0; page < 40; page += 1) {
            if (cancelled) return
            const source = reference?.binding?.eventSource
            const current = source?.getSnapshot?.()
            if (!current || current.hasMore !== true) return
            try {
              await session.loadOlder()
            } catch {
              return
            }
          }
        }
        pump()
        return () => {
          cancelled = true
        }
      }, [ready, session, reference])
      const messages = useMemo(() => collectMessages(eventWindow), [eventWindow])
      const visible = useMemo(
        () => (messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages),
        [messages],
      )
      const paths = useMemo(() => collectPaths(messages), [messages])
      // A question tool whose result never arrived is a turn parked on the user.
      // Only the latest assistant block can be in that state.
      const waiting = useMemo(() => {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const message = messages[index]
          if (message.kind !== 'assistant') continue
          const tools = message.tools ?? []
          const last = tools[tools.length - 1]
          return last !== undefined && last.name === 'ask_user_question' && last.result === undefined
        }
        return false
      }, [messages])
      const running = snapshot?.running === true
      const openState = snapshot?.openState

      useEffect(() => {
        const element = bodyRef.current
        if (!element) return
        if (!stickToBottom.current) return
        element.scrollTop = element.scrollHeight
      }, [messages.length, running, ready])

      const onScroll = () => {
        const element = bodyRef.current
        if (!element) return
        const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < 40
        stickToBottom.current = bottom
        setAtBottom(bottom)
      }

      const jumpToBottom = () => {
        const element = bodyRef.current
        if (!element) return
        stickToBottom.current = true
        element.scrollTop = element.scrollHeight
        setAtBottom(true)
      }

      const loadOlder = async () => {
        if (!session || loadingOlder) return
        setLoadingOlder(true)
        const element = bodyRef.current
        const previousHeight = element?.scrollHeight ?? 0
        try {
          await session.loadOlder()
          if (element) element.scrollTop = element.scrollHeight - previousHeight
          stickToBottom.current = false
        } catch (cause) {
          setLoadError(t('error.load', { message: cause?.message ?? String(cause) }))
        } finally {
          setLoadingOlder(false)
        }
      }

      if (!reference) return h('div', { className: 'dsc-note' }, t('rail.loading'))

      return h(
        Fragment,
        null,
        h(
          'div',
          { className: 'dsc-body-wrap' },
          h(
          'div',
          { className: 'dsc-body', ref: bodyRef, onScroll },
          h(
            'div',
            { className: 'dsc-thread' },
          eventWindow?.hasMore
            ? h(
                'div',
                { style: { display: 'flex', justifyContent: 'center', marginBottom: '10px' } },
                h(
                  'button',
                  { type: 'button', className: 'dsc-ghost', disabled: loadingOlder, onClick: loadOlder },
                  loadingOlder ? t('rail.loadingOlder') : t('rail.loadOlder'),
                ),
              )
            : null,
          loadError ? h('div', { className: 'dsc-error' }, loadError) : null,
          !ready && messages.length === 0 ? h('div', { className: 'dsc-note' }, t('rail.loading')) : null,
          ready && messages.length === 0 ? h('div', { className: 'dsc-note' }, t('rail.noMessages')) : null,
          messages.length > MAX_MESSAGES
            ? h('div', { className: 'dsc-note' }, t('rail.truncated', { count: MAX_MESSAGES }))
            : null,
          visible.map((message, index) => {
            // One avatar per run of turns by the same speaker: the column stays
            // reserved so the text does not shift left on continuation rows.
            const showAvatar = index === 0 || visible[index - 1].kind !== message.kind
            return message.kind === 'user'
              ? h(UserBlock, { key: message.id, message, session, showAvatar })
              : h(AssistantBlock, { key: message.id, message, running, showAvatar })
          }),
          ),
          ),
          atBottom
            ? null
            : h(
                'button',
                { type: 'button', className: 'dsc-jump', title: t('rail.jumpBottom'), onClick: jumpToBottom },
                ICONS.chevronDown,
              ),
        ),
        waiting
          ? h(
              'div',
              { className: 'dsc-waiting' },
              h('span', null, t('rail.waiting')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsc-action',
                  onClick: () => {
                    try {
                      uiWorkspaceRef?.openSession?.(sessionId)
                    } catch (cause) {
                      report('openSession', cause)
                    }
                  },
                },
                t('rail.toMain'),
              ),
            )
          : null,
        h(Composer, {
          session: session,
          sessionId,
          running,
          disabled: !session || openState === 'error' || openState === 'loading',
          paths,
        }),
      )
    }

    const Dock = () => {
      const current = useStore()
      const currentNotice = useNotice()
      const [dragging, setDragging] = useState(null)
      const panelRef = useRef(null)
      const ballRef = useRef(null)
      const movedRef = useRef(false)
      const activeTab = current.tabs.find((tab) => tab.sessionId === current.active) ?? current.tabs[0] ?? null
      const activeSession = activeTab === null ? null : references.get(activeTab.sessionId)?.binding?.session ?? null
      const activeSnapshot = useSnapshot(activeSession)
      const activeRunning = activeSnapshot?.running === true
      const tabIds = current.tabs.map((tab) => tab.sessionId).join('|')
      const unread = useUnread(current.active, current.mode === 'panel', tabIds)
      const [switchOpen, setSwitchOpen] = useState(false)
      const [switchQuery, setSwitchQuery] = useState('')
      const switchRows = useSessionChoices(switchOpen, switchQuery)
      const switchRef = useRef(null)
      const unreadTotal = Object.values(unread).reduce((sum, value) => sum + value, 0)

      const clampX = (value, max) => Math.min(Math.max(value, 8), Math.max(8, max))
      const defaultBall = () => ({
        x: window.innerWidth - BALL_SIZE - 24,
        y: window.innerHeight - BALL_SIZE - 24,
      })
      const defaultPanel = (anchor) => {
        const width = Math.min(PANEL_WIDTH, window.innerWidth - 32)
        const height = Math.min(PANEL_HEIGHT, window.innerHeight - 32)
        return {
          x: clampX(anchor.x + BALL_SIZE - width, window.innerWidth - width - 8),
          y: Math.max(12, anchor.y + BALL_SIZE - height),
          w: width,
          h: height,
        }
      }

      const ball = current.ball ?? defaultBall()
      const panel = current.panel ?? defaultPanel(ball)

      // A shrunken window must not strand the dock off-screen.
      useEffect(() => {
        const onResize = () => {
          setState((previous) => {
            const nextBall = previous.ball
              ? {
                  x: clampX(previous.ball.x, window.innerWidth - BALL_SIZE - 8),
                  y: clampX(previous.ball.y, window.innerHeight - BALL_SIZE - 8),
                }
              : previous.ball
            const nextPanel = previous.panel
              ? {
                  ...previous.panel,
                  x: clampX(previous.panel.x, window.innerWidth - previous.panel.w - 8),
                  y: clampX(previous.panel.y, window.innerHeight - previous.panel.h - 8),
                }
              : previous.panel
            return { ...previous, ball: nextBall, panel: nextPanel }
          })
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [])

      const persist = () => {
        try {
          window.localStorage.setItem(
            DOCK_KEY,
            JSON.stringify({ mode: state.mode, ball: state.ball, panel: state.panel }),
          )
        } catch {}
      }

      /**
       * Drag state lives in a ref and the listeners live on the window: the
       * handlers read the ref on every move instead of closing over a render,
       * so a re-render mid-drag cannot strand them. Pointer capture was tried
       * first and failed on the panel because the press lands on a child of the
       * element that owns the capture.
       */
      const dragRef = useRef(null)

      useEffect(() => {
        const move = (event) => {
          const drag = dragRef.current
          if (drag === null) return
          const dx = event.clientX - drag.startX
          const dy = event.clientY - drag.startY
          if (!drag.moved) {
            if (Math.abs(dx) + Math.abs(dy) <= 3) return
            drag.moved = true
            movedRef.current = true
          }
          const x = clampX(drag.rect.left + dx, window.innerWidth - drag.width - 8)
          const y = clampX(drag.rect.top + dy, window.innerHeight - drag.height - 8)
          setState((previous) =>
            drag.kind === 'ball'
              ? { ...previous, ball: { x, y } }
              : { ...previous, panel: { ...(previous.panel ?? drag.panel), x, y } },
          )
        }
        const end = () => {
          if (dragRef.current === null) return
          dragRef.current = null
          setDragging(null)
          persist()
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', end)
        window.addEventListener('pointercancel', end)
        return () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', end)
          window.removeEventListener('pointercancel', end)
        }
      }, [])

      useEffect(() => {
        if (!switchOpen) {
          setSwitchQuery('')
          return undefined
        }
        const onDown = (event) => {
          const node = event.target instanceof Node ? event.target : null
          if (node !== null && switchRef.current !== null && switchRef.current.contains(node)) return
          setSwitchOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setSwitchOpen(false)
        }
        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('keydown', onKey, true)
        return () => {
          document.removeEventListener('pointerdown', onDown, true)
          document.removeEventListener('keydown', onKey, true)
        }
      }, [switchOpen])

      const beginDrag = (event, kind) => {
        if (event.button !== 0) return
        const element = kind === 'ball' ? ballRef.current : panelRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        movedRef.current = false
        dragRef.current = {
          kind,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          rect,
          width: kind === 'ball' ? BALL_SIZE : rect.width,
          height: kind === 'ball' ? BALL_SIZE : rect.height,
          panel: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        }
        setDragging(kind)
      }

      const beginResize = (event) => {
        if (event.button !== 0) return
        const element = panelRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        dragRef.current = {
          kind: 'resize',
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          rect,
          panel: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        }
        const move = (moveEvent) => {
          const drag = dragRef.current
          if (drag === null) return
          const w = Math.max(PANEL_MIN_WIDTH, Math.min(window.innerWidth - drag.rect.left - 8, drag.rect.width + (moveEvent.clientX - drag.startX)))
          const h = Math.max(PANEL_MIN_HEIGHT, Math.min(window.innerHeight - drag.rect.top - 8, drag.rect.height + (moveEvent.clientY - drag.startY)))
          setState((previous) => ({ ...previous, panel: { ...(previous.panel ?? drag.panel), w, h } }))
        }
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
          dragRef.current = null
          persist()
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
      }

      if (current.mode === 'hidden') return null

      const shell = current.mode === 'ball'
          ? h(
              'button',
              {
                ref: ballRef,
                type: 'button',
                className: `dsc-ball${activeRunning ? ' is-running' : ''}`,
                style: { left: `${ball.x}px`, top: `${ball.y}px` },
                title: t('dock.open'),
                'aria-label': t('dock.open'),
                onPointerDown: (event) => beginDrag(event, 'ball'),
                onClick: () => {
                  if (movedRef.current) {
                    movedRef.current = false
                    return
                  }
                  setState({ mode: 'panel' })
                  persist()
                },
                onContextMenu: (event) => {
                  event.preventDefault()
                  setState({ mode: 'hidden' })
                  persist()
                },
              },
              ICONS.chat,
              activeRunning ? h('span', { className: 'dsc-ball-ring', 'aria-hidden': true }) : null,
              unreadTotal > 0
                ? h('span', { className: 'dsc-ball-badge' }, unreadTotal > 99 ? '99+' : String(unreadTotal))
                : null,
            )
          : h(
              'div',
              {
                ref: panelRef,
                className: `dsc-panel${dragging === 'panel' ? ' is-dragging' : ''}`,
                style: { left: `${panel.x}px`, top: `${panel.y}px`, width: `${panel.w}px`, height: `${panel.h}px` },
              },
              h(
                'div',
                { className: 'dsc-head', onPointerDown: (event) => beginDrag(event, 'panel') },
                h(
                  'div',
                  { className: 'dsc-head-title' },
                  h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-secondary)' } }, ICONS.chat),
                  h(
                    'div',
                    { style: { minWidth: 0 } },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsc-head-name dsc-head-switch',
                        title: t('dock.switch'),
                        onPointerDown: (event) => event.stopPropagation(),
                        onClick: () => setSwitchOpen((open) => !open),
                      },
                      h('span', { className: 'dsc-head-switch-label' }, activeTab ? shortTitle(activeTab) : t('rail.title')),
                      h('span', { className: 'dsc-head-switch-caret', 'aria-hidden': true }, ICONS.chevronDown),
                    ),
                    h('div', { className: 'dsc-head-sub' }, activeTab ? shortId(activeTab.sessionId) : t('dock.hint')),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsc-btn',
                    title: t('rail.toMain'),
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: () => {
                      if (!activeTab) return
                      try {
                        uiWorkspaceRef?.openSession?.(activeTab.sessionId)
                      } catch (cause) {
                        report('openSession', cause)
                      }
                    },
                  },
                  ICONS.external,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsc-btn',
                    title: t('dock.collapse'),
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: () => {
                      setState({ mode: 'ball' })
                      persist()
                    },
                  },
                  ICONS.chevronDown,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsc-btn',
                    title: t('rail.close'),
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: () => {
                      closeRail()
                      setState({ mode: 'ball' })
                      persist()
                    },
                  },
                  ICONS.close,
                ),
              ),
              activeRunning ? h('div', { className: 'dsc-running', 'aria-hidden': true }) : null,
              switchOpen
                ? h(
                    'div',
                    { ref: switchRef, className: 'dsc-switch' },
                    h('input', {
                      className: 'dsc-switch-search',
                      value: switchQuery,
                      placeholder: t('dock.switchSearch'),
                      onChange: (event) => setSwitchQuery(event.target.value),
                      autoFocus: true,
                    }),
                    switchRows.length === 0
                      ? h('div', { className: 'dsc-switch-empty' }, t('dock.switchEmpty'))
                      : null,
                    switchRows.map((row) =>
                      h(
                        'button',
                        {
                          type: 'button',
                          key: row.sessionId,
                          className: `dsc-switch-item${row.sessionId === current.active ? ' is-active' : ''}`,
                          onClick: () => {
                            openSession(row.sessionId, row.title)
                            setSwitchOpen(false)
                          },
                        },
                        h('span', { className: 'dsc-switch-name' }, row.title.length > 0 ? row.title : shortId(row.sessionId)),
                        h('span', { className: 'dsc-switch-id' }, shortId(row.sessionId)),
                      ),
                    ),
                  )
                : null,
              current.tabs.length > 1
                ? h(
                    'div',
                    { className: 'dsc-tabs' },
                    current.tabs.map((tab) =>
                      h(
                        'div',
                        {
                          key: tab.sessionId,
                          className: `dsc-tab${tab.sessionId === current.active ? ' is-active' : ''}`,
                          onClick: () => setState({ active: tab.sessionId }),
                          role: 'button',
                          tabIndex: 0,
                        },
                        h('span', { className: 'dsc-tab-label' }, shortTitle(tab)),
                        unread[tab.sessionId] !== undefined
                          ? h('span', { className: 'dsc-tab-dot', 'aria-label': t('rail.unread') })
                          : null,
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsc-tab-close',
                            title: t('rail.closeTab'),
                            onClick: (event) => {
                              event.stopPropagation()
                              closeTab(tab.sessionId)
                            },
                          },
                          ICONS.close,
                        ),
                      ),
                    ),
                  )
                : null,
              current.openError
                ? h('div', { className: 'dsc-error', style: { margin: '12px 14px' } }, current.openError)
                : activeTab
                  ? h(Conversation, { key: activeTab.sessionId, sessionId: activeTab.sessionId })
                  : h(
                      'div',
                      { className: 'dsc-empty' },
                      h('div', { className: 'dsc-empty-title' }, t('dock.emptyTitle')),
                      h('div', { className: 'dsc-empty-hint' }, t('dock.emptyHint')),
                    ),
              h('div', { className: 'dsc-resize', onPointerDown: beginResize, 'aria-hidden': true }),
            )

      return h(
        'div',
        { className: 'dsc-layer', 'data-plugin': 'dsh-sidebar-chat' },
        h('style', null, CSS),
        shell,
        currentNotice === null ? null : h('div', { className: 'dsc-notice' }, currentNotice.text),
      )
    }

    // ── plugin ──────────────────────────────────────────────────────────────
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'sidebar-chat: dictionaries')

      // Optional surfaces: a leaner composition simply leaves the control inert.
      ctx.inject(['uiWorkspace'], (extra) => {
        uiWorkspaceRef = extra.uiWorkspace
      })

      // The shipped per-session model directory. Its methods run bound to the
      // calling context, so the services its resolver reaches for are injected
      // alongside it; without them the model seat simply stays hidden.
      ctx.inject(['modelDirectories', 'sessions', 'remote', 'remote.session'], (extra) => {
        modelDirsRef = extra.modelDirectories
      })

      // Prompt files need a staged receipt; without this service only images
      // can be attached, which is exactly what the rail did before.
      ctx.inject(['fileUpload'], (extra) => {
        fileUploadRef = extra.fileUpload
      })

      ctx.effect(
        () => () => {
          for (const reference of references.values()) {
            try {
              reference.release()
            } catch {}
          }
          references.clear()
        },
        'sidebar-chat: release retained references',
      )

      ctx.inject(['slots', 'locale', 'sessions'], (scope) => {
        scopeRef = scope

        scope.slots.inject('sidebar.workspaces.session.menu.item', () =>
          scope.slots.register(
            {
              name: 'sidebar.workspaces.session.menu.item',
              id: 'sidebar-chat.open',
              order: 460,
              locale: NS,
            },
            MenuRow,
          ),
        )

        scope.slots.inject('shell.overlay', () =>
          scope.slots.register(
            {
              name: 'shell.overlay',
              id: 'sidebar-chat.panel',
              order: 1600,
              locale: NS,
            },
            Dock,
          ),
        )
      })
    }

    return { inject: ['slots', 'locale', 'sessions'], apply, name: 'sidebar-chat' }
  },
})
