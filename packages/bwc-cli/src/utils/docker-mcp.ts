import { execa } from 'execa'
import { logger } from './logger.js'
import { execClaudeCLI } from './claude-cli.js'
import { categorizeDockerMCPServer, getCategoryInfo, sortServersByCategory } from './mcp-categorizer.js'

/**
 * Docker MCP Utilities
 * Manages Docker MCP Toolkit operations
 */

export interface DockerMCPServer {
  name: string
  description: string
  category: string
  dockerHubUrl: string
}

/**
 * Check if Docker is installed and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['--version'])
    return stdout.includes('Docker version')
  } catch {
    return false
  }
}

/**
 * Check if Docker MCP Toolkit is available
 */
export async function isDockerMCPAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['mcp', '--version'])
    return true
  } catch {
    return false
  }
}

/**
 * Setup Docker MCP Gateway in Claude Code
 */
export async function setupDockerMCPGateway(scope: 'local' | 'project' | 'user' = 'project'): Promise<void> {
  logger.info('Setting up Docker MCP Toolkit gateway...')
  
  try {
    // Add the Docker MCP gateway to Claude Code
    const args = [
      'mcp', 'add',
      'docker-toolkit',
      '--scope', scope,
      '--',
      'docker', 'mcp', 'gateway', 'run'
    ]
    
    const { stdout } = await execClaudeCLI(args)
    logger.success('Docker MCP gateway configured in Claude Code')
    
    if (stdout) {
      logger.info(stdout)
    }
    
    logger.info('\nℹ️  Restart Claude Code to activate the Docker MCP gateway')
  } catch (error: any) {
    throw new Error(`Failed to setup Docker MCP gateway: ${error.message}`)
  }
}

/**
 * List available Docker MCP servers from catalog
 */
export async function listAvailableDockerMCPServers(): Promise<string[]> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'catalog', 'show'])
    
    // Parse the catalog output
    // Format: "server-name: description"
    const lines = stdout.split('\n')
    const servers: string[] = []
    
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+):/)
      if (match) {
        servers.push(match[1])
      }
    }
    
    return servers
  } catch (error: any) {
    logger.warn('Failed to fetch Docker MCP catalog')
    return []
  }
}

/**
 * List installed Docker MCP servers
 */
export async function listInstalledDockerMCPServers(): Promise<string[]> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'server', 'list'])
    
    // Parse comma-separated list
    if (!stdout || stdout.trim() === '') {
      return []
    }
    
    return stdout.split(',').map(s => s.trim()).filter(Boolean)
  } catch (error: any) {
    logger.warn('Failed to list installed Docker MCP servers')
    return []
  }
}

/**
 * Enable a Docker MCP server
 */
export async function enableDockerMCPServer(name: string): Promise<void> {
  logger.info(`Enabling Docker MCP server: ${name}`)
  
  try {
    await execa('docker', ['mcp', 'server', 'enable', name])
    logger.success(`Server "${name}" enabled in Docker MCP Toolkit`)
    
    // Check if it's actually running
    const installed = await listInstalledDockerMCPServers()
    if (installed.includes(name)) {
      logger.success(`✓ Server "${name}" is now available through the Docker MCP gateway`)
    }
  } catch (error: any) {
    throw new Error(`Failed to enable server "${name}": ${error.message}`)
  }
}

/**
 * Disable a Docker MCP server
 */
export async function disableDockerMCPServer(name: string): Promise<void> {
  logger.info(`Disabling Docker MCP server: ${name}`)
  
  try {
    await execa('docker', ['mcp', 'server', 'disable', name])
    logger.success(`Server "${name}" disabled in Docker MCP Toolkit`)
  } catch (error: any) {
    throw new Error(`Failed to disable server "${name}": ${error.message}`)
  }
}

/**
 * Get Docker MCP server info from catalog
 */
export async function getDockerMCPServerInfo(name: string): Promise<string | null> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'catalog', 'show'])
    
    // Find the server description in the catalog
    const lines = stdout.split('\n')
    for (const line of lines) {
      if (line.startsWith(`${name}:`)) {
        return line.substring(name.length + 1).trim()
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Check Docker MCP Toolkit status
 */
export async function checkDockerMCPStatus(): Promise<{
  dockerInstalled: boolean
  mcpToolkitAvailable: boolean
  gatewayConfigured: boolean
  installedServers: string[]
}> {
  const dockerInstalled = await isDockerAvailable()
  const mcpToolkitAvailable = dockerInstalled && await isDockerMCPAvailable()
  
  // Check if gateway is configured in Claude Code
  let gatewayConfigured = false
  try {
    const { stdout } = await execClaudeCLI(['mcp', 'get', 'docker-toolkit'])
    gatewayConfigured = stdout.includes('Connected')
  } catch {
    // Not configured
  }
  
  const installedServers = mcpToolkitAvailable 
    ? await listInstalledDockerMCPServers()
    : []
  
  return {
    dockerInstalled,
    mcpToolkitAvailable,
    gatewayConfigured,
    installedServers
  }
}

/**
 * Search Docker MCP servers by name or description
 */
export async function searchDockerMCPServers(query: string): Promise<DockerMCPServer[]> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'catalog', 'show'])
    
    const lines = stdout.split('\n')
    const results: DockerMCPServer[] = []
    const searchTerm = query.toLowerCase()
    
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/)
      if (match) {
        const [, name, description] = match
        // Search in both name and description
        if (name.toLowerCase().includes(searchTerm) || description.toLowerCase().includes(searchTerm)) {
          results.push({ 
            name, 
            description,
            category: categorizeDockerMCPServer(name, description),
            dockerHubUrl: `https://hub.docker.com/r/mcp/${name}`
          })
        }
      }
    }
    
    return results
  } catch (error: any) {
    logger.warn('Failed to search Docker MCP catalog')
    return []
  }
}

/**
 * Get full Docker MCP server information
 */
export async function getDockerMCPServerFullInfo(name: string): Promise<{ name: string; description: string } | null> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'catalog', 'show'])
    
    const lines = stdout.split('\n')
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/)
      if (match && match[1] === name) {
        return { name: match[1], description: match[2] }
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Get all Docker MCP servers with descriptions
 */
export async function getAllDockerMCPServers(): Promise<Array<{ name: string; description: string }>> {
  try {
    const { stdout } = await execa('docker', ['mcp', 'catalog', 'show'])
    
    const lines = stdout.split('\n')
    const servers: Array<{ name: string; description: string }> = []
    
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/)
      if (match) {
        servers.push({ name: match[1], description: match[2] })
      }
    }
    
    return servers
  } catch (error: any) {
    logger.warn('Failed to fetch Docker MCP catalog')
    return []
  }
}

/**
 * Get all Docker MCP servers with categories
 */
export async function getAllDockerMCPServersWithCategories(): Promise<DockerMCPServer[]> {
  const servers = await getAllDockerMCPServers()
  
  return servers.map(server => ({
    name: server.name,
    description: server.description,
    category: categorizeDockerMCPServer(server.name, server.description),
    dockerHubUrl: `https://hub.docker.com/r/mcp/${server.name}`
  }))
}

/**
 * Get Docker MCP servers by category
 */
export async function getDockerMCPServersByCategory(category: string): Promise<DockerMCPServer[]> {
  const allServers = await getAllDockerMCPServersWithCategories()
  return allServers.filter(server => server.category === category)
}

/**
 * Get Docker MCP servers grouped by category
 */
export async function getDockerMCPServersGroupedByCategory(): Promise<Record<string, DockerMCPServer[]>> {
  const servers = await getAllDockerMCPServersWithCategories()
  const grouped: Record<string, DockerMCPServer[]> = {}
  
  for (const server of servers) {
    if (!grouped[server.category]) {
      grouped[server.category] = []
    }
    grouped[server.category].push(server)
  }
  
  return grouped
}

/**
 * Initialize Docker MCP for first-time users
 */
export async function initializeDockerMCP(): Promise<void> {
  const status = await checkDockerMCPStatus()
  
  if (!status.dockerInstalled) {
    logger.error('Docker is not installed')
    logger.info('Please install Docker Desktop from: https://www.docker.com/products/docker-desktop')
    throw new Error('Docker not installed')
  }
  
  if (!status.mcpToolkitAvailable) {
    logger.error('Docker MCP Toolkit is not available')
    logger.info('Please enable it in Docker Desktop: Settings → Beta features → Enable Docker MCP Toolkit')
    throw new Error('Docker MCP Toolkit not available')
  }
  
  if (!status.gatewayConfigured) {
    logger.info('Docker MCP gateway is not configured in Claude Code')
    const setupPrompt = 'Would you like to set it up now? (y/n)'
    // Note: In a real implementation, you'd prompt the user here
    // For now, we'll just show instructions
    logger.info('\nTo set up the gateway, run:')
    logger.info('  bwc setup')
  }
  
  logger.success('Docker MCP Toolkit is ready!')
  
  if (status.installedServers.length > 0) {
    logger.info(`\nInstalled servers: ${status.installedServers.join(', ')}`)
  } else {
    logger.info('\nNo servers installed yet. Run "bwc list --mcps" to see available servers')
  }
}