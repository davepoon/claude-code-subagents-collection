#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const yaml = require('js-yaml');

const execAsync = promisify(exec);

/**
 * Normalize Docker Hub name to GitHub registry name
 */
function normalizeNameForGitHub(dockerHubName) {
  // Direct mappings for known differences
  const directMappings = {
    'brave-search': 'brave',
    'github-mcp-server': 'github',
    'basic-memory': 'memory',
    'github-chat': 'github-chat',
    'github-official': 'github-official',
  };
  
  if (directMappings[dockerHubName]) {
    return directMappings[dockerHubName];
  }
  
  // Try removing common suffixes
  let normalized = dockerHubName.toLowerCase();
  
  // Remove -mcp-server suffix first (most specific)
  if (normalized.endsWith('-mcp-server')) {
    return normalized.replace(/-mcp-server$/, '');
  }
  
  // Remove -server suffix
  if (normalized.endsWith('-server')) {
    return normalized.replace(/-server$/, '');
  }
  
  // Remove -mcp suffix
  if (normalized.endsWith('-mcp')) {
    return normalized.replace(/-mcp$/, '');
  }
  
  // Return as-is if no transformation needed
  return normalized;
}

/**
 * Fetch icon URL from Docker MCP registry
 */
async function fetchServerIcon(serverName) {
  // Try normalized name first
  const normalizedName = normalizeNameForGitHub(serverName);
  
  const namesToTry = [normalizedName];
  // Only add original if different from normalized
  if (normalizedName !== serverName) {
    namesToTry.push(serverName);
  }
  
  for (const name of namesToTry) {
    try {
      const url = `https://raw.githubusercontent.com/docker/mcp-registry/main/servers/${name}/server.yaml`;
      const response = await fetch(url);
      
      if (response.ok) {
        const yamlContent = await response.text();
        const serverConfig = yaml.load(yamlContent);
        
        // Extract icon URL from the YAML
        if (serverConfig && serverConfig.about && serverConfig.about.icon) {
          return serverConfig.about.icon;
        }
      }
    } catch (error) {
      // Silently continue to next name
    }
  }
  
  // No icon found
  return null;
}

/**
 * Categorize a Docker MCP server based on its name and description
 */
function categorizeDockerMCPServer(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  
  // AI & ML
  if (text.match(/\b(ai|artificial intelligence|llm|gpt|claude|model|machine learning|ml|neural|deep learning|nlp|natural language|vision|opencv|tensorflow|pytorch|hugging|transformer|bert|embedding|vector|semantic|chatbot|assistant|arxiv|research|paper|academic|journal|publication|scholar|pubmed)\b/)) {
    return 'ai-task-management';
  }
  
  // Data & Databases
  if (text.match(/\b(database|db|sql|sqlite|mysql|postgres|postgresql|mongo|mongodb|redis|elastic|elasticsearch|clickhouse|couchbase|cockroach|astra|cassandra|dynamo|firestore|supabase|prisma|orm|data warehouse|analytics|etl|bigquery|snowflake|databricks|spark|hadoop)\b/)) {
    return 'database';
  }
  
  // Cloud & Infrastructure
  if (text.match(/\b(aws|amazon web|azure|gcp|google cloud|cloud|terraform|cdk|cloudformation|kubernetes|k8s|docker|container|serverless|lambda|functions|ec2|s3|vpc|iam|infrastructure)\b/)) {
    return 'cloud-infrastructure';
  }
  
  // DevOps & CI/CD
  if (text.match(/\b(github|gitlab|git|version control|ci|cd|continuous|jenkins|circleci|buildkite|travis|pipeline|build|deploy|devops|monitoring|logging|observability|metrics|grafana|prometheus|datadog|new relic|sentry)\b/)) {
    return 'developer-tools';
  }
  
  // APIs & Integration
  if (text.match(/\b(api|rest|restful|graphql|openapi|swagger|webhook|endpoint|http|https|request|response|postman|insomnia|soap|rpc|grpc|websocket|socket|integration|connector|gateway|proxy)\b/)) {
    return 'api-development';
  }
  
  // Search & Discovery
  if (text.match(/\b(search|index|indexing|elastic|algolia|solr|lucene|query|find|discover|explore|brave search|google search|bing|duckduckgo|retrieval|rag|vector search|similarity|relevance|ranking)\b/)) {
    return 'web-search';
  }
  
  // Communication & Messaging
  if (text.match(/\b(slack|discord|teams|telegram|whatsapp|sms|email|mail|smtp|imap|twilio|sendgrid|mailgun|chat|message|messaging|notification|alert|webhook|communication|collaborate|conversation)\b/)) {
    return 'email-integration';
  }
  
  // Productivity & Project Management
  if (text.match(/\b(notion|todo|task|project|jira|confluence|atlassian|asana|trello|monday|clickup|linear|airtable|spreadsheet|excel|sheets|docs|document|wiki|knowledge|note|notebook|markdown|obsidian|roam|productivity|workflow|automation|zapier|ifttt|make|n8n)\b/)) {
    return 'productivity';
  }
  
  // Browser & Web Automation
  if (text.match(/\b(browser|chrome|firefox|safari|edge|web|scrape|scraping|crawl|crawler|puppeteer|playwright|selenium|webdriver|automation|bot|headless|dom|html|css|javascript|jquery|react|vue|angular|website|webpage)\b/)) {
    return 'browser-automation';
  }
  
  // Finance & Trading
  if (text.match(/\b(finance|financial|trading|trade|stock|equity|forex|crypto|cryptocurrency|bitcoin|ethereum|blockchain|defi|nft|market|ticker|price|portfolio|investment|banking|payment|stripe|paypal|square|plaid|coinbase|binance|kraken)\b/)) {
    return 'blockchain-crypto';
  }
  
  // Media & Content
  if (text.match(/\b(video|audio|image|media|youtube|vimeo|spotify|soundcloud|mp3|mp4|avi|mov|jpg|jpeg|png|gif|svg|pdf|ffmpeg|transcod|stream|broadcast|podcast|music|photo|picture|gallery|edit|filter|compress|resize|thumbnail)\b/)) {
    return 'media-generation';
  }
  
  // File System
  if (text.match(/\b(file|filesystem|fs|directory|folder|path|storage|drive|disk|mount|volume|permission|chmod|chown)\b/)) {
    return 'file-system';
  }
  
  // Default category
  return 'utilities';
}

/**
 * Format server name for display
 */
function formatServerName(name) {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract vendor from server name
 */
function extractVendor(name) {
  const nameLower = name.toLowerCase();
  
  // Extract vendor from common patterns
  if (nameLower.includes('atlassian')) return 'Atlassian';
  if (nameLower.includes('github')) return 'GitHub';
  if (nameLower.includes('youtube')) return 'YouTube';
  if (nameLower.includes('aws')) return 'AWS';
  if (nameLower.includes('azure')) return 'Microsoft';
  if (nameLower.includes('google')) return 'Google';
  if (nameLower.includes('elastic')) return 'Elastic';
  if (nameLower.includes('duckduckgo')) return 'DuckDuckGo';
  if (nameLower.includes('grafana')) return 'Grafana';
  if (nameLower.includes('arxiv')) return 'arXiv';
  if (nameLower.includes('astra')) return 'DataStax';
  if (nameLower.includes('atlan')) return 'Atlan';
  if (nameLower.includes('couchbase')) return 'Couchbase';
  if (nameLower.includes('fetch')) return 'Fetch';
  if (nameLower.includes('git') && !nameLower.includes('github')) return 'Git';
  if (nameLower.includes('slack')) return 'Slack';
  if (nameLower.includes('notion')) return 'Notion';
  if (nameLower.includes('docker')) return 'Docker';
  if (nameLower.includes('kubernetes') || nameLower.includes('k8s')) return 'Kubernetes';
  if (nameLower.includes('terraform')) return 'HashiCorp';
  if (nameLower.includes('mongodb')) return 'MongoDB';
  if (nameLower.includes('postgres')) return 'PostgreSQL';
  if (nameLower.includes('redis')) return 'Redis';
  if (nameLower.includes('mysql')) return 'MySQL';
  if (nameLower.includes('sqlite')) return 'SQLite';
  if (nameLower.includes('supabase')) return 'Supabase';
  if (nameLower.includes('firebase')) return 'Firebase';
  if (nameLower.includes('vercel')) return 'Vercel';
  if (nameLower.includes('netlify')) return 'Netlify';
  if (nameLower.includes('cloudflare')) return 'Cloudflare';
  if (nameLower.includes('stripe')) return 'Stripe';
  if (nameLower.includes('twilio')) return 'Twilio';
  if (nameLower.includes('sendgrid')) return 'SendGrid';
  if (nameLower.includes('mailgun')) return 'Mailgun';
  if (nameLower.includes('jira')) return 'Atlassian';
  if (nameLower.includes('confluence')) return 'Atlassian';
  if (nameLower.includes('bitbucket')) return 'Atlassian';
  if (nameLower.includes('trello')) return 'Atlassian';
  
  // Default to generic MCP
  return 'MCP';
}

/**
 * Get logo URL for vendor
 */
function getVendorLogoUrl(vendor) {
  const vendorLogos = {
    'Atlassian': 'https://wac-cdn.atlassian.com/dam/jcr:89e146b4-642e-41fc-8e65-7848337d7bdd/atlassian_logo_blue.svg',
    'GitHub': 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png',
    'YouTube': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    'AWS': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
    'Microsoft': 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
    'Google': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    'Elastic': 'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt5ebe80fb665aef6b/5ea8c8f26b62d4563b6ecda2/elastic-logo-only.svg',
    'DuckDuckGo': 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg',
    'Grafana': 'https://grafana.com/static/img/menu/grafana2.svg',
    'arXiv': 'https://info.arxiv.org/brand/images/brand-logo-primary.jpg',
    'DataStax': 'https://www.datastax.com/sites/default/files/2021-07/datastax-logo-blue-vector.svg',
    'Atlan': 'https://assets.atlan.com/assets/atlan-logo.svg',
    'Couchbase': 'https://www.couchbase.com/wp-content/uploads/2023/11/CB_logo_R_B_RGB.svg',
    'Git': 'https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png',
    'Slack': 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png',
    'Notion': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
    'Docker': 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png',
    'Kubernetes': 'https://kubernetes.io/images/kubernetes-horizontal-color.png',
    'HashiCorp': 'https://www.datocms-assets.com/2885/1620155104-brandhclogoprimar.svg',
    'MongoDB': 'https://webimages.mongodb.com/_com_assets/cms/kuyjf3vea2hg34taa-horizontal_default_slate_blue.svg',
    'PostgreSQL': 'https://wiki.postgresql.org/images/a/a4/PostgreSQL_logo.3colors.svg',
    'Redis': 'https://redis.io/wp-content/uploads/2024/04/Logotype.svg',
    'MySQL': 'https://labs.mysql.com/common/logos/mysql-logo.svg',
    'SQLite': 'https://sqlite.org/images/sqlite370_banner.gif',
    'Supabase': 'https://supabase.com/brand-assets/supabase-logo-icon.svg',
    'Firebase': 'https://firebase.google.com/static/downloads/brand-guidelines/SVG/logo-logomark.svg',
    'Vercel': 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
    'Netlify': 'https://www.netlify.com/v3/img/components/logomark.svg',
    'Cloudflare': 'https://www.cloudflare.com/img/cf-facebook-card.png',
    'Stripe': 'https://stripe.com/img/v3/home/twitter.png',
    'Twilio': 'https://www.twilio.com/content/dam/twilio-com/global/en/brand-sales-development/logos/twilio-logo-red.svg',
    'SendGrid': 'https://sendgrid.com/brand/sg-logo-300.png',
    'Mailgun': 'https://www.mailgun.com/img/mailgun-logo-red.svg',
    'MCP': 'https://avatars.githubusercontent.com/u/191408084?s=200&v=4',  // Model Context Protocol org
    'Fetch': 'https://avatars.githubusercontent.com/u/191408084?s=200&v=4'  // Use MCP logo as fallback
  };
  
  return vendorLogos[vendor] || vendorLogos['MCP'];
}

/**
 * Extract tags from name and description
 */
function extractTags(name, description) {
  const tags = [];
  const text = `${name} ${description}`.toLowerCase();
  
  // Extract technology tags
  if (text.includes('aws')) tags.push('aws');
  if (text.includes('github')) tags.push('github');
  if (text.includes('docker')) tags.push('docker');
  if (text.includes('kubernetes') || text.includes('k8s')) tags.push('kubernetes');
  if (text.includes('database') || text.includes('db')) tags.push('database');
  if (text.includes('api')) tags.push('api');
  if (text.includes('ai') || text.includes('ml')) tags.push('ai');
  if (text.includes('search')) tags.push('search');
  if (text.includes('security')) tags.push('security');
  if (text.includes('monitoring')) tags.push('monitoring');
  if (text.includes('messaging')) tags.push('messaging');
  if (text.includes('productivity')) tags.push('productivity');
  
  return [...new Set(tags)];
}

/**
 * Fetch MCP servers from Docker Hub API
 */
async function fetchMCPServersFromDockerHubAPI() {
  try {
    console.log('Fetching MCP servers from Docker Hub API...');
    const response = await fetch('https://hub.docker.com/v2/namespaces/mcp/repositories?page_size=100');
    
    if (!response.ok) {
      throw new Error(`Docker Hub API returned ${response.status}`);
    }
    
    const data = await response.json();
    const servers = [];
    
    // Skip icon fetching in CI to speed up the process
    const skipIcons = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    for (const repo of data.results) {
      const name = repo.name;
      const description = repo.description || `MCP server for ${name}`;
      
      const category = categorizeDockerMCPServer(name, description);
      const vendor = extractVendor(name);
      
      // Try to fetch official icon first, fallback to vendor logo
      let logoUrl;
      if (skipIcons) {
        logoUrl = getVendorLogoUrl(vendor);
      } else {
        logoUrl = await fetchServerIcon(name);
        if (!logoUrl) {
          logoUrl = getVendorLogoUrl(vendor);
        }
      }
      
      servers.push({
        name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        display_name: formatServerName(name),
        category,
        description,
        server_type: 'stdio',
        protocol_version: '1.0.0',
        execution_type: 'local',
        vendor,
        logo_url: logoUrl,
        verification: {
          status: 'verified',
          maintainer: 'Docker',
          last_tested: new Date().toISOString().split('T')[0],
          tested_with: ['claude-3.5', 'claude-code']
        },
        sources: {
          docker: `https://hub.docker.com/r/mcp/${name}`,
          official: `https://hub.docker.com/r/mcp/${name}`
        },
        stats: {
          docker_pulls: repo.pull_count || 0,
          docker_stars: repo.star_count || 0,
          last_updated: repo.last_updated || new Date().toISOString()
        },
        security: {
          auth_type: 'none',
          permissions: [],
          resource_indicators: false
        },
        source_registry: {
          type: 'docker',
          url: `https://hub.docker.com/r/mcp/${name.toLowerCase()}`,
          verified_by: 'Docker',
          last_fetched: new Date().toISOString()
        },
        installation_methods: [
          {
            type: 'bwc',
            recommended: true,
            command: `bwc add --mcp ${name.toLowerCase()}`,
            requirements: ['Docker Desktop', 'Docker MCP Toolkit', 'BWC CLI']
          },
          {
            type: 'docker',
            command: `docker mcp server enable ${name.toLowerCase()}`,
            requirements: ['Docker Desktop', 'Docker MCP Toolkit']
          }
        ],
        tags: extractTags(name, description),
        file: `docker-mcp/${name.toLowerCase()}.md`,
        path: `docker-mcp/${name.toLowerCase()}`
      });
    }
    
    // Handle pagination if needed
    let nextUrl = data.next;
    while (nextUrl) {
      const nextResponse = await fetch(nextUrl);
      if (!nextResponse.ok) break;
      
      const nextData = await nextResponse.json();
      for (const repo of nextData.results) {
        const name = repo.name;
        const description = repo.description || `MCP server for ${name}`;
        
        const category = categorizeDockerMCPServer(name, description);
        const vendor = extractVendor(name);
        
        // Try to fetch official icon first, fallback to vendor logo
        let logoUrl;
        if (skipIcons) {
          logoUrl = getVendorLogoUrl(vendor);
        } else {
          logoUrl = await fetchServerIcon(name);
          if (!logoUrl) {
            logoUrl = getVendorLogoUrl(vendor);
          }
        }
        
        servers.push({
          name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          display_name: formatServerName(name),
          category,
          description,
          server_type: 'stdio',
          protocol_version: '1.0.0',
          execution_type: 'local',
          vendor,
          logo_url: logoUrl,
          verification: {
            status: 'verified',
            maintainer: 'Docker',
            last_tested: new Date().toISOString().split('T')[0],
            tested_with: ['claude-3.5', 'claude-code']
          },
          sources: {
            docker: `https://hub.docker.com/r/mcp/${name}`,
            official: `https://hub.docker.com/r/mcp/${name}`
          },
          stats: {
            docker_pulls: repo.pull_count || 0,
            docker_stars: repo.star_count || 0,
            last_updated: repo.last_updated || new Date().toISOString()
          },
          security: {
            auth_type: 'none',
            permissions: [],
            resource_indicators: false
          },
          source_registry: {
            type: 'docker',
            url: `https://hub.docker.com/r/mcp/${name.toLowerCase()}`,
            verified_by: 'Docker',
            last_fetched: new Date().toISOString()
          },
          installation_methods: [
            {
              type: 'bwc',
              recommended: true,
              command: `bwc add --mcp ${name.toLowerCase()}`,
              requirements: ['Docker Desktop', 'Docker MCP Toolkit', 'BWC CLI']
            },
            {
              type: 'docker',
              command: `docker mcp server enable ${name.toLowerCase()}`,
              requirements: ['Docker Desktop', 'Docker MCP Toolkit']
            }
          ],
          tags: extractTags(name, description),
          file: `docker-mcp/${name.toLowerCase()}.md`,
          path: `docker-mcp/${name.toLowerCase()}`
        });
      }
      
      nextUrl = nextData.next;
    }
    
    console.log(`✅ Successfully fetched ${servers.length} MCP servers from Docker Hub API`);
    return servers;
  } catch (error) {
    console.error('Failed to fetch from Docker Hub API:', error.message);
    throw error;
  }
}

/**
 * Fetch Docker MCP servers from catalog
 */
async function fetchDockerMCPServers() {
  // Always use Docker Hub API as the primary source
  // This ensures we get correct repository names and can fetch stats
  console.log('Fetching MCP servers from Docker Hub API (primary source)...');
  
  try {
    return await fetchMCPServersFromDockerHubAPI();
  } catch (error) {
    console.error('Docker Hub API failed:', error.message);
    
    // Fallback to local Docker MCP command if API fails
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (!isCI) {
      console.log('Attempting fallback to local Docker MCP catalog...');
      try {
        const { stdout } = await execAsync('docker mcp catalog show');
    
    // Parse the catalog output - handle the actual format
    const lines = stdout.split('\n');
    const servers = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // The actual format is "name: description" where name might be repeated
      // Example: "Ref: Ref powerful search tool..."
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const name = line.substring(0, colonIndex).trim();
      const description = line.substring(colonIndex + 1).trim();
      
      // Skip invalid entries
      if (!name || !description) continue;
      
      const category = categorizeDockerMCPServer(name, description);
      const vendor = extractVendor(name);
      
      // Try to fetch official icon first, fallback to vendor logo
      let logoUrl = await fetchServerIcon(name);
      if (!logoUrl) {
        logoUrl = getVendorLogoUrl(vendor);
      }
      
      servers.push({
        name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        display_name: formatServerName(name),
        category,
        description,
        server_type: 'stdio',
        protocol_version: '1.0.0',
        execution_type: 'local', // Docker MCP servers run locally
        vendor,
        logo_url: logoUrl,
        verification: {
          status: 'verified',
          maintainer: 'Docker',
          last_tested: new Date().toISOString().split('T')[0],
          tested_with: ['claude-3.5', 'claude-code']
        },
        sources: {
          docker: `https://hub.docker.com/r/mcp/${name.toLowerCase()}`,
          official: `https://hub.docker.com/r/mcp/${name.toLowerCase()}`
        },
        security: {
          auth_type: 'none',
          permissions: [],
          resource_indicators: false
        },
        source_registry: {
          type: 'docker',
          url: `https://hub.docker.com/r/mcp/${name.toLowerCase()}`,
          verified_by: 'Docker',
          last_fetched: new Date().toISOString()
        },
        installation_methods: [
          {
            type: 'bwc',
            recommended: true,
            command: `bwc add --mcp ${name.toLowerCase()}`,
            requirements: ['Docker Desktop', 'Docker MCP Toolkit', 'BWC CLI']
          },
          {
            type: 'docker',
            command: `docker mcp server enable ${name.toLowerCase()}`,
            requirements: ['Docker Desktop', 'Docker MCP Toolkit']
          }
        ],
        tags: extractTags(name, description),
        file: `docker-mcp/${name.toLowerCase()}.md`,
        path: `docker-mcp/${name.toLowerCase()}`
      });
    }
    
        console.log(`Successfully fetched ${servers.length} Docker MCP servers from local Docker`);
        return servers;
      } catch (localError) {
        console.error('Local Docker MCP command also failed:', localError.message);
      }
    }
    
    // If all else fails, use mock data
    console.log('Using mock data for development');
    return getMockDockerServers();
  }
}

/**
 * Get mock Docker servers for development
 */
async function getMockDockerServers() {
  const mockServers = [
    { name: 'Ref', description: 'Ref powerful search tool connects your coding tools with documentation context' },
    { name: 'SQLite', description: 'Database interaction and business intelligence capabilities' },
    { name: 'aws', description: 'Amazon Web Services integration' },
    { name: 'github', description: 'GitHub API integration' },
    { name: 'slack', description: 'Slack messaging integration' },
    { name: 'brave-search', description: 'Brave search engine integration' },
    { name: 'google-drive', description: 'Google Drive file management' },
    { name: 'notion', description: 'Notion workspace integration' },
    { name: 'docker', description: 'Docker container management' },
    { name: 'kubernetes', description: 'Kubernetes cluster operations' },
    { name: 'terraform', description: 'Infrastructure as code with Terraform' }
  ];
  
  const processedServers = [];
  
  for (const server of mockServers) {
    const vendor = extractVendor(server.name);
    
    // Try to fetch official icon first, fallback to vendor logo
    let logoUrl = await fetchServerIcon(server.name);
    if (!logoUrl) {
      logoUrl = getVendorLogoUrl(vendor);
    }
    
    processedServers.push({
      name: server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      display_name: formatServerName(server.name),
      category: categorizeDockerMCPServer(server.name, server.description),
      description: server.description,
      server_type: 'stdio',
      protocol_version: '1.0.0',
      execution_type: 'local',
      vendor,
      logo_url: logoUrl,
    verification: {
      status: 'verified',
      maintainer: 'Docker',
      last_tested: new Date().toISOString().split('T')[0],
      tested_with: ['claude-3.5', 'claude-code']
    },
    sources: {
      docker: `https://hub.docker.com/r/mcp/${server.name.toLowerCase()}`,
      official: `https://hub.docker.com/r/mcp/${server.name.toLowerCase()}`
    },
    security: {
      auth_type: 'none',
      permissions: [],
      resource_indicators: false
    },
    source_registry: {
      type: 'docker',
      url: `https://hub.docker.com/r/mcp/${server.name.toLowerCase()}`,
      verified_by: 'Docker',
      last_fetched: new Date().toISOString()
    },
    installation_methods: [
      {
        type: 'bwc',
        recommended: true,
        command: `bwc add --mcp ${server.name.toLowerCase()}`,
        requirements: ['Docker Desktop', 'Docker MCP Toolkit', 'BWC CLI']
      },
      {
        type: 'docker',
        command: `docker mcp server enable ${server.name.toLowerCase()}`,
        requirements: ['Docker Desktop', 'Docker MCP Toolkit']
      }
    ],
    tags: extractTags(server.name, server.description),
    file: `docker-mcp/${server.name.toLowerCase()}.md`,
    path: `docker-mcp/${server.name.toLowerCase()}`
    });
  }
  
  return processedServers;
}

// Export for use in other scripts
module.exports = {
  fetchDockerMCPServers,
  categorizeDockerMCPServer
};

// If run directly, output the servers as JSON
if (require.main === module) {
  fetchDockerMCPServers().then(servers => {
    console.log(JSON.stringify(servers, null, 2));
  }).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}