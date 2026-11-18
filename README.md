# 🍲 FoodWise AI — Smart Food Price Comparison Engine

> **"Your Food. Your Choice. Always the Best Deal."**

FoodWise AI is a full-stack food delivery price comparison platform that compares real food orders across **Zomato**, **Swiggy**, and **Toing**. It unmasks hidden delivery charges, packaging fees, platform service fees, and taxes, applies active promotional coupons, verifies data provenance, and helps users discover the genuine lowest final price before ordering.

---

## 📑 Table of Contents

1. [Key Features & User Experience](#-key-features--user-experience)
2. [Architecture & Technical Principles](#-architecture--technical-principles)
3. [Project Directory Structure](#-project-directory-structure)
4. [Prerequisites & Local Installation](#-prerequisites--local-installation)
5. [Database Setup & Migrations](#-database-setup--migrations)
6. [Environment Configuration Reference](#-environment-configuration-reference)
7. [API Documentation](#-api-documentation)
8. [Production Deployment Guide](#-production-deployment-guide)
9. [Automated Testing & Verification](#-automated-testing--verification)
10. [Known Limitations & Catalogue Boundaries](#-known-limitations--catalogue-boundaries)
11. [License & Ethical Disclosure](#-license--ethical-disclosure)

---

## 📸 Key Features & User Experience

| Page / Feature | URL Route | Description |
| :--- | :--- | :--- |
| **1. Home & Search** | `/` | Hero search with instant token-based matching, category filtering, city selection, and live dish comparisons. |
| **⭐ Compare by Link** | Section on `/` | Paste any Zomato, Swiggy, or Toing link to parse dishes, match catalogue equivalents, and compare prices with fallback support. |
| **2. AI Food Search** | `/ai-search` | Natural language food recommendations powered by Google Gemini API (`gemini-1.5-flash`) with automatic local NLP fallback. |
| **3. Deep Comparison** | `/compare` | Side-by-side fee audit across Zomato, Swiggy, and Toing with interactive coupon testing and user-entered price overrides. |
| **4. Explore by Brand**| `/brands` | Direct comparison across major restaurant chains (Domino's, Burger King, McDonald's, Behrouz, etc.). |
| **5. Coupon Centre** | `/coupons` | Aggregated promotional promo codes with one-click copy, terms, and minimum order requirements. |
| **6. Saved Deals** | `/saved` | Persistent deal bookmarks with cumulative savings tracking and Supabase cloud synchronization. |
| **7. Profile & Settings**| `/profile` | Dietary preference filters, active city zones, favored platform priority, and authentication management. |

---

## 🏛️ Architecture & Technical Principles

FoodWise AI is built on a modular decoupled architecture:
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router DOM.
- **Backend**: Node.js, Express, TypeScript, tsx, CORS, dotenv, Node.js native `crypto`.
- **Database / Auth**: PostgreSQL / Supabase with Row Level Security (RLS), custom triggers, and tokenized share links.
- **AI Intelligence**: Google Gemini API via `@google/generative-ai` with conversational fallback.

```text
┌────────────────────────────────────────────────────────┐
│               FoodWise React Frontend                  │
│       Vite + React Router + Tailwind + Lucide          │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON API
┌──────────────────────────▼─────────────────────────────┐
│               FoodWise Express Backend                 │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ Provenance Gate  │  │   Local NLP / Gemini AI     │ │
│  ├──────────────────┤  ├─────────────────────────────┤ │
│  │ Platform Adapters│  │ Rate Limiter & IDOR Guard   │ │
│  └──────────────────┘  └─────────────────────────────┘ │
└──────────────────────────┬─────────────────────────────┘
                           │ Service-Role / Anon
┌──────────────────────────▼─────────────────────────────┐
│           Supabase PostgreSQL Database                 │
│  - Row Level Security (RLS) on all user data           │
│  - 256-bit Cryptographic Hex Share Tokens              │
│  - Automated Profile Creation via Auth Triggers        │
└────────────────────────────────────────────────────────┘
```

### 🛡️ Core Engineering Safeguards

1. **Integer Paise Financial Precision**:
   - All financial math is computed in integer **paise** (`1 INR = 100 Paise`), completely eliminating floating-point rounding errors (`0.1 + 0.2 !== 0.3`).
2. **Strict Data Provenance Badging**:
   - Every price and listing carries a verifiable provenance badge:
     - `demo_catalogue`: Curated simulation catalogue.
     - `live_verified`: Authorised live data signed cryptographically by the server.
     - `user_entered`: User manually supplied price for custom verification.
     - `rule_estimated`: Algorithmic estimate (e.g. distance-tiered delivery).
     - `unknown`: Unverified source.
3. **Definitive vs. Provisional Ranking**:
   - A platform is declared **Definitive Lowest Price** ONLY when all relevant competing platform prices and fees are fully known and verified.
   - If a competing platform has an unknown price, estimated fee, or unconfirmed availability, the winner is labeled **"Provisional Leader"** with a clear disclosure that unverified competitor fees could alter the final ranking.
4. **Honest Missing Fee Handling**:
   - Undisclosed fees (e.g. merchant packaging calculated only at checkout) remain `null` (**"Unknown"**), **never zero (`₹0`)**, preventing false claims of free delivery.
5. **City Isolation & Honest Location Disclaimers**:
   - Verified demo listings are geographically tied to **Bengaluru**.
   - When a user selects another city (e.g. **Jaipur**, **Mumbai**, **Delhi**), FoodWise displays the catalogue with an honest disclaimer banner and disables the "Order Now" button with `"Not available in [City]"` to prevent misleading users.
6. **No Private Scraping & Ethical Ordering**:
   - FoodWise uses documented API structures and authorized simulation datasets. FoodWise never automates checkout or captures payment credentials; orders are placed by the user directly on platform websites or mobile apps.

---

## 📁 Project Directory Structure

```text
FoodWise/
├── backend/                      # Express + TypeScript API Server
│   ├── src/
│   │   ├── adapters/             # Platform fee & coupon calculation engines
│   │   │   ├── base.adapter.ts   # Core adapter interface & discount logic
│   │   │   ├── zomato.adapter.ts # Zomato delivery tiers, packaging & coupons
│   │   │   ├── swiggy.adapter.ts # Swiggy delivery tiers, packaging & coupons
│   │   │   └── toing.adapter.ts  # Toing direct zero-commission pricing
│   │   ├── data/
│   │   │   ├── demoData.ts       # 56 verified Indian cuisine dishes
│   │   │   └── brandsData.ts     # Multi-platform restaurant chain data
│   │   ├── routes/
│   │   │   ├── food.routes.ts    # Food search & single-item compare routes
│   │   │   ├── coupons.routes.ts # Aggregated platform coupon routes
│   │   │   ├── ai.routes.ts      # Gemini AI conversational deal finder
│   │   │   ├── brand.routes.ts   # Brand exploration & comparison routes
│   │   │   └── database.routes.ts# Supabase health, profiles, deals & shares
│   │   ├── security/
│   │   │   └── provenanceVerifier.ts # Cryptographic HMAC-SHA256 signature verifier
│   │   ├── services/
│   │   │   ├── comparison.service.ts # Quotes calculation & ranking service
│   │   │   ├── brand.service.ts      # Brand quote calculation service
│   │   │   └── database.service.ts   # Database client, RLS & share token logic
│   │   ├── types/
│   │   │   ├── index.ts          # Backend domain types & interfaces
│   │   │   └── brand.types.ts    # Brand types & quote structures
│   │   ├── utils/
│   │   │   └── urlValidator.ts   # URL sanitization & deep link generator
│   │   └── server.ts             # Express server setup, CORS & startup gates
│   ├── .env.example              # Backend environment template
│   ├── package.json              # Backend dependencies and test scripts
│   └── tsconfig.json             # Backend TypeScript configuration
│
├── frontend/                     # React 18 + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Navbar.tsx        # Navigation bar with badges & city picker
│   │   │   ├── Footer.tsx        # Footer with ethical disclosures
│   │   │   ├── FoodCard.tsx      # Dish card with provenance & savings badges
│   │   │   ├── PriceBreakdownModal.tsx # Full fee audit modal
│   │   │   ├── DisclaimerBanner.tsx    # Demo mode & precision notice
│   │   │   └── CitySelectorModal.tsx   # City switching modal
│   │   ├── context/
│   │   │   ├── AuthContext.tsx   # Supabase authentication state
│   │   │   └── CityContext.tsx   # User location & city persistence
│   │   ├── pages/                # Complete Page Views
│   │   │   ├── Home.tsx          # Homepage with hero & search
│   │   │   ├── Search.tsx        # Search results with token matching
│   │   │   ├── Comparison.tsx    # Multi-platform comparison & audit
│   │   │   ├── BrandExplore.tsx  # Restaurant brand exploration
│   │   │   ├── Coupons.tsx       # Coupon code copy centre
│   │   │   ├── SavedDeals.tsx    # Saved deal bookmarks & total savings
│   │   │   └── Profile.tsx       # User preferences & platform defaults
│   │   ├── services/
│   │   │   └── api.ts            # Client API calls with AbortController support
│   │   ├── types/
│   │   │   └── index.ts          # Frontend TypeScript contracts
│   │   ├── utils/
│   │   │   └── currency.ts       # Paise-to-Rupee formatting utilities
│   │   ├── App.tsx               # Route definitions & layout wrappers
│   │   ├── main.tsx              # React mounting entry point
│   │   └── index.css             # Tailwind base & theme styles
│   ├── .env.example              # Frontend environment template
│   ├── package.json              # Frontend dependencies and build scripts
│   ├── tailwind.config.js        # Cream theme, orange accents & custom styles
│   └── vite.config.ts            # Vite dev proxy configuration
│
├── database/                     # Database Schema & Migrations
│   ├── schema.sql                # Complete PostgreSQL schema with RLS & functions
│   └── migrations/
│       └── 20261117_seed_demo_catalogue.sql # Seed data for demo catalogue
│
├── supabase/                     # Supabase CLI Migrations Mirror
│   └── migrations/
│       ├── 20261116000000_foodwise_core_schema.sql
│       └── 20261117_seed_demo_catalogue.sql
│
├── .env.example                  # Monorepo root environment template
├── package.json                  # Root runner script configuration
└── README.md                     # Comprehensive project documentation
```

---

## 🚀 Prerequisites & Local Installation

### Prerequisites
Make sure you have **Node.js** (v18 or higher) installed:
```bash
node -v
npm -v
```

> **Windows PowerShell Users:**
> If you encounter script permission errors when invoking `npm`, use `npm.cmd` or enable local script execution:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

### Step 1: Install Dependencies

From the `FoodWise` root directory, install frontend and backend dependencies:

```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

---

### Step 2: Configure Environment Variables

Create `.env` files from their respective `.env.example` templates:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

> **Note on Local Development:**
> In development mode (`NODE_ENV=development`), FoodWise runs out of the box with zero external configuration! If `GEMINI_API_KEY` is not provided, the backend seamlessly falls back to its deterministic local NLP engine. If Supabase is unconfigured, it operates using the built-in verified demo catalogue.

---

### Step 3: Start the Application

You can start the backend and frontend in separate terminal windows:

#### Terminal 1 — Start the Backend Server:
```bash
npm --prefix backend run dev
```
Backend will start on: **`http://localhost:5000`** (Health check: `http://localhost:5000/api/health`)

#### Terminal 2 — Start the Frontend Application:
```bash
npm --prefix frontend run dev
```
Frontend will be accessible at: **`http://localhost:5173`**

---

## 🗄️ Database Setup & Migrations

FoodWise supports both in-memory demo mode and persistent PostgreSQL storage via Supabase.

### Schema Migration Order:
1. **Core Schema & Security Policies**:
   - File: `database/schema.sql` (or `supabase/migrations/20261116000000_foodwise_core_schema.sql`)
   - Creates the 11 core tables (`profiles`, `platforms`, `restaurants`, `food_items`, `price_snapshots`, `coupons`, `coupon_rules`, `search_sessions`, `comparisons`, `comparison_items`, `saved_deals`).
   - Configures PostgreSQL Row Level Security (RLS) on user data.
   - Sets up the `handle_new_user()` trigger for automatic profile generation on Supabase Auth sign-ups.
   - Installs the secure `get_shared_comparison_v2` RPC function with direct PostgREST access revoked from `PUBLIC`, `anon`, and `authenticated` roles (accessible exclusively to backend `service_role`).

2. **Demo Catalogue Seed**:
   - File: `database/migrations/20261117_seed_demo_catalogue.sql`
   - Populates platforms (Zomato, Swiggy, Toing) and seed catalogue items across Indian cuisines.

### Running Migrations via Supabase CLI:
```bash
# Login to Supabase CLI
supabase login

# Link your remote Supabase project
supabase link --project-ref your-project-ref

# Apply pending migrations
supabase db push
```

---

## ⚙️ Environment Configuration Reference

### Backend Configuration (`backend/.env`)

| Variable | Required in Dev | Required in Prod | Description | Default / Example |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | No | No | Port on which the Express server listens | `5000` |
| `NODE_ENV` | No | Yes | Application environment mode | `development` / `production` |
| `GEMINI_API_KEY` | No | No | Google AI Studio Gemini API key for natural language food search | `AIzaSy...` (Falls back to local NLP if omitted) |
| `PROVENANCE_SIGNING_SECRET` | No | **YES** | Master HMAC-SHA256 secret for validating live provenance evidence. **Startup fails if unset in production.** | Minimum 32-character high-entropy secret |
| `FRONTEND_URL` | No | Yes | Primary frontend origin for CORS verification | `https://your-domain.com` |
| `ALLOWED_ORIGINS` | No | Yes | Comma-separated list of allowed CORS origins | `https://your-domain.com,https://app.your-domain.com` |
| `SUPABASE_URL` | No | No | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | No | No | Supabase anon public key (read queries restricted by RLS) | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | No | Supabase service-role secret (SERVER-ONLY, bypasses RLS) | `eyJhbGciOi...` (NEVER leak to frontend) |

### Frontend Configuration (`frontend/.env`)

| Variable | Required in Dev | Required in Prod | Description | Default / Example |
| :--- | :---: | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | No | Yes | URL pointing to the FoodWise Express API backend | `http://localhost:5000/api` |
| `VITE_SUPABASE_URL` | No | No | Supabase project URL for frontend client authentication | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`| No | No | Supabase anon publishable key for client authentication | `eyJhbGciOi...` |

---

## 📡 API Documentation

### 1. Core & Health Endpoints

#### `GET /api/health`
Returns backend health status, active environment mode, supported platforms, and currency metadata.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-18T06:30:00.000Z",
    "environment": "development",
    "currency": "INR (Paise precision)",
    "platforms": ["zomato", "swiggy", "toing"]
  }
  ```

#### `GET /api/database/health`
Returns Supabase connection status and verification of expected schema tables without exposing database secrets.

---

### 2. Food Search & Comparison Endpoints

#### `GET /api/foods`
Search and filter food catalogue items with tokenized relevance and dietary intent.
- **Query Parameters**:
  - `q` *(string, optional)*: Search query (e.g. `"paneer pizza"`, `"biryani"`, `"cold coffee"`).
  - `category` *(string, optional)*: Category filter (e.g. `"Pizza & Fast Food"`, `"Biryani & Rice"`).
  - `dietary` *(string, optional)*: Dietary filter (`"veg"`, `"non-veg"`, `"any"`).
  - `city` *(string, optional)*: Active user city (defaults to `"Bengaluru"`).
  - `maxPrice` *(number, optional)*: Maximum final price in Rupees.
  - `sort` *(string, optional)*: Sorting order (`"relevance"`, `"cheapest"`, `"rating"`).
- **Response `200 OK`**: Array of `FoodItem` objects with provenance metadata and calculated quotes.

#### `GET /api/foods/:id/compare`
Retrieve side-by-side fee breakdown and ranking across platforms for a specific dish.
- **Query Parameters**:
  - `city` *(string, optional)*: User city for location checks.
  - `userPrice` *(number, optional)*: Custom base price in Rupees for user-entered price auditing.
  - `couponCode` *(string, optional)*: Coupon code to test across platforms.
- **Response `200 OK`**: `ComparisonResult` object including `isDefinitiveCheapest`, `recommendationReason`, fee breakdown, and provenance labels.

#### `POST /api/compare-link`
Extract dish metadata from platform URLs and find matching comparisons.
- **Body**: `{ "url": "https://www.zomato.com/bangalore/paradise-biryani?dish=biryani-hyd-1", "city": "Bengaluru" }`
- **Response `200 OK`**: Matched food item, extracted dish name, and comparison result.

#### `GET /api/brands`
Retrieve price comparisons for standardized offerings from major restaurant chains.
- **Query Parameters**:
  - `brand` *(string, optional)*: Brand slug (e.g. `"dominos"`, `"burger-king"`, `"mcdonalds"`).
  - `city` *(string, optional)*: User city.

#### `GET /api/coupons`
Retrieve list of all active platform promotional coupons and terms.

#### `POST /api/ai/query`
Conversational natural language food deal finder powered by Google Gemini with local NLP fallback.
- **Body**: `{ "query": "Find me a cheap veg pizza under 250", "city": "Bengaluru" }`
- **Response `200 OK`**: Conversational answer, extracted criteria, and matched dish cards.

---

### 3. User & Share Database Endpoints

#### `GET /api/database/profile/:userId`
Fetch authenticated user profile defaults. Requires `Authorization: Bearer <token>`.
- **Protected against IDOR**: Returns `403 Forbidden` if requesting a profile other than the authenticated user.

#### `PUT /api/database/profile/:userId`
Update user dietary preferences, favorite platform, and city defaults. Requires `Authorization: Bearer <token>`.

#### `GET /api/database/deals/:userId`
Fetch saved deal bookmarks for the authenticated user. Requires `Authorization: Bearer <token>`.

#### `POST /api/database/deals/:userId`
Bookmark a deal for the authenticated user. Requires `Authorization: Bearer <token>`.

#### `DELETE /api/database/deals/:userId/:dealId`
Delete a saved deal bookmark. Requires `Authorization: Bearer <token>`.

#### `GET /api/database/share/:token`
Fetch a shared comparison by 256-bit cryptographic hex token.
- **Security**: Direct PostgREST RPC access revoked; guarded by sliding-window IP rate limiting (10 requests/minute).

---

## 🚢 Production Deployment Guide

### Security & Production Checklist

1. **Mandatory Production Startup Gate**:
   - The FoodWise backend enforces a strict startup check in `backend/src/security/provenanceVerifier.ts`.
   - When `NODE_ENV=production`, the server **strictly refuses to start** if `PROVENANCE_SIGNING_SECRET` is unset, empty, or uses the development fallback key.
   - Generate a strong 32+ character random secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

2. **CORS Isolation**:
   - Configure `FRONTEND_URL` and `ALLOWED_ORIGINS` in `backend/.env` with your exact production domains (no wildcards `*` or trailing slashes).

3. **Supabase Key Isolation**:
   - **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or version control.
   - Only `VITE_SUPABASE_ANON_KEY` is safe for client applications.

4. **Building for Production**:
   ```bash
   # Build backend TypeScript to JavaScript
   npm --prefix backend run build

   # Build frontend static bundle with Vite
   npm --prefix frontend run build
   ```

5. **Starting in Production**:
   ```bash
   export NODE_ENV=production
   export PROVENANCE_SIGNING_SECRET=your_generated_secret_key_here
   node backend/dist/server.js
   ```

---

## 🧪 Automated Testing & Verification

FoodWise AI includes a comprehensive test suite covering mathematical accuracy, data provenance, ranking integrity, search matching, and security hardening.

### Running Backend Unit & Architectural Tests
```bash
# Verify core integer paise math & adapter quotes
npm --prefix backend run test

# Run dynamic search pipeline tests across mandatory queries
npm --prefix backend run test:search

# Run "Compare by Link" URL validation & extraction tests
npm --prefix backend run test:link

# Run Toing official destination & app store verification
npm --prefix backend run test:toing

# Run cross-platform link integrity tests (140 tests)
npm --prefix backend run test:links

# Run brand feature comparison tests (47 tests)
npm --prefix backend run test:brand

# Run real comparison scenarios & provisional ranking tests (21 tests)
npm --prefix backend run test:scenarios

# Run Supabase health, key isolation & share token entropy tests
npm --prefix backend run test:db

# Run SQL syntax & handle_new_user trigger simulation tests
npm --prefix backend run test:sql
```

### Running Hardening & Provenance Verification Matrix
```bash
# Stage 1 Data Provenance & Cryptographic Signature Suite (93 tests)
npx tsx scratch/test-stage1-provenance.ts

# Stage 2 Search Accuracy, Token Matching & Dietary Suite (67 tests)
npx tsx scratch/test-stage2-verification.ts

# Phase 2 Security Hardening Suite (47 tests)
npx tsx scratch/test-phase2-hardening.ts

# Phase 1 Core Engine & Unknown Fee Suite (50 tests)
npx tsx scratch/test-phase1-fixes.ts

# Tier A In-Process HTTP Backend Integration Suite (53 tests)
npx tsx backend/src/test-backend-integration.ts
```

---

## ⚠️ Known Limitations & Catalogue Boundaries

1. **Curated Bengaluru Demo Catalogue**:
   - The bundled food catalogue features 56 verified Indian cuisine dishes representing popular restaurants in **Bengaluru** (Koramangala, Indiranagar, HSR Layout).
   - Prices, packaging fees, and distance surcharges reflect real Bengaluru delivery benchmarks.

2. **Honest Multi-City Experience**:
   - When users select cities outside the verified demo area (e.g. **Jaipur**, **Mumbai**, **Delhi**), FoodWise displays the catalogue with an explicit amber disclaimer explaining that listings are calibrated for Bengaluru. The platform disables the checkout button (`"Not available in [City]"`) to protect users from inaccurate ordering expectations.

3. **Ethical Non-Automated Ordering**:
   - FoodWise does not scrape private user accounts or automate order placement. Users click direct links to open platform apps/sites and complete their orders with full transparency.

4. **Cryptographic Live Verification**:
   - In standard demo mode, all catalogue items are badged `Demo Catalogue`. The `Live Verified` badge is granted only when live platform integration evidence is verified using HMAC-SHA256 signatures by the backend server.

---

## ⚖️ License & Ethical Disclosure

Distributed under the **MIT License**.

FoodWise AI is an independent price comparison and financial audit tool built to champion consumer transparency in the food-delivery ecosystem. Platform names, logos, and trademarks (Zomato, Swiggy, Toing) belong to their respective owners and are referenced solely for identification and fair comparative audit purposes.
