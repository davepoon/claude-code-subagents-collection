---
name: voice-persona
description: "让 Agent 变成能语音对话的机器人：语音文件转文字（支持微信 silk 格式）+ 多音色人格回复（Edge TTS 免费中文音色），全本地零 API 成本。Voice persona chat: transcribe voice messages (incl. WeChat silk) and reply in persona voices."
category: communication
license: MIT
---

# Voice-Persona · 语音对话 + 人格音色

**把 Agent 变成"能听懂语音、会用人格声音回话"的机器人——首个 IM 语音双工闭环技能。**

- 🎙 **听懂语音**：任意语音文件转文字，**支持微信 .silk 格式**（独门——大多数开源方案解不了微信语音）
- 🔊 **回语音气泡**：人格回复 → Edge TTS 多音色 → **silk 编码回发微信语音**（pilk 双向，全网首个打通）
- 🗣 **人格回话**：内置 6 个人格（元气少女/温柔知心/沉稳大叔/新闻播报/阳光伙伴/随性好友），各配专属中文音色 + 口吻
- 💰 **零 API 成本**：faster-whisper（本地）+ Edge TTS（免费）+ pilk（开源）全免费，可选 LLM 增强口吻

Voice chat for agents: transcribe voice (incl. WeChat silk) → reply with persona voices → back to WeChat voice bubbles. First IM two-way voice skill.

## 与同类差异（2026-09 实测调研）

| 方案 | 问题 |
|:--|:--|
| jozhn/wechat-voice-decode-skill | 只做单向解码转写，无 TTS/人格/语音回复，绑死 openclaw 路径 |
| zhayujie/chatgpt-on-wechat (46k★) | 语音依赖云端 ASR/TTS，个人微信通道封号风险，无 silk 原生闭环 |
| whisperbot / Telegram 转写 bot 族 | 全部单向"语音→文字"，无多音色人格语音回复 |
| SillyTavern (33k★) | 角色音色强大但只在自家 UI，不接微信/Telegram 语音消息 |
| 微软云 voice skills（Azure/OpenAI TTS） | 单项能力 + 付费云 API，无 IM 场景 |

**别人做"听写"或"朗读"，voice-persona 做"在微信/Telegram 里用带人格的嗓音说话"。**

## 快速验证 / Smoke Test（30 秒，免 key）

从本技能目录运行（本仓库已自带脚本，无需额外 clone）：

```bash
cd plugins/all-skills/skills/voice-persona   # 或直接进入 voice-persona 技能目录
python3 scripts/voice_persona.py demo
# 🎙 语音 → 文字 → [元气少女/沉稳大叔/新闻播报] 三音色回复音频
# ✅ 全链路通过：语音输入 → 转写 → 人格回复 → 语音输出
```

## 使用前提（依赖）

```bash
pip install faster-whisper pilk edge-tts    # 首次使用安装
# 可选：--llm 增强口吻需要 LLM_API_KEY / OpenAI 兼容 URL（与本集合其他技能一致）
```

## 用法

所有命令从技能目录内以相对路径调用脚本（无需安装到系统 PATH）：

```bash
# 1. 语音 → 文字（微信语音直接传 .silk 文件即可）
python3 scripts/voice_persona.py stt wechat_voice.silk
python3 scripts/voice_persona.py stt meeting.m4a --model small

# 2. 文字 → 人格回复 → 语音 mp3
python3 scripts/voice_persona.py speak "明天记得交报告" --persona yunjian --out reply.mp3

# 3. 只取人格化文本（接你自己的 TTS/IM）
python3 scripts/voice_persona.py chat "明天记得交报告" --persona xiaoyi

# 4. 列出人格
python3 scripts/voice_persona.py list

# 5. 音频 → 微信 silk 语音（可回发微信语音气泡）
python3 scripts/voice_persona.py to_silk reply.mp3 --out reply.silk

# 6. 一条命令双向闭环：人格语音 → 微信格式
python3 scripts/voice_persona.py speak "明天早上十点开会" --persona xiaoyi --out r.mp3
python3 scripts/voice_persona.py to_silk r.mp3          # → r.silk（#!SILK_V3）
```

### 在 Hermes 中安装（可选）

本仓库自带脚本可直接运行；若使用 Hermes Agent，也可从技能源仓库安装以自动接入：
```bash
hermes skills install jiawood2006/hermes-skills/skills/voice-persona
```

## 人格库（可扩展）

在 `voice_persona.py` 顶部 `PERSONAS` / `STYLE_WORDS` 增加即可：

| key | 人格 | Edge TTS 音色 | 口吻 |
|:--|:--|:--|:--|
| xiaoyi | 元气少女 · 小伊 | zh-CN-XiaoyiNeural | 嘿嘿、啦/呀 |
| xiaoxuan | 温柔知心 · 晓萱 | zh-CN-XiaoxuanNeural | 别担心、慢慢来 |
| yunjian | 沉稳大叔 · 云健 | zh-CN-YunjianNeural | 直说、结论先行 |
| yunyang | 新闻播报 · 云扬 | zh-CN-YunyangNeural | 播报、条理 |
| yunxi | 阳光伙伴 · 云希 | zh-CN-YunxiNeural | 加油、没问题 |
| xiaochen | 随性好友 · 晓辰 | zh-CN-XiaochenNeural | 口语化、像朋友 |

## Agent 接入（Hermes 等框架）

**STT 接入**：把平台收到的语音消息文件交给 `stt` 子命令 → 拿到文字进对话流。
Hermes 的 `stt.provider: local_command` + `HERMES_LOCAL_STT_COMMAND` 环境变量可直接把微信语音自动接入（指向本技能 scripts/ 下的脚本绝对路径）：
```
HERMES_LOCAL_STT_COMMAND=<python> <...>/skills/voice-persona/scripts/voice_persona.py stt {input_path} --model {model} --output_dir {output_dir} --language {language}
```

**TTS 接入**：人格化文本 → `speak` 出 mp3 → 平台发送语音。

## 已知陷阱

- **微信 silk 必须用 pilk 解码**：`pilk.decode()` 输出的是无 RIFF 头的裸 PCM，whisper 读不了——要用 `pilk.silk_to_wav()`（输出标准 wav，已实测）
- **首次运行** faster-whisper 会下载模型（small ~500MB），等待 1-3 分钟属正常
- **Edge TTS 需联网**（微软免费接口）；断网时 speak 会失败，stt/chat 不受影响
- 转写质量：Intel Mac CPU int8 下 small 模型中文够用；嘈杂/方言建议 base/small 或重发

## 验证记录（真实产出）

- 微信 .silk 语音实测转写成功（"API这一块我会让海沃云来对接…"39字符/17字符两段）
- demo 全链路：say 合成中文 → stt 转写 → 3 人格回复 → 3 个 mp3（27-31KB）✅
