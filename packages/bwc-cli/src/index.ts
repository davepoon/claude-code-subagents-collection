#!/usr/bin/env node

import { Command } from 'commander'
import updateNotifier from 'update-notifier'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createInitCommand } from './commands/init.js'
import { createAddCommand } from './commands/add.js'
import { createListCommand } from './commands/list.js'
import { createSearchCommand } from './commands/search.js'
import { createRemoveCommand } from './commands/remove.js'
import { createInfoCommand } from './commands/info.js'
import { createInstallCommand } from './commands/install.js'
import { createContributeCommand } from './commands/contribute.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

// Check for updates
updateNotifier({ pkg: packageJson }).notify()

const program = new Command()
  .name('bwc')
  .description('CLI tool for installing Claude Code subagents and commands')
  .version(packageJson.version)

// Add commands
program.addCommand(createInitCommand())
program.addCommand(createAddCommand())
program.addCommand(createListCommand())
program.addCommand(createSearchCommand())
program.addCommand(createRemoveCommand())
program.addCommand(createInfoCommand())
program.addCommand(createInstallCommand())
program.addCommand(createContributeCommand())

// Parse command line arguments
program.parse()