# Deployment Guide

Complete guide for deploying Exile Architect to production.

## Prerequisites

- Ubuntu 22.04 LTS (or similar)
- Root or sudo access
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

## Server Specifications

**Minimum:**
- 2 vCPU
- 2GB RAM
- 50GB SSD
- Ubuntu 22.04 LTS

**Recommended:**
- 4 vCPU
- 4GB RAM
- 100GB SSD
- Ubuntu 22.04 LTS

## Installation Steps

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install LEMP Stack

```bash
# Install Nginx
sudo apt install nginx -y

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PHP 8.2
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-gd -y

# Install Redis
sudo apt install redis-server -y

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Git
sudo apt install git -y
```

### 3. Configure Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 4. Create Database

```bash
sudo mysql
```

```sql
CREATE DATABASE exile_architect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'exile_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON exile_architect.* TO 'exile_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Deploy Application

```bash
# Create web directory
sudo mkdir -p /var/www/exile-architect
cd /var/www/exile-architect

# Clone repository
sudo git clone https://github.com/yourusername/exile-architect.git .

# Set permissions
sudo chown -R www-data:www-data /var/www/exile-architect
sudo chmod -R 755 /var/www/exile-architect

# Install dependencies
sudo -u www-data composer install --no-dev --optimize-autoloader

# Create .env file
sudo cp .env.example .env
sudo nano .env
```

Update `.env` with production values:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_DATABASE=exile_architect
DB_USERNAME=exile_user
DB_PASSWORD=your_secure_password

GEMINI_API_KEY=your_actual_api_key
```

### 6. Run Migrations

```bash
cd /var/www/exile-architect
sudo -u www-data php cli/migrate.php
```

### 7. Seed Initial Data

```bash
# Optional: Seed sample data
sudo -u www-data php cli/seed.php

# Scrape real data
sudo -u www-data php cli/scraper.php --task=all
```

### 8. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/exile-architect
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/exile-architect/public;
    index index.php index.html;

    # Logging
    access_log /var/log/nginx/exile-architect-access.log;
    error_log /var/log/nginx/exile-architect-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_read_timeout 300;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/exile-architect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo systemctl status certbot.timer
```

### 10. Configure PHP-FPM

```bash
sudo nano /etc/php/8.2/fpm/pool.d/www.conf
```

Optimize settings:
```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

```bash
sudo systemctl restart php8.2-fpm
```

### 11. Setup Cron Jobs

```bash
sudo crontab -e -u www-data
```

Add:
```cron
# Daily scrape at 3 AM
0 3 * * * cd /var/www/exile-architect && /usr/bin/php cli/scraper.php --task=all >> /var/log/exile-scraper.log 2>&1

# Update poe.ninja every 6 hours
0 */6 * * * cd /var/www/exile-architect && /usr/bin/php cli/scraper.php --task=poeninja >> /var/log/exile-scraper.log 2>&1

# Database backup daily at 2 AM
0 2 * * * /usr/bin/mysqldump -u exile_user -p'your_password' exile_architect > /var/backups/exile-architect/db_$(date +\%Y\%m\%d).sql 2>&1

# Clean old backups
0 5 * * * find /var/backups/exile-architect -name "db_*.sql" -mtime +7 -delete
```

Create directories:
```bash
sudo mkdir -p /var/log
sudo mkdir -p /var/backups/exile-architect
sudo chown www-data:www-data /var/log/exile-scraper.log
sudo chown www-data:www-data /var/backups/exile-architect
```

### 12. Configure Redis (Optional)

```bash
sudo nano /etc/redis/redis.conf
```

Set:
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

```bash
sudo systemctl restart redis
```

### 13. Setup Monitoring

```bash
# Install Fail2Ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure for Nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
```

```bash
sudo systemctl restart fail2ban
```

### 14. Performance Optimization

```bash
# Enable OPcache
sudo nano /etc/php/8.2/fpm/php.ini
```

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
opcache.fast_shutdown=1
```

```bash
sudo systemctl restart php8.2-fpm
```

## Post-Deployment

### 1. Verify Installation

Visit: `https://yourdomain.com`

Check:
- [ ] Homepage loads
- [ ] Can register account
- [ ] Can login
- [ ] Can create build
- [ ] Data is loading

### 2. Test Scraper

```bash
sudo -u www-data php /var/www/exile-architect/cli/scraper.php --task=uniques
```

### 3. Monitor Logs

```bash
# Nginx logs
sudo tail -f /var/log/nginx/exile-architect-error.log

# PHP logs
sudo tail -f /var/log/php8.2-fpm.log

# Scraper logs
sudo tail -f /var/log/exile-scraper.log

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### 4. Set Up Backups

```bash
# Test backup
sudo /usr/bin/mysqldump -u exile_user -p'password' exile_architect > test_backup.sql

# Verify
ls -lh test_backup.sql
```

## Security Checklist

- [ ] Firewall configured (ufw)
- [ ] SSL certificate installed
- [ ] Database password strong
- [ ] .env file permissions (600)
- [ ] Fail2Ban configured
- [ ] SSH key authentication
- [ ] Root login disabled
- [ ] Automatic security updates
- [ ] Regular backups enabled

## Maintenance

### Update Application

```bash
cd /var/www/exile-architect
sudo -u www-data git pull origin main
sudo -u www-data composer install --no-dev
sudo -u www-data php cli/migrate.php
sudo systemctl restart php8.2-fpm
```

### Database Backup

```bash
# Manual backup
sudo mysqldump -u exile_user -p'password' exile_architect > backup_$(date +%Y%m%d).sql

# Restore
sudo mysql -u exile_user -p'password' exile_architect < backup.sql
```

### View Metrics

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU load
top

# Nginx connections
sudo netstat -an | grep :80 | wc -l
```

## Troubleshooting

### 502 Bad Gateway
```bash
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm
```

### 500 Internal Server Error
```bash
# Check PHP logs
sudo tail -n 50 /var/log/nginx/exile-architect-error.log

# Check permissions
sudo chown -R www-data:www-data /var/www/exile-architect
```

### Database Connection Failed
```bash
# Test connection
mysql -u exile_user -p -h localhost exile_architect

# Check MySQL status
sudo systemctl status mysql
```

### Slow Performance
```bash
# Enable Redis caching
# Optimize database indexes
# Enable OPcache
# Use CDN for static assets
```

## Support

For issues:
1. Check logs
2. Verify configuration
3. Test components individually
4. Check GitHub issues
5. Contact support

---

**Production Checklist**: Before going live, ensure all steps are completed and tested!
