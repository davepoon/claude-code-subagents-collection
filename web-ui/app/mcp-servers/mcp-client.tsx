'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HiMiniCheckBadge, HiUserGroup, HiBeaker } from 'react-icons/hi2'
import { MCPCard } from '@/components/mcp-card'
import { CategoryFilter } from '@/components/category-filter'
import { SearchBar } from '@/components/search-bar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, TrendingDown, TrendingUp, Calendar, CalendarDays, SortAsc, SortDesc } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { 
  type MCPServer, 
  VERIFICATION_STATUS,
  SOURCE_INDICATORS,
  EXECUTION_INDICATORS 
} from '@/lib/mcp-types'
import { type MCPCategoryMetadata } from '@/lib/mcp-server'

interface MCPPageClientProps {
  allServers: MCPServer[]
  categories: MCPCategoryMetadata[]
  popularServers?: MCPServer[]
  featuredServers?: MCPServer[]
  trendingServers?: MCPServer[]
}

export default function MCPPageClient({ 
  allServers, 
  categories,
  popularServers = [],
  featuredServers = [],
  trendingServers = []
}: MCPPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [selectedVerification, setSelectedVerification] = useState<string>('all')
  const [selectedExecutionType, setSelectedExecutionType] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'downloads-desc' | 'downloads-asc' | 'newest' | 'oldest' | 'name-asc' | 'name-desc'>('downloads-desc')
  
  // Pagination configuration
  const ITEMS_PER_PAGE = 24 // Divisible by 2 and 3 for responsive grid
  
  // Set initial filters from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const verificationParam = searchParams.get('verification')
    const sortParam = searchParams.get('sort')
    
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam)
    }
    
    if (verificationParam && ['verified', 'community', 'experimental'].includes(verificationParam)) {
      setSelectedVerification(verificationParam)
    }
    
    if (sortParam && ['downloads-desc', 'downloads-asc', 'newest', 'oldest', 'name-asc', 'name-desc'].includes(sortParam)) {
      setSortBy(sortParam as typeof sortBy)
    }
  }, [searchParams, categories])
  
  // Handle category change and update URL
  const handleCategoryChange = (category: string | 'all') => {
    setSelectedCategory(category)
    updateURL({ category })
  }
  
  // Handle verification change
  const handleVerificationChange = (verification: string) => {
    setSelectedVerification(verification)
    updateURL({ verification })
  }
  
  // Update URL with new parameters
  const updateURL = (newParams: { category?: string | 'all', verification?: string, sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newParams.category !== undefined) {
      if (newParams.category === 'all') {
        params.delete('category')
      } else {
        params.set('category', newParams.category)
      }
    }
    
    if (newParams.verification !== undefined) {
      if (newParams.verification === 'all') {
        params.delete('verification')
      } else {
        params.set('verification', newParams.verification)
      }
    }
    
    if (newParams.sort !== undefined) {
      if (newParams.sort === 'downloads-desc') {
        params.delete('sort') // Remove if it's the default
      } else {
        params.set('sort', newParams.sort)
      }
    }
    
    const newUrl = params.toString() ? `/mcp-servers?${params.toString()}` : '/mcp-servers'
    router.replace(newUrl)
  }
  
  const filteredServers = useMemo(() => {
    let filtered = allServers
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(server => server.category === selectedCategory)
    }
    
    // Filter by verification status
    if (selectedVerification !== 'all') {
      filtered = filtered.filter(server => server.verification.status === selectedVerification)
    }
    
    // Filter by execution type
    if (selectedExecutionType !== 'all') {
      filtered = filtered.filter(server => server.execution_type === selectedExecutionType)
    }
    
    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(server => server.source_registry?.type === selectedSource)
    }
    
    // Filter by search query
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(server => 
        server.name.toLowerCase().includes(normalizedQuery) ||
        server.display_name.toLowerCase().includes(normalizedQuery) ||
        server.description.toLowerCase().includes(normalizedQuery) ||
        server.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      )
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'downloads-desc':
          return (b.stats?.docker_pulls || 0) - (a.stats?.docker_pulls || 0)
        case 'downloads-asc':
          return (a.stats?.docker_pulls || 0) - (b.stats?.docker_pulls || 0)
        case 'newest':
          return new Date(b.stats?.last_updated || 0).getTime() - new Date(a.stats?.last_updated || 0).getTime()
        case 'oldest':
          return new Date(a.stats?.last_updated || 0).getTime() - new Date(b.stats?.last_updated || 0).getTime()
        case 'name-asc':
          return a.display_name.localeCompare(b.display_name)
        case 'name-desc':
          return b.display_name.localeCompare(a.display_name)
        default:
          return 0
      }
    })
    
    return sorted
  }, [allServers, selectedCategory, selectedVerification, selectedExecutionType, selectedSource, searchQuery, sortBy])
  
  // Group servers by verification status
  const groupedServers = useMemo(() => {
    const groups = {
      verified: [] as MCPServer[],
      community: [] as MCPServer[],
      experimental: [] as MCPServer[]
    }
    
    filteredServers.forEach(server => {
      groups[server.verification.status].push(server)
    })
    
    return groups
  }, [filteredServers])
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      selectedCategory !== 'all' ||
      selectedVerification !== 'all' ||
      selectedExecutionType !== 'all' ||
      selectedSource !== 'all'
    )
  }, [searchQuery, selectedCategory, selectedVerification, selectedExecutionType, selectedSource])
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedVerification, selectedExecutionType, selectedSource])
  
  // Calculate paginated servers
  const paginatedServers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredServers.slice(startIndex, endIndex)
  }, [filteredServers, currentPage])
  
  const totalPages = Math.ceil(filteredServers.length / ITEMS_PER_PAGE)
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5 // Maximum number of page buttons to show
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      // Calculate range around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      // Add ellipsis if needed
      if (start > 2) pages.push('...')
      
      // Add pages around current
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // Add ellipsis if needed
      if (end < totalPages - 1) pages.push('...')
      
      // Always show last page
      if (totalPages > 1) pages.push(totalPages)
    }
    
    return pages
  }
  
  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Smooth scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">MCP Servers</h1>
          <p className="text-muted-foreground">
            Explore {allServers.length} Model Context Protocol (MCP) servers to extend Claude&apos;s capabilities. 
            Connect to databases, APIs, and external tools seamlessly.
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-6">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search MCP servers by name, description, or tags..."
          />
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <CategoryFilter 
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            categories={categories}
          />
        </div>
        
        {/* Verification Tabs */}
        <Tabs value={selectedVerification} onValueChange={handleVerificationChange} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              All Servers
              <Badge variant="secondary" className="ml-2">
                {filteredServers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="verified">
              <HiMiniCheckBadge className="h-4 w-4 text-blue-500 mr-1" />
              Verified
              <Badge variant="secondary" className="ml-2">
                {groupedServers.verified.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="community">
              <HiUserGroup className="h-4 w-4 text-blue-600 mr-1" />
              Community
              <Badge variant="secondary" className="ml-2">
                {groupedServers.community.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="experimental">
              <HiBeaker className="h-4 w-4 text-amber-600 mr-1" />
              Experimental
              <Badge variant="secondary" className="ml-2">
                {groupedServers.experimental.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Additional Filters */}
        <div className="flex justify-between mb-6 flex-wrap gap-4">
          {/* Source Filter */}
          <Tabs value={selectedSource} onValueChange={setSelectedSource}>
            <TabsList>
              <TabsTrigger value="all">All Sources</TabsTrigger>
              <TabsTrigger value="docker">
                {SOURCE_INDICATORS.docker.icon} Docker
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Sort Dropdown - aligned to the right */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort: {
                  sortBy === 'downloads-desc' ? 'Most Downloaded' :
                  sortBy === 'downloads-asc' ? 'Least Downloaded' :
                  sortBy === 'newest' ? 'Newest First' :
                  sortBy === 'oldest' ? 'Oldest First' :
                  sortBy === 'name-asc' ? 'A to Z' :
                  sortBy === 'name-desc' ? 'Z to A' :
                  'Most Downloaded'
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setSortBy('downloads-desc')
                updateURL({ sort: 'downloads-desc' })
              }}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Most Downloaded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('downloads-asc')
                updateURL({ sort: 'downloads-asc' })
              }}>
                <TrendingDown className="h-4 w-4 mr-2" />
                Least Downloaded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('newest')
                updateURL({ sort: 'newest' })
              }}>
                <Calendar className="h-4 w-4 mr-2" />
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('oldest')
                updateURL({ sort: 'oldest' })
              }}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('name-asc')
                updateURL({ sort: 'name-asc' })
              }}>
                <SortAsc className="h-4 w-4 mr-2" />
                A to Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('name-desc')
                updateURL({ sort: 'name-desc' })
              }}>
                <SortDesc className="h-4 w-4 mr-2" />
                Z to A
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Featured Sections - Only show when no filters are active and on first page */}
        {!hasActiveFilters && currentPage === 1 && (popularServers.length > 0 || featuredServers.length > 0 || trendingServers.length > 0) && (
          <div className="mb-12">
            {/* Popular Servers */}
            {popularServers.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">🔥 Popular</h2>
                  <Badge variant="secondary">{popularServers.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularServers.map((server) => (
                    <MCPCard key={server.path} server={server} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Featured Servers */}
            {featuredServers.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">⭐ Featured</h2>
                  <Badge variant="secondary">{featuredServers.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredServers.map((server) => (
                    <MCPCard key={server.path} server={server} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Trending Servers */}
            {trendingServers.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">📈 Trending</h2>
                  <Badge variant="secondary">{trendingServers.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingServers.map((server) => (
                    <MCPCard key={server.path} server={server} />
                  ))}
                </div>
              </div>
            )}
            
            <hr className="my-8 border-border/50" />
          </div>
        )}
        
        {/* All Servers Section Header - Show when featured sections are visible on page 1 */}
        {(!hasActiveFilters && currentPage === 1 && (popularServers.length > 0 || featuredServers.length > 0 || trendingServers.length > 0)) && (
          <h2 className="text-2xl font-bold mb-4">All Servers</h2>
        )}
        
        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredServers.length > 0 && (
            <span>
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredServers.length)}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredServers.length)} of {filteredServers.length} servers
              {hasActiveFilters && ` (filtered from ${allServers.length} total)`}
              {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.displayName || selectedCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
          )}
        </div>
        
        {/* Grid */}
        {filteredServers.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {paginatedServers.map((server) => (
                <MCPCard key={server.path} server={server} />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mb-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={currentPage === 1 ? undefined : () => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={currentPage === totalPages ? undefined : () => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No MCP servers found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}