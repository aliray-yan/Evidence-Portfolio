# Cyber Portfolio CMS

Professional cybersecurity portfolio platform with a content management system.

## Live Demo
https://cyber-portfolio-cms.vercel.app/

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Deployed on Vercel

## Current Phase
Phase 1 — Deployed Skeleton

## Planned Phases
- Phase 2: UI Development
- Phase 3: Database Integration
- Phase 4: Authentication
- Phase 5: CMS Functionality
- Phase 6: Polish & Launch

## Local Development

```bash
git clone [repo-url]
cd cyber-portfolio-cms
npm install
cp .env.example .env.local
npm run dev
```

## Project Structure

```
app/
  (public)/          -> All visitor-facing routes (about, projects, certifications, skills, blog, contact)
  (auth)/            -> Login route
  (dashboard)/       -> All admin routes
  health/            -> Server-side health check page
  page.tsx           -> Home page (resolves to /)

components/
  layout/            -> Navbar, Footer, DashboardSidebar
  ui/                -> Generic reusable components (PlaceholderBanner)

lib/
  constants.ts       -> Site-wide constants and nav links
```

## Author
Ali Rayyan
