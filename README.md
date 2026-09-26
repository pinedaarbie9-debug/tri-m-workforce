# Paano i-setup ang MySQL Backend (phpMyAdmin) + i-fix ang frontend

## 1. I-import ang database schema
1. Buksan ang phpMyAdmin, gumawa ng database (o gamitin yung `workforce_db` na nasa `schema.sql`)
2. Piliin ang database → tab na **SQL** → i-paste ang buong laman ng `backend/schema.sql` → **Go**

## 2. I-setup ang Express backend
```bash
cd backend
npm install
copy .env.example .env        (Windows)  /  cp .env.example .env   (Mac/Linux)
```
Buksan ang `.env` at ilagay ang tamang DB credentials mo (kadalasan `DB_USER=root`, `DB_PASSWORD=` kung XAMPP/Laragon default).

### Gumawa ng password para sa admin account
```bash
node scripts/hash-password.js "yourpassword"
```
Kopyahin yung output (magsisimula sa `$2b$10$...`), tapos sa phpMyAdmin, patakbuhin:
```sql
UPDATE users SET password_hash = '<paste dito>' WHERE email = 'admin@workforce.io';
```

### Patakbuhin ang server
```bash
npm run dev
```
Dapat makita mo: `✅ Workforce API running sa http://localhost:4000/api`

## 3. I-verify na tama ang VITE_API_URL sa frontend
Sa root ng React project mo (hindi sa `backend`), gumawa/i-check ang `.env`:
```
VITE_API_URL=http://localhost:4000/api
```

## 4. Ilipat ang mga refactored pages
Ang mga file sa `frontend-pages/` folder ay palitan (overwrite) ang kaparehong file sa `src/app/`:

| Kopyahin mula sa                        | Palitan sa                                  |
|------------------------------------------|----------------------------------------------|
| `frontend-pages/Attendance.tsx`           | `src/app/pages/Attendance.tsx`                |
| `frontend-pages/Employees.tsx`            | `src/app/pages/Employees.tsx`                 |
| `frontend-pages/Dashboard.tsx`            | `src/app/pages/Dashboard.tsx`                 |
| `frontend-pages/LeaveManagement.tsx`      | `src/app/pages/LeaveManagement.tsx`           |
| `frontend-pages/AuditLogs.tsx`            | `src/app/pages/AuditLogs.tsx`                 |
| `frontend-pages/Biometric.tsx`            | `src/app/pages/Biometric.tsx`                 |
| `frontend-pages/AuthContext.tsx`          | `src/app/context/AuthContext.tsx`             |

**Hindi na kailangan galawin** ang mga sumusunod dahil static/mock data pa rin ang gamit nila
(walang error dahil hindi sila umaasa sa `supabase`) — gagana ang mga ito, pero placeholder data lang
ang laman hangga't hindi mo pa sila kinokonekta sa `api.ts`:
`Login.tsx`, `Notifications.tsx`, `Reports.tsx`, `Settings.tsx`, `ShiftScheduling.tsx`,
`Timesheets.tsx`, `UserManagement.tsx`, `Departments.tsx`.

## 5. Patakbuhin ang frontend
```bash
npm run dev
```
Mag-login gamit ang `admin@workforce.io` / yung password na ni-hash mo sa Step 2.

## Mahalagang paalala tungkol sa "Realtime"
Dahil MySQL/phpMyAdmin ang gamit mo (hindi Supabase), walang built-in realtime (WebSocket) na
konektado. Kaya sa halip na `.channel().on("postgres_changes"...)`, gumagamit na lang ang mga
refactored pages ng **polling** (auto-refetch every 15–20 seconds) para "parang" real-time pa rin
ang datos na nakikita ng user. Kung gusto mo talaga ng tunay na realtime sa hinaharap, kakailanganin
mo ng Socket.IO o Server-Sent Events sa Express backend mo.

## Kung may error ka pa rin
1. Tignan ang terminal ng `npm run dev` sa backend — doon lalabas ang MySQL connection errors
   (halimbawa: mali ang DB_PASSWORD, o hindi pa naka-import ang schema).
2. Tignan ang Network tab sa DevTools ng browser — titignan mo kung tumatawag talaga papunta sa
   `http://localhost:4000/api/...` at kung anong response code ang bumabalik (401 = mali ang token/
   walang laman ang users table; 500 = SQL error, tignan yung backend terminal).
