import { Suspense } from 'react'
import { getAllMCPServers, getAllMCPCategories } from '@/lib/mcp-server'
import MCPPageClient from './mcp-client'

export default function MCPServersPage() {
  const allServers = getAllMCPServers()
  const categories = getAllMCPCategories()
  
  // Filter servers by badges for featured sections
  const popularServers = allServers.filter(server => 
    server.badges?.includes('popular')
  ).slice(0, 6)
  
  const featuredServers = allServers.filter(server => 
    server.badges?.includes('featured')
  ).slice(0, 6)
  
  const trendingServers = allServers.filter(server => 
    server.badges?.includes('trending')
  ).slice(0, 6)
  
  return (
    <Suspense fallback={null}>
      <MCPPageClient 
        allServers={allServers} 
        categories={categories}
        popularServers={popularServers}
        featuredServers={featuredServers}
        trendingServers={trendingServers}
      />
    </Suspense>
  )
}