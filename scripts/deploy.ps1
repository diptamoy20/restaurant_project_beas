param(
  [ValidateSet("build", "deploy", "full")]
  [string]$Mode = "full"
)

$ErrorActionPreference = "Stop"

$SERVER_HOST = if ($env:SERVER_HOST) { $env:SERVER_HOST } else { "dev.beas.in" }
$SERVER_USER = if ($env:SERVER_USER) { $env:SERVER_USER } else { "deploy" }
$SERVER_PORT = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "22" }
$SERVER_APP_DIR = if ($env:SERVER_APP_DIR) { $env:SERVER_APP_DIR } else { "/var/www/dev.beas.in/public_html/restaurant_project_beas" }
$PM2_APP_NAME = if ($env:PM2_APP_NAME) { $env:PM2_APP_NAME } else { "restaurant-backend" }
$PM2_INSTANCES = if ($env:PM2_INSTANCES) { $env:PM2_INSTANCES } else { "1" }
$KEEP_RELEASES = if ($env:KEEP_RELEASES) { $env:KEEP_RELEASES } else { "5" }
$ARTIFACT_DIR = if ($env:ARTIFACT_DIR) { $env:ARTIFACT_DIR } else { "artifacts" }

function Write-Log {
  param([string]$Message)
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)
  throw $Message
}

function Require-Command {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Fail "Missing required command: $CommandName"
  }
}

function Get-ReleaseId {
  $gitSha = "manual"

  try {
    $gitSha = (git rev-parse --short HEAD).Trim()
  } catch {
    $gitSha = "manual"
  }

  return "{0}-{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), $gitSha
}

function Build-Backend {
  Write-Log "Installing backend dependencies"
  Push-Location backend
  try {
    npm ci
    npm run lint
    npm run typecheck
    npm run build
  } finally {
    Pop-Location
  }
}

function New-BackendArtifact {
  param([string]$ReleaseId)

  if (-not (Test-Path $ARTIFACT_DIR)) {
    New-Item -ItemType Directory -Path $ARTIFACT_DIR | Out-Null
  }

  $artifactPath = Join-Path $ARTIFACT_DIR "backend-$ReleaseId.tgz"
  if (Test-Path $artifactPath) {
    Remove-Item $artifactPath -Force
  }

  Write-Log "Creating backend artifact $artifactPath"
  Push-Location backend
  try {
    & tar -czf "..\$artifactPath" "dist" "package.json" "package-lock.json" "prisma" "ecosystem.config.cjs"
  } finally {
    Pop-Location
  }

  return $artifactPath
}

function Get-LatestArtifact {
  $artifact = Get-ChildItem -Path $ARTIFACT_DIR -Filter "backend-*.tgz" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $artifact) {
    Fail "No backend artifact found in $ARTIFACT_DIR"
  }

  return $artifact.FullName
}

function Deploy-Artifact {
  param(
    [string]$ReleaseId,
    [string]$ArtifactPath
  )

  if (-not (Test-Path $ArtifactPath)) {
    Fail "Artifact not found: $ArtifactPath"
  }

  Write-Log "Preparing remote directories"
  & ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_HOST" "mkdir -p '$SERVER_APP_DIR/incoming' '$SERVER_APP_DIR/shared' '$SERVER_APP_DIR/releases'"

  Write-Log "Uploading artifact and deploy script"
  & scp -P $SERVER_PORT $ArtifactPath "scripts/deploy.sh" "$SERVER_USER@$SERVER_HOST`:$SERVER_APP_DIR/incoming/"

  $artifactName = [System.IO.Path]::GetFileName($ArtifactPath)
  $remoteCommand = "APP_ROOT='$SERVER_APP_DIR' RELEASE_ID='$ReleaseId' ARTIFACT_PATH='$SERVER_APP_DIR/incoming/$artifactName' SHARED_ENV_FILE='$SERVER_APP_DIR/shared/backend.env' PM2_APP_NAME='$PM2_APP_NAME' PM2_INSTANCES='$PM2_INSTANCES' KEEP_RELEASES='$KEEP_RELEASES' bash '$SERVER_APP_DIR/incoming/deploy.sh'"

  Write-Log "Running remote deployment"
  & ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_HOST" $remoteCommand
}

Require-Command git
Require-Command npm
Require-Command tar
Require-Command ssh
Require-Command scp

switch ($Mode) {
  "build" {
    $releaseId = Get-ReleaseId
    Build-Backend
    $artifactPath = New-BackendArtifact -ReleaseId $releaseId
    Write-Log "Artifact ready: $artifactPath"
  }
  "deploy" {
    $artifactPath = Get-LatestArtifact
    $releaseId = [System.IO.Path]::GetFileNameWithoutExtension($artifactPath) -replace '^backend-', ''
    Deploy-Artifact -ReleaseId $releaseId -ArtifactPath $artifactPath
  }
  "full" {
    $releaseId = Get-ReleaseId
    Build-Backend
    $artifactPath = New-BackendArtifact -ReleaseId $releaseId
    Deploy-Artifact -ReleaseId $releaseId -ArtifactPath $artifactPath
  }
}
