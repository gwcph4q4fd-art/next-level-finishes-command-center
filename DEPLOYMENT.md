# Deployment Notes

## Goal

Get a public Vercel URL working before adding more integrations or features.

## Current Deployment State

The app builds without requiring live database access or an OpenAI key. It can deploy publicly with mock data first.

## Required Accounts and Permissions

To deploy from this machine, Codex needs one of these paths:

1. GitHub access:
   - Permission to create a new GitHub repository, or the URL of an empty repository you created.
   - Permission to push this local Git repository to that GitHub repo.

2. Vercel access:
   - Permission to log in to Vercel with the CLI, or a Vercel token.
   - Permission to create a Vercel project under your personal account or selected team.
   - Permission to connect/import the GitHub repository.

## Environment Variables for First Public Deployment

Only this one is recommended immediately after the Vercel URL exists:

```text
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

These can wait until the integrations are ready:

```text
DATABASE_URL=
OPENAI_API_KEY=
```

## First Deploy Checklist

1. Commit the current app.
2. Push to GitHub.
3. Import the GitHub repo into Vercel.
4. Deploy with default Next.js settings.
5. Confirm the public URL loads the dashboard.

