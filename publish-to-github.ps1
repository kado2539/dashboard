# publish-to-github.ps1
# Usage: Open PowerShell, cd to repo root, then `.	ools\publish-to-github.ps1 -RepoName "my-repo" -Description "BI prototype"`
param(
    [Parameter(Mandatory = $true)] [string]$RepoName,
    [Parameter(Mandatory = $false)] [string]$Description = "BI PROTOTYPE",
    [Parameter(Mandatory = $false)] [string]$Visibility = "public"
)

function Exec([string]$cmd) {
    Write-Host "> $cmd"
    iex $cmd
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found. Please install Git and try again."
    exit 1
}

# ensure we're at repo root
$root = Get-Location
# init if needed
if (-not (Test-Path .git)) {
    Exec "git init"
    Exec "git add ."
    Exec "git commit -m 'Initial commit'"
}

# prefer gh CLI if available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "Using gh CLI to create repo..."
    $createCmd = "gh repo create $RepoName --public --description \"$Description\" --source=. --remote=origin --push"
    Exec $createCmd
    Write-Host "Repository created and pushed to GitHub: https://github.com/$(gh auth status --show-token 2>$null | Out-String)"
}
else {
    Write-Host "gh CLI not found. Create an empty repo on GitHub via the web UI, then run the following commands:";
    Write-Host "git remote add origin https://github.com/<your-username>/$RepoName.git"
    Write-Host "git branch -M main"
    Write-Host "git push -u origin main"
}

Write-Host "Done. Your project is now published (or follow the printed steps). Do not commit .env files or secrets."
