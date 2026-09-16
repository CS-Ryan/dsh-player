import { DshEvent, EventType, RawLogEntry } from '../types/events.js'
import { Session, Turn, Step } from '../types/session.js'

/**
 * Normalizes a raw log entry into a standardized DshEvent.
 * If an entry has both reasoning and assistant content, it returns an array of events.
 */
export function normalizeEntry(entry: RawLogEntry, index: number): DshEvent[] {
  const seq = typeof entry.seq === 'number' ? entry.seq : index + 1

  // Parse timestamp
  let ts = Date.now()
  if (entry.ts !== undefined) {
    ts = typeof entry.ts === 'number' ? entry.ts : Date.parse(entry.ts) || ts
  } else if (entry.timestamp !== undefined) {
    ts = typeof entry.timestamp === 'number' ? entry.timestamp : Date.parse(entry.timestamp) || ts
  } else if (entry.time !== undefined) {
    ts = typeof entry.time === 'number' ? entry.time : Date.parse(entry.time) || ts
  }

  // Parse tokens
  let tokens: DshEvent['tokens'] = undefined
  const rawTokens = entry.tokens || entry.usage
  if (rawTokens && typeof rawTokens === 'object') {
    tokens = {
      input: rawTokens.input || rawTokens.prompt_tokens || rawTokens.input_tokens || 0,
      output: rawTokens.output || rawTokens.completion_tokens || rawTokens.output_tokens || 0,
      total: rawTokens.total || rawTokens.total_tokens || 0
    }
    if (!tokens.total && (tokens.input || tokens.output)) {
      tokens.total = (tokens.input || 0) + (tokens.output || 0)
    }
  }

  // Parse duration
  const duration = entry.duration || entry.duration_ms || undefined
  const parentSeq = entry.parentSeq || entry.parent_seq || undefined
  const forkId = entry.forkId || entry.fork_id || undefined
  const model = entry.model || undefined

  const rawType = (entry.type || '').toLowerCase()
  const rawRole = (entry.role || '').toLowerCase()

  // 1. Error
  if (rawType === 'error' || entry.error) {
    const errObj = entry.error
    const message =
      typeof errObj === 'string'
        ? errObj
        : errObj?.message || entry.message || entry.content || 'Unknown error'
    const stack = typeof errObj === 'object' ? errObj?.stack : undefined
    const code = typeof errObj === 'object' ? errObj?.code : undefined

    return [
      {
        seq,
        ts,
        type: 'error',
        role: rawRole === 'assistant' ? 'assistant' : undefined,
        content: message,
        error: { message, stack, code },
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 2. Approval
  if (rawType === 'approval_request' || entry.approval_request) {
    return [
      {
        seq,
        ts,
        type: 'approval_request',
        role: 'system',
        content: extractContent(entry.approval_request || entry),
        args: entry.approval_request || entry.args,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  if (rawType === 'approval_result' || rawType === 'approval_response' || entry.approval_result) {
    return [
      {
        seq,
        ts,
        type: 'approval_result',
        role: 'user',
        content: extractContent(entry.approval_result || entry),
        result: entry.approval_result || entry.result,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 3. User message
  if (rawType === 'user' || rawType === 'user_message' || rawRole === 'user') {
    return [
      {
        seq,
        ts,
        type: 'user_message',
        role: 'user',
        content: extractContent(entry),
        tokens,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 4. Tool calls
  if (
    rawType === 'tool_call' ||
    rawType === 'tool_use' ||
    entry.tool_call ||
    (entry.tool_calls && entry.tool_calls.length > 0) ||
    (rawRole === 'assistant' && (entry.toolName || entry.tool))
  ) {
    // Check if multiple tool calls exist
    const toolCallsList = entry.tool_calls || (entry.tool_call ? [entry.tool_call] : [])
    if (toolCallsList.length > 1) {
      return toolCallsList.map((tc: any, subIdx: number) => ({
        seq: seq * 100 + subIdx,
        ts,
        type: 'tool_call',
        role: 'assistant',
        model,
        toolName: tc.name || tc.tool || tc.function?.name || entry.toolName || entry.tool || 'unknown_tool',
        toolCallId: tc.id || tc.call_id || entry.toolCallId || entry.tool_call_id,
        args: tc.arguments || tc.args || tc.function?.arguments || entry.arguments || entry.args,
        tokens,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }))
    }

    const singleTc = toolCallsList[0] || {}
    return [
      {
        seq,
        ts,
        type: 'tool_call',
        role: 'assistant',
        model,
        toolName:
          singleTc.name ||
          singleTc.tool ||
          singleTc.function?.name ||
          entry.toolName ||
          entry.tool_name ||
          entry.tool ||
          'unknown_tool',
        toolCallId:
          singleTc.id ||
          singleTc.call_id ||
          entry.toolCallId ||
          entry.tool_call_id ||
          entry.call_id,
        args:
          singleTc.arguments ||
          singleTc.args ||
          singleTc.function?.arguments ||
          entry.arguments ||
          entry.args ||
          entry.parameters,
        tokens,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 5. Tool results
  if (
    rawType === 'tool_result' ||
    rawType === 'tool_return' ||
    rawRole === 'tool' ||
    (entry.result !== undefined && (entry.tool || entry.toolName || entry.tool_call_id || entry.call_id))
  ) {
    return [
      {
        seq,
        ts,
        type: 'tool_result',
        role: 'tool',
        toolName: entry.toolName || entry.tool_name || entry.tool || undefined,
        toolCallId: entry.toolCallId || entry.tool_call_id || entry.call_id,
        result: entry.result !== undefined ? entry.result : entry.output ?? entry.response,
        exitCode: entry.exitCode ?? entry.exit_code ?? 0,
        content: extractContent(entry.result !== undefined ? entry.result : entry.output ?? entry),
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 6. Compaction / Summary
  if (rawType === 'compaction' || rawType === 'summary') {
    return [
      {
        seq,
        ts,
        type: 'compaction',
        role: 'system',
        content: extractContent(entry),
        tokens,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 7. Fork
  if (rawType === 'fork' || rawType === 'subagent' || forkId) {
    return [
      {
        seq,
        ts,
        type: 'fork',
        role: 'system',
        content: extractContent(entry),
        forkId: forkId || entry.fork || 'sub-agent',
        duration,
        parentSeq,
        raw: entry
      }
    ]
  }

  // 8. Assistant message / Reasoning block
  const reasoningContent =
    entry.reasoning || entry.reasoning_content || entry.thinking || undefined
  const content = extractContent(entry)

  if (rawRole === 'assistant' || rawType === 'assistant' || rawType === 'assistant_message') {
    const results: DshEvent[] = []

    // If there is reasoning content, create reasoning event first
    if (reasoningContent && typeof reasoningContent === 'string' && reasoningContent.trim()) {
      results.push({
        seq: content ? seq * 10 : seq,
        ts,
        type: 'reasoning',
        role: 'assistant',
        model,
        content: reasoningContent,
        duration,
        parentSeq,
        forkId,
        raw: entry
      })
    }

    if (content || results.length === 0) {
      results.push({
        seq: results.length > 0 ? seq * 10 + 1 : seq,
        ts,
        type: 'assistant_message',
        role: 'assistant',
        model,
        content: content || '',
        tokens,
        duration,
        parentSeq,
        forkId,
        raw: entry
      })
    }

    return results
  }

  // 9. Pure reasoning event
  if (rawType === 'reasoning' || rawType === 'thinking') {
    return [
      {
        seq,
        ts,
        type: 'reasoning',
        role: 'assistant',
        model,
        content: reasoningContent || content,
        duration,
        parentSeq,
        forkId,
        raw: entry
      }
    ]
  }

  // 10. Fallback: Unknown event (graceful degradation)
  return [
    {
      seq,
      ts,
      type: 'unknown',
      role: (rawRole as any) || undefined,
      content: content || JSON.stringify(entry),
      tokens,
      duration,
      parentSeq,
      forkId,
      raw: entry
    }
  ]
}

function extractContent(obj: any): string {
  if (obj === null || obj === undefined) return ''
  if (typeof obj === 'string') return obj
  if (typeof obj.content === 'string') return obj.content
  if (typeof obj.text === 'string') return obj.text
  if (typeof obj.message === 'string') return obj.message
  if (Array.isArray(obj.content)) {
    return obj.content
      .map((item: any) => (typeof item === 'string' ? item : item.text || item.content || JSON.stringify(item)))
      .join('\n')
  }
  if (typeof obj === 'object') {
    return JSON.stringify(obj, null, 2)
  }
  return String(obj)
}

/**
 * Reconstructs flat raw log entries into a structured Session with Turns and Steps.
 */
export function buildSessionTree(
  entries: RawLogEntry[],
  meta: { sessionId?: string; fileName?: string } = {}
): Session {
  // Step A: Normalize all entries to DshEvents
  const allEvents: DshEvent[] = []
  for (let i = 0; i < entries.length; i++) {
    const normalized = normalizeEntry(entries[i], i)
    allEvents.push(...normalized)
  }

  // Sort by seq and ts
  allEvents.sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq
    return a.ts - b.ts
  })

  // Link tool results to tool calls by toolCallId or toolName
  const toolCallMap = new Map<string, DshEvent>()
  for (const ev of allEvents) {
    if (ev.type === 'tool_call' && ev.toolCallId) {
      toolCallMap.set(ev.toolCallId, ev)
    } else if (ev.type === 'tool_result') {
      if (ev.toolCallId && toolCallMap.has(ev.toolCallId)) {
        const caller = toolCallMap.get(ev.toolCallId)!
        if (!ev.parentSeq) ev.parentSeq = caller.seq
        if (!ev.toolName) ev.toolName = caller.toolName
      }
    }
  }

  // Step B: Group into Turns and Steps
  const turns: Turn[] = []
  let currentTurn: Turn | null = null
  let currentStep: Step | null = null

  const toolsSummary: Record<string, number> = {}
  const forksSet = new Set<string>()
  let hasGlobalError = false

  const createTurn = (userEvent?: DshEvent): Turn => {
    const turnIndex = turns.length + 1
    const newTurn: Turn = {
      turnIndex,
      userPrompt: userEvent?.content || `Turn ${turnIndex}`,
      steps: [],
      events: [],
      startSeq: userEvent ? userEvent.seq : allEvents[0]?.seq || 1,
      endSeq: userEvent ? userEvent.seq : allEvents[0]?.seq || 1,
      startTime: userEvent ? userEvent.ts : Date.now(),
      endTime: userEvent ? userEvent.ts : Date.now(),
      duration: 0,
      totalTokens: { input: 0, output: 0, total: 0 },
      toolsUsed: [],
      status: 'in_progress'
    }
    turns.push(newTurn)
    return newTurn
  }

  const createStep = (parentTurn: Turn, title: string, firstEvent?: DshEvent): Step => {
    const stepIndex = parentTurn.steps.length + 1
    const newStep: Step = {
      stepIndex,
      title,
      events: firstEvent ? [firstEvent] : [],
      startSeq: firstEvent ? firstEvent.seq : parentTurn.endSeq,
      endSeq: firstEvent ? firstEvent.seq : parentTurn.endSeq,
      startTime: firstEvent ? firstEvent.ts : parentTurn.endTime,
      endTime: firstEvent ? firstEvent.ts : parentTurn.endTime,
      duration: 0,
      toolCallsCount: firstEvent?.type === 'tool_call' ? 1 : 0,
      hasError: firstEvent?.type === 'error' || false,
      tokens: { input: 0, output: 0, total: 0 }
    }
    parentTurn.steps.push(newStep)
    return newStep
  }

  for (const ev of allEvents) {
    if (ev.type === 'error') hasGlobalError = true
    if (ev.forkId) forksSet.add(ev.forkId)
    if (ev.toolName) {
      toolsSummary[ev.toolName] = (toolsSummary[ev.toolName] || 0) + (ev.type === 'tool_call' ? 1 : 0)
    }

    // Determine Turn boundaries
    if (ev.type === 'user_message') {
      if (currentTurn) {
        const lastTurn: Turn = currentTurn
        lastTurn.status = lastTurn.steps.some((s) => s.hasError) ? 'error' : 'success'
        lastTurn.endTime = lastTurn.events[lastTurn.events.length - 1]?.ts || lastTurn.endTime
        lastTurn.duration = Math.max(0, lastTurn.endTime - lastTurn.startTime)
      }
      currentTurn = createTurn(ev)
      currentTurn.events.push(ev)
      currentStep = createStep(currentTurn, 'User Input', ev)
      continue
    }

    if (!currentTurn) {
      currentTurn = createTurn()
      currentStep = createStep(currentTurn, 'Step 1')
    }

    const activeTurn: Turn = currentTurn
    activeTurn.events.push(ev)
    activeTurn.endSeq = Math.max(activeTurn.endSeq, ev.seq)
    activeTurn.endTime = Math.max(activeTurn.endTime, ev.ts)

    // Collect tools used in turn
    if (ev.toolName && !activeTurn.toolsUsed.includes(ev.toolName)) {
      activeTurn.toolsUsed.push(ev.toolName)
    }

    // Sum tokens
    if (ev.tokens) {
      activeTurn.totalTokens.input = (activeTurn.totalTokens.input || 0) + (ev.tokens.input || 0)
      activeTurn.totalTokens.output = (activeTurn.totalTokens.output || 0) + (ev.tokens.output || 0)
      activeTurn.totalTokens.total = (activeTurn.totalTokens.total || 0) + (ev.tokens.total || 0)
    }

    // Determine Step boundaries within Turn
    let shouldCreateStep = false
    let stepTitle = `Step ${(activeTurn.steps.length || 0) + 1}`

    if (!currentStep) {
      shouldCreateStep = true
    } else if (ev.type === 'tool_call') {
      shouldCreateStep = true
      stepTitle = `Tool: ${ev.toolName || 'tool_call'}`
    } else if (ev.type === 'reasoning' && currentStep.events.some((e: DshEvent) => e.type !== 'reasoning')) {
      shouldCreateStep = true
      stepTitle = `Reasoning`
    } else if (ev.type === 'assistant_message' && currentStep.events.some((e: DshEvent) => e.type === 'tool_call' || e.type === 'tool_result')) {
      shouldCreateStep = true
      stepTitle = `Assistant Response`
    } else if (ev.type === 'error') {
      shouldCreateStep = true
      stepTitle = `Error: ${ev.error?.message?.slice(0, 30) || 'Failure'}`
    } else if (ev.type === 'approval_request') {
      shouldCreateStep = true
      stepTitle = `Approval Request`
    }

    if (shouldCreateStep) {
      currentStep = createStep(activeTurn, stepTitle, ev)
    } else if (currentStep) {
      const activeStep: Step = currentStep
      activeStep.events.push(ev)
      activeStep.endSeq = Math.max(activeStep.endSeq, ev.seq)
      activeStep.endTime = Math.max(activeStep.endTime, ev.ts)
      if (ev.type === 'tool_call') activeStep.toolCallsCount++
      if (ev.type === 'error') activeStep.hasError = true
      if (ev.tokens) {
        activeStep.tokens.input = (activeStep.tokens.input || 0) + (ev.tokens.input || 0)
        activeStep.tokens.output = (activeStep.tokens.output || 0) + (ev.tokens.output || 0)
        activeStep.tokens.total = (activeStep.tokens.total || 0) + (ev.tokens.total || 0)
      }
    }
  }

  // Finalize turns
  if (currentTurn) {
    const finalTurn: Turn = currentTurn
    finalTurn.status = finalTurn.steps.some((s) => s.hasError) ? 'error' : 'success'
    finalTurn.endTime = finalTurn.events[finalTurn.events.length - 1]?.ts || finalTurn.endTime
    finalTurn.duration = Math.max(0, finalTurn.endTime - finalTurn.startTime)
  }

  // Calculate durations for steps
  for (const turn of turns) {
    for (const step of turn.steps) {
      step.duration = Math.max(0, step.endTime - step.startTime)
    }
  }

  const sessionStartTime = allEvents[0]?.ts || Date.now()
  const sessionEndTime = allEvents[allEvents.length - 1]?.ts || sessionStartTime
  const totalTokens: DshEvent['tokens'] = { input: 0, output: 0, total: 0 }

  for (const ev of allEvents) {
    if (ev.tokens) {
      totalTokens.input = (totalTokens.input || 0) + (ev.tokens.input || 0)
      totalTokens.output = (totalTokens.output || 0) + (ev.tokens.output || 0)
      totalTokens.total = (totalTokens.total || 0) + (ev.tokens.total || 0)
    }
  }

  const totalSteps = turns.reduce((sum, t) => sum + t.steps.length, 0)

  return {
    sessionId: meta.sessionId || (entries[0] && (entries[0].session_id || entries[0].sessionId)) || `session_${Date.now()}`,
    version: '2.0',
    startTime: sessionStartTime,
    endTime: sessionEndTime,
    duration: Math.max(0, sessionEndTime - sessionStartTime),
    turns,
    allEvents,
    totalEvents: allEvents.length,
    totalTurns: turns.length,
    totalSteps,
    totalTokens,
    toolsSummary,
    forks: Array.from(forksSet),
    hasError: hasGlobalError,
    sourceFileName: meta.fileName
  }
}
