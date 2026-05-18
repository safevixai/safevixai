# migrate-motion.ps1
# Migrates ALL remaining motion/react -> CSS keyframe animations
# Strategy: Replace motion.div with div + inline CSS animations, remove AnimatePresence

param([string]$Root = ".")

$files = Get-ChildItem -Recurse -Include *.tsx -Path "$Root\app","$Root\components" |
  Select-String -Pattern "from 'motion/react'" -List |
  ForEach-Object { $_.Path }

Write-Host "Found $($files.Count) files to migrate" -ForegroundColor Cyan

foreach ($file in $files) {
  $rel = $file.Replace("$((Get-Location).Path)\", "")
  Write-Host "  Migrating: $rel" -ForegroundColor Yellow
  
  $content = [System.IO.File]::ReadAllText($file)
  $original = $content
  
  # 1. Remove the motion import line entirely
  $content = [regex]::Replace($content, "import \{ [^}]*\} from 'motion/react';\r?\n", "", [System.Text.RegularExpressions.RegexOptions]::Singleline)
  
  # 2. Remove <AnimatePresence ...> and </AnimatePresence> tags  
  $content = [regex]::Replace($content, '<AnimatePresence[^>]*>\r?\n?', '')
  $content = [regex]::Replace($content, '\s*</AnimatePresence>\r?\n?', "`n")
  
  # 3. Replace <motion.div with <div, preserving all props EXCEPT initial/animate/exit/transition/whileHover/whileTap/whileInView/variants/layout
  # First handle self-closing motion tags
  $content = $content -replace '<motion\.section', '<section'
  $content = $content -replace '</motion\.section>', '</section>'
  $content = $content -replace '<motion\.button', '<button'
  $content = $content -replace '</motion\.button>', '</button>'
  $content = $content -replace '<motion\.span', '<span'
  $content = $content -replace '</motion\.span>', '</span>'
  $content = $content -replace '<motion\.p', '<p'
  $content = $content -replace '</motion\.p>', '</p>'
  $content = $content -replace '<motion\.div', '<div'
  $content = $content -replace '</motion\.div>', '</div>'
  $content = $content -replace '<motion\.li', '<li'
  $content = $content -replace '</motion\.li>', '</li>'
  $content = $content -replace '<motion\.a', '<a'
  $content = $content -replace '</motion\.a>', '</a>'
  $content = $content -replace '<motion\.img', '<img'
  
  # 4. Remove framer-motion-only props (multiline safe)
  # Remove initial={{ ... }}
  $content = [regex]::Replace($content, '\s+initial=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove animate={{ ... }}
  $content = [regex]::Replace($content, '\s+animate=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove exit={{ ... }}
  $content = [regex]::Replace($content, '\s+exit=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove transition={{ ... }}
  $content = [regex]::Replace($content, '\s+transition=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove whileHover={{ ... }}
  $content = [regex]::Replace($content, '\s+whileHover=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove whileTap={{ ... }}
  $content = [regex]::Replace($content, '\s+whileTap=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove whileInView={{ ... }}
  $content = [regex]::Replace($content, '\s+whileInView=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove viewport={{ ... }}
  $content = [regex]::Replace($content, '\s+viewport=\{\{[^}]*\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove variants={...}
  $content = [regex]::Replace($content, '\s+variants=\{[^}]*\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  # Remove layout prop
  $content = $content -replace '\s+layout\b(?!=)', ''
  # Remove initial={string} form
  $content = [regex]::Replace($content, '\s+initial="[^"]*"', '')
  # Remove animate={string} form  
  $content = [regex]::Replace($content, '\s+animate="[^"]*"', '')
  
  if ($content -ne $original) {
    [System.IO.File]::WriteAllText($file, $content)
    Write-Host "    Done" -ForegroundColor Green
  } else {
    Write-Host "    No changes needed" -ForegroundColor DarkGray
  }
}

Write-Host "`nMigration complete!" -ForegroundColor Cyan
