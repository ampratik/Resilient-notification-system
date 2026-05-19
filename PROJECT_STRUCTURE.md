# Project Structure - Simple Explanation

## 📁 Folder Organization & What Each Does

```
Resilient-notification-system/
│
├── src/                          # All application code goes here
│   │
│   ├── config/                   # ⚙️  SETTINGS & SETUP
│   │   ├── configuration.ts      # Reads .env file settings
│   │   ├── database.ts           # Connects to PostgreSQL database
│   │   └── queue.ts              # Connects to Redis job queue
│   │
│   ├── modules/                  # 🧩 FEATURES (organized by feature)
│   │   │
│   │   ├── notification/         # NOTIFICATION FEATURE (the main thing)
│   │   │   │
│   │   │   ├── dto/              # 📝 REQUEST & RESPONSE FORMATS
│   │   │   │   ├── create-notification.dto.ts    # What user sends to create notification
│   │   │   │   └── notification-response.dto.ts  # What API returns to user
│   │   │   │
│   │   │   ├── entities/         # 💾 DATABASE TABLES
│   │   │   │   └── notification.entity.ts        # Defines how notification looks in database
│   │   │   │
│   │   │   ├── repositories/     # 🗄️  TALK TO DATABASE (The Answer Below 👇)
│   │   │   │   └── notification.repository.ts    # All functions to read/write notifications
│   │   │   │
│   │   │   ├── services/         # 🛠️  BUSINESS LOGIC (Smart work happens here)
│   │   │   │   ├── rate-limiter.service.ts       # Controls speed (5 requests per second)
│   │   │   │   ├── time-window.service.ts        # Controls when (only 8 AM - 9 PM)
│   │   │   │   ├── idempotency.service.ts        # Prevents duplicates
│   │   │   │   └── logger.service.ts             # Logs everything that happens
│   │   │   │
│   │   │   ├── processors/       # ⚡ WORKER (Does the actual work)
│   │   │   │   └── notification.processor.ts     # Processes jobs from queue
│   │   │   │
│   │   │   ├── notification.controller.ts        # 🌐 API ENDPOINTS (receives requests)
│   │   │   ├── notification.service.ts           # 🎯 MAIN LOGIC (coordinates everything)
│   │   │   └── notification.module.ts            # 📦 PACKAGE (bundles notification feature)
│   │   │
│   │   └── external/             # 🔌 OUTSIDE CONNECTIONS
│   │       └── external-provider.service.ts      # Simulates sending to external API
│   │
│   ├── app.module.ts             # 🏗️  MAIN BUILDING BLOCK (puts all pieces together)
│   ├── app.controller.ts         # 🌐 ROOT API (health check endpoint)
│   ├── app.service.ts            # 📌 ROOT LOGIC
│   └── main.ts                   # 🚀 ENTRY POINT (starts the application)
│
├── docker-compose.yml            # 📦 SERVICES (PostgreSQL & Redis)
├── .env                          # 🔐 SECRETS & SETTINGS
├── .env.example                  # 📋 TEMPLATE for .env
├── package.json                  # 📚 DEPENDENCIES list
├── tsconfig.json                 # 🔧 TypeScript settings
├── nest-cli.json                 # ⚙️  NestJS settings
├── README.md                     # 📖 FULL DOCUMENTATION
└── PROJECT_STRUCTURE.md          # 📋 THIS FILE
```

---

## 🗂️ What Does "Repositories" Folder Do?

### Simple Answer
**Repository = Middleman between your code and database**

Think of it like a librarian:
- You want a book (data) → You ask the librarian (repository)
- Librarian goes to the shelf (database) → Gets the book → Brings it back to you
- Librarian also writes new books, modifies books, deletes books

### What It Actually Does

```typescript
// WITHOUT REPOSITORY (bad way):
// Your code directly talks to database
const notification = await Notification.find(id);  // ❌ Messy

// WITH REPOSITORY (good way):
// Your code talks to repository, repository talks to database
const notification = await repository.findById(id);  // ✅ Clean
```

### In Our Project

**File**: `src/modules/notification/repositories/notification.repository.ts`

**Functions it provides:**
```typescript
repository.save(notification)              // Save new notification
repository.findById(id)                    // Get one notification
repository.findAll(limit, offset)          // Get list of notifications
repository.updateStatus(id, status)        // Update notification status
repository.incrementAttemptCount(id)       // Add 1 to attempt counter
repository.findFailed()                    // Get all failed ones
```

### Why Have It?

✅ **Easy to change database** - Just change repository, don't touch main code  
✅ **Cleaner code** - Main code doesn't know SQL details  
✅ **Reusable** - Can use same repository in multiple places  
✅ **Testable** - Easy to fake data in tests  

---

## 📊 Data Flow (How It All Works)

```
1. USER sends request (create notification)
         ↓
2. CONTROLLER receives it
         ↓
3. NOTIFICATION.SERVICE validates & queues it
         ↓
4. REPOSITORY saves it to DATABASE
         ↓
5. JOB added to REDIS QUEUE
         ↓
6. PROCESSOR picks up job from queue
         ↓
7. SERVICES check: ⏰ Time window? 💨 Rate limit? 🔁 Already sent?
         ↓
8. EXTERNAL PROVIDER sends actual notification
         ↓
9. REPOSITORY updates status (SUCCESS or FAILED)
         ↓
10. USER can check status anytime
```

---

## 📁 Each Folder Explained Simply

| Folder | Purpose | Analogy |
|--------|---------|---------|
| **config/** | App settings | Thermostat for the house |
| **dto/** | Request/Response shapes | Forms you fill out |
| **entities/** | Database tables | How data looks in filing cabinet |
| **repositories/** | Talk to database | Librarian at the desk |
| **services/** | Smart business logic | Brain making decisions |
| **processors/** | Do actual work | Hands doing the work |

---

## 🎯 Each File Explained Simply

### 📝 Create-Notification DTO
**What**: Shape of data when creating a notification  
**Example**: 
```json
{
  "userId": "123",
  "recipient": "user@email.com",
  "message": "Hello!",
  "type": "BILLING_REMINDER"
}
```

### 💾 Notification Entity
**What**: How notification looks in database  
**Has**: id, userId, recipient, message, status, attemptCount, createdAt, updatedAt

### 🗄️ Notification Repository
**What**: Functions to read/write from database  
**Methods**: save, findById, findAll, updateStatus, incrementAttemptCount

### ⚡ Notification Processor
**What**: Worker that processes jobs from queue  
**Does**: Check time window → Check rate limit → Check duplicate → Send notification → Update status

### 🛠️ Rate Limiter Service
**What**: Limits requests (only 5 per second)  
**Analogy**: Bouncer at a club - only lets 5 people in per second

### ⏰ Time Window Service
**What**: Only allows notifications 8 AM - 9 PM  
**Analogy**: Business hours - doesn't send notifications at 3 AM

### 🔁 Idempotency Service
**What**: Prevents sending same notification twice  
**Analogy**: Checking if mail already delivered before sending again

### 📝 Logger Service
**What**: Records everything that happens  
**Analogy**: Security camera recording all events

### 🌐 Notification Controller
**What**: Receives user requests (API endpoints)  
**Example**: POST /notifications/enqueue

### 🎯 Notification Service
**What**: Coordinates everything  
**Does**: Take request → Validate → Queue job → Return response

### 🧩 Notification Module
**What**: Packages notification feature  
**Does**: Imports all services, exports ready to use

### 🌐 External Provider Service
**What**: Simulates sending to external API  
**Does**: Randomly fails/succeeds to test retry logic

### 🏗️ App Module
**What**: Main building block  
**Does**: Imports all features, databases, queues

### 🚀 Main.ts
**What**: Starts the application  
**Does**: Loads app module and starts server on port 3000

---

## 🧹 What We Removed

- ✅ `.spec.ts` files → Unit tests (removed for simplicity)
- ✅ `test/` folder → E2E tests folder
- ✅ `dist/` folder → Build output (auto-generated, can rebuild)
- ✅ `IMPLEMENTATION.md` → Redundant (info in README.md)

---

## 🏃 Quick Start

```bash
# 1. Start database and Redis
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Run app
npm run start:dev

# 4. Create notification
curl -X POST http://localhost:3000/notifications/enqueue \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","type":"BILLING_REMINDER","recipient":"test@test.com","message":"Test"}'

# 5. Check status
curl http://localhost:3000/notifications/{id}
```

---

**That's it!** The project is now clean and organized. Everything has a purpose, nothing is wasted.
