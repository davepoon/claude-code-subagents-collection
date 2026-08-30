# FunASR MCP

Transcribe audio from Claude Code with the official FunASR MCP server. The
plugin runs the published `ghcr.io/modelscope/funasr-mcp:0.1.2` image over
stdio, pinned to its OCI digest, and keeps model inference on your machine.

## Requirements

- Docker
- Node.js 18 or newer

The published container currently targets `linux/amd64`. Docker Desktop can
use x86 emulation on Apple Silicon, with a performance cost. For native ARM or
non-Docker use, follow the upstream Python setup instead.

## Install

```text
/plugin marketplace add davepoon/buildwithclaude
/plugin install funasr-mcp@buildwithclaude
```

By default, the plugin mounts Claude Code's current project directory at
`/audio` inside the container, read-only. To expose a different directory,
set `FUNASR_AUDIO_DIR` before starting Claude Code:

```bash
export FUNASR_AUDIO_DIR="$HOME/recordings"
claude
```

The first container run downloads the image and SenseVoiceSmall model. Model
files persist in the `funasr-mcp-cache` Docker volume.

## Use

Pass paths as the container sees them. For example, if
`$FUNASR_AUDIO_DIR/meeting.wav` exists, ask Claude:

```text
Transcribe /audio/meeting.wav with FunASR.
```

The server exposes one MCP tool, `transcribe_audio`, with optional language
hints for Mandarin, Cantonese, English, Japanese, and Korean. The default
SenseVoiceSmall setup performs local inference on CPU. See the
[upstream server guide](https://github.com/modelscope/FunASR/tree/main/examples/mcp_server)
for direct Python, CUDA, and custom-model configurations.

## Privacy And Licenses

The selected host directory is mounted read-only, and audio is processed by
the local container. The plugin does not upload audio or require an API key.

FunASR source code is MIT licensed. Model weights retain the license stated on
their model card; the default
[SenseVoiceSmall](https://huggingface.co/FunAudioLLM/SenseVoiceSmall) weights
use the linked FunASR model license.
