"""Convert file:// links to GitHub blob links in wiki documentation.

Windows-safe: uses pure pathlib, no shell commands.
"""
import re
from pathlib import Path

REPO = "https://github.com/SafeVixAI/SafeVixAI/blob/main"
WIKI_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "wiki" / "content"

# Pattern: file://path or file://path#L10-L20
FILE_LINK_RE = re.compile(r'file://([^\s\)\]\}<>"\']+)')

def convert_link(match):
    path = match.group(1)
    # Strip leading ./ if present
    if path.startswith("./"):
        path = path[2:]
    return f"{REPO}/{path}"

def main():
    total = 0
    files_changed = 0

    for md_file in sorted(WIKI_DIR.rglob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        new_text, count = FILE_LINK_RE.subn(convert_link, text)
        if count > 0:
            md_file.write_text(new_text, encoding="utf-8")
            total += count
            files_changed += 1
            print(f"  {md_file.relative_to(WIKI_DIR)}: {count} links")

    print(f"\nConverted {total} file:// links across {files_changed} files")

if __name__ == "__main__":
    main()
