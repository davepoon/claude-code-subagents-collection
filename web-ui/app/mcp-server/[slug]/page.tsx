import { notFound } from 'next/navigation'
import { getMCPServerBySlug, getAllMCPServers } from '@/lib/mcp-server'
import MCPServerPageClient from './page-client'

export async function generateStaticParams() {
  const servers = getAllMCPServers()
  
  return servers.map((server) => ({
    slug: server.path.replace(/\//g, '-')
  }))
}

export default async function MCPServerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const server = getMCPServerBySlug(slug)
  
  if (!server) {
    notFound()
  }
  
  return <MCPServerPageClient server={server} />
}