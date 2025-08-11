import { readJSON, writeJSON, fileExists } from './files.js'
import { MCPServer } from '../registry/types.js'
import path from 'path'
import { logger } from './logger.js'

export interface MCPJsonConfig {
  mcpServers: {
    [name: string]: {
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  }
}

/**
 * Read the .mcp.json file from the current project directory
 */
export async function readMCPJson(): Promise<MCPJsonConfig | null> {
  const mcpJsonPath = path.join(process.cwd(), '.mcp.json')
  
  if (!await fileExists(mcpJsonPath)) {
    return null
  }
  
  try {
    return await readJSON<MCPJsonConfig>(mcpJsonPath)
  } catch (error) {
    logger.error('Failed to read .mcp.json file')
    throw error
  }
}

/**
 * Write or update the .mcp.json file in the current project directory
 */
export async function writeMCPJson(config: MCPJsonConfig): Promise<void> {
  const mcpJsonPath = path.join(process.cwd(), '.mcp.json')
  
  try {
    await writeJSON(mcpJsonPath, config)
    logger.success('Updated .mcp.json file')
  } catch (error) {
    logger.error('Failed to write .mcp.json file')
    throw error
  }
}

/**
 * Add or update an MCP server in the .mcp.json file
 */
export async function addServerToMCPJson(
  server: MCPServer,
  configExample: any,
  envVars: string[] = []
): Promise<void> {
  // Read existing config or create new one
  let config = await readMCPJson() || { mcpServers: {} }
  
  // Parse the server configuration
  let serverConfig: any
  try {
    const parsedConfig = typeof configExample === 'string' 
      ? JSON.parse(configExample) 
      : configExample
    serverConfig = parsedConfig.mcpServers?.[server.name]
    
    if (!serverConfig) {
      throw new Error('Invalid configuration format')
    }
  } catch (error) {
    throw new Error('Failed to parse server configuration')
  }
  
  // Apply environment variables
  if (envVars.length > 0) {
    if (!serverConfig.env) {
      serverConfig.env = {}
    }
    
    for (const envVar of envVars) {
      const [key, value] = envVar.split('=')
      if (key && value !== undefined) {
        // Support environment variable expansion
        serverConfig.env[key] = value.includes('$') ? value : `\${${key}:-${value}}`
      }
    }
  }
  
  // Update the config
  config.mcpServers[server.name] = serverConfig
  
  // Write back to file
  await writeMCPJson(config)
  
  logger.info(`\nAdded ${server.name} to .mcp.json`)
  logger.info('This configuration will be available to all team members')
  logger.info('Remember to commit .mcp.json to version control')
  
  // Security warning for experimental servers
  if (server.verification.status === 'experimental') {
    logger.warn('\n⚠️  Security Warning:')
    logger.warn('This is an experimental server. Please review its code and security implications')
    logger.warn('before committing to version control.')
  }
}

/**
 * Check if a server exists in .mcp.json
 */
export async function serverExistsInMCPJson(serverName: string): Promise<boolean> {
  const config = await readMCPJson()
  return config ? serverName in config.mcpServers : false
}

/**
 * Remove a server from .mcp.json
 */
export async function removeServerFromMCPJson(serverName: string): Promise<boolean> {
  const config = await readMCPJson()
  
  if (!config || !(serverName in config.mcpServers)) {
    return false
  }
  
  delete config.mcpServers[serverName]
  await writeMCPJson(config)
  
  logger.info(`Removed ${serverName} from .mcp.json`)
  return true
}