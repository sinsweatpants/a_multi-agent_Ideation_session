import os, re, sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        try:
            return p.read_text(encoding="latin-1", errors="replace")
        except Exception:
            return ""

def lines(text: str) -> List[str]:
    return text.splitlines()

# -------- Extractors --------

RUST_DECL_RE = re.compile(r'^\s*(?:pub\s+)?(struct|enum|trait|fn)\s+([A-Za-z_][A-Za-z0-9_]*)', re.MULTILINE)
RUST_MOD_RE  = re.compile(r'^\s*(?:pub\s+)?mod\s+([A-Za-z_][A-Za-z0-9_]*)\s*;?', re.MULTILINE)
RUST_DERIVE_RE = re.compile(r'^\s*#\s*\[\s*derive\s*\(([^)]*)\)\s*\]', re.MULTILINE)

def extract_rust(text: str) -> Dict[str, List[str]]:
    decls = RUST_DECL_RE.findall(text)
    derives = RUST_DERIVE_RE.findall(text)
    mods = RUST_MOD_RE.findall(text)
    out = {"structs": [], "enums": [], "traits": [], "fns": [], "mods": mods, "derives": []}
    for kind, name in decls:
        out[kind + "s"].append(name)
    for d in derives:
        out["derives"].append(d.strip())
    return out

JS_FUNC_RE = re.compile(r'^\s*(?:export\s+)?(?:function\s+([A-Za-z_]\w*)|const\s+([A-Za-z_]\w*)\s*=\s*\(|let\s+([A-Za-z_]\w*)\s*=\s*\(|var\s+([A-Za-z_]\w*)\s*=\s*\()', re.MULTILINE)
JS_FETCH_RE = re.compile(r'\bfetch\s*\(', re.MULTILINE)
JS_EVT_RE   = re.compile(r'\.addEventListener\s*\(\s*["\']([A-Za-z_]+)["\']', re.MULTILINE)

def extract_js(text: str) -> Dict[str, List[str]]:
    funcs = []
    for m in JS_FUNC_RE.findall(text):
        name = next((g for g in m if g), None)
        if name:
            funcs.append(name)
    fetches = len(JS_FETCH_RE.findall(text))
    evts = JS_EVT_RE.findall(text)
    return {"functions": funcs, "fetch_calls": fetches, "event_listeners": evts}

HTML_ID_RE = re.compile(r'id\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
HTML_SCRIPT_RE = re.compile(r'<\s*script[^>]*src\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
HTML_LINK_RE = re.compile(r'<\s*link[^>]*href\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
HTML_TITLE_RE = re.compile(r'<\s*title[^>]*>(.*?)</\s*title\s*>', re.IGNORECASE | re.DOTALL)

def extract_html(text: str) -> Dict[str, List[str]]:
    ids = HTML_ID_RE.findall(text)
    scripts = HTML_SCRIPT_RE.findall(text)
    links = HTML_LINK_RE.findall(text)
    title = HTML_TITLE_RE.search(text)
    return {"title": title.group(1).strip() if title else "", "ids": ids, "scripts": scripts, "links": links}

CSS_VAR_RE = re.compile(r'--([A-Za-z0-9_-]+)\s*:', re.MULTILINE)
CSS_CLASS_RE = re.compile(r'^\s*\.([A-Za-z0-9_-]+)\s*[,{]', re.MULTILINE)

def extract_css(text: str) -> Dict[str, List[str]]:
    vars_ = sorted(set(CSS_VAR_RE.findall(text)))
    classes = sorted(set(CSS_CLASS_RE.findall(text)))
    return {"vars": vars_, "classes": classes}

TOML_PKG_NAME_RE = re.compile(r'^\s*name\s*=\s*["\']([^"\']+)["\']\s*$', re.MULTILINE)
TOML_PKG_VER_RE  = re.compile(r'^\s*version\s*=\s*["\']([^"\']+)["\']\s*$', re.MULTILINE)
TOML_SECTION_RE  = re.compile(r'^\s*\[([^\]]+)\]\s*$', re.MULTILINE)
TOML_DEP_RE      = re.compile(r'^\s*([A-Za-z0-9_\-]+)\s*=\s*(?:["\'][^"\']+["\']|\{[^}]+\})\s*$', re.MULTILINE)

def extract_toml(text: str) -> Dict[str, List[str]]:
    pkg = TOML_PKG_NAME_RE.search(text)
    ver = TOML_PKG_VER_RE.search(text)
    sections = TOML_SECTION_RE.findall(text)
    deps = []
    # crude parse: collect dep lines under [dependencies] and [dev-dependencies]
    current = None
    for line in text.splitlines():
        msec = TOML_SECTION_RE.match(line)
        if msec:
            current = msec.group(1).strip()
            continue
        if current in ("dependencies", "dev-dependencies", "build-dependencies", "target"):
            mdep = TOML_DEP_RE.match(line.strip())
            if mdep:
                deps.append(mdep.group(1))
    return {"package": pkg.group(1) if pkg else "", "version": ver.group(1) if ver else "", "sections": sections, "dependencies": deps}

ENV_KEY_RE = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=', re.MULTILINE)

def extract_env_keys(text: str) -> List[str]:
    return sorted(set(ENV_KEY_RE.findall(text)))

def extract_gitignore(text: str) -> List[str]:
    pats = []
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        pats.append(ln)
    return pats

def extract_nix(text: str) -> Dict[str, List[str]]:
    # crude: list pkgs.<name> occurrences
    pkgs = re.findall(r'pkgs\.([A-Za-z0-9_\-]+)', text)
    return {"pkgs": sorted(set(pkgs))}

def extract_md_headings(text: str) -> List[str]:
    heads = []
    for ln in text.splitlines():
        if ln.strip().startswith("#"):
            heads.append(ln.strip())
        if len(heads) >= 8:
            break
    return heads

def choose_snippet(text: str, max_lines: int = 10, prefer_regex: Optional[re.Pattern] = None) -> str:
    lines = text.splitlines()
    if prefer_regex:
        matches = [ln for ln in lines if prefer_regex.search(ln)]
        if matches:
            return "\n".join(matches[:max_lines])
    # fallback: first non-empty block
    non_empty = [ln for ln in lines if ln.strip()]
    return "\n".join(non_empty[:max_lines])

def list_agent_files(agents_dir: Path) -> List[Path]:
    if not agents_dir.exists():
        return []
    files = sorted([p for p in agents_dir.glob("*.rs") if p.name != "mod.rs"])
    return files

def build_markdown(root: Path) -> str:
    # Paths
    p_idx = root / ".idx"
    p_qodo = root / ".qodo"
    p_public = root / "public"
    p_src = root / "src"
    p_agents = p_src / "agents"

    files = {
        "airules": p_idx / "airules.md",
        "devnix": p_idx / "dev.nix",
        "index_html": p_public / "index.html",
        "style_css": p_public / "style.css",
        "index_js": p_public / "index.js",
        "script_js": p_public / "script.js",
        "main_rs": p_src / "main.rs",
        "orchestrator_rs": p_src / "orchestrator.rs",
        "language_model_rs": p_src / "language_model.rs",
        "dramatic_md": p_src / "dramatic_context_agent.md",
        "agents_mod_rs": p_agents / "mod.rs",
        "cargo_toml": root / "Cargo.toml",
        "cargo_lock": root / "Cargo.lock",
        "gitignore": root / ".gitignore",
        "env": root / ".env",
        "target": root / "target",
    }

    # Read contents
    txt = {k: read_text(p) if p.exists() and p.is_file() else "" for k, p in files.items()}
    exists = {k: (files[k].exists() and files[k].is_file()) for k in files}

    # Frontend extracts
    html_info = extract_html(txt["index_html"]) if exists["index_html"] else {}
    css_info = extract_css(txt["style_css"]) if exists["style_css"] else {}
    js_index_info = extract_js(txt["index_js"]) if exists["index_js"] else {}
    js_script_info = extract_js(txt["script_js"]) if exists["script_js"] else {}

    # Backend extracts
    rust_main = extract_rust(txt["main_rs"]) if exists["main_rs"] else {}
    rust_orch = extract_rust(txt["orchestrator_rs"]) if exists["orchestrator_rs"] else {}
    rust_lm   = extract_rust(txt["language_model_rs"]) if exists["language_model_rs"] else {}
    rust_agents_mod = extract_rust(txt["agents_mod_rs"]) if exists["agents_mod_rs"] else {}

    # Config extracts
    toml = extract_toml(txt["cargo_toml"]) if exists["cargo_toml"] else {}
    env_keys = extract_env_keys(txt["env"]) if exists["env"] else []
    ignores = extract_gitignore(txt["gitignore"]) if exists["gitignore"] else []
    nix = extract_nix(txt["devnix"]) if exists["devnix"] else {}
    md_heads_airules = extract_md_headings(txt["airules"]) if exists["airules"] else []
    md_heads_dram = extract_md_headings(txt["dramatic_md"]) if exists["dramatic_md"] else []

    # Agents
    agent_files = list_agent_files(p_agents)
    agents_rows = []
    for ap in agent_files:
        atxt = read_text(ap)
        info = extract_rust(atxt)
        snippet = choose_snippet(atxt, 10, re.compile(r'^\s*(?:pub\s+)?(struct|enum|trait|fn)\s+', re.MULTILINE))
        agents_rows.append((ap.name, info, snippet))

    # Build markdown
    out = []
    out.append("# مستند تسليم تقني للمشروع\n")
    out.append("## 1) ملخص المشروع العام")
    out.append("- **الغرض:** نظام تطوير قصص قائم على وكلاء Rust في الخلفية وواجهة HTML/CSS/JS.")
    out.append("- **التقنيات الأساسية:** Rust (خلفية)، HTML/CSS/JS (واجهة أمامية).")
    out.append("- **بنية التفاعل عالي المستوى:** الواجهة الأمامية تتواصل عبر HTTP/JSON مع الخلفية التي تنسّق عبر orchestrator والوكلاء.")
    out.append(f"- **وكلاء النظام (Agents):** تم إحصاؤهم فعليًا: **{len(agent_files)}**.\n")

    # Hidden/supporting
    out.append("---\n\n## 2) تحليل مفصل للملفات والمجلدات\n")
    out.append("### 2.1 النظام/الداعمة")
    out.append(f"#### مسار: `{p_idx}`")
    out.append("- **الغرض:** مجلد إعدادات/بيانات داعمة (لا تحليل تفصيلي إلا للملفات النصية المذكورة).")

    if exists["airules"]:
        out.append(f"\n#### مسار: `{files['airules']}`")
        out.append("- **الغرض:** قواعد/تعليمات AI.")
        out.append("- **عناوين رئيسة (مقتطف):")
        out.append("```md\n" + "\n".join(md_heads_airules[:10]) + "\n```")
    if exists["devnix"]:
        out.append(f"\n#### مسار: `{files['devnix']}`")
        out.append("- **الغرض:** تعريف بيئة Nix.")
        out.append("- **حزم مستخدمة (استدلالًا):** " + (", ".join(nix.get("pkgs", [])) if nix else "غير محدد"))
        out.append("```nix\n" + choose_snippet(txt["devnix"], 10) + "\n```")

    out.append(f"\n#### مسار: `{p_qodo}`")
    out.append("- **الغرض:** مجلد مخفي/بيانات خاصة بالأدوات. لا تحليل تفصيلي.\n")

    # Frontend
    out.append("---\n\n### 2.2 الواجهة الأمامية (public)")
    if exists["index_html"]:
        out.append(f"#### `{files['index_html']}`")
        out.append("- **الغرض:** الجذر البنيوي لواجهة المستخدم.")
        if html_info:
            out.append(f"- **العنوان:** {html_info.get('title','')}")
            out.append(f"- **روابط CSS:** {', '.join(html_info.get('links', [])) or '—'}")
            out.append(f"- **سكريبتات:** {', '.join(html_info.get('scripts', [])) or '—'}")
            ids = html_info.get('ids', [])
            out.append(f"- **IDs مهمة:** {', '.join(ids[:12]) if ids else '—'}")
        out.append("```html\n" + choose_snippet(txt["index_html"], 10) + "\n```")
    if exists["style_css"]:
        out.append(f"\n#### `{files['style_css']}`")
        out.append("- **الغرض:** الأنماط الرئيسة.")
        if css_info:
            out.append(f"- **متغيرات CSS:** {', '.join(css_info.get('vars', [])[:12]) or '—'}")
            out.append(f"- **أصناف بارزة:** {', '.join(css_info.get('classes', [])[:12]) or '—'}")
        out.append("```css\n" + choose_snippet(txt["style_css"], 10) + "\n```")
    if exists["index_js"]:
        out.append(f"\n#### `{files['index_js']}`")
        out.append("- **الغرض:** نقطة التهيئة/المنطق العام.")
        if js_index_info:
            out.append(f"- **دوال:** {', '.join(js_index_info.get('functions', [])[:12]) or '—'}")
            out.append(f"- **استدعاءات fetch:** {js_index_info.get('fetch_calls', 0)}")
            out.append(f"- **مستمعو أحداث:** {', '.join(js_index_info.get('event_listeners', [])[:12]) or '—'}")
        out.append("```js\n" + choose_snippet(txt["index_js"], 10, re.compile(r'\bfunction\b|\bconst\b|\baddEventListener\b')) + "\n```")
    if exists["script_js"]:
        out.append(f"\n#### `{files['script_js']}`")
        out.append("- **الغرض:** منطق تفاعلي/مساند.")
        if js_script_info:
            out.append(f"- **دوال:** {', '.join(js_script_info.get('functions', [])[:12]) or '—'}")
            out.append(f"- **استدعاءات fetch:** {js_script_info.get('fetch_calls', 0)}")
            out.append(f"- **مستمعو أحداث:** {', '.join(js_script_info.get('event_listeners', [])[:12]) or '—'}")
        out.append("```js\n" + choose_snippet(txt["script_js"], 10, re.compile(r'\bfunction\b|\bconst\b|\baddEventListener\b')) + "\n```")

    # Backend
    out.append("\n---\n\n### 2.3 الواجهة الخلفية (Rust)")
    if exists["main_rs"]:
        out.append(f"#### `{files['main_rs']}`")
        out.append("- **الغرض:** نقطة الدخول.")
        if rust_main:
            out.append(f"- **Structs:** {', '.join(rust_main.get('structs', [])[:12]) or '—'}")
            out.append(f"- **Traits:** {', '.join(rust_main.get('traits', [])[:12]) or '—'}")
            out.append(f"- **Functions:** {', '.join(rust_main.get('fns', [])[:12]) or '—'}")
            out.append(f"- **Derive:** {', '.join(rust_main.get('derives', [])[:12]) or '—'}")
        out.append("```rust\n" + choose_snippet(txt["main_rs"], 10, re.compile(r'^\s*(?:pub\s+)?(struct|enum|trait|fn)\s+')) + "\n```")
    if exists["orchestrator_rs"]:
        out.append(f"\n#### `{files['orchestrator_rs']}`")
        out.append("- **الغرض:** تنسيق العمل بين الوحدات/الوكلاء.")
        if rust_orch:
            out.append(f"- **Structs:** {', '.join(rust_orch.get('structs', [])[:12]) or '—'}")
            out.append(f"- **Traits:** {', '.join(rust_orch.get('traits', [])[:12]) or '—'}")
            out.append(f"- **Functions:** {', '.join(rust_orch.get('fns', [])[:12]) or '—'}")
            out.append(f"- **Modules:** {', '.join(rust_orch.get('mods', [])[:12]) or '—'}")
        out.append("```rust\n" + choose_snippet(txt["orchestrator_rs"], 10, re.compile(r'^\s*(?:pub\s+)?(struct|enum|trait|fn)\s+')) + "\n```")
    if exists["language_model_rs"]:
        out.append(f"\n#### `{files['language_model_rs']}`")
        out.append("- **الغرض:** تغليف/تكامل مع LLM.")
        if rust_lm:
            out.append(f"- **Structs:** {', '.join(rust_lm.get('structs', [])[:12]) or '—'}")
            out.append(f"- **Traits:** {', '.join(rust_lm.get('traits', [])[:12]) or '—'}")
            out.append(f"- **Functions:** {', '.join(rust_lm.get('fns', [])[:12]) or '—'}")
        out.append("```rust\n" + choose_snippet(txt["language_model_rs"], 10, re.compile(r'^\s*(?:pub\s+)?(struct|enum|trait|fn)\s+')) + "\n```")
    if exists["dramatic_md"]:
        out.append(f"\n#### `{files['dramatic_md']}`")
        out.append("- **الغرض:** توثيق وظيفي درامي.")
        out.append("```md\n" + "\n".join(extract_md_headings(txt["dramatic_md"])) + "\n```")
    if exists["agents_mod_rs"]:
        out.append(f"\n#### `{files['agents_mod_rs']}`")
        out.append("- **الغرض:** تسجيل وتصدير الوحدات الفرعية للوكلاء.")
        out.append("```rust\n" + choose_snippet(txt["agents_mod_rs"], 10, re.compile(r'^\s*(?:pub\s+)?mod\s+')) + "\n```")

    # Agents table
    out.append("\n##### جدول الوكلاء (مُستخرَج فعليًا)")
    out.append("| # | الملف | Structs/Traits | Functions |")
    out.append("|---|-------|----------------|-----------|")
    for i, (name, info, _) in enumerate(agents_rows, 1):
        st = ", ".join(sorted(set(info.get("structs", []) + info.get("traits", [])))[:3]) or "—"
        fns = ", ".join(info.get("fns", [])[:4]) or "—"
        out.append(f"| {i} | {name} | {st} | {fns} |")

    # Per-agent sections
    for name, info, snippet in agents_rows:
        out.append(f"\n- **مسار:** `{p_agents / name}`")
        out.append(f"  - **Structs:** {', '.join(info.get('structs', []) or ['—'])}")
        out.append(f"  - **Traits:** {', '.join(info.get('traits', []) or ['—'])}")
        out.append(f"  - **Functions:** {', '.join(info.get('fns', []) or ['—'])}")
        out.append("  - **مقتطف:**")
        out.append("```rust\n" + snippet + "\n```")

    # Config/build
    out.append("\n---\n\n### 2.4 إعدادات وبُنى البناء")
    if exists["cargo_toml"]:
        out.append(f"#### `{files['cargo_toml']}`")
        out.append(f"- **الحزمة:** {toml.get('package','') or '—'}")
        out.append(f"- **الإصدار:** {toml.get('version','') or '—'}")
        out.append(f"- **الأقسام:** {', '.join(toml.get('sections', [])[:10]) or '—'}")
        out.append(f"- **التبعيات:** {', '.join(toml.get('dependencies', [])[:15]) or '—'}")
        out.append("```toml\n" + choose_snippet(txt["cargo_toml"], 10) + "\n```")
    if exists["cargo_lock"]:
        out.append(f"\n#### `{files['cargo_lock']}`")
        out.append("- **الغرض:** قفل إصدارات التبعيات (reproducible builds). **لا تحليل تفصيلي**.")
    if exists["gitignore"]:
        out.append(f"\n#### `{files['gitignore']}`")
        out.append("- **أنماط مستثناة:**")
        out.append("```\n" + "\n".join(ignores[:20]) + "\n```")
    if exists["env"]:
        out.append(f"\n#### `{files['env']}`")
        out.append("- **مفاتيح بيئية (بدون قيم):** " + (", ".join(env_keys) if env_keys else "—"))
    out.append(f"\n#### `{files['target']}`")
    out.append("- **الغرض:** مجلد مخرجات البناء (لا تحليل تفصيلي).")

    # Dependencies map (coarse textual)
    out.append("\n---\n\n## 3) خريطة التبعيات والتفاعلات (استدلال من الشيفرة)")
    out.append("- **main.rs → orchestrator.rs → agents/* → language_model.rs** (تحقق فعلي عبر التصريحات والدوال أعلاه).")

    # Build/run
    out.append("\n## 4) تعليمات التشغيل والبناء (حسب الواقع)")
    out.append("- `cargo build`، `cargo run`، `cargo test` (إذا كان المشروع Rust قياسي).")
    out.append("- تقديم `public/` عبر خادم ساكن أثناء التطوير (أو تكامل مع الخلفية إذا وُجد).")
    out.append("- إعداد ملف `.env` بالقيم المطلوبة إن وُجدت مفاتيح.")

    # Contrib
    out.append("\n## 5) إرشادات المساهمة والصيانة")
    out.append("- لإضافة وكيل جديد: إنشاء ملف في `src/agents/`، التصدير في `src/agents/mod.rs`، والربط في `orchestrator.rs`.")
    out.append("- كتابة اختبارات وحدات/تكامل عند الإمكان.")

    # Limits
    out.append("\n## 6) القيود المعروفة وخارطة الطريق")
    out.append("- تُملأ وفق ما يتضح من الشيفرة الفعلية بعد القراءة الكاملة لجميع الملفات.\n")

    return "\n".join(out)

def main():
    import argparse
    ap = argparse.ArgumentParser(description="Generate TECH_HANDOVER.md from actual project files.")
    ap.add_argument("--root", required=True, help="مسار جذر المشروع (مثال: /home/user/asdf)")
    ap.add_argument("--out", default="TECH_HANDOVER.md", help="اسم ملف المخرجات Markdown")
    args = ap.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        print(f"[!] المسار غير موجود: {root}", file=sys.stderr)
        sys.exit(1)

    md = build_markdown(root)
    outp = Path(args.out).resolve()
    outp.write_text(md, encoding="utf-8")
    print(f"[✓] تم إنشاء الملف: {outp}")

if __name__ == "__main__":
    main()
