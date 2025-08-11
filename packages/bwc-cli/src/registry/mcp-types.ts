import { z } from 'zod';

// User Input Schema for MCP server configuration
export const UserInputValidationSchema = z.object({
  exists: z.boolean().optional(),
  is_directory: z.boolean().optional(),
  is_file: z.boolean().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  min_length: z.number().optional(),
  max_length: z.number().optional(),
  options: z.array(z.string()).optional(), // for select type
});

export const UserInputSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  type: z.enum(['path', 'string', 'boolean', 'number', 'url', 'select', 'password']),
  description: z.string(),
  required: z.boolean().default(true),
  default: z.any().optional(),
  placeholder: z.string().optional(),
  validation: UserInputValidationSchema.optional(),
  env_var: z.string().optional(),
  arg_position: z.number().optional(),
  config_path: z.string().optional(), // JSON path in config (e.g., "env.API_KEY")
});

// Source Registry Schema
export const SourceRegistrySchema = z.object({
  type: z.enum(['github', 'smithery', 'docker', 'mcpmarket', 'manual', 'community']),
  url: z.string().optional(),
  id: z.string().optional(), // Registry-specific ID
  last_fetched: z.string().optional(),
  auto_update: z.boolean().default(true),
  verified_by: z.string().optional(), // Who verified this source
});

// MCP Server Security Schema
export const MCPSecuritySchema = z.object({
  auth_type: z.enum(['none', 'oauth2', 'oauth2.1', 'api-key']),
  permissions: z.array(z.string()),
  resource_indicators: z.boolean().optional(),
  elicitation_schema: z.any().nullable().optional(),
});

// MCP Server Verification Schema
export const MCPVerificationSchema = z.object({
  status: z.enum(['verified', 'community', 'experimental']),
  last_tested: z.string(),
  tested_with: z.array(z.string()),
  security_audit: z.boolean().optional(),
});

// MCP Server Sources Schema
export const MCPSourcesSchema = z.object({
  official: z.string().optional(),
  docker: z.string().optional(),
  npm: z.string().optional(),
  marketplace: z.object({
    smithery: z.string().url().optional(),
    mcpmarket: z.string().url().optional(),
  }).optional(),
});

// MCP Server Stats Schema
export const MCPStatsSchema = z.object({
  github_stars: z.number().optional(),
  docker_pulls: z.number().optional(),
  npm_downloads: z.number().optional(),
  last_updated: z.string().optional(),
});

// MCP Installation Method Schema
export const MCPInstallationMethodSchema = z.object({
  type: z.enum(['docker', 'npm', 'manual', 'binary', 'bwc', 'claude-cli']),
  recommended: z.boolean().optional(),
  command: z.string().optional(),
  config_example: z.string().optional(),
  steps: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

// Main MCP Server Schema
export const MCPServerSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  category: z.enum([
    // Original categories (for backward compatibility)
    'databases',
    'file-systems',
    'apis',
    'monitoring',
    'development',
    'ai-tools',
    'productivity',
    'web',
    // New expanded categories
    'web-search',
    'browser-automation',
    'memory-management',
    'email-integration',
    'blockchain-crypto',
    'ai-task-management',
    'developer-tools',
    'api-development',
    'version-control',
    'database',
    'file-system',
    'cloud-infrastructure',
    'content-management',
    'social-media',
    'research-education',
    'media-generation',
    'data-extraction',
    'finance-trading',
    'analytics',
    'official',
    'utilities'
  ]),
  description: z.string(),
  server_type: z.enum(['stdio', 'streaming-http', 'websocket', 'sse', 'http']),
  protocol_version: z.string(),
  execution_type: z.enum(['local', 'remote', 'hybrid']).optional(),
  security: MCPSecuritySchema,
  sources: MCPSourcesSchema,
  verification: MCPVerificationSchema,
  stats: MCPStatsSchema.optional(),
  installation_methods: z.array(MCPInstallationMethodSchema),
  config_schema: z.any().optional(),
  tags: z.array(z.string()).default([]),
  badges: z.array(z.string()).optional(), // Visual badges for display
  file: z.string(),
  path: z.string(),
  user_inputs: z.array(UserInputSchema).optional(),
  source_registry: SourceRegistrySchema.optional(),
});

// Type exports
export type UserInputValidation = z.infer<typeof UserInputValidationSchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;
export type MCPSecurity = z.infer<typeof MCPSecuritySchema>;
export type MCPVerification = z.infer<typeof MCPVerificationSchema>;
export type MCPSources = z.infer<typeof MCPSourcesSchema>;
export type MCPStats = z.infer<typeof MCPStatsSchema>;
export type MCPInstallationMethod = z.infer<typeof MCPInstallationMethodSchema>;
export type MCPServer = z.infer<typeof MCPServerSchema>;

// MCP Registry Schema
export const MCPRegistrySchema = z.object({
  $schema: z.string(),
  version: z.string(),
  lastUpdated: z.string(),
  subagents: z.array(z.any()), // Using existing subagent schema
  commands: z.array(z.any()),  // Using existing command schema
  mcpServers: z.array(MCPServerSchema),
});

export type MCPRegistry = z.infer<typeof MCPRegistrySchema>;

// Helper type for MCP server installation
export interface MCPInstallConfig {
  server: MCPServer;
  method: MCPInstallationMethod;
  targetPath?: string;
  env?: Record<string, string>;
}

// Helper type for MCP server search
export interface MCPSearchOptions {
  query?: string;
  category?: MCPServer['category'];
  verificationStatus?: MCPVerification['status'];
  serverType?: MCPServer['server_type'];
  tags?: string[];
}

// Helper type for MCP server stats
export interface MCPServerWithStats extends MCPServer {
  stats: MCPStats;
  popularity: number; // Calculated from stats
}

// Source preference order
export const SOURCE_PREFERENCE = ['docker', 'npm', 'official'] as const;
export type SourceType = typeof SOURCE_PREFERENCE[number];

// Category metadata
export const MCP_CATEGORIES = {
  // Primary Categories (from Smithery)
  'web-search': {
    name: 'Web Search',
    icon: '🔍',
    description: 'Search engines and web discovery',
  },
  'browser-automation': {
    name: 'Browser Automation',
    icon: '🌐',
    description: 'Browser control and web automation',
  },
  'memory-management': {
    name: 'Memory Management',
    icon: '🧠',
    description: 'Context and memory persistence',
  },
  'email-integration': {
    name: 'Email Integration',
    icon: '📧',
    description: 'Email clients and communication',
  },
  'blockchain-crypto': {
    name: 'Blockchain & Crypto',
    icon: '₿',
    description: 'Cryptocurrency and blockchain data',
  },
  'ai-task-management': {
    name: 'AI Task Management',
    icon: '🤖',
    description: 'AI reasoning and task orchestration',
  },
  
  // Development Categories
  'developer-tools': {
    name: 'Developer Tools',
    icon: '🛠️',
    description: 'IDEs, terminals, and dev utilities',
  },
  'api-development': {
    name: 'API Development',
    icon: '🔌',
    description: 'API integration and testing',
  },
  'version-control': {
    name: 'Version Control',
    icon: '📝',
    description: 'Git and source control',
  },
  
  // Data & Infrastructure
  database: {
    name: 'Database',
    icon: '🗄️',
    description: 'Database management and queries',
  },
  'file-system': {
    name: 'File System',
    icon: '📁',
    description: 'File and document management',
  },
  'cloud-infrastructure': {
    name: 'Cloud Infrastructure',
    icon: '☁️',
    description: 'Cloud platforms and services',
  },
  
  // Productivity & Content
  productivity: {
    name: 'Productivity',
    icon: '📈',
    description: 'Task and project management',
  },
  'content-management': {
    name: 'Content Management',
    icon: '📝',
    description: 'Documents and content tools',
  },
  'social-media': {
    name: 'Social Media',
    icon: '💬',
    description: 'Social platforms integration',
  },
  
  // Specialized
  'research-education': {
    name: 'Research & Education',
    icon: '📚',
    description: 'Academic and learning resources',
  },
  'media-generation': {
    name: 'Media Generation',
    icon: '🎨',
    description: 'Image, video, and content creation',
  },
  'data-extraction': {
    name: 'Data Extraction',
    icon: '📊',
    description: 'Scraping and data processing',
  },
  'finance-trading': {
    name: 'Finance & Trading',
    icon: '💰',
    description: 'Financial data and trading',
  },
  
  // Analytics and monitoring (keeping for compatibility)
  analytics: {
    name: 'Analytics',
    icon: '📊',
    description: 'Analytics and monitoring tools',
  },
  
  // Special
  official: {
    name: 'Official',
    icon: '✅',
    description: 'Official MCP servers',
  },
  utilities: {
    name: 'Utilities',
    icon: '🔧',
    description: 'General tools and utilities',
  },
} as const;

// Verification status metadata
export const VERIFICATION_STATUS = {
  verified: {
    label: 'Verified',
    icon: '✅',
    color: 'green',
    description: 'Officially tested and security reviewed',
  },
  community: {
    label: 'Community',
    icon: '👥',
    color: 'blue',
    description: 'Popular and community validated',
  },
  experimental: {
    label: 'Experimental',
    icon: '⚠️',
    color: 'yellow',
    description: 'New or untested - use with caution',
  },
} as const;

// Source registry indicators
export const SOURCE_INDICATORS = {
  github: {
    icon: '📦',
    label: 'GitHub',
    color: '#24292e',
    description: 'Official MCP Repository',
  },
  smithery: {
    icon: '🏪',
    label: 'Smithery',
    color: '#7c3aed',
    description: 'Smithery.ai Registry',
  },
  docker: {
    icon: '🐳',
    label: 'Docker',
    color: '#2496ed',
    description: 'Docker Hub',
  },
  mcpmarket: {
    icon: '🛒',
    label: 'MCPMarket',
    color: '#10b981',
    description: 'MCP Market',
  },
  manual: {
    icon: '🛠️',
    label: 'Manual',
    color: '#6b7280',
    description: 'Manually Added',
  },
  community: {
    icon: '👥',
    label: 'Community',
    color: '#f59e0b',
    description: 'Community Contribution',
  },
} as const;

// Execution type indicators
export const EXECUTION_INDICATORS = {
  local: {
    icon: '🖥️',
    label: 'Local',
    description: 'Runs on your machine',
  },
  remote: {
    icon: '☁️',
    label: 'Remote',
    description: 'Runs on external server',
  },
  hybrid: {
    icon: '🔄',
    label: 'Hybrid',
    description: 'Can run locally or remotely',
  },
} as const;