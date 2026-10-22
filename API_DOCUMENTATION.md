# TaskFlow REST API Documentation

Comprehensive guide for consuming the TaskFlow backend REST API in React frontend applications.

---

## 📌 1. General Information

- **Base URL (Local)**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **Database**: MongoDB Atlas (`taskflow` database)

---

## 📋 2. Complete API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| **GET** | `/api/health` | Server and database health status | No |
| **POST** | `/api/auth/register` | Register a new user | No |
| **POST** | `/api/auth/login` | Authenticate and obtain JWT token | No |
| **GET** | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer) |
| **POST** | `/api/auth/logout` | Client logout helper | Yes (Bearer) |
| **POST** | `/api/auth/forgot-password` | Request password reset token | No |
| **POST** | `/api/auth/reset-password` | Reset password using reset token | No |
| **GET** | `/api/projects` | List projects (paginated, search, filter) | Yes (Bearer) |
| **POST** | `/api/projects` | Create a new project | Yes (Bearer) |
| **GET** | `/api/projects/:id` | Get project details, stats & members | Yes (Bearer) |
| **PATCH** | `/api/projects/:id` | Update project name, description or status | Yes (Bearer) |
| **DELETE** | `/api/projects/:id` | Delete project and all related tasks | Yes (Bearer) |
| **GET** | `/api/projects/:projectId/members` | List members of a project (filters, pagination) | Yes (Bearer) |
| **POST** | `/api/projects/:projectId/members` | Add a member by email or user ID | Yes (Bearer) |
| **PATCH** | `/api/projects/:projectId/members/:userId` | Update member role in project (with last-admin protection) | Yes (Bearer) |
| **DELETE** | `/api/projects/:projectId/members/:userId` | Remove member from project (with last-admin protection) | Yes (Bearer) |
| **GET** | `/api/members` | List team members visible to user (search, filter, status, pagination) | Yes (Bearer) |
| **POST** | `/api/members` | Add/Invite member directly to system (without project) | Yes (Bearer) |
| **GET** | `/api/members/:userId` | View member profile and shared project memberships | Yes (Bearer) |
| **PATCH** | `/api/members/:userId` | Update member name, role, or status | Yes (Bearer) |
| **PATCH** | `/api/members/:userId/status` | Toggle member status between ACTIVE and INACTIVE | Yes (Bearer) |
| **DELETE** | `/api/members/:userId` | Delete member completely from system and all projects | Yes (Bearer) |
| **GET** | `/api/projects/:projectId/tasks` | List tasks in a project (filters, pagination) | Yes (Bearer) |
| **POST** | `/api/projects/:projectId/tasks` | Create a task in project | Yes (Bearer) |
| **GET** | `/api/tasks/:id` | Get single task details | Yes (Bearer) |
| **PATCH** | `/api/tasks/:id` | Update task status, priority, assignee, etc. | Yes (Bearer) |
| **DELETE** | `/api/tasks/:id` | Delete task and its comments | Yes (Bearer) |
| **GET** | `/api/tasks/:taskId/comments` | List all comments on a task | Yes (Bearer) |
| **POST** | `/api/tasks/:taskId/comments` | Add a comment to a task | Yes (Bearer) |
| **PATCH** | `/api/comments/:id` | Update a comment | Yes (Bearer) |
| **DELETE** | `/api/comments/:id` | Delete a comment | Yes (Bearer) |
| **GET** | `/api/notifications` | List notifications for current user | Yes (Bearer) |
| **PATCH** | `/api/notifications/:id/read` | Mark single notification as read | Yes (Bearer) |
| **PATCH** | `/api/notifications/read-all` | Mark all notifications as read | Yes (Bearer) |
| **GET** | `/api/dashboard` | Dashboard analytics, charts & recent activity | Yes (Bearer) |

---

## 🔑 3. Demo Credentials

The database has been seeded with demo accounts for each role:

| Role | Name | Email | Password |
|---|---|---|---|
| **ADMIN** | Sarah Connor | `admin@taskflow.dev` | `Admin123!` |
| **MANAGER** | Michael Scott | `manager@taskflow.dev` | `Manager123!` |
| **MEMBER** | Jim Halpert | `member@taskflow.dev` | `Member123!` |
| **MEMBER** | Pam Beesly | `alex@taskflow.dev` | `Alex123!` |

---

## 🛡️ 4. Authentication & Axios Setup for React

All protected routes require a JWT Bearer token sent in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token_here>
```

### Axios Example Setup:
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically inject JWT token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle unauthorized (401) responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taskflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📦 5. Predictable Response Structure

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    }
  ]
}
```

---

## 🩺 6. Health Check API

### `GET /api/health`
Check API server status and MongoDB Atlas connection.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/health`
- **Auth**: None
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "uptime": 14.2,
    "timestamp": "2026-10-06T17:43:00.695Z",
    "database": "connected"
  }
}
```

---

## 🔐 7. Authentication APIs

### 1. `POST /api/auth/register`
Register a new user account.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Auth**: None
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "MEMBER" // Optional: "ADMIN" | "MANAGER" | "MEMBER" (defaults to "MEMBER")
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "MEMBER",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jane@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. `POST /api/auth/login`
Log in with registered email and password.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Auth**: None
- **Request Body**:
```json
{
  "email": "admin@taskflow.dev",
  "password": "Admin123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Sarah Connor",
      "email": "admin@taskflow.dev",
      "role": "ADMIN",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. `GET /api/auth/me`
Retrieve currently authenticated user profile.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Auth**: Required (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Sarah Connor",
      "email": "admin@taskflow.dev",
      "role": "ADMIN",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
    }
  }
}
```

---

### 4. `POST /api/auth/logout`
Logout helper to instruct frontend to clear authentication token.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/auth/logout`
- **Auth**: Required (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Logged out successfully. Please remove token on the client.",
  "data": null
}
```

---

### 5. `POST /api/auth/forgot-password`
Request a password reset token for a user account.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/auth/forgot-password`
- **Auth**: None
- **Request Body**:
```json
{
  "email": "sarah@example.com"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Password reset token generated successfully.",
  "data": {
    "message": "Password reset token generated successfully.",
    "resetToken": "8f4b23a1d9e7c5b6a2e1d0f8c3b5a7e9..."
  }
}
```

---

### 6. `POST /api/auth/reset-password`
Reset a user's password using the reset token.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/auth/reset-password` *(or `/api/auth/reset-password/:token`)*
- **Auth**: None
- **Request Body**:
```json
{
  "token": "8f4b23a1d9e7c5b6a2e1d0f8c3b5a7e9...",
  "password": "NewSecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Password has been successfully reset. You can now log in with your new password.",
  "data": null
}
```

---

## 📁 8. Project APIs

### 1. `GET /api/projects`
List accessible projects with pagination, search, status, and priority filter.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/projects`
- **Auth**: Required (`Bearer <token>`)
- **Query Parameters**:
  - `page` (number, optional, default: `1`)
  - `limit` (number, optional, default: `10`)
  - `search` (string, optional: searches project name and description)
  - `status` (string, optional: `ACTIVE` | `ARCHIVED` | `COMPLETED`)
  - `priority` (string, optional: `LOW` | `MEDIUM` | `HIGH` | `URGENT`)
  - `sortBy` (string, optional, default: `createdAt`)
  - `sortOrder` (string, optional: `asc` | `desc`, default: `desc`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [
    {
      "id": "67530e4b85c2d3a9b1c4e7fa",
      "name": "TaskFlow Web Platform",
      "description": "Modern project and team management web application...",
      "status": "ACTIVE",
      "priority": "HIGH",
      "startDate": "2026-10-01T00:00:00.000Z",
      "dueDate": "2026-11-15T00:00:00.000Z",
      "color": "#3B82F6",
      "icon": "folder",
      "ownerId": {
        "id": "67530e4b85c2d3a9b1c4e7f8",
        "name": "Sarah Connor",
        "email": "admin@taskflow.dev",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
      },
      "memberCount": 4,
      "taskCount": 4,
      "createdAt": "2026-10-06T17:40:00.000Z",
      "updatedAt": "2026-10-06T17:40:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. `GET /api/projects/:id`
Get detailed project information including member count and task breakdown by status.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/projects/:id`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the project
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Project details retrieved successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e7fa",
    "name": "TaskFlow Web Platform",
    "description": "Core frontend React web application...",
    "status": "ACTIVE",
    "priority": "HIGH",
    "startDate": "2026-10-01T00:00:00.000Z",
    "dueDate": "2026-11-15T00:00:00.000Z",
    "color": "#3B82F6",
    "icon": "folder",
    "ownerId": {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Sarah Connor",
      "email": "admin@taskflow.dev",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
    },
    "memberCount": 4,
    "taskStats": {
      "total": 4,
      "todo": 1,
      "inProgress": 1,
      "inReview": 1,
      "done": 1
    },
    "createdAt": "2026-10-06T17:40:00.000Z",
    "updatedAt": "2026-10-06T17:40:00.000Z"
  }
}
```

---

### 3. `POST /api/projects`
Create a new project. The creator is automatically added as project Admin.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/projects`
- **Auth**: Required (`Bearer <token>`)
- **Request Body**:
```json
{
  "name": "E-Commerce Replatforming",
  "description": "Migrate storefront to Next.js and headless commerce",
  "status": "ACTIVE", // Optional: "ACTIVE" | "ARCHIVED" | "COMPLETED" (default: "ACTIVE")
  "priority": "HIGH", // Optional: "LOW" | "MEDIUM" | "HIGH" | "URGENT" (default: "MEDIUM")
  "startDate": "2026-10-15T00:00:00.000Z", // Optional (Date string or null)
  "dueDate": "2026-12-31T00:00:00.000Z", // Optional (Date string or null)
  "color": "#3B82F6", // Optional (default: "#3B82F6")
  "icon": "folder" // Optional (default: "folder")
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e7fc",
    "name": "E-Commerce Replatforming",
    "description": "Migrate storefront to Next.js and headless commerce",
    "status": "ACTIVE",
    "priority": "HIGH",
    "startDate": "2026-10-15T00:00:00.000Z",
    "dueDate": "2026-12-31T00:00:00.000Z",
    "color": "#3B82F6",
    "icon": "folder",
    "ownerId": "67530e4b85c2d3a9b1c4e7f8",
    "createdAt": "2026-10-06T17:45:00.000Z",
    "updatedAt": "2026-10-06T17:45:00.000Z"
  }
}
```

---

### 4. `PATCH /api/projects/:id`
Update an existing project's details, status, priority, dates, color, or icon.

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/projects/:id`
- **Auth**: Required (`Bearer <token>` - Owner, Manager, or Admin)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the project
- **Request Body**:
```json
{
  "name": "E-Commerce Replatforming 2.0",
  "description": "Updated project description",
  "status": "ACTIVE", // Optional: "ACTIVE" | "ARCHIVED" | "COMPLETED"
  "priority": "URGENT", // Optional: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  "startDate": "2026-10-20T00:00:00.000Z", // Optional (Date string or null)
  "dueDate": "2027-01-15T00:00:00.000Z", // Optional (Date string or null)
  "color": "#10B981", // Optional
  "icon": "rocket" // Optional
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e7fc",
    "name": "E-Commerce Replatforming 2.0",
    "description": "Updated project description",
    "status": "ACTIVE",
    "priority": "URGENT",
    "startDate": "2026-10-20T00:00:00.000Z",
    "dueDate": "2027-01-15T00:00:00.000Z",
    "color": "#10B981",
    "icon": "rocket",
    "ownerId": "67530e4b85c2d3a9b1c4e7f8",
    "updatedAt": "2026-10-06T17:46:00.000Z"
  }
}
```

---

### 5. `DELETE /api/projects/:id`
Delete project and all associated tasks, comments, activities, and member records.

- **HTTP Method**: `DELETE`
- **Endpoint**: `/api/projects/:id`
- **Auth**: Required (`Bearer <token>` - Project Owner or System Admin)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the project
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Project deleted successfully",
  "data": null
}
```

---

## 👥 9. Project Member APIs

### 1. `GET /api/projects/:projectId/members`
List all members in a project.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/projects/:projectId/members`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Project members retrieved successfully",
  "data": [
    {
      "id": "67530e4b85c2d3a9b1c4e7fe",
      "projectId": "67530e4b85c2d3a9b1c4e7fa",
      "user": {
        "id": "67530e4b85c2d3a9b1c4e7f8",
        "name": "Sarah Connor",
        "email": "admin@taskflow.dev",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        "role": "ADMIN"
      },
      "role": "ADMIN",
      "joinedAt": "2026-10-06T17:40:00.000Z"
    }
  ]
}
```

---

### 2. `POST /api/projects/:projectId/members`
Add a registered user to the project using email or user ID.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/projects/:projectId/members`
- **Auth**: Required (`Bearer <token>` - Manager, Owner, or Admin)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
- **Request Body**:
```json
{
  "email": "member@taskflow.dev", // or "userId": "67530e4b85c2d3a9b1c4e7f9"
  "role": "MEMBER" // Optional: "ADMIN" | "MANAGER" | "MEMBER" (default: "MEMBER")
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Member added to project successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e815",
    "projectId": "67530e4b85c2d3a9b1c4e7fa",
    "user": {
      "id": "67530e4b85c2d3a9b1c4e7f9",
      "name": "Jim Halpert",
      "email": "member@taskflow.dev",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jim",
      "role": "MEMBER"
    },
    "role": "MEMBER",
    "joinedAt": "2026-10-06T17:48:00.000Z"
  }
}
```

---

### 3. `PATCH /api/projects/:projectId/members/:userId`
Update a team member's role within the project.

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/projects/:projectId/members/:userId`
- **Auth**: Required (`Bearer <token>` - Manager, Owner, or Admin)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
  - `userId`: MongoDB ObjectId of the member user
- **Request Body**:
```json
{
  "role": "MANAGER" // "ADMIN" | "MANAGER" | "MEMBER"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member role updated successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e815",
    "projectId": "67530e4b85c2d3a9b1c4e7fa",
    "userId": "67530e4b85c2d3a9b1c4e7f9",
    "role": "MANAGER",
    "joinedAt": "2026-10-06T17:48:00.000Z"
  }
}
```

---

### 4. `DELETE /api/projects/:projectId/members/:userId`
Remove a user from the project.

- **HTTP Method**: `DELETE`
- **Endpoint**: `/api/projects/:projectId/members/:userId`
- **Auth**: Required (`Bearer <token>` - Manager, Owner, or Admin)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
  - `userId`: MongoDB ObjectId of the member user
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member removed from project successfully",
  "data": null
}
```

---

## 👥 9.1 Team Member & Profile APIs

### 1. `GET /api/members`
List team members visible to the authenticated user.
- **Scope**: System administrators can see all members. Other users only see members who share at least one project with them (plus themselves).
- **HTTP Method**: `GET`
- **Endpoint**: `/api/members`
- **Auth**: Required (`Bearer <token>`)
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`, max: `100`)
  - `search`: Case-insensitive search on member name or email
  - `role`: Filter by role (`ADMIN` | `MANAGER` | `MEMBER`)
  - `sortBy`: Field to sort by (`name` | `email` | `joinedAt` | `createdAt`, default: `joinedAt`)
  - `sortOrder`: `asc` | `desc` (default: `asc`)
  - `projectId`: Optional filter to restrict members to a specific authorized project
- **Example Request**: `GET /api/members?search=sarah&role=ADMIN&page=1&limit=10`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Team members retrieved successfully",
  "data": [
    {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Sarah Connor",
      "email": "admin@taskflow.dev",
      "role": "ADMIN",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      "joinedAt": "2026-10-06T17:40:00.000Z",
      "projects": [
        {
          "id": "67530e4b85c2d3a9b1c4e7fa",
          "name": "TaskFlow Web Platform",
          "role": "ADMIN"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. `POST /api/members`
Add or invite a new member directly to the system/workspace without requiring a project ID.
- **Scope**: Administrator or Manager. Only Administrators can assign the `ADMIN` role.
- **HTTP Method**: `POST`
- **Endpoint**: `/api/members`
- **Auth**: Required (`Bearer <token>` — Admin or Manager)
- **Request Body**:
```json
{
  "email": "alex@taskflow.dev",
  "name": "Alex Morgan",          // Optional: generated from email if omitted
  "role": "MEMBER",               // Optional: "ADMIN" | "MANAGER" | "MEMBER" (default: "MEMBER")
  "password": "Temporary123!",    // Optional: defaults to secure default "TaskFlow123!" if omitted
  "projectId": "67530e4b85c2d3a9" // Optional: optionally assign to project immediately
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Member added to system successfully",
  "data": {
    "id": "6ac533440916763fff708006",
    "name": "Alex Morgan",
    "email": "alex@taskflow.dev",
    "role": "MEMBER",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex%40taskflow.dev",
    "joinedAt": "2026-10-10T00:30:00.000Z",
    "status": "ACTIVE"
  }
}
```
- **Error Responses**:
  - `409 Conflict`: User with this email is already registered (`"A user with this email address is already registered in the system."`).
  - `403 Forbidden`: Non-admin trying to assign `ADMIN` role (`"Only administrators can grant the ADMIN role"`).

---

### 3. `GET /api/members/:userId`
Retrieve profile details for a specific member within authorized scope.
- **Scope**: Authenticated users can view their own profile, or profiles of members who share at least one project. System administrators can view any member. Out-of-scope or non-existent members return `404 Not Found`.
- **HTTP Method**: `GET`
- **Endpoint**: `/api/members/:userId`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `userId`: MongoDB ObjectId of the member
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member profile retrieved successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e7f8",
    "name": "Sarah Connor",
    "email": "admin@taskflow.dev",
    "role": "ADMIN",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    "joinedAt": "2026-10-06T17:40:00.000Z",
    "projects": [
      {
        "id": "67530e4b85c2d3a9b1c4e7fa",
        "name": "TaskFlow Web Platform",
        "role": "ADMIN",
        "joinedAt": "2026-10-06T17:40:00.000Z"
      }
    ]
  }
}
```

---

### 4. `PATCH /api/members/:userId`
Update member details (name, role, and/or status).
- **Scope**: Administrator or Manager (or the member updating their own name). Only Administrators can change roles to or from `ADMIN`.
- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/members/:userId`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `userId`: MongoDB ObjectId of the target member
- **Request Body** (all fields optional):
```json
{
  "name": "Alex Morgan",          // Optional: update display name
  "role": "MANAGER",              // Optional: "ADMIN" | "MANAGER" | "MEMBER" (Admin only)
  "status": "ACTIVE",             // Optional: "ACTIVE" | "INACTIVE"
  "projectId": "67530e4b85c2d3a9" // Optional: sync role change to a specific project
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": {
    "id": "6ac533440916763fff708006",
    "name": "Alex Morgan",
    "email": "alex@taskflow.dev",
    "role": "MANAGER",
    "status": "ACTIVE",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex%40taskflow.dev",
    "updatedAt": "2026-10-10T00:35:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Demoting the last active administrator (`"Cannot demote the last active administrator of the system"`).
  - `403 Forbidden`: Non-admin trying to update roles (`"Only administrators can change account roles"`).
  - `404 Not Found`: Member not found.

---

### 5. `PATCH /api/members/:userId/status`
Activate or Inactivate a member directly.
- **Scope**: Administrator or Manager.
- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/members/:userId/status`
- **Auth**: Required (`Bearer <token>` — Admin or Manager)
- **URL Parameters**:
  - `userId`: MongoDB ObjectId of the target member
- **Request Body**:
```json
{
  "status": "INACTIVE" // "ACTIVE" | "INACTIVE"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member status updated to INACTIVE",
  "data": {
    "id": "6ac533440916763fff708006",
    "name": "Alex Morgan",
    "email": "alex@taskflow.dev",
    "role": "MEMBER",
    "status": "INACTIVE",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex%40taskflow.dev",
    "updatedAt": "2026-10-10T00:36:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Attempting to deactivate the last active administrator (`"Cannot deactivate the last active administrator of the system"`).
  - `403 Forbidden`: Insufficient permissions.

---

### 6. `DELETE /api/members/:userId`
Completely remove and delete a member from the system and clean up all their project memberships.
- **Scope**: System Administrator only.
- **HTTP Method**: `DELETE`
- **Endpoint**: `/api/members/:userId`
- **Auth**: Required (`Bearer <token>` — System Admin)
- **URL Parameters**:
  - `userId`: MongoDB ObjectId of the target member
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Member deleted from the system successfully",
  "data": {
    "id": "6ac533440916763fff708006",
    "email": "alex@taskflow.dev"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Attempting to delete oneself (`"Cannot delete your own account from the member list"`) or deleting the last administrator (`"Cannot delete the last administrator of the system"`).
  - `403 Forbidden`: Non-admin trying to delete a member (`"Only administrators can remove members from the system"`).
  - `404 Not Found`: Member does not exist.

---

### 7. 🛡️ Role Management Safeguards & Business Rules
- **Last Administrator Protection**: An administrator cannot be demoted, deactivated, or deleted if they are the last active administrator in the system (`400 Bad Request`).
- **Self-Deletion Protection**: Administrators cannot delete their own account via the member management API (`400 Bad Request`).
- **Privilege Escalation Prevention**: Only administrators can change member roles to or from `ADMIN` (`403 Forbidden`).
- **Cascade Cleanup**: When a member is deleted via `DELETE /api/members/:userId`, all their project memberships (`ProjectMember`) are automatically cleaned up across all projects.
- **Privacy Assurance**: Passwords, bcrypt hashes, reset tokens, and sensitive auth data are strictly excluded from all member responses.

---

## 📝 10. Task APIs

### 1. `GET /api/projects/:projectId/tasks`
List all tasks for a project with filters and pagination (Ideal for Kanban boards or list views).

- **HTTP Method**: `GET`
- **Endpoint**: `/api/projects/:projectId/tasks`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
- **Query Parameters**:
  - `status`: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `assigneeId`: User ID or `"unassigned"`
  - `search`: Search query string
  - `page`: default `1`
  - `limit`: default `20`
  - `sortBy`: default `createdAt`
  - `sortOrder`: `asc` | `desc` (default: `desc`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "id": "67530e4b85c2d3a9b1c4e801",
      "projectId": "67530e4b85c2d3a9b1c4e7fa",
      "title": "Design Kanban Board UI in React",
      "description": "Create responsive drag-and-drop Kanban columns...",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assigneeId": {
        "id": "67530e4b85c2d3a9b1c4e7f9",
        "name": "Jim Halpert",
        "email": "member@taskflow.dev",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jim"
      },
      "creatorId": {
        "id": "67530e4b85c2d3a9b1c4e7f8",
        "name": "Sarah Connor",
        "email": "admin@taskflow.dev",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
      },
      "dueDate": "2026-10-09T17:40:00.000Z",
      "commentCount": 2,
      "createdAt": "2026-10-06T17:40:00.000Z",
      "updatedAt": "2026-10-06T17:40:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. `GET /api/tasks/:id`
Get full details of a single task.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/tasks/:id`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the task
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task details retrieved successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e801",
    "projectId": {
      "id": "67530e4b85c2d3a9b1c4e7fa",
      "name": "TaskFlow Web Platform",
      "status": "ACTIVE"
    },
    "title": "Design Kanban Board UI in React",
    "description": "Create responsive drag-and-drop Kanban columns...",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assigneeId": {
      "id": "67530e4b85c2d3a9b1c4e7f9",
      "name": "Jim Halpert",
      "email": "member@taskflow.dev",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jim"
    },
    "creatorId": { ... },
    "dueDate": "2026-10-09T17:40:00.000Z",
    "commentCount": 2,
    "createdAt": "2026-10-06T17:40:00.000Z",
    "updatedAt": "2026-10-06T17:40:00.000Z"
  }
}
```

---

### 3. `POST /api/projects/:projectId/tasks`
Create a new task in a project.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/projects/:projectId/tasks`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `projectId`: MongoDB ObjectId of the project
- **Request Body**:
```json
{
  "title": "Build Dark Mode Theme Toggle",
  "description": "Add dark mode classes and local storage persistence",
  "status": "TODO", // Optional: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" (default: "TODO")
  "priority": "MEDIUM", // Optional: "LOW" | "MEDIUM" | "HIGH" | "URGENT" (default: "MEDIUM")
  "assigneeId": "67530e4b85c2d3a9b1c4e7f9", // Optional: User ObjectId or null
  "dueDate": "2026-10-15T00:00:00.000Z" // Optional: ISO date string or "YYYY-MM-DD"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e820",
    "projectId": "67530e4b85c2d3a9b1c4e7fa",
    "creatorId": "67530e4b85c2d3a9b1c4e7f8",
    "title": "Build Dark Mode Theme Toggle",
    "description": "Add dark mode classes and local storage persistence",
    "status": "TODO",
    "priority": "MEDIUM",
    "assigneeId": "67530e4b85c2d3a9b1c4e7f9",
    "dueDate": "2026-10-15T00:00:00.000Z",
    "createdAt": "2026-10-06T17:50:00.000Z",
    "updatedAt": "2026-10-06T17:50:00.000Z"
  }
}
```

---

### 4. `PATCH /api/tasks/:id`
Update task attributes (e.g., drag and drop status change, editing assignee, priority, or due date).

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/tasks/:id`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the task
- **Request Body** (provide any fields you want to update):
```json
{
  "status": "DONE", // "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
  "priority": "URGENT", // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  "assigneeId": "67530e4b85c2d3a9b1c4e7f9", // or null to unassign
  "title": "Updated task title",
  "description": "Updated task description",
  "dueDate": "2026-10-20T00:00:00.000Z"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e820",
    "projectId": "67530e4b85c2d3a9b1c4e7fa",
    "title": "Build Dark Mode Theme Toggle",
    "status": "DONE",
    "priority": "URGENT",
    "assigneeId": "67530e4b85c2d3a9b1c4e7f9",
    "updatedAt": "2026-10-06T17:51:00.000Z"
  }
}
```

---

### 5. `DELETE /api/tasks/:id`
Delete a task and its comments.

- **HTTP Method**: `DELETE`
- **Endpoint**: `/api/tasks/:id`
- **Auth**: Required (`Bearer <token>` - Manager, Owner, or Admin)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the task
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task deleted successfully",
  "data": null
}
```

---

## 💬 11. Comment APIs

### 1. `GET /api/tasks/:taskId/comments`
List comments for a specific task.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/tasks/:taskId/comments`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `taskId`: MongoDB ObjectId of the task
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": [
    {
      "id": "67530e4b85c2d3a9b1c4e805",
      "taskId": "67530e4b85c2d3a9b1c4e801",
      "author": {
        "id": "67530e4b85c2d3a9b1c4e7f9",
        "name": "Jim Halpert",
        "email": "member@taskflow.dev",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jim",
        "role": "MEMBER"
      },
      "content": "Progress is looking great! Responsive grid is complete.",
      "createdAt": "2026-10-06T17:40:00.000Z",
      "updatedAt": "2026-10-06T17:40:00.000Z"
    }
  ]
}
```

---

### 2. `POST /api/tasks/:taskId/comments`
Add a comment to a task.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/tasks/:taskId/comments`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `taskId`: MongoDB ObjectId of the task
- **Request Body**:
```json
{
  "content": "PR is up for review: https://github.com/example/repo/pull/12"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e830",
    "taskId": "67530e4b85c2d3a9b1c4e801",
    "author": {
      "id": "67530e4b85c2d3a9b1c4e7f8",
      "name": "Sarah Connor",
      "email": "admin@taskflow.dev",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      "role": "ADMIN"
    },
    "content": "PR is up for review: https://github.com/example/repo/pull/12",
    "createdAt": "2026-10-06T17:52:00.000Z",
    "updatedAt": "2026-10-06T17:52:00.000Z"
  }
}
```

---

### 3. `PATCH /api/comments/:id`
Edit comment content (Only the comment author or Admin can edit).

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/comments/:id`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the comment
- **Request Body**:
```json
{
  "content": "Updated PR link: https://github.com/example/repo/pull/13"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e830",
    "taskId": "67530e4b85c2d3a9b1c4e801",
    "content": "Updated PR link: https://github.com/example/repo/pull/13",
    "updatedAt": "2026-10-06T17:53:00.000Z"
  }
}
```

---

### 4. `DELETE /api/comments/:id`
Delete a comment (Only the comment author or Admin can delete).

- **HTTP Method**: `DELETE`
- **Endpoint**: `/api/comments/:id`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the comment
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": null
}
```

---

## 🔔 12. Notification APIs

### 1. `GET /api/notifications`
List notifications for the logged-in user.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/notifications`
- **Auth**: Required (`Bearer <token>`)
- **Query Parameters**:
  - `page`: default `1`
  - `limit`: default `20`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "67530e4b85c2d3a9b1c4e809",
        "userId": "67530e4b85c2d3a9b1c4e7f9",
        "type": "TASK_ASSIGNED",
        "message": "You were assigned to task \"Design Kanban Board UI in React\".",
        "isRead": false,
        "createdAt": "2026-10-06T17:40:00.000Z"
      }
    ],
    "unreadCount": 1
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 2. `PATCH /api/notifications/:id/read`
Mark a single notification as read.

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/notifications/:id/read`
- **Auth**: Required (`Bearer <token>`)
- **URL Parameters**:
  - `id`: MongoDB ObjectId of the notification
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "67530e4b85c2d3a9b1c4e809",
    "userId": "67530e4b85c2d3a9b1c4e7f9",
    "type": "TASK_ASSIGNED",
    "message": "You were assigned to task \"Design Kanban Board UI in React\".",
    "isRead": true,
    "createdAt": "2026-10-06T17:40:00.000Z"
  }
}
```

---

### 3. `PATCH /api/notifications/read-all`
Mark all unread notifications as read for current user.

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/notifications/read-all`
- **Auth**: Required (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 4
  }
}
```

---

## 📊 13. Dashboard API

### `GET /api/dashboard`
Returns complete metrics, task counts by status, priority breakdown, upcoming deadlines, and recent activities.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/dashboard`
- **Auth**: Required (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "overview": {
      "totalProjects": 3,
      "totalTasks": 6,
      "myTasksCount": 3,
      "completedTasksCount": 1
    },
    "tasksByStatus": {
      "TODO": 2,
      "IN_PROGRESS": 2,
      "IN_REVIEW": 1,
      "DONE": 1
    },
    "tasksByPriority": {
      "LOW": 1,
      "MEDIUM": 2,
      "HIGH": 2,
      "URGENT": 1
    },
    "recentActivities": [
      {
        "id": "67530e4b85c2d3a9b1c4e807",
        "action": "TASK_STATUS_CHANGED",
        "metadata": {
          "taskTitle": "Integrate JWT Authentication with Axios",
          "oldStatus": "IN_REVIEW",
          "newStatus": "DONE"
        },
        "userId": {
          "id": "67530e4b85c2d3a9b1c4e7f9",
          "name": "Jim Halpert",
          "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jim"
        },
        "projectId": {
          "id": "67530e4b85c2d3a9b1c4e7fa",
          "name": "TaskFlow Web Platform"
        },
        "createdAt": "2026-10-06T17:40:00.000Z"
      }
    ],
    "upcomingTasks": [
      {
        "id": "67530e4b85c2d3a9b1c4e803",
        "title": "Conduct Code Review for Project APIs",
        "dueDate": "2026-10-08T17:40:00.000Z",
        "projectId": {
          "id": "67530e4b85c2d3a9b1c4e7fa",
          "name": "TaskFlow Web Platform"
        },
        "assigneeId": {
          "id": "67530e4b85c2d3a9b1c4e7f8",
          "name": "Sarah Connor"
        }
      }
    ],
    "activeProjects": [
      {
        "id": "67530e4b85c2d3a9b1c4e7fa",
        "name": "TaskFlow Web Platform",
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

## 🛠️ 14. Running Locally & Commands

```bash
# Navigate to backend directory
cd taskflow-backend

# Install dependencies
npm install

# Seed demo data with sample accounts and tasks
npm run seed

# Run the development server (auto-reloads on edits)
npm run dev

# Run TypeScript compilation build
npm run build

# Start production server
npm start
```
