# 🎙️ Voice-Based Billing System

A full-stack billing system with voice recognition powered by Hugging Face AI.

## 🛠️ Prerequisites

Make sure the following are installed on your laptop:

- [Node.js](https://nodejs.org/) (v18 or above)
- [Git](https://git-scm.com/)
- A MongoDB connection (MongoDB Atlas cloud URI recommended)
- A [Hugging Face](https://huggingface.co/settings/tokens) account (for AI token)

---

## 🚀 Setup & Run (Step by Step)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/DharmikRavat/voice-based-billing-system.git
cd voice-based-billing-system
```

---

### Step 2 — Setup the Backend

```bash
cd backend
```

**Install dependencies:**
```bash
npm install
```

**Create your `.env` file:**
```bash
copy .env.example .env
```

**Open `.env` and fill in your values:**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
GST_RATE=0.05
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
HF_TOKEN=your_huggingface_token_here
```

> 💡 Get MongoDB URI from [MongoDB Atlas](https://cloud.mongodb.com)
> 💡 Get HF_TOKEN from [Hugging Face Tokens](https://huggingface.co/settings/tokens)

**Seed the database (optional - adds menu items):**
```bash
npm run seed
```

**Start the backend server:**
```bash
npm run dev
```

> ✅ Backend runs at: http://localhost:5000

---

### Step 3 — Setup the Frontend

Open a **new terminal** and run:

```bash
cd fronted
```

**Install dependencies:**
```bash
npm install
```

**Create your `.env` file:**
```bash
copy .env.example .env
```

The `.env` should contain:
```env
VITE_API_URL=http://localhost:5000
```

**Start the frontend:**
```bash
npm run dev
```

> ✅ Frontend runs at: http://localhost:5173

---

## 📁 Project Structure

```
voice-based-billing-system/
├── backend/          # Node.js + Express API
│   ├── controllers/  # Route controllers
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   ├── services/     # Business logic & AI services
│   ├── middleware/   # Auth & validation middleware
│   ├── seed/         # Database seeding scripts
│   └── server.js     # Entry point
│
├── fronted/          # React + Vite frontend
│   ├── src/          # React components & pages
│   └── index.html
│
└── docs/             # Project documentation
```

---

## 🧪 Running Tests

**Backend tests:**
```bash
cd backend
npm test
```

**Frontend tests:**
```bash
cd fronted
npm test
```

---

## ⚠️ Notes

- Never commit your `.env` file — it is already in `.gitignore`
- Both servers must be running at the same time for the app to work
- Backend runs on port `5000`, Frontend on port `5173`
