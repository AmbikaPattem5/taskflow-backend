# TaskFlow Backend

Production-ready TypeScript REST API backend for **TaskFlow** — a project and team management application (similar to Jira/Trello).

## 🚀 Tech Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB Atlas via Mongoose
- **Authentication**: JWT & bcryptjs
- **Validation**: Zod
- **Architecture**: Controller / Service / Model pattern

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed database with demo accounts & sample tasks
npm run seed

# 3. Start development server
npm run dev
```

The API will be running at `http://localhost:5000/api`.

---

## 🔐 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **ADMIN** | `admin@taskflow.dev` | `Admin123!` |
| **MANAGER** | `manager@taskflow.dev` | `Manager123!` |
| **MEMBER** | `member@taskflow.dev` | `Member123!` |

---

## 📖 API Documentation

Refer to [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for full endpoint specifications, request bodies, query parameters, and response examples.
