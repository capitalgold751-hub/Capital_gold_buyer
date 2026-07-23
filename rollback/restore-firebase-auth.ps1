$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Copy-Item "$PSScriptRoot\firebase-auth\login-route.ts" "$root\app\api\auth\login\route.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\session.ts" "$root\app\lib\session.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\firebase-auth.ts" "$root\app\lib\firebase-auth.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\db-index.ts" "$root\db\index.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\db-bootstrap.ts" "$root\db\bootstrap.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\db-schema.ts" "$root\db\schema.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\dashboard-route.ts" "$root\app\api\dashboard\route.ts" -Force
Copy-Item "$PSScriptRoot\firebase-auth\package.json" "$root\package.json" -Force
Write-Host "Firebase Authentication code restored. Run npm install and restore Firebase environment variables."
