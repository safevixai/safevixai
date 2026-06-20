"""Check all internal markdown links in wiki content resolve to existing files.

Usage: python scripts/docs/check-links.py
"""
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent.parent.parent
WIKI_DIR = ROOT / "docs" / "wiki" / "content"
DOCS_DIR = ROOT / "docs"

LINK_RE = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
ANCHOR_RE = re.compile(r'#L(\d+)(?:-L(\d+))?')

def resolve_link(link_text: str, source_file: Path) -> list[str]:
    """Try to resolve a markdown link to an existing file. Returns list of issues."""
    issues = []
    if link_text.startswith("http://") or link_text.startswith("https://"):
        return issues  # external links checked by lychee
    if link_text.startswith("#"):
        return issues  # same-file anchor
    if link_text.startswith("file://"):
        issues.append(f"file:// link still present: {link_text}")
        return issues

    # Remove anchor (#section, #L10-L20)
    file_part = link_text.split("#")[0]
    anchor_part = link_text.split("#")[1] if "#" in link_text else ""

    if not file_part:
        return issues

    # Try relative to source file
    target = (source_file.parent / file_part).resolve()
    if not target.exists():
        # Try relative to ROOT
        target = (ROOT / file_part).resolve()
        if not target.exists():
            issues.append("Broken link: '" + link_text + "' -> not found at " + str(target))
            return issues

    # If anchor is a line number ref, check the file has enough lines
    am = ANCHOR_RE.match(anchor_part)
    if am:
        line_num = int(am.group(1))
        lines = target.read_text(encoding="utf-8").split("\n")
        if line_num > len(lines):
            issues.append("Line ref exceeds file: '" + link_text + "' -> " + target.name + " has " + str(len(lines)) + " lines, referenced L" + str(line_num))

    return issues


def main():
    total_issues = 0
    total_links = 0
    files_with_issues = 0

    for md_file in sorted(WIKI_DIR.rglob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        file_issues = 0
        for match in LINK_RE.finditer(text):
            total_links += 1
            issues = resolve_link(match.group(2), md_file)
            if issues:
                file_issues += len(issues)
                for issue in issues:
                    print(f"  {md_file.relative_to(ROOT)}: {issue}")

        if file_issues:
            files_with_issues += 1
            total_issues += file_issues

    # Also check docs/ root markdown files
    for md_file in sorted(DOCS_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        file_issues = 0
        for match in LINK_RE.finditer(text):
            total_links += 1
            issues = resolve_link(match.group(2), md_file)
            if issues:
                file_issues += len(issues)
                for issue in issues:
                    print(f"  {md_file.relative_to(ROOT)}: {issue}")
        if file_issues:
            files_with_issues += 1
            total_issues += file_issues

    print(f"\n{'='*60}")
    print(f"  Links checked: {total_links}")
    print(f"  Issues found: {total_issues}")
    print(f"  Files with issues: {files_with_issues}")
    print(f"{'='*60}")
    return total_issues


if __name__ == "__main__":
    exit(main())
