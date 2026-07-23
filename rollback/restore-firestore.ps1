$ErrorActionPreference = "Stop"
Copy-Item "$PSScriptRoot\firestore\db-index.ts" "$PSScriptRoot\..\db\index.ts" -Force
Copy-Item "$PSScriptRoot\firestore\package.json" "$PSScriptRoot\..\package.json" -Force
Copy-Item "$PSScriptRoot\firestore\package-lock.json" "$PSScriptRoot\..\package-lock.json" -Force
Set-Location "$PSScriptRoot\.."
npm install
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Write-Host "Firestore data layer restored. Restore Firestore env variables, then run npm run dev."
