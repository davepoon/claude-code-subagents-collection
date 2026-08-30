import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDockerArgs, resolveAudioDir } from './launch.mjs'

test('buildDockerArgs pins the official image and mounts only the audio directory read-only', () => {
	assert.deepEqual(buildDockerArgs('/workspace/audio'), [
		'run',
		'--rm',
		'-i',
		'--platform',
		'linux/amd64',
		'--mount',
		'type=bind,src=/workspace/audio,dst=/audio,readonly',
		'--mount',
		'type=volume,src=funasr-mcp-cache,dst=/root/.cache/modelscope',
		'ghcr.io/modelscope/funasr-mcp:0.1.2@sha256:ef616a3767df44d31cb257fd0b195e690f5b556b72d0f916f601b24143c912d6',
	])
})

test('resolveAudioDir prefers an explicit audio directory, then the Claude project, then cwd', () => {
	assert.equal(
		resolveAudioDir({ FUNASR_AUDIO_DIR: ' /media/recordings ', CLAUDE_PROJECT_DIR: '/workspace/project' }, '/plugin/root'),
		'/media/recordings',
	)
	assert.equal(resolveAudioDir({ CLAUDE_PROJECT_DIR: '/workspace/project' }, '/plugin/root'), '/workspace/project')
	assert.equal(resolveAudioDir({}, '/workspace/project'), '/workspace/project')
})
