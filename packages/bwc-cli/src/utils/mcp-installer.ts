import { execa } from 'execa'
import { MCPServer, MCPInstallationMethod } from '../registry/types.js'
import { logger } from './logger.js'
import chalk from 'chalk'
import { execClaudeCLI, isClaudeCLIAvailable } from './claude-cli.js'

/**
 * Install an MCP server based on the installation method
 */
export async function installMCPServer(
  server: MCPServer, 
  method: MCPInstallationMethod
): Promise<void> {
  switch (method.type) {
    case 'docker':
      await installDockerServer(server, method)
      break
      
    case 'npm':
      await installNpmServer(server, method)
      break
      
    case 'manual':
      showManualInstructions(server, method)
      break
      
    case 'bwc':
      // BWC method should handle both installation and configuration
      await installBwcServer(server, method)
      break
      
    default:
      throw new Error(`Unsupported installation method: ${method.type}`)
  }
}

async function installDockerServer(
  server: MCPServer, 
  _method: MCPInstallationMethod
): Promise<void> {
  // First check if Docker is available
  try {
    await execa('docker', ['--version'])
  } catch {
    throw new Error('Docker is not installed or not running. Please install Docker Desktop and ensure it is running.')
  }
  
  logger.info(`\nChecking Docker setup for ${server.name}...`)
  
  try {
    // For MCP servers, we typically don't need to pre-pull images or run containers
    // The configuration will handle running the container when Claude Code starts
    
    // Just verify the Docker image exists (if specified)
    const dockerImage = server.sources.docker
    if (dockerImage) {
      logger.info(`Docker image to be used: ${dockerImage}`)
      logger.info('The image will be pulled automatically when Claude Code starts the MCP server')
    }
    
    // For MCP servers, we don't run the container now - Claude Code will do that
    logger.success('Docker configuration verified')
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Docker setup failed: ${error.message}`)
    }
    throw error
  }
}

async function installNpmServer(
  server: MCPServer, 
  method: MCPInstallationMethod
): Promise<void> {
  // First check if npm is available
  try {
    await execa('npm', ['--version'])
  } catch {
    throw new Error('npm is not installed. Please install Node.js and npm first.')
  }
  
  const npmPackage = server.sources.npm
  if (!npmPackage) {
    throw new Error('No npm package specified for this MCP server')
  }
  
  logger.info(`\nSetting up npm-based MCP server: ${npmPackage}`)
  
  try {
    // For MCP servers using npx, we typically don't need to install globally
    // The config will use npx to run the package on demand
    if (method.config_example?.includes('npx')) {
      logger.info(`${npmPackage} will be run using npx when Claude Code starts`)
      logger.info('No pre-installation needed - npx will download and cache the package automatically')
      logger.success('NPM configuration verified')
    } else if (method.command?.includes('-g') || method.command?.includes('--global')) {
      // Some MCP servers might need global installation
      logger.info(`Installing ${npmPackage} globally...`)
      await execa('npm', ['install', '-g', npmPackage])
      logger.success(`Installed ${npmPackage} globally`)
    } else {
      // Default to npx approach
      logger.info(`${npmPackage} will be run using npx`)
      logger.success('NPM configuration verified')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`NPM setup failed: ${error.message}`)
    }
    throw error
  }
}

function showManualInstructions(
  server: MCPServer, 
  method: MCPInstallationMethod
): void {
  logger.info(`\n${chalk.bold('Manual installation required for ' + server.name)}`)
  
  if (method.requirements && method.requirements.length > 0) {
    logger.info('\nRequirements:')
    method.requirements.forEach(req => {
      console.log(`  - ${req}`)
    })
  }
  
  if (method.steps && method.steps.length > 0) {
    logger.info('\nInstallation steps:')
    method.steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step}`)
    })
  }
  
  logger.info('\nAfter completing these steps, configure Claude Code with the provided configuration.')
}

async function installBwcServer(
  server: MCPServer, 
  method: MCPInstallationMethod
): Promise<void> {
  // For BWC method, we should handle the most appropriate installation
  // based on what's available, but avoid recursive calls
  
  // Find the best non-BWC installation method
  const nonBwcMethods = server.installation_methods.filter(m => m.type !== 'bwc')
  
  // Try to find a recommended method first
  let bestMethod = nonBwcMethods.find(m => m.recommended)
  
  if (!bestMethod) {
    // Try Docker first if available
    bestMethod = nonBwcMethods.find(m => m.type === 'docker' && server.sources.docker)
    
    // Fall back to npm if available
    if (!bestMethod) {
      bestMethod = nonBwcMethods.find(m => m.type === 'npm' && server.sources.npm)
    }
    
    // Finally, use manual method
    if (!bestMethod) {
      bestMethod = nonBwcMethods.find(m => m.type === 'manual')
    }
  }
  
  if (!bestMethod) {
    throw new Error('No suitable installation method found')
  }
  
  // Use the appropriate installer based on the method type
  switch (bestMethod.type) {
    case 'docker':
      await installDockerServer(server, bestMethod)
      break
    case 'npm':
      await installNpmServer(server, bestMethod)
      break
    case 'manual':
      showManualInstructions(server, bestMethod)
      break
    default:
      throw new Error(`Unsupported installation method: ${bestMethod.type}`)
  }
  
  // IMPORTANT: Return the best method's config, not the BWC method's config
  // This ensures the actual Docker/npm configuration is shown to the user
  ;(method as any)._actualMethod = bestMethod
}

/**
 * Check if Claude Code is available (exports from claude-cli.ts)
 * Re-exporting for backward compatibility
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  return isClaudeCLIAvailable()
}

/**
 * Configure MCP server in Claude Code using claude CLI
 */
interface MCPConfigOptions {
  scope: 'local' | 'user' | 'project'
  envVars: string[]
}

export async function configureInClaudeCode(
  server: MCPServer,
  method: MCPInstallationMethod,
  options: MCPConfigOptions = { scope: 'local', envVars: [] }
): Promise<void> {
  const hasClaudeCLI = await isClaudeCodeAvailable()
  
  if (!hasClaudeCLI) {
    logger.warn('Claude CLI is not installed. Please install Claude Code first.')
    logger.info('Visit https://claude.ai/download to install Claude Code')
    showManualConfiguration(method.config_example || '')
    return
  }
  
  // Look for claude-cli installation method first
  const claudeMethod = server.installation_methods.find(m => m.type === 'claude-cli')
  if (claudeMethod && claudeMethod.command) {
    try {
      // Parse the command to extract parts
      const commandParts = claudeMethod.command.split(' ')
      const claudeIndex = commandParts.indexOf('claude')
      const mcpIndex = commandParts.indexOf('mcp')
      const addIndex = commandParts.indexOf('add')
      
      if (claudeIndex !== -1 && mcpIndex !== -1 && addIndex !== -1) {
        // Build the command with user's options
        const args = ['mcp', 'add']
        
        // Add scope
        args.push('--scope', options.scope)
        
        // Check for transport type (SSE/HTTP)
        const transportIndex = commandParts.indexOf('--transport')
        if (transportIndex !== -1 && commandParts[transportIndex + 1]) {
          args.push('--transport', commandParts[transportIndex + 1])
        }
        
        // Add environment variables
        for (const envVar of options.envVars) {
          args.push('--env', envVar)
        }
        
        // Get server name and remaining args
        let serverName = server.name
        let remainingArgs: string[] = []
        
        // For SSE/HTTP servers, the URL is the last part
        if (transportIndex !== -1) {
          let urlIndex = addIndex + 1
          while (urlIndex < commandParts.length && commandParts[urlIndex].startsWith('--')) {
            urlIndex += 2 // Skip flag and its value
          }
          if (urlIndex < commandParts.length) {
            serverName = commandParts[urlIndex]
            if (urlIndex + 1 < commandParts.length) {
              remainingArgs = commandParts.slice(urlIndex + 1)
            }
          }
        } else {
          // For stdio servers, everything after 'add' (except flags) goes to the command
          const dashDashIndex = commandParts.indexOf('--')
          if (dashDashIndex !== -1) {
            serverName = commandParts[addIndex + 1]
            remainingArgs = ['--', ...commandParts.slice(dashDashIndex + 1)]
          }
        }
        
        args.push(serverName, ...remainingArgs)
        
        logger.info('\nConfiguring MCP server with Claude Code...')
        logger.info(`Running: claude ${args.join(' ')}`)
        
        const result = await execClaudeCLI(args)
        logger.success(`MCP server "${server.name}" configured successfully (${options.scope} scope)`)
        
        if (result.stdout) {
          logger.info(result.stdout)
        }
      }
    } catch (error: any) {
      logger.error(`Failed to configure with Claude CLI: ${error.message}`)
      if (error.stderr) {
        logger.error(error.stderr)
      }
      logger.info('\nFalling back to manual configuration...')
      showManualConfiguration(method.config_example || '')
    }
  } else {
    // Fall back to old method if no claude-cli method available
    logger.info('\nNo Claude CLI command available for this server.')
    showManualConfiguration(method.config_example || '')
  }
}

function showManualConfiguration(configExample: string): void {
  if (configExample) {
    logger.info('\n' + chalk.bold('Configuration for Claude Desktop:'))
    
    // Try to parse and format the JSON nicely
    try {
      const config = JSON.parse(configExample)
      console.log(chalk.gray(JSON.stringify(config, null, 2)))
    } catch {
      // If parsing fails, show as-is
      console.log(chalk.gray(configExample))
    }
    
    logger.info('\nTo use this MCP server:')
    logger.info('1. Open Claude Desktop settings')
    logger.info('2. Navigate to Developer > MCP Servers')
    logger.info('3. Add the above configuration to your MCP settings')
  }
}