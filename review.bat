@echo off
setlocal

set "REVIEW_BATCH_MODE=%~1"
set "REVIEW_BATCH_OPEN=false"
set "REVIEW_BATCH_PATH=%~f0"

if "%REVIEW_BATCH_MODE%"=="" set "REVIEW_BATCH_MODE=working"
if /I "%REVIEW_BATCH_MODE%"=="--open" (
  set "REVIEW_BATCH_MODE=working"
  set "REVIEW_BATCH_OPEN=true"
)
if /I "%~2"=="--open" set "REVIEW_BATCH_OPEN=true"

if not "%~3"=="" goto usage
if not "%~2"=="" if /I not "%~2"=="--open" goto usage
if /I "%REVIEW_BATCH_MODE%"=="staged" goto run
if /I "%REVIEW_BATCH_MODE%"=="working" goto run
if /I "%REVIEW_BATCH_MODE%"=="branch" goto run
if /I "%REVIEW_BATCH_MODE%"=="-h" goto usage_ok
if /I "%REVIEW_BATCH_MODE%"=="--help" goto usage_ok
goto usage

:run
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$raw = [IO.File]::ReadAllText($env:REVIEW_BATCH_PATH); $marker = '# POWERSHELL'; $index = $raw.LastIndexOf($marker); if ($index -lt 0) { exit 1 }; $script = $raw.Substring($index); & ([ScriptBlock]::Create($script))"
exit /b %ERRORLEVEL%

:usage
echo Usage: review.bat [working^|staged^|branch] [--open] 1>&2
exit /b 1

:usage_ok
echo Usage: review.bat [working^|staged^|branch] [--open]
echo.
echo Default mode: working
echo.
echo Optional environment variables:
echo   REVIEW_API_TOKEN   Review server Bearer token ^(default: dev-token^)
echo   REVIEW_API_URL     Review server base URL ^(default: http://localhost:3000^)
echo   BASE_BRANCH        Base branch for branch mode ^(default: main^)
exit /b 0

# POWERSHELL
$ErrorActionPreference = 'Stop'

function Write-Info([string]$Label, [string]$Value) {
  Write-Host ('  {0,-14} {1}' -f $Label, $Value) -ForegroundColor Cyan
}

function Stop-WithError([string]$Message) {
  Write-Host ('x ' + $Message) -ForegroundColor Red
  exit 1
}

try {
  if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    Stop-WithError 'git.exe를 찾을 수 없습니다.'
  }

  $mode = $env:REVIEW_BATCH_MODE
  $openResult = $env:REVIEW_BATCH_OPEN -eq 'true'
  $baseBranch = if ($env:BASE_BRANCH) { $env:BASE_BRANCH } else { 'main' }
  $apiBaseUrl = if ($env:REVIEW_API_URL) { $env:REVIEW_API_URL.TrimEnd('/') } else { 'http://localhost:3000' }
  $apiUrl = $apiBaseUrl + '/api/reviews'
  $apiToken = if ($env:REVIEW_API_TOKEN) { $env:REVIEW_API_TOKEN } else { 'dev-token' }

  $repositoryRoot = (& git.exe rev-parse --show-toplevel 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { Stop-WithError $repositoryRoot }
  $repository = Split-Path $repositoryRoot -Leaf
  $commitSha = (& git.exe -C $repositoryRoot rev-parse HEAD 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { Stop-WithError $commitSha }
  $shortCommit = (& git.exe -C $repositoryRoot rev-parse --short HEAD 2>&1 | Out-String).Trim()

  $gitArguments = switch ($mode) {
    'staged' { @('-C', $repositoryRoot, 'diff', '--cached', '--unified=5', '--diff-filter=ACMRT') }
    'working' { @('-C', $repositoryRoot, 'diff', '--unified=5', '--diff-filter=ACMRT') }
    'branch' { @('-C', $repositoryRoot, 'diff', ($baseBranch + '...HEAD'), '--unified=5', '--diff-filter=ACMRT') }
    default { Stop-WithError ('지원하지 않는 mode입니다: ' + $mode) }
  }

  $diffOutput = & git.exe @gitArguments 2>&1
  if ($LASTEXITCODE -ne 0) { Stop-WithError (($diffOutput | Out-String).Trim()) }
  $diff = [string]::Join("`n", [string[]]$diffOutput)
  if ([string]::IsNullOrWhiteSpace($diff)) {
    Stop-WithError ('리뷰할 변경사항이 없습니다. (mode: ' + $mode + ')')
  }

  $changedFiles = [regex]::Matches($diff, '(?m)^diff --git ').Count
  $diffBytes = [Text.Encoding]::UTF8.GetByteCount($diff)
  $requestBody = [ordered]@{
    repository = $repository
    baseBranch = $baseBranch
    mode = $mode
    commitSha = $commitSha
    diff = $diff
  } | ConvertTo-Json -Depth 4

  Write-Host ''
  Write-Host 'AI Code Review' -ForegroundColor Blue
  Write-Host '----------------------------------------'
  Write-Info 'Repository' $repository
  Write-Info 'Mode' $mode
  Write-Info 'Base branch' $baseBranch
  Write-Info 'Commit' $shortCommit
  Write-Info 'Changed files' ([string]$changedFiles)
  Write-Info 'Diff size' ($diffBytes.ToString() + ' bytes')
  Write-Info 'Endpoint' $apiUrl
  Write-Host '----------------------------------------'
  Write-Host ''

  Add-Type -AssemblyName System.Net.Http
  $handler = [Net.Http.HttpClientHandler]::new()
  $handler.AllowAutoRedirect = $true
  $client = [Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromMinutes(11)
  $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, $apiUrl)
  $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $apiToken)
  $request.Headers.Accept.Add([Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new('text/plain'))
  $request.Content = [Net.Http.StringContent]::new($requestBody, [Text.Encoding]::UTF8, 'application/json')

  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $task = $client.SendAsync($request)
  $frames = @('|', '/', '-', '\')
  $frameIndex = 0
  while (-not $task.IsCompleted) {
    Write-Host -NoNewline ("`r  {0} AI 리뷰 생성 중... {1}s" -f $frames[$frameIndex], [int]$stopwatch.Elapsed.TotalSeconds) -ForegroundColor Yellow
    $frameIndex = ($frameIndex + 1) % $frames.Count
    Start-Sleep -Milliseconds 500
  }
  Write-Host -NoNewline "`r                                                        `r"

  $response = $task.GetAwaiter().GetResult()
  $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult().Trim()
  $stopwatch.Stop()
  $statusCode = [int]$response.StatusCode

  if ($statusCode -ne 201) {
    Write-Host ('x 리뷰 생성 실패 - HTTP {0} - {1}s' -f $statusCode, [int]$stopwatch.Elapsed.TotalSeconds) -ForegroundColor Red
    try {
      $formattedError = $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 8
      Write-Host $formattedError
    } catch {
      Write-Host $responseBody
    }
    exit 1
  }

  if ($responseBody -notmatch '^https?://') {
    Stop-WithError ('서버가 올바르지 않은 URL을 반환했습니다: ' + $responseBody)
  }

  $reviewUrl = $responseBody
  $reviewId = ([Uri]$reviewUrl).Segments[-1].Trim('/')
  Write-Host 'OK 리뷰 생성 완료' -ForegroundColor Green
  Write-Info 'Review ID' $reviewId
  Write-Info 'Elapsed' (([int]$stopwatch.Elapsed.TotalSeconds).ToString() + 's')
  Write-Info 'Result URL' $reviewUrl

  if ($openResult) {
    Start-Process $reviewUrl
    Write-Host ''
    Write-Host 'OK 브라우저에서 결과를 열었습니다.' -ForegroundColor Green
  }

  $request.Dispose()
  $client.Dispose()
  $handler.Dispose()
  exit 0
} catch {
  Stop-WithError $_.Exception.Message
}
