# Fix test file conventions across all test directories
$ErrorActionPreference = 'Stop'

$fixed = 0
$dirs = @(
  'components/__tests__',
  'lib/__tests__',
  'hooks/__tests__',
  'tests',
  'lib/auth/__tests__',
  'lib/store/__tests__'
)

foreach ($dir in $dirs) {
  $files = Get-ChildItem "$dir/*.test.*" -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    $name = $f.Name
    if ($name -match 'test-utils|api-contract') { continue }
    
    $content = Get-Content $f.FullName -Raw
    $original = $content
    $changed = $false

    # Fix arrow functions in lifecycle callbacks (handles comma between args)
    # describe('name', () => {  ->  describe('name', function() {
    # it('name', () => {  ->  it('name', function() {
    # beforeEach(() => {  ->  beforeEach(function() {
    $patterns = @(
      @('(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)(\s*\([\s\S]*?),\s*\(\s*\)\s*=>\s*\{', '$1$2, function() {'),
      @('(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)(\s*\(\s*\)\s*)=>(\s*\{)', '$1$2 function$3'),
      @('(it|test)(\s*\([\s\S]*?),\s*async\s*\(\s*\)\s*=>\s*\{', '$1$2, async function() {')
    )
    foreach ($p in $patterns) {
      $newContent = $content -replace $p[0], $p[1]
      if ($newContent -ne $content) { $changed = $true; $content = $newContent }
    }

    # Replace const/let with var at module scope (lines that aren't import statements)
    $lines = $content -split "`r`n|`n"
    $newLines = @()
    $inMock = $false
    $parenDepth = 0
    
    foreach ($line in $lines) {
      $trimmed = $line.Trim()
      
      # Track jest.mock scope by counting parens
      if ($trimmed -match '^jest\.mock\(') { $inMock = $true; $parenDepth = 0 }
      
      if ($inMock) {
        # Count parens to find when mock() closes
        foreach ($ch in $trimmed.GetEnumerator()) {
          if ($ch -eq '(') { $parenDepth++ }
          if ($ch -eq ')') { $parenDepth-- }
        }
        if ($parenDepth -le 0) { $inMock = $false }
        # Don't modify const/let inside mock factory (it's in function scope)
        $newLines += $line
        continue
      }
      
      # Skip import statements
      if ($trimmed -match '^import\s') {
        $newLines += $line
        continue
      }
      
      # Replace const/let at start of line (with leading whitespace)
      # Skip: for (const x of ...), export const, as const pattern (TypeScript)
      if ($trimmed -match '^(const|let)\s' -and $trimmed -notmatch 'for\s*\((const|let)\)' -and $trimmed -notmatch 'as const') {
        $line = $line -replace '^(\s*)(const|let)\s', '$1var '
        $changed = $true
      }
      
      $newLines += $line
    }
    $content = $newLines -join "`r`n"

    if ($changed) {
      Set-Content -Path $f.FullName -Value $content
      $fixed++
      Write-Host "  FIXED: $($f.Name)"
    }
  }
}

Write-Host "`nTotal fixed: $fixed"
