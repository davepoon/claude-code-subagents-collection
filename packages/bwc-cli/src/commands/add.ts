import { Command } from 'commander'
import inquirer from 'inquirer'
import path from 'path'
import { ConfigManager } from '../config/manager.js'
import { RegistryClient } from '../registry/client.js'
import { logger } from '../utils/logger.js'
import { writeFile } from '../utils/files.js'
import { installMCPServer, configureInClaudeCode } from '../utils/mcp-installer.js'
import { addServerToMCPJson } from '../utils/mcp-json.js'
import { UserInputHandler } from '../utils/user-input-handler.js'
import { 
  isDockerMCPAvailable, 
  enableDockerMCPServer, 
  getDockerMCPServerInfo,
  checkDockerMCPStatus,
  setupDockerMCPGateway,
  listAvailableDockerMCPServers,
  listInstalledDockerMCPServers
} from '../utils/docker-mcp.js'

export function createAddCommand() {
  const add = new Command('add')
    .description('Add subagents, commands, or MCP servers')
    .option('-a, --agent <name>', 'add a specific subagent')
    .option('-c, --command <name>', 'add a specific command')
    .option('-m, --mcp <name>', 'add a specific MCP server')
    .option('-g, --global', 'force user-level installation (for subagents/commands)')
    .option('-u, --user', 'force user-level installation (alias for --global)')
    .option('-s, --scope <scope>', 'configuration scope for MCP servers: local, user, or project (default: "local")')
    .option('-e, --env <env...>', 'set environment variables for MCP servers (e.g. -e KEY=value)')
    .option('--setup', 'setup Docker MCP gateway in Claude Code')
    .option('--docker-mcp', 'use Docker MCP Toolkit for MCP servers')
    .action(async (options) => {
      try {
        const configManager = ConfigManager.getInstance()
        const registryClient = new RegistryClient(configManager)

        // Handle --user as alias for --global
        const forceUserLevel = options.global || options.user
        
        // If force user level is requested, load user config
        if (forceUserLevel) {
          await configManager.loadUserConfig()
        }

        // Check if using project config
        const isProject = await configManager.isUsingProjectConfig()
        
        if (isProject && !forceUserLevel) {
          logger.info('Installing to project configuration')
        } else if (forceUserLevel) {
          logger.info('Installing to user configuration')
        }

        // Handle Docker MCP setup
        if (options.setup) {
          await setupDockerMCPGatewayCommand(options.scope || 'project')
          return
        }

        if (options.agent) {
          await addSubagent(options.agent, configManager, registryClient, forceUserLevel)
        } else if (options.command) {
          await addCommand(options.command, configManager, registryClient, forceUserLevel)
        } else if (options.mcp) {
          // Validate scope
          const validScopes = ['local', 'user', 'project']
          const scope = options.scope || 'local'
          if (!validScopes.includes(scope)) {
            throw new Error(`Invalid scope: ${scope}. Must be one of: ${validScopes.join(', ')}`)
          }
          
          // Check if we should use Docker MCP
          if (options.dockerMcp || await shouldUseDockerMCP()) {
            await addDockerMCPServer(options.mcp, configManager)
          } else {
            await addMCPServer(options.mcp, configManager, registryClient, {
              scope,
              envVars: options.env || []
            })
          }
        } else {
          await interactiveAdd(configManager, registryClient, forceUserLevel)
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
      }
    })

  return add
}

async function addSubagent(
  name: string, 
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  forceUserLevel: boolean = false
): Promise<void> {
  const spinner = logger.spinner(`Fetching subagent: ${name}`)
  
  try {
    const subagent = await registryClient.findSubagent(name)
    
    if (!subagent) {
      spinner.fail(`Subagent "${name}" not found`)
      return
    }
    
    spinner.text = `Downloading ${subagent.name}...`
    
    const content = await registryClient.fetchFileContent(subagent.file)
    const subagentsPath = await configManager.getSubagentsPath()
    const filePath = path.join(subagentsPath, `${subagent.name}.md`)
    
    await writeFile(filePath, content)
    await configManager.addInstalledSubagent(subagent.name)
    
    spinner.succeed(`Successfully installed subagent: ${subagent.name}`)
    logger.info(`Location: ${filePath}`)
    logger.info(`Tools: ${subagent.tools.join(', ')}`)
  } catch (error) {
    spinner.fail('Failed to add subagent')
    throw error
  }
}

async function addCommand(
  name: string, 
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  forceUserLevel: boolean = false
): Promise<void> {
  const spinner = logger.spinner(`Fetching command: ${name}`)
  
  try {
    const command = await registryClient.findCommand(name)
    
    if (!command) {
      spinner.fail(`Command "${name}" not found`)
      return
    }
    
    spinner.text = `Downloading ${command.name}...`
    
    const content = await registryClient.fetchFileContent(command.file)
    const commandsPath = await configManager.getCommandsPath()
    const filePath = path.join(commandsPath, `${command.name}.md`)
    
    await writeFile(filePath, content)
    await configManager.addInstalledCommand(command.name)
    
    spinner.succeed(`Successfully installed command: ${command.prefix}${command.name}`)
    logger.info(`Location: ${filePath}`)
  } catch (error) {
    spinner.fail('Failed to add command')
    throw error
  }
}

async function interactiveAdd(
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  forceUserLevel: boolean = false
): Promise<void> {
  try {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'What would you like to add?',
        choices: [
          { name: 'Subagent', value: 'subagent' },
          { name: 'Command', value: 'command' },
          { name: 'MCP Server', value: 'mcp' }
        ]
      }
    ])

    if (type === 'subagent') {
      await interactiveAddSubagent(configManager, registryClient, forceUserLevel)
    } else if (type === 'command') {
      await interactiveAddCommand(configManager, registryClient, forceUserLevel)
    } else {
      await interactiveAddMCP(configManager, registryClient)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch registry')) {
      logger.error('Failed to connect to registry. Please check your internet connection.')
      logger.info('Registry URL: ' + await configManager.getRegistryUrl())
    } else {
      throw error
    }
  }
}

async function interactiveAddSubagent(
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  forceUserLevel: boolean = false
): Promise<void> {
  const subagents = await registryClient.getSubagents()
  
  const categories = [...new Set(subagents.map(s => s.category))].sort()
  
  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select a category:',
      choices: ['All', ...categories]
    }
  ])

  const filteredSubagents = category === 'All' 
    ? subagents 
    : subagents.filter(s => s.category === category)

  logger.info('Use SPACE to select/deselect, ENTER to confirm')
  
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select subagents to install:',
      choices: filteredSubagents.map(s => ({
        name: `${s.name} - ${s.description}`,
        value: s.name,
        short: s.name
      })),
      validate: (answer: string[]) => {
        if (answer.length < 1) {
          return 'You must select at least one subagent!'
        }
        return true
      }
    }
  ])

  if (!selected || selected.length === 0) {
    logger.warn('No subagents selected')
    return
  }

  logger.info(`Installing ${selected.length} subagent(s)...`)
  
  for (const name of selected) {
    await addSubagent(name, configManager, registryClient, forceUserLevel)
  }
}

async function interactiveAddCommand(
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  forceUserLevel: boolean = false
): Promise<void> {
  const commands = await registryClient.getCommands()
  
  const categories = [...new Set(commands.map(c => c.category))].sort()
  
  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select a category:',
      choices: ['All', ...categories]
    }
  ])

  const filteredCommands = category === 'All' 
    ? commands 
    : commands.filter(c => c.category === category)

  logger.info('Use SPACE to select/deselect, ENTER to confirm')
  
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select commands to install:',
      choices: filteredCommands.map(c => ({
        name: `${c.prefix}${c.name} - ${c.description}`,
        value: c.name,
        short: c.name
      })),
      validate: (answer: string[]) => {
        if (answer.length < 1) {
          return 'You must select at least one command!'
        }
        return true
      }
    }
  ])

  if (!selected || selected.length === 0) {
    logger.warn('No commands selected')
    return
  }

  logger.info(`Installing ${selected.length} command(s)...`)
  
  for (const name of selected) {
    await addCommand(name, configManager, registryClient, forceUserLevel)
  }
}

interface MCPOptions {
  scope: 'local' | 'user' | 'project'
  envVars: string[]
}

async function addMCPServer(
  name: string, 
  configManager: ConfigManager, 
  registryClient: RegistryClient,
  options: MCPOptions = { scope: 'local', envVars: [] }
): Promise<void> {
  const spinner = logger.spinner(`Fetching MCP server: ${name}`)
  
  try {
    const server = await registryClient.findMCPServer(name)
    
    if (!server) {
      spinner.fail(`MCP server "${name}" not found`)
      return
    }
    
    spinner.stop()
    
    // Show server details
    logger.info(`\n${server.display_name} - ${server.description}`)
    logger.info(`Verification: ${server.verification.status}`)
    
    // Security warning for experimental servers
    if (server.verification.status === 'experimental') {
      logger.warn('⚠️  This is an experimental server. Use with caution.')
    }
    
    // Select installation method - prefer claude-cli method
    let method = server.installation_methods.find(m => m.type === 'claude-cli' && m.recommended)
    if (!method) {
      // Fall back to other methods
      if (server.user_inputs && server.user_inputs.length > 0) {
        // Find the recommended non-BWC method or use the first available non-BWC method
        method = server.installation_methods.find(m => m.type !== 'bwc' && m.recommended) || 
                 server.installation_methods.find(m => m.type !== 'bwc')
      } else {
        // Find the recommended method or use the first available
        method = server.installation_methods.find(m => m.recommended) || server.installation_methods[0]
      }
    }
    
    if (!method) {
      logger.error('No installation methods available for this server')
      return
    }
    
    // Check if server requires user inputs
    let userInputs: Record<string, any> = {}
    let updatedConfigExample = method.config_example
    
    if (server.user_inputs && server.user_inputs.length > 0) {
      spinner.stop()
      
      // Collect user inputs
      const inputHandler = new UserInputHandler()
      userInputs = await inputHandler.collectInputs(server)
      
      // Validate inputs
      const validation = await inputHandler.validateInputs(userInputs, server)
      if (!validation.valid) {
        logger.error('Invalid inputs:')
        validation.errors.forEach(error => logger.error(`  - ${error}`))
        throw new Error('Invalid configuration inputs')
      }
      
      // Show summary
      inputHandler.showInputSummary(userInputs, server)
      
      // Apply inputs to config
      if (method.config_example) {
        try {
          const config = JSON.parse(method.config_example)
          const updatedConfig = await inputHandler.applyInputsToConfig(config, userInputs, server)
          updatedConfigExample = JSON.stringify(updatedConfig, null, 2)
          
          // Update the method with the new config
          method = { ...method, config_example: updatedConfigExample }
        } catch (error) {
          logger.warn('Could not apply user inputs to config automatically')
          logger.warn(`Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      
      spinner.start()
    }
    
    spinner.text = `Installing ${server.name} using ${method.type}...`
    
    try {
      // Execute the actual installation
      await installMCPServer(server, method)
      
      spinner.succeed(`Successfully installed ${server.name}`)
      
      // Handle different scopes
      if (options.scope === 'project') {
        // For project scope, update .mcp.json with user inputs applied
        await addServerToMCPJson(server, updatedConfigExample, options.envVars)
      }
      
      // Update BWC config to track installation
      await configManager.addInstalledMCPServer(server.name)
      
      // Configure in Claude Code with appropriate scope and updated config
      await configureInClaudeCode(server, method, options)
      
      // Show scope-specific information
      logger.info(`\nMCP server configured with ${options.scope} scope`)
      
      if (options.scope === 'project') {
        logger.info('The server is now available to all team members via .mcp.json')
      } else if (options.scope === 'user') {
        logger.info('The server is now available across all your projects')
      } else {
        logger.info('The server is available for this project only')
      }
      
    } catch (installError) {
      spinner.fail(`Failed to install ${server.name}`)
      throw installError
    }
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail('Failed to add MCP server')
    }
    throw error
  }
}

async function interactiveAddMCP(
  configManager: ConfigManager, 
  registryClient: RegistryClient
): Promise<void> {
  // Check if we should use Docker MCP
  if (await shouldUseDockerMCP()) {
    // Use Docker MCP interactive mode
    await interactiveAddDockerMCP(configManager)
    return
  }
  
  // Original interactive MCP add logic (fallback for non-Docker)
  const { scope } = await inquirer.prompt([
    {
      type: 'list',
      name: 'scope',
      message: 'Select configuration scope for MCP servers:',
      choices: [
        { name: 'Local (this project only)', value: 'local' },
        { name: 'Project (shared with team via .mcp.json)', value: 'project' },
        { name: 'User (across all your projects)', value: 'user' }
      ],
      default: 'local'
    }
  ])
  
  const servers = await registryClient.getMCPServers()
  
  // Group by verification status
  const verificationGroups = servers.reduce((acc, server) => {
    const status = server.verification.status
    if (!acc[status]) acc[status] = []
    acc[status].push(server)
    return acc
  }, {} as Record<string, typeof servers>)
  
  const { verification } = await inquirer.prompt([
    {
      type: 'list',
      name: 'verification',
      message: 'Select verification status:',
      choices: ['All', 'verified', 'community', 'experimental']
    }
  ])

  const filteredServers = verification === 'All' 
    ? servers 
    : verificationGroups[verification] || []

  logger.info('Use SPACE to select/deselect, ENTER to confirm')
  
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select MCP servers to install:',
      choices: filteredServers.map(s => ({
        name: `${s.name} - ${s.description}`,
        value: s.name,
        short: s.name
      })),
      validate: (answer: string[]) => {
        if (answer.length < 1) {
          return 'You must select at least one MCP server!'
        }
        return true
      }
    }
  ])

  if (!selected || selected.length === 0) {
    logger.warn('No MCP servers selected')
    return
  }

  // Ask for environment variables if project scope
  let envVars: string[] = []
  if (scope === 'project') {
    const { hasEnvVars } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasEnvVars',
        message: 'Do you need to set environment variables?',
        default: false
      }
    ])
    
    if (hasEnvVars) {
      const { envInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'envInput',
          message: 'Enter environment variables (e.g., API_KEY=value SECRET=value):',
          validate: (input) => {
            if (!input.trim()) return 'Please enter at least one environment variable'
            return true
          }
        }
      ])
      envVars = envInput.split(' ').filter((e: string) => e.includes('='))
    }
  }
  
  logger.info(`Installing ${selected.length} MCP server(s) with ${scope} scope...`)
  
  let successCount = 0
  let failureCount = 0
  
  for (const name of selected) {
    try {
      await addMCPServer(name, configManager, registryClient, { scope, envVars })
      successCount++
    } catch (error) {
      logger.error(`Failed to install ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failureCount++
    }
  }
  
  if (successCount > 0) {
    logger.success(`\nSuccessfully installed ${successCount} MCP server(s)`)
  }
  if (failureCount > 0) {
    logger.warn(`Failed to install ${failureCount} MCP server(s)`)
  }
}

// Helper functions for Docker MCP integration
async function setupDockerMCPGatewayCommand(scope: string): Promise<void> {
  logger.heading('Setting up Docker MCP Gateway')
  
  try {
    await setupDockerMCPGateway(scope as 'local' | 'project' | 'user')
    
    logger.success('\n✅ Docker MCP gateway configured!')
    logger.info('\nNext steps:')
    logger.info('1. Restart Claude Code to activate the gateway')
    logger.info('2. Run "bwc add --mcp <server-name>" to add servers')
    logger.info('3. Or run "bwc add" for interactive mode')
  } catch (error: any) {
    logger.error(`Failed to setup gateway: ${error.message}`)
  }
}

async function shouldUseDockerMCP(): Promise<boolean> {
  // Check if Docker MCP is available and preferred
  const status = await checkDockerMCPStatus()
  return status.dockerInstalled && status.mcpToolkitAvailable
}

async function addDockerMCPServer(name: string, configManager: ConfigManager): Promise<void> {
  const spinner = logger.spinner(`Adding Docker MCP server: ${name}`)
  
  try {
    // Check if server exists in catalog
    const info = await getDockerMCPServerInfo(name)
    
    if (!info) {
      spinner.fail(`Server "${name}" not found in Docker MCP catalog`)
      logger.info('Run "bwc list --mcps" to see available servers')
      return
    }
    
    spinner.stop()
    logger.info(`\n📦 ${name}`)
    logger.info(`   ${info}`)
    
    // Check if already installed
    const installed = await listInstalledDockerMCPServers()
    if (installed.includes(name)) {
      // Check if it's already in BWC config
      const trackedServers = await configManager.getInstalledMCPServers()
      if (trackedServers.includes(name)) {
        logger.warn(`Server "${name}" is already installed and tracked in BWC config`)
        return
      }
      
      // Server is installed but not tracked in BWC config
      logger.warn(`Server "${name}" is already installed in Docker MCP`)
      
      const { shouldTrack } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldTrack',
          message: 'Would you like to add it to your BWC config file for tracking?',
          default: true
        }
      ])
      
      if (shouldTrack) {
        await configManager.addInstalledMCPServer(name)
        spinner.succeed(`Server "${name}" added to BWC config for tracking`)
      } else {
        logger.info('Server not added to BWC config')
      }
      return
    }
    
    // Enable the server
    spinner.start(`Enabling ${name} in Docker MCP Toolkit...`)
    await enableDockerMCPServer(name)
    
    // Update BWC config to track it
    await configManager.addInstalledMCPServer(name)
    
    spinner.succeed(`Server "${name}" added successfully!`)
    
    logger.info('\n✅ The server is now available through the Docker MCP gateway')
    logger.info('   Try using it in Claude Code!')
    
  } catch (error: any) {
    spinner.fail(`Failed to add server "${name}"`)
    logger.error(error.message)
  }
}

async function interactiveAddDockerMCP(configManager: ConfigManager): Promise<void> {
  logger.heading('Add Docker MCP Servers')
  
  const spinner = logger.spinner('Fetching available servers...')
  
  try {
    const available = await listAvailableDockerMCPServers()
    const installed = await listInstalledDockerMCPServers()
    
    spinner.stop()
    
    if (available.length === 0) {
      logger.warn('No servers available in Docker MCP catalog')
      return
    }
    
    // Filter out already installed servers
    const notInstalled = available.filter(s => !installed.includes(s))
    
    if (notInstalled.length === 0) {
      logger.info('All available servers are already installed!')
      logger.info(`Installed servers: ${installed.join(', ')}`)
      return
    }
    
    logger.info(`Found ${available.length} servers (${installed.length} installed)`)
    logger.info('Use SPACE to select, ENTER to confirm')
    
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: 'Select servers to install:',
      choices: notInstalled.map(name => ({
        name: name,
        value: name,
        checked: false
      })),
      pageSize: 15,
      validate: (answer: string[]) => {
        if (answer.length < 1) {
          return 'You must select at least one server!'
        }
        return true
      }
    }])
    
    if (!selected || selected.length === 0) {
      logger.warn('No servers selected')
      return
    }
    
    logger.info(`\nInstalling ${selected.length} server(s)...`)
    
    for (const name of selected) {
      await addDockerMCPServer(name, configManager)
    }
    
    logger.success('\n🎉 All selected servers have been added!')
    logger.info('They are now available through the Docker MCP gateway in Claude Code')
    
  } catch (error: any) {
    spinner.fail('Failed to fetch servers')
    logger.error(error.message)
  }
}