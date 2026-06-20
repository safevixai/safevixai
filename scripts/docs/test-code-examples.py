"""Extract and validate code examples from wiki documentation.

Checks:
- Python code blocks compile (syntax check via ast.parse)
- Bash code blocks have no obvious errors (basic shellcheck-style checks)
- TypeScript code blocks can be parsed (basic AST check)

Usage: python scripts/docs/test-code-examples.py
"""
import ast
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent.parent.parent
WIKI_DIR = ROOT / "docs" / "wiki" / "content"

CODE_BLOCK_RE = re.compile(
    r'```(python|typescript|bash|sh|javascript|js)\s*\n(.*?)```',
    re.DOTALL
)

SHELL_DANGEROUS = [
    "rm -rf /", "rm -rf /*", "> /dev/sda", "dd if=", "mkfs.",
    ":(){ :|:& };:", "chmod -R 000 /", "wget http://evil",
]

def validate_python(code: str, source: str) -> list[str]:
    issues = []
    try:
        ast.parse(code)
    except SyntaxError as e:
        issues.append(f"Python syntax error: {e}")
    for line in code.split("\n"):
        stripped = line.strip()
        if any(danger in stripped for danger in SHELL_DANGEROUS):
            if not stripped.startswith("#"):
                issues.append(f"Potentially dangerous pattern in Python: {stripped[:60]}")
    return issues


def validate_typescript(code: str, source: str) -> list[str]:
    issues = []
    # JSX/TSX won't compile in Python. Instead check for common patterns:
    has_jsx = bool(re.search(r'<[A-Z]\w+[^>]*>', code))
    if has_jsx:
        # Basic JSX check: balanced angle brackets, no unclosed tags
        open_tags = len(re.findall(r'<[A-Z]\w+[^>]*>', code))
        close_tags = len(re.findall(r'</\w+>', code))
        if open_tags > close_tags + 5:
            issues.append(f"Possible unclosed JSX tags: {open_tags} open, {close_tags} closed")
    else:
        try:
            compile(code, source, "exec")
        except SyntaxError as e:
            issues.append(f"TypeScript/JS syntax error: {e}")
    for line in code.split("\n"):
        stripped = line.strip()
        if any(danger in stripped for danger in SHELL_DANGEROUS):
            issues.append(f"Potentially dangerous pattern in TS: {stripped[:60]}")
    return issues


def validate_bash(code: str, source: str) -> list[str]:
    issues = []
    for line in code.split("\n"):
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        if any(danger in stripped for danger in SHELL_DANGEROUS):
            issues.append(f"Potentially dangerous shell command: {stripped[:60]}")
        # Check for unclosed quotes
        for q in ['"', "'", "`"]:
            if stripped.count(q) % 2 != 0:
                issues.append(f"Unclosed {q} quote: {stripped[:60]}")
    return issues


VALIDATORS = {
    "python": validate_python,
    "typescript": validate_typescript,
    "javascript": validate_typescript,
    "bash": validate_bash,
    "sh": validate_bash,
}


def main():
    total_blocks = 0
    total_issues = 0
    files_with_issues = 0

    for md_file in sorted(WIKI_DIR.rglob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        file_issues = 0
        for match in CODE_BLOCK_RE.finditer(text):
            lang = match.group(1)
            code = match.group(2)
            total_blocks += 1

            validator = VALIDATORS.get(lang)
            if validator:
                issues = validator(code, str(md_file))
                if issues:
                    file_issues += len(issues)
                    for issue in issues:
                        print(f"  {md_file.relative_to(ROOT)} [{lang}]: {issue}")

        if file_issues:
            files_with_issues += 1
            total_issues += file_issues

    print(f"\n{'='*60}")
    print(f"  Code blocks checked: {total_blocks}")
    print(f"  Issues found: {total_issues}")
    print(f"  Files with issues: {files_with_issues}")
    print(f"{'='*60}")
    return total_issues


if __name__ == "__main__":
    exit(main())
