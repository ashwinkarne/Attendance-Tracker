# Semester Attendance Tracker

A full-stack, production-quality Progressive Web App (PWA) built with **React.js**, **Node.js**, **Express.js**, and **MongoDB Atlas** that empowers college students to track, manage, and maintain at least **75% attendance** throughout their semester.

---

## 🌟 Key Highlights & Features

1. **Fixed Semester Timeline & Timezone**:
   - Fixed semester start date: **16 November 2026**.
   - Timezone: **Asia/Kolkata (IST)**.
   - All calculations and daily records begin from 16 November 2026.
2. **Persistent Authentication & PWA**:
   - **True Persistent Session**: Survives browser closures, tab closures, and device restarts.
   - **Zero Flashing**: Smooth initialization check prevents Login page from flickering during session restoration.
   - **HTTP-Only Cookies**: Short-lived JWT access tokens (15m) and long-lived refresh tokens (30d) stored safely in HTTP-only, SameSite cookies.
   - **Refresh Token Rotation & Hashing**: Tokens are hashed with SHA-256 before storing in the `RefreshSession` collection.
   - **Installable PWA**: Works on Android, iOS, Windows laptops/desktops, and major browsers with Web App Manifest, Service Worker caching of static assets, and an Install App prompt.
   - **Offline Awareness**: Instant offline indicator notifying users that app assets are cached while data modifications require connectivity.
3. **Automated Attendance Engine & Downtime Recovery**:
   - **Conducted Hours**: Every normal working day contains **6 hours**.
   - **Sundays**: Automatically marked as official holidays (0 hours conducted, uneditable).
   - **Defaults**: Working days default to **6/6 hours**.
   - **Daily Midnight Cron (`0 0 * * *` IST)**: Automatically generates records for every student at 12:00 AM IST via `node-cron`.
   - **Downtime Recovery**: Automatically scans and populates any missing dates between 16 November 2026 and today after server restarts or downtime without creating duplicates.
4. **Attendance Target Engine (75% Threshold)**:
   - **Attendance Percentage**: `(Attended Hours / Conducted Hours) × 100`.
   - **Future Hours Needed to Reach 75% Formula**:
     $$\text{Required Future Hours} = \max\left(0, \left\lceil \frac{0.75 \times T - A}{0.25} \right\rceil\right)$$
     *(Where $T$ = Conducted Hours, $A$ = Attended Hours, assuming all upcoming future hours are attended without missing any).*
   - **Visual Indicators**: Color-coded progress bar with a dedicated 75% target line, green status for $\ge 75\%$, and amber warning for $< 75\%$.
5. **Human-Crafted Professional Design**:
   - 100% **Standard CSS** (Flexbox, CSS Grid, CSS Variables, Media Queries).
   - No external CSS frameworks (No Tailwind, No Bootstrap, No Material UI).
   - Clean, minimal, readable typography, subtle borders, and balanced layout.

---

## 🏗️ Architecture & Project Structure

```
my_attendence/
├── client/                     # Frontend React SPA & PWA
│   ├── public/
│   │   ├── manifest.json       # Web App Manifest
│   │   ├── service-worker.js   # PWA Service Worker (caches static assets only)
│   │   └── icons/              # App icons (icon.svg, icon-192.png, icon-512.png)
│   ├── src/
│   │   ├── components/         # Navbar, ProtectedRoute, LoadingSpinner, OfflineBanner, InstallPwaButton
│   │   ├── context/            # AuthContext (initialization, login, signup, logout)
│   │   ├── pages/              # Login, Signup, ForgotPassword, Dashboard, AttendanceManagement
│   │   ├── services/           # Axios client with automatic 401 token refresh interceptor
│   │   ├── styles/             # Standard CSS (variables, global, navbar, auth, dashboard, attendance)
│   │   ├── App.jsx             # React Router setup & protected routes
│   │   └── main.jsx            # Entry point & Service Worker registration
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Backend Node.js & Express REST API
│   ├── config/
│   │   └── db.js               # MongoDB Atlas connection & error resilience
│   ├── controllers/            # authController, studentController, attendanceController
│   ├── jobs/
│   │   └── attendanceCron.js   # 12:00 AM IST daily cron job & recovery runner
│   ├── middleware/             # authMiddleware, CSRF verification, rateLimiter
│   ├── models/                 # Mongoose schemas: User, Attendance, RefreshSession
│   ├── routes/                 # authRoutes, studentRoutes, attendanceRoutes
│   ├── services/               # attendanceService, authService
│   ├── utils/                  # dateUtils (IST calculations), jwtUtils (tokens, cookies)
│   ├── tests/                  # Node.js built-in automated test suite
│   ├── server.js               # Express application entrypoint
│   ├── .env.example            # Environment template
│   └── package.json
│
├── package.json                # Root package configuration
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB Atlas** account & cluster URI

### 1. Clone & Install Dependencies

In the project root directory:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create `server/.env` based on `server/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/semester_attendance?retryWrites=true&w=majority
ACCESS_TOKEN_SECRET=your_super_secret_access_key_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_min_32_chars
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

*(Note: Replace `<username>`, `<password>`, and cluster address with your genuine MongoDB Atlas connection string).*

---

## 🚀 Running the Application

### Development Mode

Run backend and frontend concurrently:

```bash
# Terminal 1: Start Express API server
npm run server:dev

# Terminal 2: Start React Vite frontend
npm run client
```

- Frontend will be live at: `http://localhost:5173`
- Backend API will be live at: `http://localhost:5000`

### Production Build & Run

```bash
# Build React static distribution
npm run client:build

# Start production server (serves both API and optimized React SPA)
npm run server
```

---

## 🧪 Testing

The backend includes a comprehensive automated test suite testing:
- **IST Timezone & Date Calculations** (including Sunday calendar identification).
- **Attendance Percentage and 75% Target Mathematical Formula**.
- **Edge Cases** (0 conducted hours, Day 1 default, missed days, holiday exclusions).
- **Cryptographic Token & Cookie Configurations**.

Run the test suite:

```bash
npm test
```

---

## 🛡️ Security Implementation

- **No LocalStorage/SessionStorage for Tokens**: Eliminates XSS token exfiltration attacks.
- **HTTP-Only & SameSite Cookies**: `accessToken` and `refreshToken` are inaccessible to client-side scripts.
- **Refresh Token Hashing**: Stored as SHA-256 hashes in MongoDB, preventing compromised database dumps from leaking active tokens.
- **Refresh Token Rotation**: Each refresh request invalidates the previous refresh token and issues a new one.
- **CSRF Protection**: State-changing requests (`POST`, `PUT`, `DELETE`) require custom request headers (`X-Requested-With`) verified by backend middleware.
- **Multi-Device Support**: Each device/browser maintains an isolated `RefreshSession` document.
- **Password Reset Revocation**: Resetting password instantly invalidates all active sessions across all devices.
- **Rate Limiting**: Protected endpoints (`/signup`, `/login`, `/forgot-password`) enforce strict request throttling.

---

## 📱 PWA Features

- **Standalone Mode**: Configured with full viewport display (`display: standalone`) removing browser address bars.
- **Service Worker Asset Caching**: Caches HTML, CSS, JS, and icons for instant loading. Never caches sensitive `/api/*` endpoints.
- **Install App Prompt**: Automatically surfaces a non-intrusive "Install App" button in the navigation header on supported desktop and mobile devices.
- **Offline Alert**: Displays clear, real-time warning when device loses internet connectivity.
