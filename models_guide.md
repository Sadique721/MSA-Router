# AI Models Capability & Selection Guide

This guide details the specific capabilities, optimal use cases, and limitations of the models configured in your Continue panel dropdown.

---

## 1. Model Capabilities Matrix

| Model Name | Type | Best Use Case | Vision (Image Input) | Video / Audio Input | Document Generation | Image / Video Gen | Cost |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Local Qwen 2.5 Coder** | Offline (Local) | Code Writing, Autocomplete, Refactoring | ❌ No | ❌ No | ✅ Yes (MD/Docstrings) | ❌ No | 💰 Free |
| **Local DeepSeek R1** | Offline (Local) | Algorithmic Logic, Deep Reasoning, Math | ❌ No | ❌ No | ✅ Yes (MD/Logic Docs) | ❌ No | 💰 Free |
| **Gemini 3 Pro Preview** | Cloud (API) | Complex Codebases, Large Context Docs | ✅ Yes | ✅ Yes (High Quality) | ✅ Yes (All formats) | ❌ No | 💳 Paid |
| **Gemini 3 Flash Preview** | Cloud (API) | Fast Chat, Real-time Screenshot Analysis | ✅ Yes | ✅ Yes (Fast) | ✅ Yes (Fast text) | ❌ No | 💳 Paid |
| **OmniRoute Auto Free Coding** | Cloud (Free) | General Programming Chat | ❌ No | ❌ No | ✅ Yes (Basic) | ❌ No | 💰 Free |
| **OmniRoute Free AI (HY3)** | Cloud (Free) | General Chat, Fast Code Edits | ❌ No | ❌ No | ✅ Yes (Basic) | ❌ No | 💰 Free |

---

## 2. Detailed Selection Guide

### 💻 For Coding and Development
- **Offline / Local Default**: Use **Local Qwen 2.5 Coder (Offline)**. It runs directly on your computer, meaning it has zero latency, zero token limits, and works offline. Excellent for writing code blocks, refactoring, and auto-completing.
- **Complex Bugs & Algorithms**: Use **Local DeepSeek R1 (Offline)**. It uses reasoning tokens to think through complex math, logical bugs, and algorithm design before outputting code.
- **Free Cloud Fallback**: Use **OmniRoute Auto Free Coding** if you want cloud performance without using your API key.

### 🖼️ For Vision, UI & Screenshots
- **Reading Screenshots**: Only **Gemini 3 Pro Preview** or **Gemini 3 Flash Preview** can read screenshots or images. If you need to debug a UI issue or write code based on a mockup, paste the image and use one of these models.
- **Image Generation (Text-to-Image)**: None of these models can generate raw JPG/PNG images directly inside the chat panel. However, you can ask them to write code (like SVG, HTML Canvas, or Python PIL script) to draw graphics.

### 🎥 For Video & Audio (Multimedia)
- **Analyzing Media Files**: Use **Gemini 3 Pro** or **Gemini 3 Flash**. They are native multimodal models that can process video clips and audio logs to summarize contents, describe frames, or extract text transcriptions.

### 📄 For Writing Technical Documents (.md / .doc)
- **Documentation & Specs**: Use **Gemini 3 Pro** for writing heavy, structured documentation (Markdown tables, RTF formats). For local drafts, **Local Qwen 2.5 Coder** can write clean markdown tutorials and README files.

---

*Note: All local models (Qwen and DeepSeek) run offline on your machine using Ollama. Cloud models (Gemini Pro/Flash) use your configured API Key.*
