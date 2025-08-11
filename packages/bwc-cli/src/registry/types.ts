import { z } from 'zod'
import { MCPServerSchema } from './mcp-types'
export * from './mcp-types'

export const SubagentSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  file: z.string(),
  tools: z.array(z.string()),
  path: z.string(),
  tags: z.array(z.string()).default([]),
  sha: z.string().optional()
})

export const CommandSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  file: z.string(),
  path: z.string(),
  argumentHint: z.string(),
  model: z.string(),
  prefix: z.string().default('/'),
  tags: z.array(z.string()).default([]),
  sha: z.string().optional()
})

export const RegistrySchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  lastUpdated: z.string(),
  subagents: z.array(SubagentSchema),
  commands: z.array(CommandSchema),
  mcpServers: z.array(MCPServerSchema).optional()
})

export type Subagent = z.infer<typeof SubagentSchema>
export type Command = z.infer<typeof CommandSchema>
export type Registry = z.infer<typeof RegistrySchema>
export type RegistryData = Registry

export interface BwcConfig {
  version: string
  registry: string
  paths: {
    subagents: string
    commands: string
    mcpServers?: string
  }
  installed: {
    subagents: string[]
    commands: string[]
    mcpServers?: string[]
  }
}