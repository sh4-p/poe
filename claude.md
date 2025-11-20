# Exile Architect - Development Process Documentation

## 📋 Project Overview

**Project Name:** Exile Architect - Advanced PoE Build Planner
**Architecture:** MVC (Model-View-Controller) in Pure PHP
**Development Timeline:** 7 Weeks
**Approach:** Mobile-First, Spec-Driven Development
**Status:** Planning Phase

---

## 🎯 Core Objectives

1. Create an intuitive, mobile-responsive Path of Exile build planning tool
2. Implement AI-powered build generation using Google Gemini
3. Provide real-time data synchronization with official PoE sources
4. Enable seamless build import/export functionality
5. Deliver a clean, performant, and accessible user experience

---

## 🛠️ Technology Stack

### Backend
- **Language:** PHP 8.2+
- **Architecture:** Custom MVC Framework
- **Database:** MySQL 8.0+ / MariaDB 10.6+
- **Dependencies:**
  - Composer (Dependency Management)
  - Twig 3.x (Templating Engine)
  - Guzzle 7.x (HTTP Client)
  - PHPUnit 10.x (Testing)

### Frontend
- **Core:** Vanilla JavaScript (ES6+ Modules)
- **Styling:** Tailwind CSS 3.x (Utility-First)
- **Visualization:** D3.js (Passive Tree Rendering)
- **Icons:** Font Awesome / Heroicons

### DevOps & Tools
- **Version Control:** Git + GitHub
- **Server Stack:** LEMP (Linux, Nginx, MySQL, PHP-FPM)
- **Containerization:** Docker (Development)
- **CI/CD:** GitHub Actions
- **Monitoring:** Error logging, Performance metrics

---

## 📐 Development Standards & Best Practices

### Code Quality Standards

#### PHP Standards
```php
// PSR-12 Coding Standard
// - 4 spaces indentation (no tabs)
// - Opening braces on same line for methods
// - Type hints for all parameters and return types
// - Strict types declaration

declare(strict_types=1);

namespace App\Controllers;

class BuildController extends BaseController
{
    public function saveAction(int $buildId): array
    {
        // Implementation
    }
}
```

#### JavaScript Standards
```javascript
// ES6+ Module Pattern
// - Use const/let (no var)
// - Arrow functions for callbacks
// - Async/await for promises
// - JSDoc comments for functions

/**
 * Saves build data to server
 * @param {Object} buildData - The build configuration
 * @returns {Promise<Object>} Server response
 */
export async function saveBuild(buildData) {
    // Implementation
}
```

#### CSS/Tailwind Standards
```css
/* Mobile-First Approach */
/* Base styles for mobile (320px+) */
.build-card {
    @apply p-4 rounded-lg shadow-md;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
    .build-card {
        @apply p-6;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
    .build-card {
        @apply p-8;
    }
}
```

### Project Structure
```
/exile-architect
├── /public                 # Public web root
│   ├── index.php          # Front controller
│   └── /assets
│       ├── /css           # Compiled CSS
│       ├── /js            # Compiled/minified JS
│       └── /images        # Optimized images
├── /app
│   ├── /Controllers       # Request handlers
│   ├── /Models           # Data layer
│   ├── /Views            # Twig templates
│   ├── /Core             # Framework core
│   │   ├── Router.php
│   │   ├── Database.php
│   │   └── Request.php
│   └── /Services         # Business logic
│       ├── GeminiAIService.php
│       └── DataScraperService.php
├── /config               # Configuration files
│   ├── database.php
│   ├── app.php
│   └── services.php
├── /data                 # Scraped game data (JSON)
├── /migrations           # Database migrations
├── /tests               # PHPUnit tests
├── /vendor              # Composer dependencies
├── /docker              # Docker configuration
├── composer.json
├── .env.example
└── README.md
```

### Security Best Practices

#### Input Validation & Sanitization
- ✅ Validate all user inputs on server-side
- ✅ Use prepared statements (PDO) for all database queries
- ✅ Implement CSRF token protection
- ✅ Sanitize output to prevent XSS
- ✅ Use password_hash() with BCRYPT for passwords

#### Authentication & Authorization
- ✅ Implement secure session management
- ✅ Use HTTP-only and secure cookies
- ✅ Implement rate limiting on auth endpoints
- ✅ Add two-factor authentication (future enhancement)

#### API Security
- ✅ Implement API key authentication for external services
- ✅ Store sensitive credentials in .env files
- ✅ Use HTTPS for all production traffic
- ✅ Implement request throttling

### Performance Optimization

#### Backend
- ✅ Implement database query caching
- ✅ Use connection pooling
- ✅ Lazy load related models
- ✅ Implement Redis/Memcached for session storage
- ✅ Optimize database indexes

#### Frontend
- ✅ Minify and bundle JavaScript/CSS
- ✅ Implement lazy loading for images
- ✅ Use CDN for static assets
- ✅ Implement service workers for offline support
- ✅ Optimize passive tree rendering (viewport culling)

---

## 🚀 Phase-by-Phase Development Checklist

---

## Phase 1: Foundation & Project Setup (Week 1)

### 1.1 Environment & Version Control
- [ ] Initialize Git repository on GitHub
- [ ] Create `.gitignore` file (exclude vendor, .env, node_modules)
- [ ] Set up branch protection rules on `main` branch
- [ ] Define branching strategy:
  - [ ] `main` - Production ready code
  - [ ] `develop` - Integration branch
  - [ ] `feature/*` - Feature branches
  - [ ] `hotfix/*` - Emergency fixes
- [ ] Set up local development environment:
  - [ ] Option A: Docker with LEMP stack
    - [ ] Create `docker-compose.yml`
    - [ ] Configure PHP 8.2+ container
    - [ ] Configure Nginx container
    - [ ] Configure MySQL 8.0 container
    - [ ] Configure Redis container (caching)
  - [ ] Option B: XAMPP/MAMP (alternative)
- [ ] Create `.env.example` file with required variables
- [ ] Set up GitHub Actions workflow file (`.github/workflows/ci.yml`)

### 1.2 Project Architecture (MVC)
- [ ] Create root directory structure (see Project Structure above)
- [ ] Set up Composer
  - [ ] Run `composer init`
  - [ ] Configure autoloading (PSR-4)
  - [ ] Install dependencies:
    ```bash
    composer require twig/twig
    composer require guzzlehttp/guzzle
    composer require --dev phpunit/phpunit
    ```
- [ ] Create core MVC files:
  - [ ] `/app/Core/Router.php` - URL routing
  - [ ] `/app/Core/Database.php` - PDO singleton
  - [ ] `/app/Core/Request.php` - HTTP request handling
  - [ ] `/app/Core/Response.php` - HTTP response handling
  - [ ] `/app/Controllers/BaseController.php` - Abstract base
- [ ] Create `public/index.php` front controller
- [ ] Configure Nginx/Apache virtual host
- [ ] Test routing with a simple "Hello World" controller

### 1.3 Database Design & Setup
- [ ] Design database schema (use dbdiagram.io)
- [ ] Create migration system:
  - [ ] Create `/migrations` directory
  - [ ] Build migration runner script
- [ ] Create initial migrations:
  - [ ] `001_create_users_table.sql`
    ```sql
    CREATE TABLE users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ```
  - [ ] `002_create_builds_table.sql`
    ```sql
    CREATE TABLE builds (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        build_name VARCHAR(100) NOT NULL,
        ascendancy_class VARCHAR(50) NOT NULL,
        poe_version VARCHAR(20) NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_public (is_public),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ```
  - [ ] `003_create_build_data_table.sql`
    ```sql
    CREATE TABLE build_data (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        build_id INT UNSIGNED NOT NULL,
        data_type ENUM('passive_tree', 'items', 'skills', 'gems', 'jewels', 'flasks') NOT NULL,
        json_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
        INDEX idx_build_id (build_id),
        INDEX idx_data_type (data_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ```
  - [ ] `004_create_uniques_table.sql`
    ```sql
    CREATE TABLE uniques (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        base_item VARCHAR(100) NOT NULL,
        inventory_icon VARCHAR(255),
        stats_json JSON NOT NULL,
        poe_version VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_base_item (base_item),
        FULLTEXT idx_search (name, base_item)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ```
  - [ ] `005_create_base_items_table.sql`
  - [ ] `006_create_skill_gems_table.sql`
- [ ] Run migrations on local database
- [ ] Create database seeder for test data
- [ ] Verify database connections in app

**Phase 1 Completion Criteria:**
- ✅ Git repository is set up with proper branching
- ✅ Development environment is running
- ✅ MVC structure is in place and tested
- ✅ Database schema is created and documented
- ✅ Can route a request through the MVC stack

---

## Phase 2: Backend Development (MVC in PHP) (Weeks 2-4)

### 2.1 Core MVC Components
- [ ] **Front Controller** (`public/index.php`)
  - [ ] Load Composer autoloader
  - [ ] Load environment variables
  - [ ] Initialize error handler
  - [ ] Create Request object
  - [ ] Initialize Router
  - [ ] Dispatch to controller
  - [ ] Send Response
  - [ ] Handle 404/500 errors gracefully

- [ ] **Router** (`app/Core/Router.php`)
  - [ ] Implement route registration (GET, POST, PUT, DELETE)
  - [ ] Implement route parameters (e.g., `/build/{id}`)
  - [ ] Implement middleware support
  - [ ] Add CSRF protection middleware
  - [ ] Add authentication middleware
  - [ ] Create route caching mechanism
  - [ ] Example routes:
    ```php
    $router->get('/', 'HomeController@index');
    $router->get('/build/{id}', 'BuildController@view');
    $router->post('/build/save', 'BuildController@save');
    ```

- [ ] **Database Connection** (`app/Core/Database.php`)
  - [ ] Implement singleton pattern
  - [ ] Use PDO with prepared statements
  - [ ] Add query builder methods (select, insert, update, delete)
  - [ ] Implement transaction support
  - [ ] Add query logging (development mode)
  - [ ] Implement connection pooling
  - [ ] Add error handling and logging

### 2.2 Models (`app/Models/`)
- [ ] **BaseModel.php** (Abstract base for all models)
  - [ ] CRUD operations (create, read, update, delete)
  - [ ] Query builder integration
  - [ ] Validation helpers
  - [ ] Relationship methods

- [ ] **User.php**
  - [ ] `register(array $data): ?int` - Create new user
  - [ ] `login(string $email, string $password): ?User` - Authenticate
  - [ ] `findById(int $id): ?User` - Get user by ID
  - [ ] `findByEmail(string $email): ?User` - Get user by email
  - [ ] `updateProfile(int $id, array $data): bool` - Update user
  - [ ] `hashPassword(string $password): string` - Hash password
  - [ ] `verifyPassword(string $password, string $hash): bool` - Verify
  - [ ] Add input validation (email format, password strength)
  - [ ] Implement rate limiting for login attempts

- [ ] **Build.php**
  - [ ] `create(int $userId, array $data): ?int` - Create build
  - [ ] `findById(int $id): ?Build` - Get build by ID
  - [ ] `findByUserId(int $userId): array` - Get user's builds
  - [ ] `update(int $id, array $data): bool` - Update build
  - [ ] `delete(int $id): bool` - Delete build
  - [ ] `setPublic(int $id, bool $public): bool` - Toggle visibility
  - [ ] `getBuildData(int $buildId, string $type): ?array` - Get JSON data
  - [ ] `saveBuildData(int $buildId, string $type, array $data): bool`
  - [ ] Implement build validation (check ascendancy, version)

- [ ] **GameData.php**
  - [ ] `searchUniques(string $query, array $filters): array`
  - [ ] `getUniqueById(int $id): ?array`
  - [ ] `searchBaseItems(array $filters): array`
  - [ ] `getSkillGems(array $filters): array`
  - [ ] `getPassiveTreeData(string $version): ?array`
  - [ ] Add caching layer (Redis/file-based)

### 2.3 Controllers (`app/Controllers/`)
- [ ] **BaseController.php**
  - [ ] `render(string $view, array $data): Response` - Render Twig view
  - [ ] `json(array $data, int $status): Response` - JSON response
  - [ ] `redirect(string $url): Response` - HTTP redirect
  - [ ] `validate(array $data, array $rules): array` - Input validation
  - [ ] Error handling methods

- [ ] **HomeController.php**
  - [ ] `index()` - Landing page
  - [ ] `about()` - About page
  - [ ] `features()` - Features showcase

- [ ] **UserController.php**
  - [ ] `showRegister()` - Display registration form
  - [ ] `register()` - Handle registration POST
  - [ ] `showLogin()` - Display login form
  - [ ] `login()` - Handle login POST
  - [ ] `logout()` - Destroy session
  - [ ] `dashboard()` - User dashboard (auth required)
  - [ ] `profile()` - User profile page
  - [ ] Add CSRF token validation
  - [ ] Add session management

- [ ] **BuildController.php** (Most Complex)
  - [ ] `index()` - List all public builds
  - [ ] `myBuilds()` - List user's builds (auth)
  - [ ] `new()` - Display build creation page
  - [ ] `edit(int $id)` - Display build edit page
  - [ ] `view(int $id)` - Public build view
  - [ ] `save()` - AJAX: Save build data (JSON)
  - [ ] `delete(int $id)` - Delete build
  - [ ] `import()` - Import from Pastebin/POB code
  - [ ] `export(int $id)` - Export as POB code
  - [ ] Add permission checks (owner only can edit)
  - [ ] Implement auto-save debouncing

- [ ] **ApiController.php** (AJAX Endpoints)
  - [ ] `getItems()` - Search items endpoint
    - [ ] Accept filters (slot, name, rarity)
    - [ ] Return paginated JSON results
  - [ ] `getPassiveTree()` - Serve passive tree JSON
    - [ ] Support version parameter
    - [ ] Add caching headers
  - [ ] `generateBuildWithAI()` - AI build generation
    - [ ] Accept user prompt
    - [ ] Call GeminiAIService
    - [ ] Validate AI response
    - [ ] Return build ID or error
  - [ ] `searchSkillGems()` - Search gems endpoint
  - [ ] Add rate limiting on all endpoints
  - [ ] Implement API authentication

### 2.4 Services (`app/Services/`)
- [ ] **GeminiAIService.php**
  - [ ] `__construct(string $apiKey)` - Initialize with API key
  - [ ] `generateBuild(string $prompt, array $context): ?array`
  - [ ] `buildPrompt(string $userRequest, array $gameData): string`
  - [ ] `parseResponse(string $response): ?array`
  - [ ] `validateBuildData(array $data): bool`
  - [ ] Implement prompt engineering:
    - [ ] System role definition
    - [ ] Game data context injection
    - [ ] Constraint specification
    - [ ] Output format enforcement (JSON schema)
  - [ ] Add error handling and retry logic
  - [ ] Implement response caching

- [ ] **DataScraperService.php**
  - [ ] `scrapePassiveTree(string $version): bool`
  - [ ] `scrapeUniques(): bool`
  - [ ] `scrapeBaseItems(): bool`
  - [ ] `scrapeSkillGems(): bool`
  - [ ] `fetchFromPoeNinja(): bool`
  - [ ] Use Guzzle for HTTP requests
  - [ ] Implement rate limiting (respect robots.txt)
  - [ ] Add HTML parsing (use DOMDocument/Symfony DomCrawler)
  - [ ] Implement data validation before DB insert
  - [ ] Add logging for scraping activities
  - [ ] Create CLI command for manual runs

**Phase 2 Completion Criteria:**
- ✅ All models have complete CRUD operations
- ✅ All controllers are implemented and tested
- ✅ Services are functional and documented
- ✅ API endpoints return correct JSON responses
- ✅ User authentication is working
- ✅ Build creation/editing is functional (backend)

---

## Phase 3: Frontend Development (HTML, CSS, JS) (Weeks 3-6)

### 3.1 HTML & CSS Structure (Mobile-First)

#### HTML Templates (Twig)
- [ ] Create base layout (`/app/Views/layouts/base.twig`)
  - [ ] HTML5 semantic structure
  - [ ] Meta tags (viewport, charset, description)
  - [ ] Open Graph tags for social sharing
  - [ ] Favicon and app icons
  - [ ] Dynamic title and meta injection
  - [ ] Header navigation
  - [ ] Footer with credits
  - [ ] Flash message display area

- [ ] Create page templates:
  - [ ] `/app/Views/home/index.twig` - Landing page
  - [ ] `/app/Views/user/login.twig` - Login form
  - [ ] `/app/Views/user/register.twig` - Registration form
  - [ ] `/app/Views/user/dashboard.twig` - User dashboard
  - [ ] `/app/Views/build/index.twig` - Build list
  - [ ] `/app/Views/build/create.twig` - Build creator
  - [ ] `/app/Views/build/edit.twig` - Build editor
  - [ ] `/app/Views/build/view.twig` - Public build view

- [ ] Create component templates:
  - [ ] Navigation menu (mobile hamburger + desktop)
  - [ ] Build card component
  - [ ] Item tooltip component
  - [ ] Passive tree viewer container
  - [ ] Skill gem selector
  - [ ] Loading spinner
  - [ ] Modal dialogs

#### CSS Architecture (Tailwind CSS)
- [ ] Install and configure Tailwind CSS
  - [ ] Run `npm init -y`
  - [ ] Install: `npm install -D tailwindcss postcss autoprefixer`
  - [ ] Generate config: `npx tailwindcss init`
  - [ ] Configure `tailwind.config.js`:
    ```javascript
    module.exports = {
      content: ['./app/Views/**/*.twig', './public/assets/js/**/*.js'],
      theme: {
        extend: {
          colors: {
            'poe-dark': '#1a1a1a',
            'poe-brown': '#38250e',
            'poe-gold': '#af8551',
            'poe-unique': '#af5025',
            'poe-rare': '#ffff77',
          },
        },
      },
    };
    ```

- [ ] Create custom CSS files:
  - [ ] `/public/assets/css/main.css` - Tailwind imports + custom
  - [ ] Add dark/light theme CSS variables
  - [ ] Custom animations (fade-in, slide-in)
  - [ ] Game-specific styling (item rarity colors)

- [ ] Implement responsive breakpoints:
  - [ ] Mobile-first base styles (320px+)
  - [ ] Tablet adjustments (768px+)
  - [ ] Desktop enhancements (1024px+)
  - [ ] Large desktop (1440px+)

- [ ] Mobile optimization:
  - [ ] Touch-friendly buttons (min 44x44px)
  - [ ] Readable font sizes (16px+ base)
  - [ ] Adequate spacing on small screens
  - [ ] Collapsible sections for complex data
  - [ ] Bottom navigation for mobile (fixed)
  - [ ] Swipe gestures for passive tree (touch events)

- [ ] Theme Implementation:
  - [ ] Create theme toggle component
  - [ ] Use CSS variables for theming:
    ```css
    :root {
      --bg-primary: #ffffff;
      --text-primary: #1a1a1a;
    }
    [data-theme="dark"] {
      --bg-primary: #1a1a1a;
      --text-primary: #ffffff;
    }
    ```
  - [ ] Store preference in localStorage
  - [ ] Auto-detect system preference

### 3.2 Vanilla JavaScript (ES6+ Modules)

#### Module Structure
- [ ] Create module directory: `/public/assets/js/modules/`
- [ ] Set up build process (optional):
  - [ ] Install Rollup/Webpack for bundling
  - [ ] Configure minification
  - [ ] Set up source maps

#### Core Modules
- [ ] **`/js/modules/api.js`** - API Communication Layer
  ```javascript
  export class API {
    constructor(baseURL) { }
    async get(endpoint, params) { }
    async post(endpoint, data) { }
    async put(endpoint, data) { }
    async delete(endpoint) { }
  }
  ```
  - [ ] Implement fetch wrapper with error handling
  - [ ] Add CSRF token to all requests
  - [ ] Add loading state management
  - [ ] Implement request/response interceptors

- [ ] **`/js/modules/PassiveTreeViewer.js`** - Interactive Tree
  - [ ] Use D3.js or custom Canvas rendering
  - [ ] Features to implement:
    - [ ] Load tree JSON data from API
    - [ ] Render nodes and connections
    - [ ] Implement pan (drag) functionality
    - [ ] Implement zoom (pinch on mobile, wheel on desktop)
    - [ ] Node selection/deselection
    - [ ] Highlight shortest path to node
    - [ ] Search functionality (by name/stat)
    - [ ] Show jewel sockets
    - [ ] Display allocated points count
    - [ ] Show node details on hover/click
    - [ ] Mobile touch gestures (pinch-zoom, pan)
  - [ ] Optimize performance:
    - [ ] Viewport culling (only render visible nodes)
    - [ ] Throttle pan/zoom events
    - [ ] Use requestAnimationFrame
    - [ ] Lazy load node images

- [ ] **`/js/modules/ItemSelector.js`** - Item Search & Display
  - [ ] Implement autocomplete search
  - [ ] Filter by slot, rarity, stats
  - [ ] Display results in grid/list view
  - [ ] Item tooltip on hover (mimic in-game)
  - [ ] Drag-and-drop to equipment slots
  - [ ] Mobile: tap to select, modal for details

- [ ] **`/js/modules/SkillPlanner.js`** - Skill & Gem Management
  - [ ] Create link groups (6-link, 4-link, etc.)
  - [ ] Gem socket color validation
  - [ ] Support gem drag-and-drop
  - [ ] Show gem level/quality selectors
  - [ ] Calculate total mana reservation
  - [ ] Validate gem compatibility

- [ ] **`/js/modules/BuildManager.js`** - Build State Management
  - [ ] Centralized state store
  - [ ] Methods:
    - [ ] `loadBuild(buildId)`
    - [ ] `saveBuild()` - Auto-save with debounce
    - [ ] `exportBuild()` - Generate POB code
    - [ ] `importBuild(code)` - Parse POB code
  - [ ] Implement undo/redo functionality
  - [ ] Add change tracking (dirty state)

- [ ] **`/js/modules/AIGenerator.js`** - AI Integration
  - [ ] Build prompt from UI inputs
  - [ ] Call API endpoint
  - [ ] Display loading state
  - [ ] Handle errors gracefully
  - [ ] Apply generated build to current state

- [ ] **`/js/modules/utils.js`** - Utility Functions
  - [ ] Debounce function
  - [ ] Throttle function
  - [ ] DOM manipulation helpers
  - [ ] Local storage helpers
  - [ ] Date formatting
  - [ ] Number formatting (abbreviate large numbers)

- [ ] **`/js/main.js`** - Entry Point
  - [ ] Initialize all modules
  - [ ] Set up event listeners
  - [ ] Initialize theme
  - [ ] Check authentication state

#### AJAX Implementation
- [ ] Auto-save functionality:
  - [ ] Debounce save calls (2 seconds)
  - [ ] Show "Saving..." indicator
  - [ ] Show "Saved" confirmation
  - [ ] Handle offline state (queue saves)

- [ ] Real-time search:
  - [ ] Debounce search input (300ms)
  - [ ] Show loading spinner
  - [ ] Cancel previous requests
  - [ ] Highlight search terms in results

- [ ] Error handling:
  - [ ] Display user-friendly error messages
  - [ ] Log errors to console (dev mode)
  - [ ] Send errors to backend (production)
  - [ ] Implement retry mechanism

#### Accessibility (a11y)
- [ ] Keyboard navigation support
- [ ] ARIA labels on interactive elements
- [ ] Focus management (modals, dropdowns)
- [ ] Screen reader friendly
- [ ] Color contrast compliance (WCAG AA)

**Phase 3 Completion Criteria:**
- ✅ All pages are responsive (mobile, tablet, desktop)
- ✅ Passive tree viewer is functional and performant
- ✅ Item/skill selection works smoothly
- ✅ Auto-save is implemented
- ✅ Dark/light theme toggle works
- ✅ Touch gestures work on mobile devices

---

## Phase 4: Data Integration & Automation (Weeks 2 & 5)

### 4.1 Scraper/API Service Implementation

- [ ] **Passive Tree Data**
  - [ ] Identify GGG's official passive tree JSON source
  - [ ] Create script to download `tree.json`
  - [ ] Parse and validate JSON structure
  - [ ] Store in `/data/passive-tree/{version}.json`
  - [ ] Import into database (if needed)
  - [ ] Version management (support multiple leagues)

- [ ] **Unique Items Data**
  - [ ] Scrape poedb.tw:
    - [ ] Build URL list for all uniques
    - [ ] Parse item HTML pages
    - [ ] Extract: name, base, stats, icon URL
    - [ ] Handle pagination
    - [ ] Implement delay between requests (1-2 seconds)
  - [ ] Scrape poewiki.net (supplement):
    - [ ] Extract lore/flavor text
    - [ ] Get high-res images
  - [ ] Data processing:
    - [ ] Normalize stat text
    - [ ] Parse numeric ranges
    - [ ] Store as structured JSON
    - [ ] Insert into `uniques` table
  - [ ] Deduplicate entries

- [ ] **Base Items Data**
  - [ ] Scrape all base item types from poedb.tw
  - [ ] Extract: name, class, level requirement, implicit mods
  - [ ] Store in `base_items` table
  - [ ] Link to item categories

- [ ] **Skill Gems Data**
  - [ ] Scrape poewiki.net skill gem pages
  - [ ] Extract:
    - [ ] Gem name, color, tags
    - [ ] Level progression stats
    - [ ] Quality bonuses
    - [ ] Vaal versions
  - [ ] Parse gem requirements
  - [ ] Store in `skill_gems` table

- [ ] **Meta Data (poe.ninja API)**
  - [ ] Create poe.ninja API client
  - [ ] Endpoints to fetch:
    - [ ] `/currencyoverview` - Economy data
    - [ ] `/itemoverview` - Popular items
    - [ ] `/builds` - Popular builds (if available)
  - [ ] Parse and store:
    - [ ] Item prices (chaos equivalent)
    - [ ] Popularity rankings
    - [ ] Meta shifts
  - [ ] Update daily

### 4.2 Automation & Scheduling

- [ ] **CLI Command System**
  - [ ] Create `/cli/scraper.php` entry point
  - [ ] Implement command arguments:
    ```bash
    php cli/scraper.php --task=uniques
    php cli/scraper.php --task=skills
    php cli/scraper.php --task=all
    ```
  - [ ] Add verbose/quiet modes
  - [ ] Progress indicators

- [ ] **Cron Job Setup**
  - [ ] Create cron configuration:
    ```bash
    # Daily scrape at 3 AM
    0 3 * * * /usr/bin/php /path/to/project/cli/scraper.php --task=all

    # poe.ninja update every 6 hours
    0 */6 * * * /usr/bin/php /path/to/project/cli/scraper.php --task=poeninja
    ```
  - [ ] Set up log rotation for scraper logs
  - [ ] Add email notifications on failures

- [ ] **Error Handling & Logging**
  - [ ] Log all scraper activities
  - [ ] Track success/failure rates
  - [ ] Store failed URLs for retry
  - [ ] Implement exponential backoff
  - [ ] Send alerts on consecutive failures

- [ ] **Data Validation**
  - [ ] Validate JSON structure before insert
  - [ ] Check for required fields
  - [ ] Detect format changes (scraper breakage)
  - [ ] Compare with previous version

**Phase 4 Completion Criteria:**
- ✅ All game data scrapers are functional
- ✅ Data is being stored in database correctly
- ✅ Cron jobs are scheduled and running
- ✅ Error logging and notifications work
- ✅ Data quality validation passes

---

## Phase 5: AI Integration with Gemini (Week 6)

### 5.1 Prompt Engineering

- [ ] **Gemini API Setup**
  - [ ] Obtain API key from Google AI Studio
  - [ ] Store in `.env` file
  - [ ] Install Gemini PHP SDK (if available) or use Guzzle
  - [ ] Test basic API connection

- [ ] **Prompt Structure Design**
  - [ ] Create prompt template:
    ```
    ROLE:
    You are an expert Path of Exile build creator with deep knowledge of game mechanics, item interactions, and current meta.

    CONTEXT:
    - Game Version: {version}
    - League: {league}
    - Current Meta: {meta_summary}

    USER REQUEST:
    {user_prompt}

    AVAILABLE RESOURCES:
    Unique Items: {unique_list}
    Skill Gems: {skill_list}
    Key Passives: {notable_passives}

    CONSTRAINTS:
    - Budget: {budget_tier}
    - Difficulty: {content_focus}

    OUTPUT FORMAT:
    Respond ONLY with valid JSON matching this schema:
    {json_schema}
    ```

- [ ] **JSON Schema Definition**
  - [ ] Define strict output schema:
    ```json
    {
      "build_name": "string",
      "ascendancy_class": "string",
      "main_skill": "string",
      "passive_tree_url": "string",
      "items": [
        {
          "slot": "string",
          "name": "string",
          "rarity": "unique|rare|magic",
          "required_stats": ["string"]
        }
      ],
      "skill_gems": [
        {
          "link_group": "string",
          "gems": ["string"],
          "socket_colors": "string"
        }
      ],
      "flasks": ["string"],
      "jewels": [
        {
          "type": "string",
          "socket_location": "string",
          "priority_stats": ["string"]
        }
      ],
      "playstyle": "string",
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
    ```

- [ ] **Context Injection**
  - [ ] Fetch current meta from poe.ninja
  - [ ] Load available uniques from DB
  - [ ] Load skill gems from DB
  - [ ] Summarize key passives
  - [ ] Inject into prompt template

### 5.2 Backend Logic

- [ ] **GeminiAIService.php Implementation**
  - [ ] `generateBuild()` method:
    - [ ] Build complete prompt
    - [ ] Make API request to Gemini
    - [ ] Set temperature (0.7 for creativity)
    - [ ] Set max tokens (2000+)
    - [ ] Parse JSON response
    - [ ] Handle API errors (rate limit, timeout)
    - [ ] Implement retry logic (3 attempts)

- [ ] **Response Validation**
  - [ ] Check JSON structure against schema
  - [ ] Validate item names exist in DB
  - [ ] Validate skill gems exist
  - [ ] Check gem link compatibility
  - [ ] Verify ascendancy class is valid
  - [ ] Sanitize all string outputs
  - [ ] Log validation failures

- [ ] **ApiController::generateBuildWithAI()**
  - [ ] Validate user input
  - [ ] Check rate limit (prevent spam)
  - [ ] Extract prompt parameters
  - [ ] Call GeminiAIService
  - [ ] Save generated build to database
  - [ ] Associate with user account
  - [ ] Return response:
    ```json
    {
      "success": true,
      "build_id": 123,
      "message": "Build generated successfully"
    }
    ```

### 5.3 Frontend Integration

- [ ] **AI Generator UI**
  - [ ] Create form in `/app/Views/build/generate.twig`
  - [ ] Input fields:
    - [ ] Text area for free-form prompt
    - [ ] Dropdown: Ascendancy class (optional)
    - [ ] Dropdown: Main skill (optional)
    - [ ] Radio buttons: Budget (low/medium/high)
    - [ ] Checkboxes: Content focus (mapping/bossing/delve)
    - [ ] League selector
  - [ ] Generate button

- [ ] **JavaScript Logic** (`/js/modules/AIGenerator.js`)
  - [ ] Capture form data
  - [ ] Validate inputs
  - [ ] Show loading overlay
  - [ ] Call API endpoint
  - [ ] Handle response:
    - [ ] Success: Redirect to build editor
    - [ ] Error: Display error message
  - [ ] Show generation progress (if streaming available)

- [ ] **Generated Build Display**
  - [ ] Load generated build in editor
  - [ ] Highlight AI-suggested items (badge/icon)
  - [ ] Show AI's reasoning (playstyle notes)
  - [ ] Allow user to modify immediately

- [ ] **Feedback Mechanism**
  - [ ] Add "Regenerate" button
  - [ ] Add "Refine" button (modify prompt)
  - [ ] Collect user ratings (thumbs up/down)
  - [ ] Store feedback for improvement

### 5.4 Advanced Features (Optional Enhancements)
- [ ] Multi-turn conversation (follow-up questions)
- [ ] Build comparison (AI vs user builds)
- [ ] Explain decisions (why this item?)
- [ ] Budget optimization (suggest cheaper alternatives)

**Phase 5 Completion Criteria:**
- ✅ Gemini API integration is working
- ✅ Prompt engineering produces valid builds
- ✅ Generated builds are saved to database
- ✅ Frontend UI is functional and user-friendly
- ✅ Validation catches invalid AI responses
- ✅ Error handling is robust

---

## Phase 6: Testing & Deployment (Week 7)

### 6.1 Testing

#### Backend Testing (PHPUnit)
- [ ] Set up PHPUnit configuration (`phpunit.xml`)
- [ ] Create test directory structure:
  ```
  /tests
    /Unit
      /Models
      /Services
    /Integration
      /Controllers
    /Feature
  ```

- [ ] **Unit Tests**
  - [ ] Test User model:
    - [ ] Password hashing
    - [ ] Email validation
    - [ ] User creation
  - [ ] Test Build model:
    - [ ] CRUD operations
    - [ ] JSON data storage/retrieval
  - [ ] Test GeminiAIService:
    - [ ] Mock API responses
    - [ ] Test prompt building
    - [ ] Test response validation

- [ ] **Integration Tests**
  - [ ] Test BuildController endpoints
  - [ ] Test API endpoints with database
  - [ ] Test authentication flow

- [ ] **Run tests**:
  ```bash
  vendor/bin/phpunit
  vendor/bin/phpunit --coverage-html coverage/
  ```

- [ ] **Code Coverage**
  - [ ] Aim for 70%+ coverage
  - [ ] Generate coverage report

#### Frontend Testing
- [ ] **Manual Testing Checklist**
  - [ ] Test all user flows:
    - [ ] Registration → Login → Dashboard
    - [ ] Create new build
    - [ ] Edit existing build
    - [ ] Delete build
    - [ ] Import/Export build
    - [ ] Generate build with AI
  - [ ] Test passive tree:
    - [ ] Pan, zoom, select nodes
    - [ ] Search functionality
    - [ ] Jewel socket interaction
  - [ ] Test item selector:
    - [ ] Search, filter, select
    - [ ] Drag-and-drop
  - [ ] Test auto-save
  - [ ] Test theme toggle

- [ ] **Cross-Browser Testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

- [ ] **Device Testing**
  - [ ] iPhone (various sizes)
  - [ ] Android phones
  - [ ] iPad/tablets
  - [ ] Desktop (various resolutions)

- [ ] **Performance Testing**
  - [ ] Lighthouse audit (aim for 90+ score)
  - [ ] Page load time (<3 seconds)
  - [ ] Passive tree render time (<1 second)
  - [ ] API response time (<500ms)

- [ ] **Accessibility Testing**
  - [ ] WAVE tool evaluation
  - [ ] Keyboard navigation
  - [ ] Screen reader testing

### 6.2 Deployment

#### Production Server Setup
- [ ] **Choose Hosting Provider**
  - [ ] Options: DigitalOcean, Linode, AWS, Vultr
  - [ ] Minimum specs: 2GB RAM, 2 vCPU, 50GB SSD

- [ ] **Server Configuration**
  - [ ] Install Ubuntu 22.04 LTS
  - [ ] Update system: `apt update && apt upgrade`
  - [ ] Install LEMP stack:
    ```bash
    apt install nginx mysql-server php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl
    ```
  - [ ] Install Composer
  - [ ] Install Git
  - [ ] Install Redis
  - [ ] Configure firewall (ufw):
    ```bash
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw enable
    ```

- [ ] **Nginx Configuration**
  - [ ] Create site config: `/etc/nginx/sites-available/exilearchitect`
  - [ ] Enable site: `ln -s /etc/nginx/sites-available/exilearchitect /etc/nginx/sites-enabled/`
  - [ ] Configure PHP-FPM
  - [ ] Set up gzip compression
  - [ ] Configure caching headers
  - [ ] Test: `nginx -t`
  - [ ] Reload: `systemctl reload nginx`

- [ ] **SSL Certificate (Let's Encrypt)**
  - [ ] Install Certbot: `apt install certbot python3-certbot-nginx`
  - [ ] Obtain certificate: `certbot --nginx -d exilearchitect.com`
  - [ ] Set up auto-renewal

- [ ] **Domain Setup**
  - [ ] Purchase domain (e.g., exilearchitect.com)
  - [ ] Configure DNS:
    - [ ] A record: `@ -> server_ip`
    - [ ] A record: `www -> server_ip`
  - [ ] Wait for DNS propagation

- [ ] **Database Setup**
  - [ ] Create production database
  - [ ] Create database user with limited privileges
  - [ ] Run migrations
  - [ ] Import initial data (from scraper)

- [ ] **Application Deployment**
  - [ ] Create deploy user: `adduser deployer`
  - [ ] Set up SSH key authentication
  - [ ] Clone repository:
    ```bash
    cd /var/www
    git clone https://github.com/yourusername/exile-architect.git
    ```
  - [ ] Install dependencies:
    ```bash
    composer install --no-dev --optimize-autoloader
    npm install --production
    npm run build
    ```
  - [ ] Set up `.env` file with production values
  - [ ] Set permissions:
    ```bash
    chown -R www-data:www-data /var/www/exile-architect
    chmod -R 755 /var/www/exile-architect
    ```

- [ ] **Cron Jobs**
  - [ ] Edit crontab: `crontab -e -u www-data`
  - [ ] Add scraper jobs
  - [ ] Add database backup job:
    ```bash
    0 2 * * * mysqldump -u user -p'password' dbname > /backups/db_$(date +\%Y\%m\%d).sql
    ```

- [ ] **Monitoring & Logging**
  - [ ] Set up error logging:
    - [ ] PHP errors: `/var/log/php-fpm/error.log`
    - [ ] Nginx errors: `/var/log/nginx/error.log`
    - [ ] Application logs: `/var/www/exile-architect/logs/app.log`
  - [ ] Install monitoring tool (optional):
    - [ ] New Relic
    - [ ] Sentry (for error tracking)
  - [ ] Set up uptime monitoring (UptimeRobot)

- [ ] **Security Hardening**
  - [ ] Disable root SSH login
  - [ ] Change SSH port (optional)
  - [ ] Install Fail2Ban
  - [ ] Set up automatic security updates
  - [ ] Configure CSP headers
  - [ ] Enable HSTS

- [ ] **Performance Optimization**
  - [ ] Enable OPcache for PHP
  - [ ] Configure Redis caching
  - [ ] Set up CDN (Cloudflare)
  - [ ] Optimize images (use WebP)
  - [ ] Enable HTTP/2

#### Deployment Process
- [ ] Create deployment script (`deploy.sh`):
  ```bash
  #!/bin/bash
  cd /var/www/exile-architect
  git pull origin main
  composer install --no-dev
  npm run build
  php cli/migrate.php
  systemctl reload php8.2-fpm
  systemctl reload nginx
  ```
- [ ] Test deployment on staging environment first
- [ ] Create rollback plan

#### Post-Deployment Checklist
- [ ] Verify site is accessible via HTTPS
- [ ] Test all critical features
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Test mobile responsiveness
- [ ] Verify auto-save functionality
- [ ] Test AI generation
- [ ] Check scraper cron jobs

**Phase 6 Completion Criteria:**
- ✅ All tests pass (backend and manual frontend)
- ✅ Cross-browser compatibility confirmed
- ✅ Production server is configured and secure
- ✅ Application is deployed and accessible
- ✅ SSL certificate is active
- ✅ Monitoring and logging are set up
- ✅ Performance metrics meet targets

---

## 📱 Mobile Optimization Guidelines

### Performance
- [ ] Minimize initial bundle size (<200KB JS)
- [ ] Lazy load images and modules
- [ ] Use WebP format for images
- [ ] Implement service workers for offline support
- [ ] Reduce HTTP requests (bundle assets)

### UX/UI Best Practices
- [ ] Touch targets: minimum 44x44px
- [ ] Font size: minimum 16px (prevent zoom)
- [ ] Use native-like animations (CSS transforms)
- [ ] Implement pull-to-refresh (optional)
- [ ] Add haptic feedback for touch events (if supported)
- [ ] Use bottom navigation for primary actions
- [ ] Make forms easy to fill (correct input types)

### Responsive Breakpoints
```css
/* Mobile: 320px - 767px (base styles) */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */
/* Large Desktop: 1440px+ */
```

### Testing on Real Devices
- [ ] Test on iOS devices (iPhone 8+, iPhone 14+, iPad)
- [ ] Test on Android devices (various manufacturers)
- [ ] Test on different network speeds (3G, 4G, WiFi)
- [ ] Use Chrome DevTools device emulation
- [ ] Test landscape and portrait orientations

---

## 🔍 Code Quality Checklist

### Before Each Commit
- [ ] Code follows PSR-12 (PHP) / Airbnb (JS) style guide
- [ ] No commented-out code
- [ ] All functions have docblocks
- [ ] No console.log() in production code
- [ ] No hardcoded credentials
- [ ] All variables have meaningful names
- [ ] Complex logic has explanatory comments

### Before Each Pull Request
- [ ] All tests pass
- [ ] Code has been peer-reviewed
- [ ] Documentation is updated
- [ ] No merge conflicts
- [ ] Branch is up-to-date with develop

### Code Review Checklist
- [ ] Security vulnerabilities addressed
- [ ] Performance considerations reviewed
- [ ] Error handling is comprehensive
- [ ] Edge cases are covered
- [ ] Naming conventions are consistent

---

## 🚨 Common Pitfalls to Avoid

1. **Security Issues**
   - ❌ Don't use `eval()` or execute user input
   - ❌ Don't store passwords in plain text
   - ❌ Don't trust user input (always validate/sanitize)
   - ❌ Don't expose API keys in client-side code

2. **Performance Issues**
   - ❌ Don't load entire passive tree data without need
   - ❌ Don't make synchronous API calls
   - ❌ Don't skip database indexes
   - ❌ Don't render thousands of DOM elements at once

3. **Code Quality Issues**
   - ❌ Don't duplicate code (DRY principle)
   - ❌ Don't create God classes (single responsibility)
   - ❌ Don't ignore error handling
   - ❌ Don't skip input validation

4. **UX Issues**
   - ❌ Don't make users wait without feedback
   - ❌ Don't hide error messages
   - ❌ Don't make forms difficult on mobile
   - ❌ Don't forget loading states

---

## 📊 Project Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Foundation Complete | MVC framework, database schema |
| 2 | Backend 50% | Models, core controllers |
| 3 | Backend Complete + Frontend Start | All endpoints, HTML/CSS |
| 4 | Data Integration | Scrapers working, data populated |
| 5 | Frontend 80% | Passive tree viewer, UI complete |
| 6 | AI Integration | Build generation functional |
| 7 | Testing & Deployment | Live production site |

---

## 🎓 Learning Resources

### PHP & MVC
- [PHP The Right Way](https://phptherightway.com/)
- [PSR-12 Coding Standard](https://www.php-fig.org/psr/psr-12/)
- [Twig Documentation](https://twig.symfony.com/doc/)

### JavaScript
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [D3.js Documentation](https://d3js.org/)

### CSS & Tailwind
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [CSS Tricks](https://css-tricks.com/)
- [Responsive Design Patterns](https://responsivedesign.is/patterns/)

### PoE Development
- [Official PoE API](https://www.pathofexile.com/developer/docs)
- [poe.ninja API](https://poe.ninja/api)
- [PoE Wiki](https://www.poewiki.net/)

---

## ✅ Final Pre-Launch Checklist

- [ ] All features implemented and tested
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] SEO meta tags configured
- [ ] Analytics (Google Analytics) integrated
- [ ] Error tracking (Sentry) configured
- [ ] Database backups automated
- [ ] SSL certificate active
- [ ] Privacy policy and terms of service pages
- [ ] Contact/support page
- [ ] User documentation/help section
- [ ] Monitoring dashboards configured
- [ ] Disaster recovery plan documented

---

## 📝 Notes

**Development Philosophy:**
- Write code for humans first, computers second
- Optimize for readability and maintainability
- Test early and often
- Mobile users are first-class citizens
- Security is not optional
- Performance matters

**Communication:**
- Commit messages should be descriptive
- Document complex logic
- Keep PRs focused and small
- Respond to code review feedback promptly

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Status:** Ready for Development

---

## 🚀 Ready to Start?

Now that you have this comprehensive development plan, we can begin implementation phase by phase. Each checkbox represents a concrete task that can be verified and marked as complete.

**Suggested Next Steps:**
1. Review this document thoroughly
2. Set up development environment (Phase 1.1)
3. Create initial MVC structure (Phase 1.2)
4. Set up database (Phase 1.3)
5. Begin Phase 2 backend development

Let's build something amazing! 🎮⚔️
