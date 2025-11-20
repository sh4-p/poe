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

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/exile-architect.git
   cd exile-architect
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Docker containers**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies**
   ```bash
   docker exec -it exile_php composer install
   ```

5. **Run migrations**
   ```bash
   docker exec -it exile_php php cli/migrate.php
   ```

6. **Access the application**
   - Main App: http://localhost:8080
   - PHPMyAdmin: http://localhost:8081

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

### Running Tests
```bash
docker exec -it exile_php composer test
```

### Code Style
```bash
# Follow PSR-12 standard
composer check-style
```

### Database Migrations
```bash
# Run migrations
php cli/migrate.php

# Rollback
php cli/migrate.php --rollback
```

## 📊 Development Process

See [claude.md](claude.md) for the complete development roadmap and checklist.

## 🔒 Security

- All user inputs are validated and sanitized
- Prepared statements for database queries
- CSRF protection on all forms
- Password hashing with bcrypt
- HTTPS enforced in production

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📧 Support

For issues and questions, please open a GitHub issue.

---

Built with ⚔️ for the Path of Exile community
