> **✅ COMPLETED — 2026-06-22 — All 6 changes implemented. See Phase 3 for next steps.**

# Phase 1: Wiki Enterprise Score 80 → 85

## 6 Quick-Win Changes — Execute in order

---

### 1. Add `site_url` to mkdocs.yml

**File:** `mkdocs.yml:2` — insert after `site_description`

```yaml
site_url: https://safevixai.github.io/SafeVixAI/
```

Enables sitemap.xml generation (SEO), social link previews, and absolute URLs in search results.

---

### 2. Add CHANGELOG to MkDocs nav

**File:** `mkdocs.yml:80` — add after `Complete_Project_Resource_Checklist.md`

```yaml
      - Changelog: CHANGELOG.md
```

`CHANGELOG.md` already exists (88 lines, Keep a Changelog format). Just needs to be in the nav.

---

### 3. Add markdown linting to sync-wiki.yml

**File:** `.github/workflows/sync-wiki.yml` — insert between "Set up Python" and "Run wiki manager"

```yaml
      - name: Lint hand-written markdown
        uses: DavidAnson/markdownlint-cli2-action@v16
        continue-on-error: true
        with:
          globs: |
            docs/*.md
            *.md
            !docs/wiki/**/*
            !node_modules/**/*
          config: |
            {
              "MD013": false,
              "MD024": false,
              "MD033": false,
              "MD041": false
            }
```

Skips auto-generated wiki content. `continue-on-error: true` means it won't block the PR — just surfaces warnings.

---

### 4. Replace post-run integrity check with strict check

**File:** `.github/workflows/sync-wiki.yml` — replace entire "Post-run integrity check" step

Old:
```yaml
      - name: Post-run integrity check
        run: |
          echo "=== Wiki Integrity Report ==="
          CONTENT_COUNT=$(find docs/wiki/content -name "*.md" | wc -l)
          echo "Wiki content files: $CONTENT_COUNT"
          STALE=$(grep -rl "sentence-transformers\|SentenceTransformer\|admin123\|mock-jwt" ...)
          ...
```

New:
```yaml
      - name: Post-run integrity check
        run: |
          echo "=== Wiki Integrity Report ==="
          CONTENT_COUNT=$(find docs/wiki/content -name "*.md" | wc -l)
          echo "Wiki content files: $CONTENT_COUNT"
          python scripts/docs/wiki_manager.py check --strict
```

---

### 5. Add broken link checker to sync-wiki.yml

**File:** `.github/workflows/sync-wiki.yml` — insert between "Post-run integrity check" and "Create Pull Request"

```yaml
      - name: Check for broken external links
        continue-on-error: true
        uses: lycheeverse/lychee-action@v1
        with:
          args: >
            --no-progress
            --exclude-mail
            --exclude 'file://'
            --exclude 'https://github.com/SafeVixAI/SafeVixAI'
            './docs/wiki/**/*.md'
            './docs/*.md'
            './*.md'
          fail: false
```

Uses `lychee` (Rust — fast). Excludes `file://` links (253+ exist) and the repo URL. `continue-on-error: true` means it won't block the PR.

---

### 6. Add `--strict` flag to wiki_manager.py

**File:** `scripts/docs/wiki_manager.py:956-961` — modify `main()` to accept `--strict`

Old:
```python
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "check"

    if mode == "check":
        uncov, stale = run_check()
        sys.exit(1 if stale > 0 else 0)
```

New:
```python
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    mode = args[0] if args else "check"
    strict = "--strict" in flags

    if mode == "check":
        uncov, stale = run_check()
        if strict and uncov > 0:
            print(f"\n  STRICT MODE: {uncov} modules undocumented — failing")
            sys.exit(1)
        sys.exit(1 if stale > 0 else 0)
```

This makes CI fail if any module is undocumented when `--strict` is passed. Links into the new sync-wiki.yml integrity check step.

---

## Verification

After all changes, run:
```bash
python scripts/docs/wiki_manager.py check --strict
```
Should exit 0 (340/340 coverage, 0 stale).

Then push and verify the sync-wiki workflow runs without errors.
