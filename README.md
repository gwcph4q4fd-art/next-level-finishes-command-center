# Next Level Finishes AI Command Center

Full-stack web app for Next Level Finishes, a painting, cabinet, deck refinishing, drywall/trim, and light remodeling business in Titusville, PA.

The first deployment uses mock/read-only data so the public URL can be live before customer, accounting, scheduling, and messaging integrations are connected.

## Current Modules

- Dashboard with today’s schedule, lead follow-ups, unpaid invoices/deposits, bills, cash summary, weekly goal progress, and recommended actions.
- Lead Inbox with manual lead creation and status tracking.
- AI Reply Drafting endpoint with draft-only safety behavior.
- Estimate Writer for painting, cabinet painting, deck staining, exterior painting, drywall/trim, bathroom, and kitchen projects.
- Schedule view for jobs, estimates, and reminders.
- Daily Briefing generated from mock/read-only data.
- Integration placeholder page for QuickBooks, Jobber, Meta leads, website leads, and Twilio SMS.

## Safety Rules

- No automatic texts or emails.
- No automatic financial changes.
- No automatic QuickBooks changes.
- No automatic Jobber changes.
- Draft first, approve second.
- AI-generated drafts are designed to be logged before use.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## Environment Variables

Copy `.env.example` to `.env.local` for local work.

- `DATABASE_URL`: PostgreSQL or Supabase database URL. Not required for the current mock-data UI.
- `OPENAI_API_KEY`: Optional for real AI replies. If omitted, the app uses safe local mock drafts.
- `NEXT_PUBLIC_APP_URL`: Public app URL after deployment.
- `AUTH_SECRET`: Required for private access. Generate with `node scripts/generate-auth.mjs "your password"`.
- `ADMIN_PASSWORD_HASH`: Required for private access. Generate with `node scripts/generate-auth.mjs "your password"`.
- `JOBBER_CLIENT_ID`: Jobber developer app client ID.
- `JOBBER_CLIENT_SECRET`: Jobber developer app client secret.

## Authentication

The command center is protected by a password login and signed HTTP-only session cookie. Generate the required Vercel environment variables with:

```bash
node scripts/generate-auth.mjs "your admin password"
```

Add the printed `AUTH_SECRET` and `ADMIN_PASSWORD_HASH` values to Vercel before using the deployed app.

## Jobber Setup

Create a Jobber developer app, add the redirect URI shown on the Integrations page, then add `JOBBER_CLIENT_ID` and `JOBBER_CLIENT_SECRET` to Vercel. The initial Jobber integration uses OAuth authorization and only implements read-only connection setup.

## Deployment Target

Vercel is the intended first deployment target. The default Vercel settings for a Next.js app are enough:

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.next`
