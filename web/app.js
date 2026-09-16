// dsh-player Web Client Application

// --- i18n Dictionaries ---
const I18N = {
  zh: {
    open: '打开日志',
    export: '导出分享',
    search_placeholder: '搜索内容、参数或结果 (按 / 聚焦)...',
    filter_all: '全部',
    filter_tool: '工具调用',
    filter_error: '错误',
    filter_reasoning: '推理',
    filter_user: '用户输入',
    all_tools: '所有工具',
    session_tree: '会话轮次 (Turns)',
    timeline: '执行时间线 (Timeline)',
    tab_formatted: '格式化视图',
    tab_raw: '原始 JSON',
    no_session: '暂未加载会话日志',
    drag_hint: '请拖入 session.jsonl / .zstd 文件或点击上方打开',
    select_event_hint: '在时间线中点击事件查看详情',
    export_modal_title: '导出独立离线 HTML 回放文件',
    export_desc: '导出的单文件 HTML 内嵌了完整交互式回放器和会话数据，接收方用任何浏览器均可直接双击打开离线浏览。',
    privacy_options: '隐私脱敏选项',
    mask_keys: '脱敏 API 密钥 (OpenAI, DeepSeek, Bearer, Token 等)',
    mask_env: '脱敏环境变量与敏感配置 (PASSWORD, SECRET, KEY 等)',
    mask_paths: '脱敏用户家目录路径 (替换系统用户名路径为 ~)',
    custom_regex: '自定义脱敏正则 (可选)',
    preview_diff: '脱敏效果实时预览',
    preview_before: '原始数据片段:',
    preview_after: '脱敏后数据片段:',
    cancel: '取消',
    download_html: '📥 下载离线 HTML',
    copied: '已复制!',
    copy: '复制',
    jump_to_call: '跳转到调用 #',
    unknown_tool: '未知工具',
    duration: '耗时',
    tokens: 'Tokens',
    model: '模型',
    exit_code: '退出码',
    stack_trace: '错误堆栈',
    reasoning_block: '思考与推理链 (Thinking)',
    tool_parameters: '工具入参 (Arguments)',
    tool_output: '工具输出 (Result)',
    user_prompt: '用户指令',
    assistant_reply: '助手响应',
    expand_reasoning: '▼ 展开思维链',
    collapse_reasoning: '▲ 折叠思维链'
  },
  en: {
    open: 'Open Log',
    export: 'Export & Share',
    search_placeholder: 'Search content, args or result (press /)...',
    filter_all: 'All',
    filter_tool: 'Tools',
    filter_error: 'Errors',
    filter_reasoning: 'Reasoning',
    filter_user: 'User Prompts',
    all_tools: 'All Tools',
    session_tree: 'Session Turns',
    timeline: 'Timeline Stream',
    tab_formatted: 'Formatted',
    tab_raw: 'Raw JSON',
    no_session: 'No session loaded',
    drag_hint: 'Drag & drop session.jsonl / .zstd file here or click Open',
    select_event_hint: 'Click an event in the timeline to view details',
    export_modal_title: 'Export Standalone Replay HTML',
    export_desc: 'The exported single-file HTML embeds the complete viewer and session data. Anyone can open it offline in any browser.',
    privacy_options: 'Privacy & Desensitization',
    mask_keys: 'Mask API keys (OpenAI, DeepSeek, Bearer, tokens, etc.)',
    mask_env: 'Mask environment variables & secrets (PASSWORD, SECRET, etc.)',
    mask_paths: 'Mask user home paths (replace with ~)',
    custom_regex: 'Custom Mask Regex (Optional)',
    preview_diff: 'Desensitization Preview',
    preview_before: 'Original Data:',
    preview_after: 'Masked Data:',
    cancel: 'Cancel',
    download_html: '📥 Download HTML',
    copied: 'Copied!',
    copy: 'Copy',
    jump_to_call: 'Jump to Call #',
    unknown_tool: 'Unknown Tool',
    duration: 'Duration',
    tokens: 'Tokens',
    model: 'Model',
    exit_code: 'Exit Code',
    stack_trace: 'Stack Trace',
    reasoning_block: 'Reasoning & Thinking Chain',
    tool_parameters: 'Tool Parameters',
    tool_output: 'Tool Output',
    user_prompt: 'User Prompt',
    assistant_reply: 'Assistant Reply',
    expand_reasoning: '▼ Expand Thinking',
    collapse_reasoning: '▲ Collapse Thinking'
  }
}

// --- Application State ---
const state = {
  lang: 'zh',
  theme: 'dark',
  session: null,
  activeEvents: [],
  currentFrame: 0,
  isPlaying: false,
  speed: 1,
  playTimer: null,
  selectedSeq: null,
  activeTab: 'formatted',
  filterType: 'all',
  toolFilter: '',
  searchQuery: '',
  isRegex: false,
  expandedReasonings: new Set()
}

// --- Masker (Client-side implementation) ---
function maskStringClient(text, opts) {
  if (!text || typeof text !== 'string') return text
  let s = text
  if (opts.maskApiKeys) {
    s = s.replace(/sk-[A-Za-z0-9_-]{16,}/g, 'sk-***[MASKED_KEY]')
    s = s.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza***[MASKED_KEY]')
    s = s.replace(/Bearer\s+[A-Za-z0-9._~+/-]{20,}/gi, 'Bearer [MASKED_TOKEN]')
    s = s.replace(/ghp_[A-Za-z0-9]{36}/g, 'ghp_***[MASKED_TOKEN]')
    s = s.replace(/glpat-[A-Za-z0-9-]{20,}/g, 'glpat-***[MASKED_TOKEN]')
    s = s.replace(/eyJh[A-Za-z0-9_-]{10,}\.eyJh[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT_MASKED]')
  }
  if (opts.maskEnvVars) {
    s = s.replace(/(?<=^|[\s,;])([A-Za-z0-9_]*(?:PASSWORD|SECRET|KEY|TOKEN|AUTH|CREDENTIAL)[A-Za-z0-9_]*\s*=\s*)([^\s;,]+)/gi, '$1********')
    s = s.replace(/(["'](?:password|secret|apiKey|api_key|token|auth_token|access_token|private_key)["']\s*:\s*["'])([^"']+)(["'])/gi, '$1********$3')
  }
  if (opts.maskPaths) {
    s = s.replace(/[A-Za-z]:\\[Uu]sers\\[^\\]+/g, '~')
    s = s.replace(/(?:\/Users|\/home)\/[^/\s"']+/g, '~')
  }
  if (opts.customRegex && opts.customRegex.trim()) {
    try {
      s = s.replace(new RegExp(opts.customRegex, 'g'), '[MASKED]')
    } catch (_) {}
  }
  return s
}

function maskObjectClient(data, opts) {
  if (data === null || data === undefined) return data
  if (typeof data === 'string') return maskStringClient(data, opts)
  if (Array.isArray(data)) return data.map(item => maskObjectClient(item, opts))
  if (typeof data === 'object') {
    const res = {}
    for (const [k, v] of Object.entries(data)) {
      res[k] = maskObjectClient(v, opts)
    }
    return res
  }
  return data
}

// --- DOM Elements ---
const dom = {
  metaSessionId: document.getElementById('meta-session-id'),
  metaCounts: document.getElementById('meta-counts'),
  metaDuration: document.getElementById('meta-duration'),
  metaTokens: document.getElementById('meta-tokens'),
  btnOpen: document.getElementById('btn-open'),
  fileInput: document.getElementById('file-input'),
  btnExportModal: document.getElementById('btn-export-modal'),
  btnLang: document.getElementById('btn-lang'),
  langLabel: document.getElementById('lang-label'),
  btnTheme: document.getElementById('btn-theme'),
  btnPrev: document.getElementById('btn-prev'),
  btnPlay: document.getElementById('btn-play'),
  btnNext: document.getElementById('btn-next'),
  speedSelect: document.getElementById('speed-select'),
  currentFrameLabel: document.getElementById('current-frame-label'),
  scrubber: document.getElementById('scrubber'),
  seqInput: document.getElementById('seq-input'),
  btnSeqGo: document.getElementById('btn-seq-go'),
  searchInput: document.getElementById('search-input'),
  btnRegex: document.getElementById('btn-regex'),
  filterPills: document.getElementById('filter-pills'),
  toolFilter: document.getElementById('tool-filter'),
  sessionTree: document.getElementById('session-tree'),
  timelineList: document.getElementById('timeline-list'),
  turnCountBadge: document.getElementById('turn-count-badge'),
  timelineCountBadge: document.getElementById('timeline-count-badge'),
  tabFormatted: document.getElementById('tab-formatted'),
  tabRaw: document.getElementById('tab-raw'),
  inspectorContent: document.getElementById('inspector-content'),
  exportModal: document.getElementById('export-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnConfirmExport: document.getElementById('btn-confirm-export'),
  maskApiKeys: document.getElementById('mask-api-keys'),
  maskEnvVars: document.getElementById('mask-env-vars'),
  maskPaths: document.getElementById('mask-paths'),
  maskCustomRegex: document.getElementById('mask-custom-regex'),
  diffBefore: document.getElementById('diff-before'),
  diffAfter: document.getElementById('diff-after'),
  dropOverlay: document.getElementById('drop-overlay')
}

// --- Helper Functions ---
function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || key
}

function updateI18nTexts() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    el.textContent = t(key)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')
    el.placeholder = t(key)
  })
  dom.langLabel.textContent = state.lang === 'zh' ? 'EN' : '中文'
}

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

function formatTokens(count) {
  if (!count) return '0'
  if (count > 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count > 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function syntaxHighlightJson(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2)
  }
  json = escapeHtml(json)
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
    let cls = 'color: #79c0ff;' // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'color: #7ee787; font-weight: bold;' // key
      } else {
        cls = 'color: #a5d6ff;' // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'color: #ff7b72;' // boolean
    } else if (/null/.test(match)) {
      cls = 'color: #d2a8ff;' // null
    }
    return `<span style="${cls}">${match}</span>`
  })
}

// --- App Initialization ---
function init() {
  bindEvents()
  updateI18nTexts()

  // Check if session data is preloaded (in standalone exported HTML)
  if (window.__DSH_SESSION__) {
    loadSession(window.__DSH_SESSION__)
  }
}

// --- Event Listeners ---
function bindEvents() {
  // Lang switch
  dom.btnLang.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh'
    updateI18nTexts()
    render()
  })

  // Theme switch
  dom.btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', state.theme)
    dom.btnTheme.textContent = state.theme === 'dark' ? '🌙' : '☀️'
  })

  // File open
  dom.btnOpen.addEventListener('click', () => dom.fileInput.click())
  dom.fileInput.addEventListener('change', handleFileSelect)

  // Drag & Drop
  window.addEventListener('dragover', e => {
    e.preventDefault()
    dom.dropOverlay.classList.add('active')
  })
  window.addEventListener('dragleave', e => {
    if (e.relatedTarget === null) dom.dropOverlay.classList.remove('active')
  })
  window.addEventListener('drop', e => {
    e.preventDefault()
    dom.dropOverlay.classList.remove('active')
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0])
    }
  })

  // Playback controls
  dom.btnPlay.addEventListener('click', togglePlay)
  dom.btnPrev.addEventListener('click', prevStep)
  dom.btnNext.addEventListener('click', nextStep)
  dom.speedSelect.addEventListener('change', e => {
    state.speed = Number(e.target.value) || 1
    if (state.isPlaying) {
      stopPlay()
      startPlay()
    }
  })
  dom.scrubber.addEventListener('input', e => {
    goToFrame(Number(e.target.value))
  })
  dom.btnSeqGo.addEventListener('click', () => {
    const seq = Number(dom.seqInput.value)
    if (!isNaN(seq)) jumpToSeq(seq)
  })
  dom.seqInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const seq = Number(dom.seqInput.value)
      if (!isNaN(seq)) jumpToSeq(seq)
    }
  })

  // Search and filter
  dom.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value
    applyFilters()
  })
  dom.btnRegex.addEventListener('click', () => {
    state.isRegex = !state.isRegex
    dom.btnRegex.classList.toggle('active', state.isRegex)
    applyFilters()
  })
  dom.filterPills.addEventListener('click', e => {
    const pill = e.target.closest('.pill')
    if (!pill) return
    dom.filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'))
    pill.classList.add('active')
    state.filterType = pill.getAttribute('data-filter')
    applyFilters()
  })
  dom.toolFilter.addEventListener('change', e => {
    state.toolFilter = e.target.value
    applyFilters()
  })

  // Inspector tabs
  dom.tabFormatted.addEventListener('click', () => {
    state.activeTab = 'formatted'
    dom.tabFormatted.classList.add('active')
    dom.tabRaw.classList.remove('active')
    renderInspector()
  })
  dom.tabRaw.addEventListener('click', () => {
    state.activeTab = 'raw'
    dom.tabRaw.classList.add('active')
    dom.tabFormatted.classList.remove('active')
    renderInspector()
  })

  // Export Modal
  dom.btnExportModal.addEventListener('click', openExportModal)
  dom.btnCloseModal.addEventListener('click', closeExportModal)
  dom.btnCancelModal.addEventListener('click', closeExportModal)
  dom.btnConfirmExport.addEventListener('click', executeExport)

  dom.maskApiKeys.addEventListener('change', updateDiffPreview)
  dom.maskEnvVars.addEventListener('change', updateDiffPreview)
  dom.maskPaths.addEventListener('change', updateDiffPreview)
  dom.maskCustomRegex.addEventListener('input', updateDiffPreview)

  // Keyboard Shortcuts
  window.addEventListener('keydown', e => {
    // Avoid shortcuts if user is typing in an input
    const tag = e.target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') {
        e.target.blur()
      }
      return
    }

    if (e.code === 'Space') {
      e.preventDefault()
      togglePlay()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevStep()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextStep()
    } else if (e.key === 'j' || e.key === 'J') {
      e.preventDefault()
      jumpToolCall(1)
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault()
      jumpToolCall(-1)
    } else if (e.key === '/') {
      e.preventDefault()
      dom.searchInput.focus()
      dom.searchInput.select()
    } else if (e.key === 'Escape') {
      closeExportModal()
    }
  })
}

// --- File Handling & Client-side Parsing ---
function handleFileSelect(e) {
  if (e.target.files && e.target.files[0]) {
    loadFile(e.target.files[0])
  }
}

async function loadFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const u8 = new Uint8Array(arrayBuffer)
    let text = ''

    // Check Zstd magic: 0x28, 0xB5, 0x2F, 0xFD
    if (u8.length >= 4 && u8[0] === 0x28 && u8[1] === 0xb5 && u8[2] === 0x2f && u8[3] === 0xfd) {
      if (window.fzstd && typeof window.fzstd.decompress === 'function') {
        const decompressed = window.fzstd.decompress(u8)
        text = new TextDecoder('utf-8').decode(decompressed)
      } else {
        alert(state.lang === 'zh' ? '检测到 Zstandard 压缩文件，需要解压模块' : 'Zstandard file detected; decompressor needed')
        return
      }
    } else {
      text = new TextDecoder('utf-8').decode(u8)
    }

    const session = parseClientSession(text, file.name)
    loadSession(session)
  } catch (err) {
    console.error('File load failed:', err)
    alert((state.lang === 'zh' ? '解析日志失败: ' : 'Failed to parse log: ') + err.message)
  }
}

function parseClientSession(text, fileName) {
  const lines = text.split(/\r?\n/)
  const rawEntries = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null) rawEntries.push(parsed)
    } catch (_) {}
  }

  // Simplified in-browser tree builder
  const events = []
  rawEntries.forEach((entry, idx) => {
    const seq = typeof entry.seq === 'number' ? entry.seq : idx + 1
    let ts = Date.now()
    if (entry.ts) ts = typeof entry.ts === 'number' ? entry.ts : Date.parse(entry.ts) || ts
    else if (entry.timestamp) ts = typeof entry.timestamp === 'number' ? entry.timestamp : Date.parse(entry.timestamp) || ts

    const rawRole = (entry.role || '').toLowerCase()
    const rawType = (entry.type || '').toLowerCase()

    let type = 'unknown'
    if (rawRole === 'user' || rawType === 'user' || rawType === 'user_message') type = 'user_message'
    else if (rawType === 'error' || entry.error) type = 'error'
    else if (rawType === 'tool_call' || rawType === 'tool_use' || entry.tool_call || entry.tool_calls || (rawRole === 'assistant' && (entry.toolName || entry.tool))) type = 'tool_call'
    else if (rawType === 'tool_result' || rawType === 'tool_return' || rawRole === 'tool' || (entry.result !== undefined && (entry.tool || entry.toolName))) type = 'tool_result'
    else if (rawType === 'approval_request' || entry.approval_request) type = 'approval_request'
    else if (rawType === 'approval_result' || entry.approval_result) type = 'approval_result'
    else if (rawType === 'reasoning' || rawType === 'thinking') type = 'reasoning'
    else if (rawRole === 'assistant' || rawType === 'assistant' || rawType === 'assistant_message') {
      if ((entry.reasoning || entry.reasoning_content || entry.thinking) && !entry.content) type = 'reasoning'
      else type = 'assistant_message'
    }

    const toolName = entry.toolName || entry.tool_name || entry.tool || (entry.tool_call && entry.tool_call.name) || (entry.tool_calls && entry.tool_calls[0] && entry.tool_calls[0].name)
    const args = entry.arguments || entry.args || entry.parameters || (entry.tool_call && entry.tool_call.arguments) || (entry.tool_calls && entry.tool_calls[0] && entry.tool_calls[0].arguments)
    const result = entry.result !== undefined ? entry.result : (entry.output ?? entry.response)
    const exitCode = entry.exitCode ?? entry.exit_code ?? 0

    let content = entry.content || entry.text || entry.message || ''
    if (typeof content === 'object') content = JSON.stringify(content, null, 2)

    events.push({
      seq,
      ts,
      type,
      role: rawRole || (type === 'user_message' ? 'user' : 'assistant'),
      model: entry.model,
      content,
      toolName,
      toolCallId: entry.toolCallId || entry.tool_call_id || entry.call_id,
      args,
      result,
      exitCode,
      error: entry.error ? (typeof entry.error === 'object' ? entry.error : { message: String(entry.error) }) : undefined,
      tokens: entry.tokens || entry.usage,
      duration: entry.duration || entry.duration_ms,
      parentSeq: entry.parentSeq || entry.parent_seq,
      raw: entry
    })
  })

  // Build turns
  const turns = []
  let currentTurn = null
  let currentStep = null

  events.forEach(ev => {
    if (ev.type === 'user_message' || !currentTurn) {
      currentTurn = {
        turnIndex: turns.length + 1,
        userPrompt: ev.content || `Turn ${turns.length + 1}`,
        steps: [],
        events: [],
        startTime: ev.ts,
        endTime: ev.ts,
        duration: 0,
        toolsUsed: [],
        totalTokens: { total: 0 }
      }
      turns.push(currentTurn)
    }

    currentTurn.events.push(ev)
    currentTurn.endTime = Math.max(currentTurn.endTime, ev.ts)
    if (ev.toolName && !currentTurn.toolsUsed.includes(ev.toolName)) {
      currentTurn.toolsUsed.push(ev.toolName)
    }

    if (!currentStep || ev.type === 'tool_call' || ev.type === 'error' || ev.type === 'user_message') {
      currentStep = {
        stepIndex: currentTurn.steps.length + 1,
        title: ev.type === 'tool_call' ? `Tool: ${ev.toolName}` : (ev.type === 'user_message' ? 'User Input' : (ev.type === 'error' ? 'Error' : `Step ${currentTurn.steps.length + 1}`)),
        events: [ev],
        startTime: ev.ts,
        endTime: ev.ts,
        duration: 0
      }
      currentTurn.steps.push(currentStep)
    } else {
      currentStep.events.push(ev)
      currentStep.endTime = Math.max(currentStep.endTime, ev.ts)
    }
  })

  const toolsSummary = {}
  events.forEach(e => {
    if (e.toolName) toolsSummary[e.toolName] = (toolsSummary[e.toolName] || 0) + (e.type === 'tool_call' ? 1 : 0)
  })

  return {
    sessionId: (rawEntries[0] && (rawEntries[0].session_id || rawEntries[0].sessionId)) || `session_${Date.now()}`,
    version: '2.0',
    startTime: events[0]?.ts || Date.now(),
    endTime: events[events.length - 1]?.ts || Date.now(),
    duration: Math.max(0, (events[events.length - 1]?.ts || 0) - (events[0]?.ts || 0)),
    turns,
    allEvents: events,
    totalEvents: events.length,
    totalTurns: turns.length,
    toolsSummary,
    sourceFileName: fileName
  }
}

// --- Session Loader ---
function loadSession(session) {
  state.session = session
  state.activeEvents = [...session.allEvents]
  state.currentFrame = 0
  state.selectedSeq = session.allEvents[0]?.seq || null
  stopPlay()

  // Update Header Meta
  dom.metaSessionId.textContent = session.sessionId || 'session'
  dom.metaCounts.textContent = `${session.totalTurns || session.turns.length} Turns · ${session.totalEvents || session.allEvents.length} Events`
  dom.metaDuration.textContent = formatDuration(session.duration)
  const totalTokens = session.totalTokens?.total || session.allEvents.reduce((sum, e) => sum + (e.tokens?.total || 0), 0)
  dom.metaTokens.textContent = `${formatTokens(totalTokens)} Tokens`

  // Update Scrubber
  dom.scrubber.max = Math.max(0, state.activeEvents.length - 1)
  dom.scrubber.value = 0

  // Populate Tool Filter Dropdown
  dom.toolFilter.innerHTML = `<option value="">${t('all_tools')}</option>`
  if (session.toolsSummary) {
    const tools = Object.keys(session.toolsSummary)
    if (tools.length > 0) {
      dom.toolFilter.style.display = 'inline-block'
      tools.forEach(tool => {
        const opt = document.createElement('option')
        opt.value = tool
        opt.textContent = `${tool} (${session.toolsSummary[tool]})`
        dom.toolFilter.appendChild(opt)
      })
    } else {
      dom.toolFilter.style.display = 'none'
    }
  }

  render()
}

// --- Filtering & Search ---
function applyFilters() {
  if (!state.session) return

  let filtered = [...state.session.allEvents]

  // Type filter
  if (state.filterType === 'tool') {
    filtered = filtered.filter(e => e.type === 'tool_call' || e.type === 'tool_result')
  } else if (state.filterType === 'error') {
    filtered = filtered.filter(e => e.type === 'error' || (e.exitCode !== undefined && e.exitCode !== 0))
  } else if (state.filterType === 'reasoning') {
    filtered = filtered.filter(e => e.type === 'reasoning')
  } else if (state.filterType === 'user') {
    filtered = filtered.filter(e => e.type === 'user_message')
  }

  // Specific tool filter
  if (state.toolFilter) {
    filtered = filtered.filter(e => e.toolName === state.toolFilter)
  }

  // Search query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim()
    let regex = null
    if (state.isRegex) {
      try { regex = new RegExp(q, 'i') } catch (_) {}
    }

    filtered = filtered.filter(e => {
      const texts = [
        e.content || '',
        e.toolName || '',
        e.args ? JSON.stringify(e.args) : '',
        e.result ? JSON.stringify(e.result) : '',
        e.error?.message || ''
      ]
      if (regex) {
        return texts.some(txt => regex.test(txt))
      }
      const lowerQ = q.toLowerCase()
      return texts.some(txt => txt.toLowerCase().includes(lowerQ))
    })
  }

  state.activeEvents = filtered
  state.currentFrame = 0
  dom.scrubber.max = Math.max(0, state.activeEvents.length - 1)
  dom.scrubber.value = 0
  if (state.activeEvents.length > 0) {
    state.selectedSeq = state.activeEvents[0].seq
  }

  renderTimeline()
  renderInspector()
  updateFrameUI()
}

// --- Playback Engine ---
function togglePlay() {
  if (state.isPlaying) {
    stopPlay()
  } else {
    startPlay()
  }
}

function startPlay() {
  if (!state.activeEvents.length) return
  state.isPlaying = true
  dom.btnPlay.textContent = '⏸'
  dom.btnPlay.classList.add('active')

  const interval = Math.max(100, Math.round(1000 / state.speed))
  state.playTimer = setInterval(() => {
    if (state.currentFrame < state.activeEvents.length - 1) {
      goToFrame(state.currentFrame + 1)
    } else {
      stopPlay()
    }
  }, interval)
}

function stopPlay() {
  state.isPlaying = false
  dom.btnPlay.textContent = '▶'
  dom.btnPlay.classList.remove('active')
  if (state.playTimer) {
    clearInterval(state.playTimer)
    state.playTimer = null
  }
}

function prevStep() {
  stopPlay()
  if (state.currentFrame > 0) {
    goToFrame(state.currentFrame - 1)
  }
}

function nextStep() {
  stopPlay()
  if (state.currentFrame < state.activeEvents.length - 1) {
    goToFrame(state.currentFrame + 1)
  }
}

function goToFrame(index) {
  if (index < 0 || index >= state.activeEvents.length) return
  state.currentFrame = index
  dom.scrubber.value = index
  const ev = state.activeEvents[index]
  if (ev) {
    state.selectedSeq = ev.seq
    dom.seqInput.value = ev.seq
  }
  updateFrameUI()
  highlightTimelineCard(ev?.seq)
  renderInspector()
}

function jumpToSeq(seq) {
  const idx = state.activeEvents.findIndex(e => e.seq === seq)
  if (idx !== -1) {
    stopPlay()
    goToFrame(idx)
  } else {
    // Search in full session
    const fullEv = state.session?.allEvents.find(e => e.seq === seq)
    if (fullEv) {
      // Clear filters to find it
      state.filterType = 'all'
      state.toolFilter = ''
      state.searchQuery = ''
      dom.searchInput.value = ''
      dom.filterPills.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === 'all'))
      applyFilters()
      const newIdx = state.activeEvents.findIndex(e => e.seq === seq)
      if (newIdx !== -1) goToFrame(newIdx)
    }
  }
}

function jumpToolCall(direction) {
  const currentSeq = state.selectedSeq || 0
  const toolIndices = []
  state.activeEvents.forEach((e, idx) => {
    if (e.type === 'tool_call') toolIndices.push(idx)
  })
  if (toolIndices.length === 0) return

  if (direction > 0) {
    const nextIdx = toolIndices.find(idx => idx > state.currentFrame)
    if (nextIdx !== undefined) goToFrame(nextIdx)
    else goToFrame(toolIndices[0])
  } else {
    const prevList = toolIndices.filter(idx => idx < state.currentFrame)
    if (prevList.length > 0) goToFrame(prevList[prevList.length - 1])
    else goToFrame(toolIndices[toolIndices.length - 1])
  }
}

function updateFrameUI() {
  const total = state.activeEvents.length
  const cur = total === 0 ? 0 : state.currentFrame + 1
  dom.currentFrameLabel.textContent = `${cur} / ${total}`
  dom.timelineCountBadge.textContent = String(total)
}

// --- Main Rendering ---
function render() {
  renderSessionTree()
  renderTimeline()
  renderInspector()
  updateFrameUI()
}

function renderSessionTree() {
  if (!state.session || !state.session.turns.length) {
    dom.sessionTree.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <div>${t('no_session')}</div>
      </div>`
    dom.turnCountBadge.textContent = '0'
    return
  }

  dom.turnCountBadge.textContent = String(state.session.turns.length)
  let html = ''

  state.session.turns.forEach(turn => {
    const errorBadge = turn.status === 'error' ? '<span class="badge badge-red">ERR</span>' : ''
    const toolBadge = turn.toolsUsed.length > 0 ? `<span class="badge badge-amber">${turn.toolsUsed.length} tools</span>` : ''

    html += `
      <div class="turn-node" data-turn="${turn.turnIndex}">
        <div class="turn-header" onclick="window.__selectTurn(${turn.turnIndex})">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>Turn ${turn.turnIndex}</span>
            ${errorBadge}
            ${toolBadge}
          </div>
          <span style="font-size: 10px; color: var(--text-muted);">${formatDuration(turn.duration)}</span>
        </div>
        <div class="turn-prompt" title="${escapeHtml(turn.userPrompt)}">
          ${escapeHtml(turn.userPrompt.slice(0, 45))}${turn.userPrompt.length > 45 ? '...' : ''}
        </div>
        <div class="steps-list">
    `

    turn.steps.forEach(step => {
      const stepError = step.hasError ? '⚠️ ' : ''
      html += `
        <div class="step-node" onclick="window.__jumpToSeq(${step.startSeq})">
          <span>${stepError}${escapeHtml(step.title)}</span>
          <span style="color: var(--text-muted); font-size: 10px;">${formatDuration(step.duration)}</span>
        </div>
      `
    })

    html += `
        </div>
      </div>
    `
  })

  dom.sessionTree.innerHTML = html
}

function renderTimeline() {
  if (!state.activeEvents.length) {
    dom.timelineList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <div>${state.session ? '无符合条件的事件' : t('drag_hint')}</div>
      </div>`
    return
  }

  let html = ''
  state.activeEvents.forEach((ev, idx) => {
    const isSelected = ev.seq === state.selectedSeq ? 'selected' : ''
    let badgeClass = 'badge-gray'
    let badgeText = ev.type

    switch (ev.type) {
      case 'user_message': badgeClass = 'badge-blue'; badgeText = 'User'; break;
      case 'assistant_message': badgeClass = 'badge-green'; badgeText = 'Assistant'; break;
      case 'reasoning': badgeClass = 'badge-purple'; badgeText = 'Reasoning'; break;
      case 'tool_call': badgeClass = 'badge-amber'; badgeText = `Tool: ${ev.toolName || 'call'}`; break;
      case 'tool_result': badgeClass = 'badge-teal'; badgeText = `Result: ${ev.toolName || 'tool'}`; break;
      case 'approval_request': badgeClass = 'badge-orange'; badgeText = 'Approval Req'; break;
      case 'approval_result': badgeClass = 'badge-orange'; badgeText = 'Approved'; break;
      case 'error': badgeClass = 'badge-red'; badgeText = 'Error'; break;
    }

    let bodyHtml = ''
    if (ev.type === 'tool_call') {
      const argsStr = typeof ev.args === 'string' ? ev.args : JSON.stringify(ev.args, null, 2)
      bodyHtml = `<div class="card-body-preview" style="color: var(--accent-amber);">${escapeHtml(argsStr || '')}</div>`
    } else if (ev.type === 'tool_result') {
      const resStr = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result, null, 2)
      const exitBadge = ev.exitCode !== undefined && ev.exitCode !== 0
        ? `<span class="badge badge-red">Exit: ${ev.exitCode}</span> `
        : ''
      bodyHtml = `<div>${exitBadge}</div><div class="card-body-preview">${escapeHtml((resStr || '').slice(0, 300))}</div>`
    } else if (ev.type === 'reasoning') {
      const isExpanded = state.expandedReasonings.has(ev.seq)
      const toggleLabel = isExpanded ? t('collapse_reasoning') : t('expand_reasoning')
      bodyHtml = `
        <div class="card-body ${isExpanded ? 'expanded' : ''}" style="color: var(--accent-purple); font-style: italic;">
          ${escapeHtml(ev.content || '')}
        </div>
        <button class="btn" style="padding: 2px 6px; font-size: 10px; align-self: flex-start; margin-top: 4px;" onclick="window.__toggleReasoning(${ev.seq}, event)">${toggleLabel}</button>
      `
    } else if (ev.type === 'error') {
      bodyHtml = `<div style="color: var(--accent-red); font-weight: 500;">❌ ${escapeHtml(ev.error?.message || ev.content || '')}</div>`
    } else {
      bodyHtml = `<div class="card-body">${escapeHtml(ev.content || '')}</div>`
    }

    html += `
      <div class="event-card type-${ev.type} ${isSelected}" id="event-card-${ev.seq}" onclick="window.__selectEvent(${ev.seq}, ${idx})">
        <div class="card-header">
          <div class="card-badge-group">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span class="card-seq">#${ev.seq}</span>
          </div>
          <div class="card-meta">
            ${ev.duration ? `<span>${formatDuration(ev.duration)}</span>` : ''}
            ${ev.tokens?.total ? `<span>${ev.tokens.total} tok</span>` : ''}
            <span>${new Date(ev.ts).toLocaleTimeString()}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>
    `
  })

  dom.timelineList.innerHTML = html
}

function highlightTimelineCard(seq) {
  document.querySelectorAll('.event-card').forEach(card => card.classList.remove('selected'))
  if (!seq) return
  const card = document.getElementById(`event-card-${seq}`)
  if (card) {
    card.classList.add('selected')
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function renderInspector() {
  const ev = state.activeEvents.find(e => e.seq === state.selectedSeq) || state.session?.allEvents.find(e => e.seq === state.selectedSeq)

  if (!ev) {
    dom.inspectorContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>${t('select_event_hint')}</div>
      </div>`
    return
  }

  // Raw Tab
  if (state.activeTab === 'raw') {
    const rawJson = JSON.stringify(ev.raw || ev, null, 2)
    dom.inspectorContent.innerHTML = `
      <div class="inspector-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="section-label">RAW JSON EVENT #${ev.seq}</span>
          <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(rawJson)})">📋 ${t('copy')}</button>
        </div>
        <div class="code-block">${syntaxHighlightJson(rawJson)}</div>
      </div>
    `
    return
  }

  // Formatted Tab
  let html = `
    <!-- Metadata Grid -->
    <div class="inspector-section">
      <span class="section-label">METADATA</span>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-item-label">EVENT TYPE</span>
          <span class="meta-item-val" style="color: var(--accent-blue);">${ev.type}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">SEQ / TS</span>
          <span class="meta-item-val">#${ev.seq} · ${new Date(ev.ts).toLocaleTimeString()}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">MODEL</span>
          <span class="meta-item-val">${ev.model || 'N/A'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">DURATION</span>
          <span class="meta-item-val">${formatDuration(ev.duration)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">TOKENS</span>
          <span class="meta-item-val">${ev.tokens?.total ? `${ev.tokens.total} (in: ${ev.tokens.input || 0}, out: ${ev.tokens.output || 0})` : 'N/A'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">PARENT SEQ</span>
          <span class="meta-item-val">${ev.parentSeq ? `<a href="javascript:void(0)" onclick="window.__jumpToSeq(${ev.parentSeq})" style="color: var(--accent-blue);">#${ev.parentSeq}</a>` : 'None'}</span>
        </div>
      </div>
    </div>
  `

  // Tool Call details
  if (ev.type === 'tool_call') {
    const argsFormatted = JSON.stringify(ev.args, null, 2)
    html += `
      <div class="inspector-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="section-label" style="color: var(--accent-amber);">${t('tool_parameters')}: ${escapeHtml(ev.toolName || '')}</span>
          <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(argsFormatted)})">📋 ${t('copy')}</button>
        </div>
        <div class="code-block">${syntaxHighlightJson(argsFormatted)}</div>
      </div>
    `
  }

  // Tool Result details
  if (ev.type === 'tool_result') {
    const resFormatted = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result, null, 2)
    const jumpBtn = ev.parentSeq
      ? `<button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__jumpToSeq(${ev.parentSeq})">🔗 ${t('jump_to_call')}${ev.parentSeq}</button>`
      : ''

    html += `
      <div class="inspector-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="section-label" style="color: var(--accent-teal);">${t('tool_output')} (Exit: ${ev.exitCode ?? 0})</span>
          <div style="display: flex; gap: 6px;">
            ${jumpBtn}
            <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(resFormatted)})">📋 ${t('copy')}</button>
          </div>
        </div>
        <div class="code-block">${escapeHtml(resFormatted)}</div>
      </div>
    `
  }

  // Reasoning details
  if (ev.type === 'reasoning') {
    html += `
      <div class="inspector-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="section-label" style="color: var(--accent-purple);">${t('reasoning_block')}</span>
          <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(ev.content || '')})">📋 ${t('copy')}</button>
        </div>
        <div class="code-block" style="color: var(--accent-purple); font-style: italic;">${escapeHtml(ev.content || '')}</div>
      </div>
    `
  }

  // Error details
  if (ev.type === 'error' || ev.error) {
    const errObj = ev.error || {}
    html += `
      <div class="inspector-section">
        <span class="section-label" style="color: var(--accent-red);">ERROR DETAILS</span>
        <div style="background: rgba(248, 81, 73, 0.1); border: 1px solid var(--accent-red); border-radius: 6px; padding: 10px; color: var(--accent-red);">
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(errObj.message || ev.content || 'Error')}</div>
          ${errObj.code ? `<div style="font-size: 11px; margin-top: 4px;">Code: ${errObj.code}</div>` : ''}
        </div>
      </div>
    `
    if (errObj.stack) {
      html += `
        <div class="inspector-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="section-label">${t('stack_trace')}</span>
            <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(errObj.stack)})">📋 ${t('copy')}</button>
          </div>
          <div class="code-block" style="color: var(--text-muted); font-size: 11px;">${escapeHtml(errObj.stack)}</div>
        </div>
      `
    }
  }

  // Message Content
  if (ev.content && ev.type !== 'reasoning' && ev.type !== 'error') {
    const title = ev.type === 'user_message' ? t('user_prompt') : t('assistant_reply')
    html += `
      <div class="inspector-section">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="section-label">${title}</span>
          <button class="btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.__copyText(${JSON.stringify(ev.content)})">📋 ${t('copy')}</button>
        </div>
        <div class="code-block">${escapeHtml(ev.content)}</div>
      </div>
    `
  }

  dom.inspectorContent.innerHTML = html
}

// --- Global helper triggers ---
window.__selectTurn = function(turnIndex) {
  const turn = state.session?.turns.find(t => t.turnIndex === turnIndex)
  if (turn) {
    jumpToSeq(turn.startSeq)
  }
}

window.__jumpToSeq = function(seq) {
  jumpToSeq(seq)
}

window.__selectEvent = function(seq, index) {
  state.selectedSeq = seq
  state.currentFrame = index
  dom.scrubber.value = index
  dom.seqInput.value = seq
  updateFrameUI()
  highlightTimelineCard(seq)
  renderInspector()
}

window.__toggleReasoning = function(seq, event) {
  event.stopPropagation()
  if (state.expandedReasonings.has(seq)) {
    state.expandedReasonings.delete(seq)
  } else {
    state.expandedReasonings.add(seq)
  }
  renderTimeline()
}

window.__copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(t('copied'))
  }).catch(() => {
    // Fallback
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert(t('copied'))
  })
}

// --- Export & Desensitization Modal Logic ---
function openExportModal() {
  if (!state.session) {
    alert(t('no_session'))
    return
  }
  dom.exportModal.classList.add('open')
  updateDiffPreview()
}

function closeExportModal() {
  dom.exportModal.classList.remove('open')
}

function getMaskOptions() {
  return {
    maskApiKeys: dom.maskApiKeys.checked,
    maskEnvVars: dom.maskEnvVars.checked,
    maskPaths: dom.maskPaths.checked,
    customRegex: dom.maskCustomRegex.value
  }
}

function updateDiffPreview() {
  if (!state.session) return
  const sampleEvents = state.session.allEvents.slice(0, 5)
  const sampleRaw = JSON.stringify(sampleEvents, null, 2).slice(0, 500)
  const opts = getMaskOptions()
  const maskedRaw = maskStringClient(sampleRaw, opts)

  dom.diffBefore.textContent = sampleRaw
  dom.diffAfter.textContent = maskedRaw
}

function executeExport() {
  if (!state.session) return
  const opts = getMaskOptions()
  const maskedSession = maskObjectClient(state.session, opts)

  // Package single-file HTML
  const htmlBundle = generateClientHtmlBundle(maskedSession)
  const blob = new Blob([htmlBundle], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dsh-player-${state.session.sessionId || 'session'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  closeExportModal()
}

function generateClientHtmlBundle(sessionData) {
  const currentHtml = document.documentElement.outerHTML
  // Inject session data directly before </head>
  const scriptTag = `<script>window.__DSH_SESSION__ = ${JSON.stringify(sessionData)};<\/script>`
  return currentHtml.replace('</head>', `${scriptTag}\n</head>`)
}

// Start application
window.addEventListener('DOMContentLoaded', init)
