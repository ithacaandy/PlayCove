# PlayCove

PlayCove is a local family connection platform designed to help parents discover nearby families, join groups, and organize playdate-style events in a simple, friendly app experience.

## Overview

The project is built as a modern web app with a focus on:

- family-friendly community discovery
- lightweight event creation and RSVPs
- profile identity with avatars
- group-based connection and participation
- push notification support for timely updates

PlayCove is currently in active development.

## Features

### Authentication

- Email/password sign in and account creation
- Supabase Auth integration
- Email confirmation flow
- Profile row creation during signup

### Profiles

- Account page with editable profile details
- Avatar upload with Supabase Storage
- Fields for:
  - full name
  - city
  - kid ages
- Avatar preview and fallback initials

### Events and Groups

- Event and RSVP data model in place
- Group and invite support
- Foundation for social identity across events

### Notifications

- Web Push support with VAPID keys
- Push subscription infrastructure in progress

### UI Foundation

- Next.js App Router
- Tailwind CSS
- Design tokens defined in `app/globals.css`
- Mobile-friendly card-based interface

## Tech Stack

- Next.js
- Supabase
- Tailwind CSS
- JavaScript

## Project Structure

```text
app/          App Router pages, layouts, and UI
lib/          Shared utilities and client helpers
public/       Static assets
scripts/      Utility scripts
supabase/     Supabase-related setup and resources
docs/         Archived notes and project docs
```

## Current Design Direction

PlayCove uses a warm, friendly visual system built around soft neutrals and sunny accents.

Core design tokens currently include:

- sunshine
- cream
- ink
- accent
- clay tones

These are managed in:

```text
app/globals.css
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local environment file

Create a file named:

```text
.env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

### 3. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment Notes

- `.env.local` is for local development only and should not be committed
- `.env.local.example` can be used as a template
- `.next` and other generated files should remain gitignored

## Current Status

Active prototype / in development.

Recent work has included:

- account page improvements
- avatar upload flow
- profile editing
- signup profile creation
- auth UI cleanup
- repo structure cleanup

## Next Priorities

Planned next steps include:

- more robust first-login profile creation
- clearer event identity with avatars and names
- profile completeness prompts
- better creator identity on events
- push notifications for event and RSVP activity

## Notes

This repo is an actively evolving product prototype. Some features are still being refined, and the app structure may continue to change as the product direction develops.

## License

No license has been added yet.