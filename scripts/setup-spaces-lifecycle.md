# DigitalOcean Spaces Lifecycle Configuration

## Automatic Deletion of Old Werkbrief History

This guide explains how to set up automatic deletion of werkbrief history items older than 7 days using DigitalOcean Spaces Lifecycle Rules.

## Option 1: Using DigitalOcean Control Panel (Easiest)

1. Log in to [DigitalOcean Cloud Panel](https://cloud.digitalocean.com/)
2. Navigate to **Spaces** → Select your bucket
3. Click on **Settings** tab
4. Scroll to **Lifecycle Rules** section
5. Click **Add Lifecycle Rule**
6. Configure the rule:
   - **Rule Name**: `auto-delete-old-werkbrief-history`
   - **Scope**: Select "Limit to prefix"
   - **Prefix**: `werkbrief-history/`
   - **Expiration**: Check "Delete objects after X days"
   - **Days**: `7`
7. Click **Save**

## Option 2: Using AWS CLI (S3-Compatible)

DigitalOcean Spaces is S3-compatible, so you can use the AWS CLI:

### Step 1: Install AWS CLI

```bash
# Windows (PowerShell)
winget install Amazon.AWSCLI

# Or download from: https://aws.amazon.com/cli/
```

### Step 2: Configure AWS CLI for DigitalOcean Spaces

```bash
aws configure --profile digitalocean

# Enter these values:
# AWS Access Key ID: [Your DO Spaces Key]
# AWS Secret Access Key: [Your DO Spaces Secret]
# Default region name: [Your DO region, e.g., nyc3]
# Default output format: json
```

### Step 3: Create Lifecycle Configuration File

Create `lifecycle-config.json`:

```json
{
  "Rules": [
    {
      "ID": "delete-old-werkbrief-history",
      "Status": "Enabled",
      "Prefix": "werkbrief-history/",
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
```

### Step 4: Apply the Lifecycle Policy

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket YOUR_BUCKET_NAME \
  --lifecycle-configuration file://lifecycle-config.json \
  --endpoint-url https://YOUR_REGION.digitaloceanspaces.com \
  --profile digitalocean
```

### Step 5: Verify the Configuration

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket YOUR_BUCKET_NAME \
  --endpoint-url https://YOUR_REGION.digitaloceanspaces.com \
  --profile digitalocean
```

## Option 3: Using DigitalOcean API

You can also set this up programmatically using the DigitalOcean API if you want to automate the setup as part of your deployment process.

See: https://docs.digitalocean.com/reference/api/spaces-api/

## How It Works

- **Automatic**: DigitalOcean handles deletion automatically
- **No Code Needed**: Runs at the storage level
- **Cost-Effective**: No additional compute resources required
- **Reliable**: Guaranteed to run without maintenance
- **Prefix-Based**: Only affects files under `werkbrief-history/`
- **Safe**: Your PDF uploads and other data remain untouched

## Verification

After setting up, you can verify the rule is working by:

1. Checking the DigitalOcean Spaces dashboard
2. Monitoring your storage usage over time
3. Creating test files with dates in the past (if needed for testing)

## Notes

- The deletion happens **daily**, typically in the early morning hours (UTC)
- Objects are deleted based on their **creation date** (LastModified)
- Once deleted, objects **cannot be recovered** (ensure 7 days is appropriate for your needs)
- You can modify or delete the lifecycle rule at any time

## Adjusting the Retention Period

To change from 7 days to a different period:

- **Control Panel**: Edit the existing lifecycle rule
- **CLI**: Update the JSON file and reapply the configuration

## Recommended: Keep the DELETE API Endpoint

Even though DigitalOcean will handle automatic cleanup, keeping the DELETE API endpoint is useful for:

- Manual cleanup on demand
- Admin-initiated cleanup
- Testing purposes
- Immediate cleanup (doesn't wait for daily cycle)
