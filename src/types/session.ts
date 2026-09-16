import { DshEvent, EventTokens } from './events.js'

export interface Step {
  stepIndex: number
  title: string
  events: DshEvent[]
  startSeq: number
  endSeq: number
  startTime: number
  endTime: number
  duration: number
  toolCallsCount: number
  hasError: boolean
  tokens: EventTokens
}

export interface Turn {
  turnIndex: number
  userPrompt: string
  steps: Step[]
  events: DshEvent[]
  startSeq: number
  endSeq: number
  startTime: number
  endTime: number
  duration: number
  totalTokens: EventTokens
  toolsUsed: string[]
  status: 'success' | 'error' | 'in_progress'
}

export interface Session {
  sessionId: string
  version: string
  startTime: number
  endTime: number
  duration: number
  turns: Turn[]
  allEvents: DshEvent[]
  totalEvents: number
  totalTurns: number
  totalSteps: number
  totalTokens: EventTokens
  toolsSummary: Record<string, number>
  forks: string[]
  hasError: boolean
  sourceFileName?: string
}

export interface MaskOptions {
  maskApiKeys?: boolean
  maskEnvVars?: boolean
  maskPaths?: boolean
  customRegex?: string
}
