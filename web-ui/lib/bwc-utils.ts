/**
 * Utility functions for generating BWC CLI commands
 */

export type ResourceType = 'subagent' | 'command' | 'mcp'

export interface BWCCommands {
  install: string
  info: string
  list: string
  remove: string
  search?: string
}

/**
 * Generate BWC CLI commands for a given resource
 */
export function generateBWCCommands(type: ResourceType, name: string): BWCCommands {
  // Map resource type to CLI flag
  const flag = type === 'subagent' ? 'agent' : type
  
  const commands: BWCCommands = {
    install: `bwc add --${flag} ${name}`,
    info: `bwc info --${flag} ${name}`,
    list: `bwc list --${flag}s`,
    remove: `bwc remove --${flag} ${name}`,
    search: `bwc search --${flag}s ${name}`
  }
  
  return commands
}

/**
 * Generate a complete BWC installation script with all commands
 */
export function generateBWCInstallScript(type: ResourceType, name: string): string {
  const commands = generateBWCCommands(type, name)
  const resourceName = getResourceTypeDisplayName(type)
  
  return `# Install ${name} ${resourceName}
${commands.install}

# View info
${commands.info}

# List installed ${resourceName}s
${commands.list}

# Remove if needed
# ${commands.remove}`
}

/**
 * Format command name for BWC CLI (commands use underscore format)
 */
export function formatCommandName(slug: string): string {
  return `/${slug.replace(/-/g, '_')}`
}

/**
 * Get display name for resource type
 */
export function getResourceTypeDisplayName(type: ResourceType): string {
  switch (type) {
    case 'subagent':
      return 'Subagent'
    case 'command':
      return 'Command'
    case 'mcp':
      return 'MCP Server'
    default:
      return type
  }
}