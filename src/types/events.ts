export type EventType =
  | 'user_message'
  | 'assistant_message'
  | 'reasoning'
  | 'tool_call'
  | 'tool_result'
  | 'approval_request'
  | 'approval_result'
  | 'error'
  | 'compaction'
  | 'fork'
  | 'unknown'

export interface EventTokens {
  input?: number
  output?: number
  total?: number
}

export interface EventError {
  message: string
  stack?: string
  code?: string | number
}

export interface DshEvent {
  seq: number
  ts: number // unix epoch ms
  type: EventType
  role?: 'user' | 'assistant' | 'tool' | 'system'
  model?: string
  content?: string
  toolName?: string
  toolCallId?: string
  args?: any
  result?: any
  exitCode?: number
  error?: EventError
  tokens?: EventTokens
  duration?: number // ms
  parentSeq?: number
  forkId?: string
  raw?: Record<string, any>
}

export interface RawLogEntry {
  seq?: number
  id?: string | number
  ts?: number | string
  timestamp?: number | string
  time?: number | string
  type?: string
  role?: string
  model?: string
  content?: any
  text?: string
  message?: any
  tool?: string
  tool_name?: string
  toolName?: string
  tool_call?: any
  tool_calls?: any[]
  toolCallId?: string
  tool_call_id?: string
  call_id?: string
  arguments?: any
  args?: any
  parameters?: any
  result?: any
  output?: any
  response?: any
  exit_code?: number
  exitCode?: number
  error?: any
  reasoning?: string
  reasoning_content?: string
  thinking?: string
  tokens?: any
  usage?: any
  duration?: number
  duration_ms?: number
  parent_seq?: number
  parentSeq?: number
  fork_id?: string
  forkId?: string
  [key: string]: any
}
