#!/usr/bin/env python3
"""
voice-persona — 给 Agent 装上"语音对话 + 人格音色"（Voice persona chat for agents）
================================================================
能力：
  1. stt    — 任意语音文件转文字（含微信 silk，pilk 解码；其余格式直接喂 faster-whisper）
  2. speak  — 把文字变成"某个人格"的口吻，并用 Edge TTS 免费中文音色合成语音
  3. chat   — 端到端：给文字 → 人格化回复文本
  4. demo   — 免 key 全链路验证：合成一句输入 → 人格回复 → 输出音频

人格 = 音色 + 说话风格。内置 6 个人格（见 PERSONAS），可自行扩展。

依赖（都是免费/本地）：
  pip install faster-whisper pilk edge-tts      # stt 需要前两个，speak 需要 edge-tts

用法示例:
  python3 voice_persona.py stt wechat_voice.silk            # 微信语音 → 文字
  python3 voice_persona.py speak "明天记得交报告" --persona xiaoyi --out reply.mp3
  python3 voice_persona.py chat "明天记得交报告" --persona dajiang
  python3 voice_persona.py demo                              # 全链路自测
"""
import argparse, os, re, sys, tempfile, pathlib, subprocess, shutil

# ═══════════════ 人格库（可自行增删） ═══════════════
# persona: 音色id | 语气前缀 | 风格词(用于LLM可选增强) | 示例开场
PERSONAS = {
    "xiaoyi":  {"voice": "zh-CN-XiaoyiNeural",  "style": "元气少女", "emoji": "✨",
                "prefix": "嘿嘿，",
                "desc": "元气少女·小伊：活泼可爱，爱用'啦/呀/喔'"},
    "xiaoxuan": {"voice": "zh-CN-XiaoxuanNeural", "style": "温柔知心", "emoji": "💗",
                "prefix": "嗯嗯，别担心，",
                "desc": "温柔知心·晓萱：柔和、安抚、耐心"},
    "yunjian": {"voice": "zh-CN-YunjianNeural", "style": "沉稳大叔", "emoji": "📌",
                "prefix": "好，直说：",
                "desc": "沉稳大叔·云健：简洁、稳重、结论先行"},
    "yunyang": {"voice": "zh-CN-YunyangNeural", "style": "新闻播报", "emoji": "📰",
                "prefix": "播报一则消息：",
                "desc": "新闻播报·云扬：正式、条理、有节奏"},
    "yunxi":  {"voice": "zh-CN-YunxiNeural",   "style": "阳光伙伴", "emoji": "☀️",
                "prefix": "没问题！",
                "desc": "阳光伙伴·云希：热情、鼓励、正能量"},
    "xiaochen": {"voice": "zh-CN-XiaochenNeural", "style": "随性好友", "emoji": "🎮",
                "prefix": "行，跟你说——",
                "desc": "随性好友·晓辰：口语化、像朋友聊天"},
}

STYLE_WORDS = {
    "xiaoyi":  ["啦", "呀", "超", "好好玩"],
    "xiaoxuan": ["别担心", "慢慢来", "可以的", "我理解"],
    "yunjian": ["首先", "其次", "重点是", "结论是"],
    "yunyang": ["各位听众", "值得注意的是", "总而言之"],
    "yunxi":  ["加油", "真棒", "一起搞定", "没问题"],
    "xiaochen": ["讲真", "就是说", "咱", "差不多"],
}

# ═══════════════ 一、STT：语音 → 文字 ═══════════════
def _decode_silk(src: str) -> str:
    """silk → 标准 wav 临时文件；非 silk 原样返回"""
    if pathlib.Path(src).suffix.lower() != ".silk":
        return src
    import pilk
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False); tmp.close()
    pilk.silk_to_wav(src, tmp.name)  # 24kHz/16bit/mono 标准 wav
    return tmp.name

def stt_file(src: str, model: str = "small", language: str = "zh") -> str:
    from faster_whisper import WhisperModel
    wav = _decode_silk(src)
    try:
        m = WhisperModel(model, device="cpu", compute_type="int8")
        segs, _info = m.transcribe(wav, language=language or None)
        return "".join(s.text for s in segs).strip()
    finally:
        if wav != src:
            try: os.unlink(wav)
            except OSError: pass

# ═══════════════ 二、人格化：文字 → 人格口吻 ═══════════════
def personalize(text: str, persona: str, use_llm: bool = False) -> str:
    key = persona if persona in PERSONAS else "xiaoyi"
    p = PERSONAS[key]
    if use_llm:
        try:
            return _llm_personalize(text, key, p)
        except Exception:
            pass  # LLM 失败自动降级规则
    return p["prefix"] + text

def _llm_personalize(text: str, key: str, p: dict) -> str:
    import json, urllib.request
    llm_key = os.environ.get("LLM_API_KEY", "").strip()
    if not llm_key:
        raise RuntimeError("no LLM key")
    style_words = STYLE_WORDS.get(key, [p["style"]])
    prompt = (f"把下面这段话改写成{p['desc']}的口吻（自然口语、简短，保留原意，"
              f"可适当用风格词如{'/'.join(style_words[:3])}），"
              f"只输出改写后的内容，不要解释：\n{text}")
    body = json.dumps({"model": os.environ.get("LLM_MODEL", "deepseek-chat"),
                       "messages": [{"role": "user", "content": prompt}],
                       "temperature": 0.8, "max_tokens": 300}).encode()
    req = urllib.request.Request(os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1/chat/completions"),
                                 data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {llm_key}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.load(r)
    return d["choices"][0]["message"]["content"].strip()

# ═══════════════ 三、TTS：文字 → 语音 ═══════════════
def speak(text: str, persona: str, out: str = "") -> str:
    p = PERSONAS.get(persona) or PERSONAS["xiaoyi"]
    out = out or os.path.join(tempfile.gettempdir(), f"voice_persona_{persona}.mp3")
    import edge_tts
    async def _run():
        com = edge_tts.Communicate(text, p["voice"])
        await com.save(out)
    import asyncio
    asyncio.run(_run())
    return out

# ═══════════════ 四、silk 编码：语音回发微信（双向闭环） ═══════════════
def to_silk(audio: str, out: str = "") -> str:
    """任意音频(mp3/wav/m4a) → 微信 silk 语音（#!SILK_V3 头），可回发微信语音气泡。
    解码优先 ffmpeg，无则用 macOS 原生 afconvert；均转 24kHz 单声道 pcm。"""
    import pilk, subprocess, tempfile, shutil, wave
    out = out or str(pathlib.Path(audio).with_suffix(".silk"))
    pcm = tempfile.NamedTemporaryFile(suffix=".pcm", delete=False); pcm.close()
    tmpwav = None
    try:
        ffmpeg = shutil.which("ffmpeg") or "/usr/local/bin/ffmpeg"
        if os.path.exists(ffmpeg):
            r = subprocess.run([ffmpeg, "-y", "-v", "error", "-i", audio,
                                "-f", "s16le", "-ac", "1", "-ar", "24000", pcm.name],
                               capture_output=True)
            if r.returncode != 0:
                return f"ffmpeg error: {r.stderr.decode()[:200]}"
        else:
            tmpwav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False); tmpwav.close()
            r = subprocess.run(["/usr/bin/afconvert", "-f", "WAVE", "-d", "LEI16@24000",
                                "-c", "1", audio, tmpwav.name], capture_output=True)
            if r.returncode != 0:
                return f"afconvert error: {r.stderr.decode()[:200]}"
            with wave.open(tmpwav.name, "rb") as w:
                raw = w.readframes(w.getnframes())
            with open(pcm.name, "wb") as f:
                f.write(raw)
        pilk.encode(pcm.name, out, pcm_rate=24000, tencent=True)
        return out
    finally:
        try: os.unlink(pcm.name)
        except OSError: pass
        if tmpwav:
            try: os.unlink(tmpwav.name)
            except OSError: pass

# ═══════════════ demo：免 key 全链路自测 ═══════════════
def cmd_demo():
    print("🧪 voice-persona 自测（全本地免费，无需 key）")
    # 1) 合成一段中文输入当"语音消息"
    say_path = os.path.join(tempfile.gettempdir(), "vp_input.m4a")
    try:
        subprocess.run(["say", "-v", "Ting-Ting", "-o", say_path, "明天早上十点开会记得提前准备材料"],
                       check=True, capture_output=True, timeout=60)
    except Exception:
        print("⚠️ 跳过 say 合成输入（当前系统无中文语音）")
        return
    # 2) STT 转文字
    txt = stt_file(say_path)
    print(f"🎙 语音 → 文字: {txt}")
    # 3) 三种人格演示
    for pname in ["xiaoyi", "yunjian", "yunyang"]:
        p = PERSONAS[pname]
        reply = personalize(txt, pname)
        audio = speak(reply, pname)
        print(f"🗣 [{p['style']}] {reply}")
        print(f"   🔊 {audio} ({os.path.getsize(audio)//1024}KB)")
    # 4) 双向闭环：人格语音 → 微信 silk
    audio_yunyang = speak(personalize(txt, "yunyang"), "yunyang")
    silk = to_silk(audio_yunyang)
    print(f"🔁 回发闭环: 人格语音 → {silk} (微信 #!SILK_V3, {os.path.getsize(silk)//1024}KB)")
    print("\n✅ 全链路通过：语音输入 → 转写 → 人格回复 → 语音输出 → 微信格式")

def cmd_list():
    print("可用人格：")
    for k, p in PERSONAS.items():
        print(f"  {k:10s} {p['desc']}")

def main():
    ap = argparse.ArgumentParser(description="voice-persona: 语音对话 + 人格音色")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s1 = sub.add_parser("stt", help="语音文件转文字（支持微信 silk）")
    s1.add_argument("file"); s1.add_argument("--model", default="small")
    s1.add_argument("--language", default="zh")
    s1.set_defaults(func=lambda a: print(stt_file(a.file, a.model, a.language)))

    s2 = sub.add_parser("speak", help="文字→人格口吻→语音 mp3")
    s2.add_argument("text"); s2.add_argument("--persona", default="xiaoyi")
    s2.add_argument("--out", default="")
    s2.set_defaults(func=lambda a: print(speak(personalize(a.text, a.persona), a.persona, a.out)))

    s3 = sub.add_parser("chat", help="文字→人格回复文本")
    s3.add_argument("text"); s3.add_argument("--persona", default="xiaoyi")
    s3.add_argument("--llm", action="store_true", help="用 LLM 增强（需 LLM_API_KEY）")
    s3.set_defaults(func=lambda a: print(personalize(a.text, a.persona, a.llm)))

    s4 = sub.add_parser("demo", help="免 key 全链路自测")
    s4.set_defaults(func=lambda a: cmd_demo())

    s5 = sub.add_parser("list", help="列出人格")
    s5.set_defaults(func=lambda a: cmd_list())

    s6 = sub.add_parser("to_silk", help="音频→微信 silk 语音（回发语音气泡）")
    s6.add_argument("audio"); s6.add_argument("--out", default="")
    s6.set_defaults(func=lambda a: print(to_silk(a.audio, a.out)))

    a = ap.parse_args()
    a.func(a)

if __name__ == "__main__":
    main()
