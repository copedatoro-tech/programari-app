$ErrorActionPreference = "Stop"

$root = "D:\programari"
$landingPage = Join-Path $root "app\[locale]\page.tsx"
$subscriptionsPage = Join-Path $root "app\[locale]\abonamente\page.tsx"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $landingPage)) {
  throw "Landing page not found: $landingPage"
}

if (-not (Test-Path -LiteralPath $subscriptionsPage)) {
  throw "Subscriptions page not found: $subscriptionsPage"
}

Write-Host "Removing generated backup files..."
Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*.backup-*" } |
  Remove-Item -Force

Write-Host "Patching landing pricing cards..."
$landingText = [System.IO.File]::ReadAllText($landingPage, [System.Text.Encoding]::UTF8)
$oldLandingBlock = @'
                <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-1 ${highlight?"text-white":"text-slate-900"}`}>{p.plan}</h3>
                <p className={`text-[10px] font-black italic mb-5 ${highlight?"text-amber-400":"text-amber-600"}`}>{p.prog}</p>
'@
$newLandingBlock = @'
                <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-1 ${highlight?"text-white":"text-slate-900"}`}>{p.plan}</h3>
                <p className={`text-3xl font-black tracking-tighter mb-1 ${highlight?"text-white":"text-slate-900"}`}>{p.price}</p>
                <p className={`text-[10px] font-black italic mb-5 ${highlight?"text-amber-400":"text-amber-600"}`}>{p.prog}</p>
'@

if ($landingText -notmatch "\{p\.price\}") {
  if (-not $landingText.Contains($oldLandingBlock)) {
    throw "Could not find the expected pricing block in landing page."
  }
  $landingText = $landingText.Replace($oldLandingBlock, $newLandingBlock)
  [System.IO.File]::WriteAllText($landingPage, $landingText, $utf8NoBom)
} else {
  [System.IO.File]::WriteAllText($landingPage, $landingText, $utf8NoBom)
}

Write-Host "Patching recommended plan on subscriptions page..."
$subscriptionsText = [System.IO.File]::ReadAllText($subscriptionsPage, [System.Text.Encoding]::UTF8)
$subscriptionsText = $subscriptionsText.Replace(
  '{ id: "CHRONOS PRO", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, popular: true, Icon: Zap, accent: "text-amber-600", bg: "bg-amber-50", ring: "border-amber-200" }',
  '{ id: "CHRONOS PRO", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, popular: false, Icon: Zap, accent: "text-amber-600", bg: "bg-amber-50", ring: "border-amber-200" }'
)
$subscriptionsText = $subscriptionsText.Replace(
  '{ id: "CHRONOS ELITE", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE, popular: false, Icon: Gem, accent: "text-sky-600", bg: "bg-sky-50", ring: "border-sky-200" }',
  '{ id: "CHRONOS ELITE", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE, popular: true, Icon: Gem, accent: "text-sky-600", bg: "bg-sky-50", ring: "border-sky-200" }'
)
[System.IO.File]::WriteAllText($subscriptionsPage, $subscriptionsText, $utf8NoBom)

Write-Host "Validating translation JSON files..."
Push-Location -LiteralPath $root
node -e "const fs=require('fs'); for (const f of fs.readdirSync('messages').filter(f=>f.endsWith('.json'))) JSON.parse(fs.readFileSync('messages/'+f,'utf8')); console.log('JSON OK');"
git status --short
Pop-Location

Write-Host "Done."
