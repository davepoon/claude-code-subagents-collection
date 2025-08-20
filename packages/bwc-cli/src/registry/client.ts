import got from 'got'
import { HttpsProxyAgent, HttpProxyAgent } from 'hpagent'
import { Registry, RegistrySchema, Subagent, Command, MCPServer } from './types.js'
import { ConfigManager } from '../config/manager.js'

export class RegistryClient {
  private static instance: RegistryClient | null = null
  private configManager: ConfigManager

  constructor(configManager: ConfigManager) {
    this.configManager = configManager
  }

  private getGotInstance(): typeof got {
    const httpsProxy = process.env.HTTPS_PROXY
    const httpProxy = process.env.HTTP_PROXY
    
    if (httpsProxy || httpProxy) {
      const agents: { https?: HttpsProxyAgent; http?: HttpProxyAgent } = {}
      
      // Check if SSL verification should be disabled (for corporate proxies)
      const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
      
      if (httpsProxy) {
        agents.https = new HttpsProxyAgent({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          scheduling: 'lifo',
          proxy: httpsProxy,
          rejectUnauthorized
        })
      }
      
      if (httpProxy) {
        agents.http = new HttpProxyAgent({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          scheduling: 'lifo',
          proxy: httpProxy
        })
      }
      
      return got.extend({ 
        agent: agents,
        https: { rejectUnauthorized }
      })
    }
    
    return got
  }

  static getInstance(): RegistryClient {
    if (!RegistryClient.instance) {
      RegistryClient.instance = new RegistryClient(ConfigManager.getInstance())
    }
    return RegistryClient.instance
  }

  async fetchRegistry(): Promise<Registry> {
    const registryUrl = await this.configManager.getRegistryUrl()
    
    try {
      const response = await this.getGotInstance()(registryUrl).json()
      return RegistrySchema.parse(response)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch registry: ${error.message}`)
      }
      throw error
    }
  }

  async getSubagents(): Promise<Subagent[]> {
    const registry = await this.fetchRegistry()
    return registry.subagents
  }

  async getCommands(): Promise<Command[]> {
    const registry = await this.fetchRegistry()
    return registry.commands
  }

  async findSubagent(name: string): Promise<Subagent | undefined> {
    const subagents = await this.getSubagents()
    return subagents.find(s => s.name === name)
  }

  async findCommand(name: string): Promise<Command | undefined> {
    const commands = await this.getCommands()
    return commands.find(c => c.name === name)
  }

  async searchSubagents(query: string): Promise<Subagent[]> {
    const subagents = await this.getSubagents()
    const lowerQuery = query.toLowerCase()
    
    return subagents.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  async searchCommands(query: string): Promise<Command[]> {
    const commands = await this.getCommands()
    const lowerQuery = query.toLowerCase()
    
    return commands.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  async fetchFileContent(fileUrl: string): Promise<string> {
    const baseUrl = 'https://raw.githubusercontent.com/davepoon/claude-code-subagents-collection/main/'
    const fullUrl = baseUrl + fileUrl
    
    try {
      return await this.getGotInstance()(fullUrl).text()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch file content: ${error.message}`)
      }
      throw error
    }
  }

  // MCP Server methods
  async getMCPServers(): Promise<MCPServer[]> {
    const registry = await this.fetchRegistry()
    return registry.mcpServers || []
  }

  async getMCPServer(name: string): Promise<MCPServer | undefined> {
    const servers = await this.getMCPServers()
    return servers.find(s => s.name === name)
  }

  async listMCPServers(): Promise<MCPServer[]> {
    return this.getMCPServers()
  }

  async searchMCPServers(query: string): Promise<MCPServer[]> {
    const servers = await this.getMCPServers()
    const lowerQuery = query.toLowerCase()
    
    return servers.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.display_name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      s.category.toLowerCase().includes(lowerQuery)
    )
  }

  async findMCPServer(name: string): Promise<MCPServer | undefined> {
    const servers = await this.getMCPServers()
    return servers.find(s => s.name === name)
  }
}