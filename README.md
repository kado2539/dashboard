# BI PTOTOTYPE

Local BI prototype (backend + frontend).

Quick start

1. Copy `.env.example` to `.env` and fill DB creds for MySQL.
2. Start backend:

```powershell
cd backend
npm install
node scripts/seed.js
npm start
```

3. Start frontend:

```powershell
cd frontend
npm install
npm start
```

Notes

- Seed script will create sample tables and data for local testing.
- Admin panel available at `/admin` (requires an admin user created by the seed script).
