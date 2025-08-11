name: Fetch MCP Servers from Registries

on:
  schedule:
    # Run twice daily at 2 AM and 2 PM UTC
    - cron: '0 2,14 * * *'
  workflow_dispatch:
    inputs:
      registry:
        description: 'Registry to fetch from'
        required: false
        default: 'docker'
        type: choice
        options:
          - docker

jobs:
  fetch-servers:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup Docker (optional for Docker MCP)
        uses: docker/setup-buildx-action@v3
        continue-on-error: true
          
      - name: Install dependencies for MCP importers
        run: |
          cd scripts/mcp-importers
          npm install
          
      - name: Fetch MCP servers from registries
        run: |
          echo "Skipping MCP markdown file generation - we only use Docker MCP now"
          # cd scripts/mcp-importers
          # node fetch-from-registries.js \
          #   --registry ${{ github.event.inputs.registry || 'docker' }} \
          #   --output ../../mcp-servers
            
      - name: Install dependencies for registry generation
        run: |
          npm install gray-matter
          
      - name: Generate registry.json
        run: |
          npm run generate:registry
          
      - name: Trigger Vercel Deployment
        if: success()
        run: |
          if [ -n "${{ secrets.VERCEL_DEPLOY_HOOK }}" ]; then
            echo "Triggering Vercel deployment..."
            curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
            echo "Deployment triggered successfully"
          else
            echo "VERCEL_DEPLOY_HOOK secret not configured, skipping deployment trigger"
          fi