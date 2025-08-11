---
"bwc-cli": minor
---

feat: Add MCP server support via Docker integration

- Add support for Docker MCP servers in BWC CLI
- Integrate with Docker Desktop's MCP catalog (100+ secure servers)
- Add `bwc add --mcp <server>` command for installing MCP servers
- Add `bwc mcp list` command to browse available servers
- Support user/project scopes for MCP server configuration
- Add interactive MCP server installation with user input handling
- Update web UI to display MCP servers alongside subagents and commands
- Add Docker Hub API integration for fetching server metadata and stats
- Implement smart server tracking to avoid duplicate installations
- Add copy buttons for installation commands on MCP detail pages
- Update configuration schema to include mcpServers field
- Remove direct MCP markdown file support in favor of Docker-only approach