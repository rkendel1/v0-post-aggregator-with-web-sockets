# GitHub Actions Setup for Automated Aggregation

This document explains how to configure GitHub Actions to run automated aggregation jobs.

## Required Secrets

Add these secrets in your GitHub repository settings:

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" and add:

### `CRON_SECRET`
A secure random string used to authenticate cron requests to edge functions.

Generate one with:
```bash
openssl rand -base64 32
```

Example: `8f3e2a1b5c9d7e4f6a8b2c1d5e9f3a7b2c4d6e8f1a3b5c7d9e2f4a6b8c1d3e5f`

### `SUPABASE_URL`
Your Supabase project URL.

Example: `https://abcdefghijklmnop.supabase.co`

Find it in your Supabase Dashboard → Project Settings → API

## Supabase Configuration

You also need to set the `CRON_SECRET` in your Supabase Edge Functions:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Settings
3. Add environment variable:
   - Name: `CRON_SECRET`
   - Value: (same value as GitHub Actions secret)

## Workflow Schedule

The default schedule is every 30 minutes. To modify:

Edit `.github/workflows/aggregate-posts.yml`:

```yaml
on:
  schedule:
    # Cron syntax: minute hour day month dayofweek
    - cron: '*/30 * * * *'  # Every 30 minutes
    # - cron: '0 * * * *'   # Every hour
    # - cron: '0 */6 * * *' # Every 6 hours
```

## Testing the Workflow

### Manual Trigger

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Aggregate Posts" workflow
4. Click "Run workflow"

### Check Logs

After running:

1. Click on the workflow run
2. Expand each job to see detailed logs
3. Check for success/failure messages

## Troubleshooting

### Workflow fails with 401 Unauthorized

- Verify `CRON_SECRET` matches in both GitHub Actions and Supabase
- Ensure it's set correctly in Supabase Edge Functions settings

### Workflow fails with 500 Internal Server Error

- Check Supabase Edge Function logs in Dashboard
- Verify edge functions are deployed
- Check database migrations are run

### No posts being created

- Verify `show_rss_feeds` table has active feeds
- Check `aggregation_logs` table for errors
- Test edge functions manually with curl

## Alternative: Disable GitHub Actions

If you don't want to use GitHub Actions, you can:

1. Delete `.github/workflows/aggregate-posts.yml`
2. Use Supabase Cron (Pro plan required)
3. Use an external cron service (cron-job.org, EasyCron, etc.)

See [docs/AUTOMATED_AGGREGATION.md](../../docs/AUTOMATED_AGGREGATION.md) for other options.
