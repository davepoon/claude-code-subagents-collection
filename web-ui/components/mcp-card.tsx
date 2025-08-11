import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Shield, Users, AlertCircle } from 'lucide-react'
import { type MCPServer } from '@/lib/mcp-types'

interface MCPCardProps {
  server: MCPServer
}

export function MCPCard({ server }: MCPCardProps) {
  const getVerificationIcon = () => {
    switch (server.verification.status) {
      case 'verified':
        return <Shield className="h-4 w-4 text-green-600" />
      case 'community':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'experimental':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getVerificationColor = () => {
    switch (server.verification.status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'community':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'experimental':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Link href={`/mcp-server/${server.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {server.icon && (
                <img 
                  src={server.icon} 
                  alt={`${server.name} icon`}
                  className="h-5 w-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              {server.display_name || server.name}
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${getVerificationColor()}`}
            >
              {getVerificationIcon()}
              {server.verification.status}
            </Badge>
          </div>
          <CardDescription className="mt-2 line-clamp-2">
            {server.description}
          </CardDescription>
          {server.docker_image && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{server.docker_image}</span>
            </div>
          )}
          {server.stats && (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {server.stats.downloads && server.stats.downloads > 0 && (
                <span>{server.stats.downloads.toLocaleString()} downloads</span>
              )}
              {server.stats.lastUpdated && (
                <span>Updated {new Date(server.stats.lastUpdated).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
    </Link>
  )
}