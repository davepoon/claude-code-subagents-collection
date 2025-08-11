import inquirer from 'inquirer'
import { MCPServer, UserInput } from '../registry/types.js'
import { logger } from './logger.js'
import chalk from 'chalk'
import path from 'path'
import { fileExists } from './files.js'
import { homedir } from 'os'

/**
 * Handles user input collection and validation for MCP server configuration
 */
export class UserInputHandler {
  /**
   * Collect all required inputs for an MCP server
   */
  async collectInputs(server: MCPServer): Promise<Record<string, any>> {
    if (!server.user_inputs || server.user_inputs.length === 0) {
      return {}
    }
    
    logger.info(`\n${chalk.bold(`Configuring ${server.display_name}`)}`)
    logger.info('This server requires some configuration:\n')
    
    const inputs: Record<string, any> = {}
    
    for (const input of server.user_inputs) {
      const value = await this.promptForInput(input)
      inputs[input.name] = value
    }
    
    return inputs
  }
  
  /**
   * Apply collected inputs to the server configuration
   */
  async applyInputsToConfig(
    config: any, 
    inputs: Record<string, any>, 
    server: MCPServer
  ): Promise<any> {
    if (!server.user_inputs) {
      return config
    }
    
    // Deep clone the config to avoid mutations
    const updatedConfig = JSON.parse(JSON.stringify(config))
    
    for (const input of server.user_inputs) {
      const value = inputs[input.name]
      if (value === undefined) continue
      
      // Apply to environment variables
      if (input.env_var) {
        this.setNestedValue(updatedConfig, `mcpServers.${server.name}.env.${input.env_var}`, value)
      }
      
      // Apply to arguments
      if (input.arg_position !== undefined) {
        const argsPath = `mcpServers.${server.name}.args`
        const args = this.getNestedValue(updatedConfig, argsPath) || []
        args[input.arg_position] = value
        this.setNestedValue(updatedConfig, argsPath, args)
      }
      
      // Apply to custom config path
      if (input.config_path) {
        this.setNestedValue(updatedConfig, input.config_path, value)
      }
    }
    
    // Replace any remaining placeholders
    const configStr = JSON.stringify(updatedConfig)
    const updatedConfigStr = this.replacePlaceholders(configStr, inputs)
    
    return JSON.parse(updatedConfigStr)
  }
  
  /**
   * Prompt for a single input with validation
   */
  private async promptForInput(input: UserInput): Promise<any> {
    const promptConfig: any = {
      type: this.getPromptType(input.type),
      name: 'value',
      message: `${input.display_name}:`,
      default: input.default
    }
    
    // Add description as suffix
    if (input.description) {
      promptConfig.message = `${input.display_name} (${input.description}):`
    }
    
    // Type-specific configurations
    switch (input.type) {
      case 'path':
        promptConfig.validate = async (value: string) => {
          if (!value && input.required) {
            return 'This field is required'
          }
          if (value) {
            const expandedPath = this.expandPath(value)
            if (input.validation?.exists && !(await fileExists(expandedPath))) {
              return `Path does not exist: ${expandedPath}`
            }
            if (input.validation?.is_directory) {
              // Check if it's a directory (simplified check)
              if (expandedPath.includes('.') && expandedPath.lastIndexOf('.') > expandedPath.lastIndexOf('/')) {
                return 'Path must be a directory, not a file'
              }
            }
            if (input.validation?.is_file) {
              // Check if it's a file (simplified check)
              if (!expandedPath.includes('.') || expandedPath.lastIndexOf('.') < expandedPath.lastIndexOf('/')) {
                return 'Path must be a file, not a directory'
              }
            }
          }
          return true
        }
        promptConfig.filter = (value: string) => this.expandPath(value)
        break
        
      case 'string':
      case 'password':
        promptConfig.validate = (value: string) => {
          if (!value && input.required) {
            return 'This field is required'
          }
          if (value && input.validation?.pattern) {
            const regex = new RegExp(input.validation.pattern)
            if (!regex.test(value)) {
              return `Value must match pattern: ${input.validation.pattern}`
            }
          }
          if (value && input.validation?.min_length && value.length < input.validation.min_length) {
            return `Minimum length is ${input.validation.min_length}`
          }
          if (value && input.validation?.max_length && value.length > input.validation.max_length) {
            return `Maximum length is ${input.validation.max_length}`
          }
          return true
        }
        break
        
      case 'number':
        promptConfig.validate = (value: string) => {
          const num = parseFloat(value)
          if (isNaN(num)) {
            return 'Please enter a valid number'
          }
          if (input.validation?.min !== undefined && num < input.validation.min) {
            return `Minimum value is ${input.validation.min}`
          }
          if (input.validation?.max !== undefined && num > input.validation.max) {
            return `Maximum value is ${input.validation.max}`
          }
          return true
        }
        promptConfig.filter = (value: string) => parseFloat(value)
        break
        
      case 'boolean':
        promptConfig.default = input.default !== undefined ? input.default : false
        break
        
      case 'url':
        promptConfig.validate = (value: string) => {
          if (!value && input.required) {
            return 'This field is required'
          }
          if (value) {
            try {
              new URL(value)
              return true
            } catch {
              return 'Please enter a valid URL'
            }
          }
          return true
        }
        break
        
      case 'select':
        if (input.validation?.options) {
          promptConfig.type = 'list'
          promptConfig.choices = input.validation.options
        }
        break
    }
    
    // Add placeholder hint
    if (input.placeholder) {
      promptConfig.message += chalk.gray(` (e.g., ${input.placeholder})`)
    }
    
    const { value } = await inquirer.prompt([promptConfig])
    return value
  }
  
  /**
   * Get the appropriate inquirer prompt type for our input type
   */
  private getPromptType(type: UserInput['type']): string {
    switch (type) {
      case 'password':
        return 'password'
      case 'boolean':
        return 'confirm'
      case 'select':
        return 'list'
      default:
        return 'input'
    }
  }
  
  /**
   * Expand path with ~ and environment variables
   */
  private expandPath(inputPath: string): string {
    // Expand ~
    if (inputPath.startsWith('~/')) {
      inputPath = path.join(homedir(), inputPath.slice(2))
    }
    
    // Expand environment variables
    inputPath = inputPath.replace(/\$([A-Z_]+[A-Z0-9_]*)/g, (_, varName) => {
      return process.env[varName] || `$${varName}`
    })
    
    return path.resolve(inputPath)
  }
  
  /**
   * Replace placeholders in configuration string
   */
  private replacePlaceholders(configStr: string, inputs: Record<string, any>): string {
    // Replace {{name}} style placeholders
    return configStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return inputs[key] !== undefined ? inputs[key] : match
    })
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
  
  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {}
      }
      return current[key]
    }, obj)
    target[lastKey] = value
  }
  
  /**
   * Validate all inputs before applying
   */
  async validateInputs(
    inputs: Record<string, any>, 
    server: MCPServer
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    if (!server.user_inputs) {
      return { valid: true, errors: [] }
    }
    
    for (const inputDef of server.user_inputs) {
      const value = inputs[inputDef.name]
      
      // Check required
      if (inputDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`${inputDef.display_name} is required`)
        continue
      }
      
      // Skip validation if not required and no value
      if (!value) continue
      
      // Type-specific validation
      switch (inputDef.type) {
        case 'path':
          if (inputDef.validation?.exists) {
            const expandedPath = this.expandPath(value)
            if (!(await fileExists(expandedPath))) {
              errors.push(`${inputDef.display_name}: Path does not exist - ${expandedPath}`)
            }
          }
          break
          
        case 'string':
        case 'password':
          if (inputDef.validation?.pattern) {
            const regex = new RegExp(inputDef.validation.pattern)
            if (!regex.test(value)) {
              errors.push(`${inputDef.display_name}: Does not match required pattern`)
            }
          }
          break
          
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${inputDef.display_name}: Must be a number`)
          } else {
            if (inputDef.validation?.min !== undefined && value < inputDef.validation.min) {
              errors.push(`${inputDef.display_name}: Must be at least ${inputDef.validation.min}`)
            }
            if (inputDef.validation?.max !== undefined && value > inputDef.validation.max) {
              errors.push(`${inputDef.display_name}: Must be at most ${inputDef.validation.max}`)
            }
          }
          break
          
        case 'url':
          try {
            new URL(value)
          } catch {
            errors.push(`${inputDef.display_name}: Must be a valid URL`)
          }
          break
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Show a summary of collected inputs
   */
  showInputSummary(inputs: Record<string, any>, server: MCPServer): void {
    if (!server.user_inputs || Object.keys(inputs).length === 0) {
      return
    }
    
    logger.info('\n' + chalk.bold('Configuration Summary:'))
    
    for (const inputDef of server.user_inputs) {
      const value = inputs[inputDef.name]
      if (value !== undefined) {
        const displayValue = inputDef.type === 'password' ? '********' : value
        logger.info(`  ${inputDef.display_name}: ${chalk.cyan(displayValue)}`)
      }
    }
    
    logger.info('')
  }
}