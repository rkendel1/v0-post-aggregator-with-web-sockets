# Creator Bulk Upload Guide

This guide explains how to use the bulk upload feature to quickly onboard multiple creators to PodBridge with all their metadata.

## Overview

The bulk upload feature allows administrators to load creator shows with all required information in one operation:
- Show names and tags
- RSS feeds
- Community links (Discord, Telegram, etc.)
- Subdomains
- Categories

## Upload Formats

You can upload creator data in two formats: **CSV** or **JSON**.

### CSV Format

CSV is ideal for spreadsheet editing and simple bulk uploads.

#### Required Columns
- `tag` - URL-friendly slug (e.g., `joe-rogan-experience`)
- `name` - Display name (e.g., `The Joe Rogan Experience`)

#### Optional Columns
- `category` - Content category (e.g., `Comedy`, `Technology`)
- `subdomain` - Custom subdomain (e.g., `joerogan`)
- `rss_feeds` - Pipe-separated RSS feed URLs (e.g., `https://feed1.com|https://feed2.com`)
- `discord_name` - Discord community name
- `discord_url` - Discord community URL
- `discord_description` - Discord community description
- `telegram_name` - Telegram community name
- `telegram_url` - Telegram community URL
- `telegram_description` - Telegram community description
- `additional_links` - JSON array of additional community links

#### CSV Example

```csv
tag,name,category,subdomain,rss_feeds,discord_name,discord_url,discord_description
joe-rogan-experience,The Joe Rogan Experience,Society & Culture,joerogan,https://feeds.megaphone.fm/jre,JRE Discord,https://discord.gg/joerogan,Official Joe Rogan Discord server
huberman-lab,Huberman Lab,Science,huberman,https://feeds.megaphone.fm/hubermanlab,Huberman Lab Community,https://discord.gg/hubermanlab,Discuss neuroscience and health
```

### JSON Format

JSON provides more flexibility for complex data structures.

#### JSON Example

```json
[
  {
    "tag": "joe-rogan-experience",
    "name": "The Joe Rogan Experience",
    "category": "Society & Culture",
    "subdomain": "joerogan",
    "rss_feeds": "https://feeds.megaphone.fm/jre|https://joeroganexp.joerogan.com/feed",
    "discord_name": "JRE Discord",
    "discord_url": "https://discord.gg/joerogan",
    "discord_description": "Official Joe Rogan Discord server"
  },
  {
    "tag": "huberman-lab",
    "name": "Huberman Lab",
    "category": "Science",
    "subdomain": "huberman",
    "rss_feeds": "https://feeds.megaphone.fm/hubermanlab",
    "discord_name": "Huberman Lab Community",
    "discord_url": "https://discord.gg/hubermanlab",
    "discord_description": "Discuss neuroscience and health",
    "additional_links": "[{\"platform\":\"twitter\",\"name\":\"Huberman Lab Twitter\",\"url\":\"https://twitter.com/hubermanlab\",\"description\":\"Follow on Twitter\"}]"
  }
]
```

## How to Use

### Step 1: Access the Admin Dashboard

1. Navigate to `/admin` in your PodBridge instance
2. Log in with your administrator account
3. Click on the "Bulk Upload" tab

### Step 2: Prepare Your Data

#### Option A: Download Template
1. Click "Download CSV Template" or "Download JSON Template"
2. Open the template in your preferred editor (Excel, Google Sheets, text editor)
3. Fill in your creator data following the format
4. Save the file

#### Option B: Create From Scratch
1. Create a new CSV or JSON file
2. Follow the format specifications above
3. Include all required fields and any optional fields you need

### Step 3: Upload

#### File Upload
1. Click "Upload File" button
2. Select your CSV or JSON file
3. The content will be automatically loaded into the text area

#### Copy/Paste
1. Copy your CSV or JSON content
2. Paste it directly into the text area in the bulk upload interface

### Step 4: Submit

1. Review your data in the text area
2. Ensure the correct format is selected (CSV or JSON)
3. Click "Upload Creators"
4. Wait for the processing to complete

### Step 5: Review Results

After upload, you'll see:
- **Success count**: Number of creators successfully created
- **Error list**: Any validation errors or warnings
- **Warnings**: Non-fatal issues (e.g., subdomain conflicts)

If there are errors:
- Review the error messages
- Fix the data in your file
- Try uploading again

## Validation Rules

### Tag (slug)
- Required
- Must contain only lowercase letters, numbers, and hyphens
- Must be unique across all shows

### Name
- Required
- Can contain any characters

### Subdomain
- Optional
- Must contain only lowercase letters, numbers, and hyphens
- Must be unique across all shows
- Cannot be set on alias tags

### RSS Feeds
- Must be valid URLs starting with `http://` or `https://`
- Multiple feeds separated by pipe (`|`) in CSV
- No limit on number of feeds

### Community Links
- Must have both name and URL
- URL must be a valid URL starting with `http://` or `https://`
- Platform is automatically detected for Discord and Telegram
- Additional links can be added via JSON in `additional_links` field

## Common Issues

### Duplicate Tags
If a tag already exists, the upload will skip that row and show an error. Make sure all tags are unique and don't conflict with existing shows.

### Subdomain Conflicts
Subdomains must be unique. If a subdomain is already taken, you'll see a warning but the creator will still be created (without the subdomain).

### Invalid URLs
All RSS feed URLs and community link URLs must start with `http://` or `https://`. Check your URLs if you see validation errors.

### CSV Parsing Issues
- Make sure to properly escape commas and quotes in CSV values
- Use quotes around values containing commas
- Double-quote any quotes within quoted values

### JSON Parsing Issues
- Validate your JSON syntax using a JSON validator
- Make sure the root element is an array `[]`
- Ensure all strings are properly quoted

## Best Practices

1. **Start Small**: Test with 2-3 creators first to verify your format
2. **Use Templates**: Download and modify the provided templates
3. **Validate Before Upload**: Check your data for duplicates and invalid URLs
4. **Keep Backups**: Save your upload files in case you need to make corrections
5. **Review Results**: Always check the upload results for any warnings or errors

## Example Workflows

### From Spreadsheet
1. Create a Google Sheet or Excel file with creator data
2. Export as CSV
3. Upload to PodBridge admin panel

### From API or Database
1. Export data from your source system as JSON
2. Transform to match PodBridge format
3. Upload via bulk upload interface

### Manual Entry
1. Download the template
2. Fill in creators one by one
3. Upload when complete

## Advanced: Additional Links Format

For complex community link structures, use the `additional_links` field with JSON:

```json
"additional_links": "[{\"platform\":\"twitter\",\"name\":\"Creator Twitter\",\"url\":\"https://twitter.com/creator\",\"description\":\"Follow on Twitter\"},{\"platform\":\"youtube\",\"name\":\"YouTube Channel\",\"url\":\"https://youtube.com/creator\"}]"
```

Each link object requires:
- `platform` - Platform identifier (e.g., `twitter`, `youtube`, `website`)
- `name` - Display name for the link
- `url` - Full URL to the community or platform
- `description` - Optional description

## Support

If you encounter issues:
1. Check the error messages in the upload results
2. Verify your data format matches the specifications
3. Try uploading a smaller batch to isolate the problem
4. Review the validation rules above

## API Endpoint

For programmatic uploads, you can POST directly to:
```
POST /api/admin/bulk-upload-creators
Content-Type: application/json

{
  "content": "<your CSV or JSON string>",
  "format": "csv" | "json"
}
```

Response:
```json
{
  "success": true,
  "created": 5,
  "errors": [
    {
      "row": 3,
      "tag": "problematic-tag",
      "error": "Tag already exists"
    }
  ]
}
```
