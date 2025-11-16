# PowerShell script to set up DigitalOcean Spaces lifecycle policy
# This script uses AWS CLI (S3-compatible) to configure lifecycle rules

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName,
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 7,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "nyc3"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "DigitalOcean Spaces Lifecycle Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking for AWS CLI..." -ForegroundColor Yellow
$awsCliInstalled = Get-Command aws -ErrorAction SilentlyContinue

if (-not $awsCliInstalled) {
    Write-Host "❌ AWS CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install AWS CLI:" -ForegroundColor Yellow
    Write-Host "  winget install Amazon.AWSCLI" -ForegroundColor White
    Write-Host "  or download from: https://aws.amazon.com/cli/" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ AWS CLI is installed" -ForegroundColor Green
Write-Host ""

# Check if AWS CLI is configured for DigitalOcean
Write-Host "Checking AWS CLI configuration for DigitalOcean profile..." -ForegroundColor Yellow
$profileExists = aws configure list --profile digitalocean 2>&1 | Select-String -Pattern "access_key" -Quiet

if (-not $profileExists) {
    Write-Host "⚠️  DigitalOcean profile not configured." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please configure AWS CLI for DigitalOcean Spaces:" -ForegroundColor Yellow
    Write-Host "  aws configure --profile digitalocean" -ForegroundColor White
    Write-Host ""
    Write-Host "Enter your DigitalOcean Spaces credentials when prompted:" -ForegroundColor White
    Write-Host "  - Access Key ID: Your DO Spaces Key" -ForegroundColor Gray
    Write-Host "  - Secret Access Key: Your DO Spaces Secret" -ForegroundColor Gray
    Write-Host "  - Default region: $Region" -ForegroundColor Gray
    Write-Host "  - Output format: json" -ForegroundColor Gray
    Write-Host ""
    
    $configure = Read-Host "Would you like to configure it now? (y/n)"
    if ($configure -eq "y") {
        aws configure --profile digitalocean
    } else {
        exit 1
    }
}

Write-Host "✅ AWS CLI profile configured" -ForegroundColor Green
Write-Host ""

# Create lifecycle configuration
Write-Host "Creating lifecycle configuration..." -ForegroundColor Yellow
$lifecycleConfig = @{
    Rules = @(
        @{
            ID = "delete-old-werkbrief-history"
            Status = "Enabled"
            Prefix = "werkbrief-history/"
            Expiration = @{
                Days = $RetentionDays
            }
        }
    )
} | ConvertTo-Json -Depth 10

$configFile = "$PSScriptRoot\lifecycle-config-temp.json"
$lifecycleConfig | Out-File -FilePath $configFile -Encoding UTF8

Write-Host "✅ Lifecycle configuration created" -ForegroundColor Green
Write-Host ""

# Apply lifecycle configuration
Write-Host "Applying lifecycle policy to bucket: $BucketName" -ForegroundColor Yellow
Write-Host "  Region: $Region" -ForegroundColor Gray
Write-Host "  Prefix: werkbrief-history/" -ForegroundColor Gray
Write-Host "  Retention: $RetentionDays days" -ForegroundColor Gray
Write-Host ""

$endpoint = "https://$Region.digitaloceanspaces.com"

try {
    $result = aws s3api put-bucket-lifecycle-configuration `
        --bucket $BucketName `
        --lifecycle-configuration file://$configFile `
        --endpoint-url $endpoint `
        --profile digitalocean 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Lifecycle policy applied successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Verify the configuration
        Write-Host "Verifying configuration..." -ForegroundColor Yellow
        $verification = aws s3api get-bucket-lifecycle-configuration `
            --bucket $BucketName `
            --endpoint-url $endpoint `
            --profile digitalocean 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Configuration verified!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Current Lifecycle Configuration:" -ForegroundColor Cyan
            Write-Host $verification -ForegroundColor White
        }
    } else {
        throw $result
    }
} catch {
    Write-Host "❌ Failed to apply lifecycle policy" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Check that bucket name is correct" -ForegroundColor White
    Write-Host "  - Verify your credentials have lifecycle management permissions" -ForegroundColor White
    Write-Host "  - Ensure the region matches your Spaces region" -ForegroundColor White
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $configFile) {
        Remove-Item $configFile
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files under 'werkbrief-history/' older than $RetentionDays days will be automatically deleted daily." -ForegroundColor White
Write-Host ""
