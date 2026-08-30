import { spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IMAGE =
	'ghcr.io/modelscope/funasr-mcp:0.1.2@sha256:ef616a3767df44d31cb257fd0b195e690f5b556b72d0f916f601b24143c912d6'

export function resolveAudioDir(env = process.env, cwd = process.cwd()) {
	return path.resolve(env.FUNASR_AUDIO_DIR?.trim() || env.CLAUDE_PROJECT_DIR?.trim() || cwd)
}

export function buildDockerArgs(audioDir) {
	return [
		'run',
		'--rm',
		'-i',
		'--platform',
		'linux/amd64',
		'--mount',
		`type=bind,src=${audioDir},dst=/audio,readonly`,
		'--mount',
		'type=volume,src=funasr-mcp-cache,dst=/root/.cache/modelscope',
		IMAGE,
	]
}

export function main() {
	const audioDir = resolveAudioDir()
	if (!statSync(audioDir).isDirectory()) {
		throw new Error(`FUNASR_AUDIO_DIR is not a directory: ${audioDir}`)
	}

	const child = spawn('docker', buildDockerArgs(audioDir), { stdio: 'inherit' })
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.once(signal, () => child.kill(signal))
	}
	child.once('error', (error) => {
		console.error(`Failed to start the FunASR MCP container: ${error.message}`)
		process.exitCode = 1
	})
	child.once('exit', (code) => {
		process.exitCode = code ?? 1
	})
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main()
}
