# bwc-cli - Build With Claude CLI

CLI tool for installing Claude Code subagents and commands from the community collection.

## Installation

```bash
# Global installation (recommended)
npm install -g bwc-cli

# Or use directly with npx
npx bwc-cli@latest init
```

## Quick Start

```bash
# Initialize user configuration (default)
bwc init

# Or initialize project configuration (team sharing)
bwc init --project

# Add a subagent (goes to project if project config exists)
bwc add --agent python-pro

# Add a command (goes to project if project config exists)
bwc add --command dockerize

# Browse and select interactively
bwc add
```

## Commands

### `bwc init`

Initialize bwc configuration.

```bash
# Initialize user configuration (default)
bwc init

# Initialize project-level configuration
bwc init --project
```

Options:
- `-p, --project` - Create project-level configuration
- `-f, --force` - Overwrite existing configuration

**Important**: When you initialize with `--project`, all subsequent `bwc add` commands will install to the project by default (`.claude/agents/` and `.claude/commands/`)

### `bwc add`

Add subagents or commands to your Claude Code setup.

```bash
# Add a specific subagent
bwc add --agent python-pro

# Add a specific command
bwc add --command dockerize

# Interactive mode (browse and select multiple items)
bwc add

# Force user-level installation even with project config
bwc add --agent python-pro --user

# Force project-level installation (requires project config)
bwc add --agent python-pro --project
```

Options:
- `-a, --agent <name>` - Add a specific subagent
- `-c, --command <name>` - Add a specific command
- `-u, --user` - Force user-level installation (when project config exists)
- `-p, --project` - Force project-level installation (requires project config)

**Default Behavior**:
- If `./bwc.config.json` exists → installs to project (`.claude/agents/`, `.claude/commands/`)
- Otherwise → installs to user level (`~/.claude/agents/`, `~/.claude/commands/`)

**Interactive Mode Tips:**
- Use **SPACE** to select/deselect items
- Use **ENTER** to confirm and install selected items
- You can select multiple items at once

### `bwc list`

List available subagents and commands.

```bash
# List all items
bwc list

# List subagents only
bwc list --agents

# List commands only
bwc list --commands

# Filter by category
bwc list --category language-specialists

# Show only installed items
bwc list --installed
```

Options:
- `-a, --agents` - List subagents only
- `-c, --commands` - List commands only
- `--category <category>` - Filter by category
- `--installed` - Show only installed items

### `bwc search`

Search for subagents and commands.

```bash
# Search both subagents and commands
bwc search python

# Search subagents only
bwc search python --agents

# Search commands only
bwc search docker --commands
```

Options:
- `-a, --agents` - Search subagents only
- `-c, --commands` - Search commands only

### `bwc install`

Install all dependencies from configuration (perfect for team onboarding).

```bash
# Install all items listed in configuration
bwc install
```

This reads from either:
- Project configuration (`./bwc.config.json`) if it exists
- User configuration (`~/.bwc/config.json`) otherwise

### `bwc remove`

Remove installed subagents, commands, or MCP servers.

```bash
# Remove a specific subagent
bwc remove --agent python-pro

# Remove a specific command
bwc remove --command dockerize

# Remove an MCP server
bwc remove --mcp postgres

# Force user-level removal (when project config exists)
bwc remove --agent python-pro --user

# Force project-level removal (requires project config)
bwc remove --agent python-pro --project

# Skip confirmation prompt
bwc remove --agent python-pro --yes

# Interactive mode
bwc remove
```

Options:
- `-a, --agent <name>` - Remove a specific subagent
- `-c, --command <name>` - Remove a specific command
- `-m, --mcp <name>` - Remove a specific MCP server
- `-u, --user` - Force user-level removal (when project config exists)
- `-p, --project` - Force project-level removal (requires project config)
- `-y, --yes` - Skip confirmation prompt

**Default Behavior**:
- If `./bwc.config.json` exists → removes from project
- Otherwise → removes from user level
- Use `--user` to force user-level removal
- Use `--project` to force project-level removal

### `bwc status`

Check the health of your BWC configuration and verify MCP server installations.

```bash
# Check basic configuration status
bwc status

# Verify MCP server installations (deep verification)
bwc status --verify-mcp

# Get machine-readable JSON output
bwc status --json
```

Options:
- `--verify-mcp` - Perform deep verification of MCP server installations
- `--json` - Output results in JSON format for scripting

**Features**:
- Shows configuration location and scope
- Lists installed subagents, commands, and MCP servers
- Verifies MCP server installations against actual Claude Code configuration
- Provides fix commands for missing or misconfigured servers
- Reminds about Docker gateway setup when needed

**Example Output**:
```
✓ BWC Configuration Status

Configuration: /path/to/bwc.config.json (project)

📦 Installed Items:
  Subagents: 3
  Commands: 2
  MCP Servers: 4

🔌 MCP Servers:
  ✓ postgres (Docker)
  ✓ github (Docker)
  ✓ linear-server (SSE)
  ⚠ supabase (Not installed)
    Fix: bwc add --mcp supabase --docker-mcp
    Note: Run 'bwc add --setup' to configure Docker gateway if needed
```

## Configuration

### User Configuration

Located at `~/.bwc/config.json` (available across all your projects):

```json
{
  "version": "1.0",
  "registry": "https://buildwithclaude.com/registry.json",
  "paths": {
    "subagents": "~/.claude/agents/",
    "commands": "~/.claude/commands/"
  },
  "installed": {
    "subagents": ["python-pro", "react-wizard"],
    "commands": ["dockerize", "test-runner"]
  }
}
```

### Project Configuration

Located at `./bwc.config.json`:

```json
{
  "version": "1.0",
  "registry": "https://buildwithclaude.com/registry.json",
  "paths": {
    "subagents": ".claude/agents/",
    "commands": ".claude/commands/"
  },
  "installed": {
    "subagents": ["backend-architect", "database-admin"],
    "commands": ["api-tester", "dockerize"]
  }
}
```

**Note:** Add `.claude/` to your `.gitignore` to avoid committing installed files.

## Configuration Scope Behavior

When you initialize BWC with `bwc init --project`, it creates a project configuration that becomes the default for all installations:

```bash
# Initialize project configuration
bwc init --project

# These all install to PROJECT by default (./claude/agents/, ./claude/commands/)
bwc add --agent python-pro      # → ./claude/agents/python-pro.md
bwc add --command dockerize     # → ./claude/commands/dockerize.md

# MCP servers need explicit scope
bwc add --mcp postgres --scope project  # → ./bwc.config.json

# Override to install at user level
bwc add --agent golang-pro --user       # → ~/.claude/agents/golang-pro.md

# Force project level (when user config exists but you want project)
bwc add --agent rust-pro --project      # → .claude/agents/rust-pro.md
```

## Use Cases

### Team Onboarding

Share your Claude Code setup with your team:

```bash
# Initialize project configuration
bwc init --project

# Add project-specific subagents (automatically project-scoped)
bwc add --agent backend-architect
bwc add --agent database-admin
bwc add --command dockerize

# Commit configuration
git add bwc.config.json
git commit -m "Add Claude Code configuration"

# Team members install dependencies
git clone <repo>
bwc install
```

### Bulk Installation

Add multiple items at once:

```bash
# Search for testing-related tools
bwc search test

# Add multiple items interactively
bwc add
# Select "Subagent"
# Select category or "All"
# Use SPACE to select multiple items
# Press ENTER to install all
```

### CI/CD Integration

Automate Claude Code setup in your pipelines:

```yaml
# .github/workflows/setup.yml
- name: Install bwc CLI
  run: npm install -g bwc-cli
  
- name: Install Claude dependencies
  run: bwc install
```

## MCP Servers

### 🔌 Connect Claude to External Tools

BWC CLI supports MCP (Model Context Protocol) servers through two providers:
- **Docker MCP Gateway**: Secure containerized servers (100+ available)
- **Claude CLI**: Remote servers via SSE/HTTP for cloud services

### Prerequisites

- **For Docker MCP**: Docker Desktop - Download from [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)
- **For Remote MCP**: Claude CLI installed (`npm install -g @anthropic/claude-cli`)

### Quick Start

#### Docker MCP Servers (Local/Containerized)
```bash
# Setup Docker gateway (one-time)
bwc add --setup

# Add a Docker MCP server
bwc add --mcp postgres --docker-mcp

# Add with specific scope
bwc add --mcp postgres --docker-mcp --scope project
```

#### Remote MCP Servers (SSE/HTTP)
```bash
# Add an SSE server
bwc add --mcp linear-server --transport sse --url https://mcp.linear.app/sse --scope project

# Add an HTTP server with authentication
bwc add --mcp api-server --transport http --url https://api.example.com/mcp \
  --header "Authorization: Bearer token" --scope project

# Add with environment variables
bwc add --mcp custom-server --transport stdio --env API_KEY=secret --scope user
```

#### Interactive Mode
```bash
# Browse and select servers interactively
bwc add
# Choose "MCP Server"
# Select provider (Docker or Remote)
# Configure as prompted
```

### Installation Scopes

#### Local Scope (Default)
- **Location**: Claude Code local configuration
- **Availability**: Current machine only
- **Use Case**: Personal experimentation
- **Sharing**: Not shared with team

#### User Scope
- **Location**: `~/.bwc/config.json` and Claude Code user config
- **Availability**: All your projects on this machine
- **Use Case**: Personal tools across projects
- **Sharing**: Not shared with team

#### Project Scope (Team Sharing)
- **Location**: `./bwc.config.json` and `./.mcp.json`
- **Availability**: Current project for all team members
- **Use Case**: Team collaboration
- **Sharing**: Committed to version control

```bash
# Local scope (default)
bwc add --mcp postgres --docker-mcp

# User scope (all your projects)
bwc add --mcp postgres --docker-mcp --scope user

# Project scope (team sharing)
bwc add --mcp postgres --docker-mcp --scope project

# Remote servers also support all scopes
bwc add --mcp api-server --transport http --url https://api.example.com --scope project
```

**Important for Team Sharing**:
- Project scope servers are saved to `.mcp.json` for Claude Code
- Docker servers use the gateway and are NOT in `.mcp.json`
- SSE/HTTP servers ARE saved in `.mcp.json` with `"type"` field
- Commit both `bwc.config.json` and `.mcp.json` to share with team

### Team Collaboration Example

```bash
# Team lead sets up project MCP servers
bwc init --project

# Add Docker MCP servers
bwc add --mcp postgres --docker-mcp --scope project
bwc add --mcp github --docker-mcp --scope project

# Add remote MCP server
bwc add --mcp linear-server --transport sse \
  --url https://mcp.linear.app/sse --scope project

# Commit configuration
git add bwc.config.json .mcp.json
git commit -m "Add team MCP servers"

# Team members clone and install
git clone <repo>
bwc install  # Installs all configured MCP servers

# Verify installations
bwc status --verify-mcp
```

### Provider Comparison

#### Docker MCP Gateway
- 🔒 **Container Isolation**: Complete system protection
- 🔑 **Secure Secrets**: Docker manages all API keys
- ✅ **Verified Images**: All servers signed by Docker
- 🌐 **Single Gateway**: One secure endpoint for all servers
- 📦 **100+ Servers**: Large catalog of containerized servers

#### Remote MCP (Claude CLI)
- ☁️ **Cloud Services**: Direct connection to cloud APIs
- 🔐 **Custom Auth**: Support for API keys and headers
- 🌍 **SSE/HTTP**: Real-time and REST API connections
- 🤝 **Team Sharing**: Easy sharing via `.mcp.json`
- ⚡ **No Docker Required**: Works without Docker Desktop

### MCP Commands

```bash
# Add MCP servers
bwc add --mcp <name> [options]

# Remove MCP servers
bwc remove --mcp <name>

# Check status and verify installations
bwc status               # Basic status
bwc status --verify-mcp  # Deep verification with fix suggestions

# List installed servers
bwc list --mcps

# Setup Docker gateway
bwc add --setup
```

### Examples

#### Adding a Docker MCP Server
```bash
$ bwc add --mcp postgres --docker-mcp --scope project
✓ Enabled postgres in Docker MCP Gateway
✓ Server available through Docker gateway
✓ Configuration saved to project
```

#### Adding a Remote SSE Server
```bash
$ bwc add --mcp linear-server --transport sse \
    --url https://mcp.linear.app/sse --scope project
✓ Configured linear-server in Claude Code
✓ Added to .mcp.json for team sharing
```

#### Verifying Installations
```bash
$ bwc status --verify-mcp
✓ BWC Configuration Status

🔌 MCP Server Verification:
  ✓ postgres (Docker) - Installed
  ✓ linear-server (SSE) - Installed in .mcp.json
  ⚠ github (Docker) - Not installed
    Fix: bwc add --mcp github --docker-mcp
    Note: Run 'bwc add --setup' if Docker gateway not configured
```

### Popular MCP Servers

#### Docker MCP Servers
- **postgres**: PostgreSQL database operations
- **github**: GitHub API integration  
- **elasticsearch**: Search and analytics
- **redis**: Caching and data store
- **mongodb**: NoSQL database

#### Remote MCP Servers (SSE/HTTP)
- **linear-server**: Linear issue tracking (SSE)
- **supabase**: Supabase backend services (HTTP)
- **stripe**: Payment processing (HTTP)
- **slack**: Team communication (HTTP)
- **notion**: Knowledge management (HTTP)

View all servers at [buildwithclaude.com/mcp-servers](https://buildwithclaude.com/mcp-servers)


## Categories

### Subagent Categories
- `development-architecture` - Backend, frontend, mobile, API design
- `language-specialists` - Language-specific expertise (Python, Go, Rust, etc.)
- `infrastructure-operations` - DevOps, cloud, deployment, databases
- `quality-security` - Code review, security, testing, performance
- `data-ai` - Data science, ML/AI engineering, analytics
- `specialized-domains` - Domain-specific tools (payments, blockchain, etc.)
- `crypto-trading` - Cryptocurrency and DeFi applications

### Command Categories
- `ci-deployment` - CI/CD and deployment commands
- `code-analysis-testing` - Code quality and testing commands
- `context-loading-priming` - Context and priming commands
- `documentation-changelogs` - Documentation commands
- `project-task-management` - Project management commands
- `version-control-git` - Git and version control commands
- `miscellaneous` - Other specialized commands

## Proxy Configuration

BWC CLI automatically detects and uses HTTP/HTTPS proxy settings from environment variables, making it compatible with corporate networks.

### Environment Variables

```bash
# Set proxy for HTTPS traffic
export HTTPS_PROXY=https://proxy.company.com:8080

# Set proxy for HTTP traffic  
export HTTP_PROXY=http://proxy.company.com:8080

# For corporate proxies with SSL certificate issues
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Usage Examples

```bash
# Set proxy environment variables and run commands
export HTTPS_PROXY=https://proxy.company.com:8080
bwc list

# Or set for single command
HTTPS_PROXY=https://proxy.company.com:8080 bwc add --agent python-pro

# Corporate proxy with SSL certificate handling
NODE_TLS_REJECT_UNAUTHORIZED=0 HTTPS_PROXY=https://proxy.company.com:8080 bwc list
```

**Note**: The `NODE_TLS_REJECT_UNAUTHORIZED=0` setting disables SSL certificate verification, which is commonly needed for corporate proxies that intercept HTTPS traffic with their own certificates.

## Troubleshooting

### Configuration not found
Run `bwc init` to create configuration.

### Failed to fetch registry
Check your internet connection. The CLI needs access to `buildwithclaude.com`.

If behind a corporate proxy, see the [Proxy Configuration](#proxy-configuration) section above.

### "Unable to get local issuer certificate" error
This occurs when using corporate proxies that intercept SSL traffic. Set the environment variable:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Permission denied
On macOS/Linux, you may need to use `sudo npm install -g bwc-cli`.

### Interactive mode not selecting
Use **SPACE** to select items (not Enter). Selected items show a ● marker. Press **ENTER** only to confirm.

## Contributing

Contributions are welcome! Please visit our [GitHub repository](https://github.com/davepoon/claude-code-subagents-collection) to submit pull requests for new subagents, commands, or MCP servers.

## Development

```bash
# Clone the repository
git clone https://github.com/davepoon/claude-code-subagents-collection.git
cd claude-code-subagents-collection/packages/bwc-cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Run in development mode
npm run dev

# Link for local testing
npm link
```

## Links

- **Website**: [buildwithclaude.com](https://buildwithclaude.com)
- **Documentation**: [buildwithclaude.com/docs/cli](https://buildwithclaude.com/docs/cli)
- **GitHub**: [github.com/davepoon/claude-code-subagents-collection](https://github.com/davepoon/claude-code-subagents-collection)
- **Issues**: [Report bugs or suggest features](https://github.com/davepoon/claude-code-subagents-collection/issues)

## License

MIT © Dave Poon