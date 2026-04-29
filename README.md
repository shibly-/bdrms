# BDRMS Monorepo

LPG Reticulation Billing System scaffold with role-based architecture.

## Stack

- Frontend: Next.js (React 19) + Tailwind CSS + Lucide icons
- Backend: NestJS modular architecture
- Database: PostgreSQL + Drizzle ORM
- Auth: JWT + RBAC (`admin`, `staff`, `user`)

## Workspace

- `apps/web`: Next.js role portals and UI scaffold
- `apps/api`: NestJS API modules (auth/admin/billing/management)
- `packages/shared`: shared role and billing types

## RBAC policy

- Admin can manage users/staff/system-config
- Staff and Admin can generate bills and view monthly reports
- Standard User can access personal dashboard endpoints (to be expanded)

## Billing logic

Implemented in `apps/api/src/billing/billing.service.ts`:

- `usageQuantity = currentReading - (previousReading ?? 0)`
- `totalBill = usageQuantity * unitPrice`
- OCR extraction method is scaffolded as a service placeholder

## Quick start

```bash
npm install
npm run dev:api
npm run dev:web
```

## Environment

- API env template: `apps/api/.env.example`
- Web env template: `apps/web/.env.example`

## Database

Drizzle schema is defined in `apps/api/src/database/schema.ts`.

Generate migrations:

```bash
npm run db:generate -w api
```

Default admin (after schema exists and `DATABASE_URL` points at that database): username `admin`, password `admin123`.

```bash
npm run seed:admin -w api
```

---

By A S M Abdur Rab, Email: shibly.dhk@gmail.com, LinkedIn: https://www.linkedin.com/in/shibly/

## Technology Stack Icons

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge)](https://orm.drizzle.team/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
