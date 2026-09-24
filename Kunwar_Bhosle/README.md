# Gym & Fitness Club Management REST API

A production-ready RESTful backend API for a **Gym & Fitness Center Management System** built with **Node.js, Express.js, MongoDB, Mongoose, and Passport.js (Local Strategy)**.

Live Deployment URL: `https://gym-management-api.onrender.com` *(Replace with your active Render service URL)*

---

## Table of Contents

- [Overview & Features](#overview--features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Automated Validation Tests](#automated-validation-tests)
- [Postman Collection](#postman-collection)
- [Deployment Guide (Render)](#deployment-guide-render)

---

## Overview & Features

- **Membership Lifecycle Management**: Automatic 30-day per month membership expiry calculation using Mongoose `pre('validate')` hooks. Includes helper methods for calculating remaining active days.
- **Fitness Class Capacity & Bookings**: Seat-capacity enforcement preventing over-booking. Atomic MongoDB update operations guarantee thread-safety and eliminate race conditions during concurrent bookings.
- **Session-Based Authentication**: Passport.js local strategy with bcrypt password hashing and persistent session storage backed by MongoDB (`connect-mongo`).
- **Membership Renewals**: Pro-rated extension from current expiry date for active members, or seamless renewal starting from the current date for expired members.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Authentication**: Passport.js (`passport-local`), `express-session`, `bcryptjs`
- **Session Store**: `connect-mongo`
- **Utility & Middleware**: `dotenv`, `cors`, `nodemon`

---

## Project Architecture

```text
Kunwar_Bhosle/
├── config/
│   ├── db.js                # Mongoose database connection setup
│   └── passport.js          # Passport Local strategy setup
├── controllers/
│   ├── authController.js    # Register, login, profile & logout handlers
│   ├── classController.js   # Fitness class CRUD, booking & capacity logic
│   └── memberController.js  # Renewal & expired query handlers
├── middleware/
│   ├── authMiddleware.js    # Ensure session authentication
│   └── checkActiveMember.js # Check member is not expired / inactive
├── models/
│   ├── FitnessClass.js      # Fitness class Mongoose schema
│   └── User.js              # Member schema with pre-validate hook
├── routes/
│   ├── authRoutes.js        # Auth routes (/api/auth)
│   ├── classRoutes.js       # Class & booking routes (/api/classes)
│   └── memberRoutes.js      # Membership routes (/api/members)
├── postman/
│   └── Gym_API.postman_collection.json # Complete Postman test collection
├── .env.example             # Environment template
├── .env                     # Local environment configuration
├── .gitignore
├── package.json
├── render.yaml              # Render IaC configuration
├── server.js                # Server entry point
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB installed locally OR a MongoDB Atlas connection URI

### Installation

1. Clone or open the repository workspace:
   ```bash
   cd ~/Desktop/assignment-8-gym-management-api/Kunwar_Bhosle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Start the application:
   - **Development**:
     ```bash
     npm run dev
     ```
   - **Production**:
     ```bash
     npm start
     ```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP Server Port | `5000` |
| `MONGO_URI` | MongoDB Connection String | `mongodb://127.0.0.1:27017/gymdb` |
| `SESSION_SECRET` | Secret key for express-session | `gym_management_api_secret_key_2026` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:3000` |

---

## API Documentation

### 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register new member | `{"username":"fit_sam","email":"sam@fit.com","password":"mypassword","membershipTier":"Gold","durationMonths":3}` | `201 Created`, `400 Bad Request` |
| `POST` | `/api/auth/login` | Login member | `{"username":"fit_sam","password":"mypassword"}` | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/auth/me` | Get profile & active status | None | `200 OK`, `401 Unauthorized` |
| `POST` | `/api/auth/logout` | Logout active session | None | `200 OK`, `401 Unauthorized` |

#### Register Response (`201 Created`):
```json
{
  "success": true,
  "message": "Member registered successfully",
  "data": {
    "_id": "6601a2b3c4d5e6f7a8b9c0d1",
    "username": "fit_sam",
    "email": "sam@fit.com",
    "membershipTier": "Gold",
    "membershipStatus": "active",
    "membershipExpiryDate": "2026-06-23T18:48:54.000Z",
    "createdAt": "2026-03-25T18:48:54.000Z",
    "updatedAt": "2026-03-25T18:48:54.000Z"
  }
}
```

---

### 2. Fitness Class Endpoints (`/api/classes`)

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/classes` | Fetch upcoming classes (optional `?trainer=Maria`) | None | `200 OK` |
| `GET` | `/api/classes/:id` | Get class details with populated member names | None | `200 OK`, `400 Invalid ID`, `404 Not Found` |
| `POST` | `/api/classes` | Create a workout class | `{"title":"Zumba Cardio","trainerName":"Maria","scheduleDate":"2026-04-15T09:00:00Z","maxCapacity":20}` | `201 Created`, `400 Bad Request` |
| `POST` | `/api/classes/:id/book` | Enroll logged-in active user | None | `200 OK`, `400 Class Full / Expired / Already Enrolled`, `404 Not Found` |
| `DELETE` | `/api/classes/:id/cancel` | Cancel booking | None | `200 OK`, `400 Not Enrolled`, `404 Not Found` |

#### Book Class Capacity Exceeded Response (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Class capacity reached"
}
```

---

### 3. Membership Management Endpoints (`/api/members`)

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `PATCH` | `/api/members/:id/renew` | Renew / extend expiry date | `{"additionalMonths": 6, "tier": "Platinum"}` | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `GET` | `/api/members/expired` | List all expired memberships | None | `200 OK` |

#### Renew Response (`200 OK`):
```json
{
  "success": true,
  "message": "Membership renewed successfully",
  "data": {
    "_id": "6601a2b3c4d5e6f7a8b9c0d1",
    "username": "fit_sam",
    "membershipTier": "Platinum",
    "membershipStatus": "active",
    "membershipExpiryDate": "2026-12-20T18:48:54.000Z"
  }
}
```

---

## Automated Validation Tests

Run the full validation suite to verify the required scenarios:

1. **Auto-Expiry Check**: Verifies 1-month registration calculates `membershipExpiryDate` exactly 30 days in the future.
2. **Capacity Limit**: Verifies 3rd member booking into a 2-capacity class fails with `400 Bad Request: Class capacity reached`.
3. **Expired Query**: Verifies `/api/members/expired` fetches expired accounts correctly.

To run:
```bash
node test-validation.js
```

---

## Postman Collection

Import `postman/Gym_API.postman_collection.json` into Postman.
- **Variables**: `baseUrl` (defaults to `http://localhost:5000`), `classId`, `memberId`.
- Cookie handling is preserved to support session persistence across auth calls.

---

## Deployment Guide (Render)

### Step 1: Create MongoDB Atlas Cluster
1. Create a free **M0** cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Set Network Access to allow `0.0.0.0/0`.
3. Copy your connection string: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/gymdb?retryWrites=true&w=majority`.

### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Gym & Fitness Club Management API"
git branch -M main
git remote add origin https://github.com/<your-username>/itm-assignment-08-gym-api.git
git push -u origin main
```

### Step 3: Configure Render Web Service
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository `itm-assignment-08-gym-api`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add Environment Variables:
   - `MONGO_URI`: *(Your MongoDB Atlas connection string)*
   - `SESSION_SECRET`: *(Random 32+ character string)*
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `*`
