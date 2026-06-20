"""Auto-generate MkDocs nav entries for wiki content.

Scans docs/wiki/content/ and outputs YAML nav entries.

Usage:
    python scripts/docs/generate-nav.py
"""
from pathlib import Path

WIKI_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "wiki" / "content"
EXCLUDES = {"README.md"}

def build_nav(dir_path, prefix=""):
    """Build nested nav dict from directory structure."""
    items = []
    for f in sorted(dir_path.iterdir()):
        if f.name.startswith("."):
            continue
        if f.is_dir():
            children = build_nav(f, prefix)
            if children:
                items.append({f.name: children})
        elif f.suffix == ".md" and f.stem not in EXCLUDES:
            rel = f.relative_to(Path(__file__).resolve().parent.parent.parent)
            name = f.stem.replace("-", " ").replace("_", " ").title()
            items.append({name: str(rel)})
    return items

def main():
    nav = build_nav(WIKI_DIR)
    for item in nav:
        print(item)

if __name__ == "__main__":
    main()
