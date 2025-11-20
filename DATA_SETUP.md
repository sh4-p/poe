# Data Setup Guide

This guide explains how to populate the Exile Architect database with Path of Exile game data.

## Overview

The application needs game data from various sources:
- **Passive Skill Tree**: Official PoE data
- **Unique Items**: Item database
- **Skill Gems**: Gem information
- **Base Items**: Base item types
- **Market Data**: poe.ninja API

## Quick Start

### 1. Run Database Migrations

```bash
php cli/migrate.php
```

### 2. Seed Sample Data (Development)

```bash
php cli/seed.php
```

This creates:
- 2 sample users
- 4 sample builds
- Demo credentials:
  - Email: `demo@exilearchitect.com`
  - Password: `Demo123!`

### 3. Scrape Game Data

```bash
# Scrape all data
php cli/scraper.php --task=all

# Or scrape specific data
php cli/scraper.php --task=uniques
php cli/scraper.php --task=gems
php cli/scraper.php --task=tree
```

## CLI Commands

### Migration Runner

```bash
# Run pending migrations
php cli/migrate.php

# Rollback last batch
php cli/migrate.php --rollback

# Fresh migration (DESTRUCTIVE!)
php cli/migrate.php --fresh

# Show help
php cli/migrate.php --help
```

### Data Scraper

```bash
# Scrape all data
php cli/scraper.php --task=all --version=3.25

# Scrape specific data
php cli/scraper.php --task=uniques
php cli/scraper.php --task=gems
php cli/scraper.php --task=bases
php cli/scraper.php --task=tree
php cli/scraper.php --task=poeninja

# Clear old data before scraping
php cli/scraper.php --task=all --clear

# Show help
php cli/scraper.php --help
```

### Database Seeder

```bash
# Seed sample data
php cli/seed.php
```

## Automated Updates (Cron)

### Setup Cron Jobs

1. Edit crontab:
```bash
crontab -e
```

2. Add cron jobs (see `cron/scraper.cron` for examples):

```cron
# Daily scrape at 3 AM
0 3 * * * cd /var/www/exile-architect && php cli/scraper.php --task=all >> /var/log/exile-scraper.log 2>&1

# Update poe.ninja every 6 hours
0 */6 * * * cd /var/www/exile-architect && php cli/scraper.php --task=poeninja >> /var/log/exile-scraper.log 2>&1
```

3. Create log directory:
```bash
sudo mkdir -p /var/log
sudo touch /var/log/exile-scraper.log
sudo chown www-data:www-data /var/log/exile-scraper.log
```

### View Logs

```bash
# View scraper logs
tail -f /var/log/exile-scraper.log

# View last 100 lines
tail -n 100 /var/log/exile-scraper.log
```

## Data Sources

### 1. Passive Skill Tree

**Source**: Official Path of Exile API
**URL**: `https://www.pathofexile.com/passive-skill-tree/data.json`
**Update Frequency**: Weekly (after patches)

The passive tree JSON contains:
- All nodes and their stats
- Node connections
- Jewel sockets
- Starting positions

**Storage**: `/data/passive-tree/{version}.json`

### 2. Unique Items

**Source**: poedb.tw, poewiki.net
**Update Frequency**: Daily

**Data Structure**:
```json
{
  "name": "Kaom's Heart",
  "base_item": "Glorious Plate",
  "stats": [
    "+500 to maximum Life",
    "Has no Sockets"
  ]
}
```

### 3. Skill Gems

**Source**: poewiki.net
**Update Frequency**: After major patches

**Data Structure**:
```json
{
  "name": "Righteous Fire",
  "gem_color": "red",
  "gem_tags": "spell,aoe,fire,duration",
  "is_support": false,
  "stats": { }
}
```

### 4. poe.ninja Market Data

**Source**: poe.ninja API
**URL**: `https://poe.ninja/api/data`
**Update Frequency**: Every 6 hours

Provides:
- Item prices
- Popular items
- Meta information

## Sample Data vs Real Data

### Development (Sample Data)

For development, use sample data:

```bash
php cli/seed.php
php cli/scraper.php --task=all
```

This uses hardcoded sample items (5 uniques, 5 gems, 3 bases).

### Production (Real Data)

For production, implement real scraping:

1. **Web Scraping** (poedb.tw, poewiki.net)
   - Use Guzzle + DOMDocument
   - Parse HTML tables
   - Extract stats

2. **Official API**
   - Passive tree: Direct JSON download
   - Trade API: For item data

3. **poe.ninja API**
   - Market data
   - Popular builds

## Database Schema

### uniques
- `id`: Primary key
- `name`: Item name
- `base_item`: Base type
- `stats_json`: JSON stats
- `poe_version`: Version

### skill_gems
- `id`: Primary key
- `name`: Gem name
- `gem_color`: red/green/blue/white
- `gem_tags`: Comma-separated
- `is_support`: Boolean
- `stats_json`: JSON stats
- `poe_version`: Version

### base_items
- `id`: Primary key
- `name`: Item name
- `item_class`: Class type
- `item_level`: iLvl
- `stats_json`: JSON stats

## Troubleshooting

### "Database connection failed"
- Check `.env` file exists
- Verify database credentials
- Ensure MySQL is running

### "Permission denied" on CLI scripts
```bash
chmod +x cli/*.php
```

### Scraper fails
- Check internet connection
- Verify sources are accessible
- Check rate limits (2 second delay default)

### Empty results
- Run `php cli/seed.php` for sample data
- Check logs for errors
- Verify migrations ran successfully

## Best Practices

1. **Always backup before scraping**:
```bash
mysqldump -u user -p exile_architect > backup.sql
```

2. **Test scraper manually before cron**:
```bash
php cli/scraper.php --task=uniques
```

3. **Monitor logs regularly**:
```bash
tail -f /var/log/exile-scraper.log
```

4. **Update data after patches**:
```bash
php cli/scraper.php --task=all --clear --version=3.26
```

5. **Keep backups**:
- Database backups daily
- Keep last 7 days
- Store off-site

## Advanced

### Custom Data Sources

Add your own scrapers in `DataScraperService.php`:

```php
public function scrapeCustomSource(): int
{
    // Your scraping logic
    return $count;
}
```

### Parallel Scraping

For faster scraping, use parallel requests:

```php
// TODO: Implement with async Guzzle
```

### Data Validation

Validate scraped data before insertion:

```php
if (!$this->validateItemData($item)) {
    continue;
}
```

## Support

For issues:
1. Check logs: `/var/log/exile-scraper.log`
2. Verify database connection
3. Test manually
4. Check GitHub issues

## Version History

- **v1.0.0**: Initial data scraper
  - Sample data support
  - CLI commands
  - Basic automation

---

**Note**: This is development setup. Production scraping requires:
- Proper rate limiting
- Error recovery
- Data validation
- Legal compliance with source sites
