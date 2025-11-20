# Exile Architect

Advanced Path of Exile Build Planner with AI Integration

## 🎯 Features

- **Interactive Passive Tree Viewer** - Visualize and plan your skill tree
- **AI-Powered Build Generation** - Generate optimal builds using Google Gemini
- **Item Database** - Comprehensive database of uniques, bases, and gems
- **Build Import/Export** - Compatible with Path of Building
- **Mobile-Responsive** - Optimized for all devices
- **Real-time Data** - Auto-sync with official PoE sources

## 🛠️ Technology Stack

- **Backend:** PHP 8.2+ (Custom MVC)
- **Frontend:** Vanilla JavaScript (ES6+), Tailwind CSS, D3.js
- **Database:** MySQL 8.0+
- **Cache:** Redis
- **AI:** Google Gemini API
- **DevOps:** Docker, Nginx, PHP-FPM

## 🚀 Quick Start

### Prerequisites

- PHP 8.2+
- MySQL 8.0+ / MariaDB 10.6+
- Composer
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/exile-architect.git
   cd exile-architect
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations**
   ```bash
   php cli/migrate.php
   ```

5. **Seed sample data**
   ```bash
   php cli/seed.php
   ```

6. **Scrape game data**
   ```bash
   php cli/scraper.php --task=all
   ```

7. **Start development server**
   ```bash
   composer serve
   # Or: php -S localhost:8080 -t public
   ```

8. **Access the application**
   - App: http://localhost:8080
   - Demo Login:
     - Email: `demo@exilearchitect.com`
     - Password: `Demo123!`

### Docker (Alternative)

```bash
docker-compose up -d
docker exec -it exile_php composer install
docker exec -it exile_php php cli/migrate.php
docker exec -it exile_php php cli/seed.php
```

## 📁 Project Structure

```
/exile-architect
├── /public              # Web root
│   ├── index.php       # Front controller
│   └── /assets         # Static files
├── /app
│   ├── /Controllers    # Request handlers
│   ├── /Models        # Data layer
│   ├── /Views         # Twig templates
│   ├── /Core          # Framework core
│   └── /Services      # Business logic
├── /config            # Configuration
├── /data              # Game data (JSON)
├── /migrations        # Database migrations
├── /docker            # Docker configuration
└── /tests             # PHPUnit tests
```

## 🧪 Development

### CLI Commands

```bash
# Database migrations
php cli/migrate.php              # Run migrations
php cli/migrate.php --rollback   # Rollback last batch
php cli/migrate.php --fresh      # Fresh migration (DESTRUCTIVE!)

# Data management
php cli/seed.php                 # Seed sample data
php cli/scraper.php --task=all   # Scrape all game data
php cli/scraper.php --task=uniques  # Scrape only uniques

# Development server
composer serve                   # Start PHP dev server (port 8080)
```

### Running Tests
```bash
composer test
# Or: vendor/bin/phpunit
```

### Code Style
```bash
# Follow PSR-12 standard
composer check-style
```

## 📊 Documentation

- [claude.md](claude.md) - Complete development roadmap and checklist
- [DATA_SETUP.md](DATA_SETUP.md) - Data scraping and setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide

## 🔒 Security

- ✅ All user inputs validated and sanitized
- ✅ Prepared statements (PDO) for database queries
- ✅ CSRF protection on all forms
- ✅ Password hashing with bcrypt (cost: 12)
- ✅ XSS prevention
- ✅ SQL injection protection
- ✅ HTTPS enforced in production

## 📈 Project Status

```
Phase 1: Foundation & Setup       ✅ COMPLETE
Phase 2: Backend Development      ✅ COMPLETE
Phase 3: Frontend Development     ✅ COMPLETE
Phase 4: Data Integration         ✅ COMPLETE
Phase 5: AI Integration           ⚠️  PARTIAL (service ready)
Phase 6: Testing & Deployment     📝 DOCUMENTED

Overall: ~75% Complete
```

## 🎯 Features Implemented

- ✅ User authentication (register, login, logout)
- ✅ Build management (create, edit, delete, clone)
- ✅ Build import/export (POB codes)
- ✅ Public/private builds
- ✅ Item database search
- ✅ Skill gem database
- ✅ Data scraping system
- ✅ AI build generation (Gemini API ready)
- ✅ Auto-save functionality
- ✅ Mobile-responsive UI
- ✅ Dark theme
- ⏳ Passive tree viewer (placeholder)

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Follow PSR-12 coding standards
4. Write tests for new features
5. Submit a pull request

## 📧 Support

- 🐛 Bug reports: [GitHub Issues](https://github.com/yourusername/exile-architect/issues)
- 💬 Questions: [GitHub Discussions](https://github.com/yourusername/exile-architect/discussions)
- 📖 Documentation: [claude.md](claude.md)

## 🙏 Credits

- **Path of Exile** by Grinding Gear Games
- **Google Gemini API** for AI integration
- **poe.ninja** for market data
- **PoE Wiki** for game information

---

Built with ⚔️ for the Path of Exile community

**Version:** 1.0.0 | **Last Updated:** 2025-11-20
