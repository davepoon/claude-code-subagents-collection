import fs from 'fs'
import path from 'path'
import { MCPServer } from './mcp-types'

export interface MCPCategoryMetadata {
  id: string
  name: string
  displayName: string
  count: number
  description?: string
  icon: string
}

export function getAllMCPServers(): MCPServer[] {
  try {
    const registryPath = path.join(process.cwd(), 'public', 'registry.json')
    if (!fs.existsSync(registryPath)) {
      console.warn('Registry file not found, returning empty MCP servers array')
      return []
    }
    
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    return registry.mcpServers || []
  } catch (error) {
    console.error('Error loading MCP servers:', error)
    return []
  }
}

export function getMCPServer(slug: string): MCPServer | null {
  const servers = getAllMCPServers()
  return servers.find(s => s.slug === slug) || null
}

export function getMCPServerBySlug(slug: string): MCPServer | null {
  return getMCPServer(slug)
}

export function getAllMCPCategories(): MCPCategoryMetadata[] {
  const servers = getAllMCPServers()
  const categoryMap = new Map<string, number>()
  
  servers.forEach(server => {
    if (server.category) {
      categoryMap.set(server.category, (categoryMap.get(server.category) || 0) + 1)
    }
  })
  
  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    displayName: name,
    count,
    icon: '📦'
  })).sort((a, b) => a.name.localeCompare(b.name))
}

export function getMCPCategories(): string[] {
  const servers = getAllMCPServers()
  const categories = new Set<string>()
  
  servers.forEach(server => {
    if (server.category) {
      categories.add(server.category)
    }
  })
  
  return Array.from(categories).sort()
}

export function getMCPServersByCategory(category: string): MCPServer[] {
  const servers = getAllMCPServers()
  return servers.filter(s => s.category === category)
}

export function searchMCPServers(query: string): MCPServer[] {
  const servers = getAllMCPServers()
  const searchTerm = query.toLowerCase()
  
  return servers.filter(server => 
    server.name.toLowerCase().includes(searchTerm) ||
    server.display_name?.toLowerCase().includes(searchTerm) ||
    server.description.toLowerCase().includes(searchTerm) ||
    server.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  )
}