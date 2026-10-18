# AnimeVerse

An anime discovery platform where users can search for anime, view detailed
information, create an account, log in securely, and save favorite anime to
their own account.

## Tech stack

- React 19 + Vite
- React Router DOM
- Firebase Authentication (email/password) + Firestore (favorites storage)
- Jikan REST API (https://api.jikan.moe) via Axios

## Getting started

```bash
npm install
npm run dev
```

### Environment variables

Create a `.env` file in the project root (never commit this file) with your
Firebase project's web config:

```
VITE_FIREBASE_API_KEY=AIzaSyACflUcHAAOjemMIROQ9AFygdY3DET1yMQ
VITE_FIREBASE_AUTH_DOMAIN=animeverse-97b32.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://animeverse-97b32-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=animeverse-97b32
VITE_FIREBASE_STORAGE_BUCKET=animeverse-97b32.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=917115972934
VITE_FIREBASE_APP_ID=1:917115972934:web:ac19c3da3f6744195dc947
VITE_FIREBASE_MEASUREMENT_ID=G-YL1WGDN74C
```

### Firestore security rules

Favorites are stored at `users/{uid}/favorites/{animeId}`. Apply this rule in
the Firebase console (Firestore → Rules) so each user can only read/write
their own favorites:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/favorites/{favoriteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Available scripts

- `npm run dev` — start the local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Project structure

```
src/
  components/   reusable UI components (cards, states, layout)
  pages/        route-level page components
  services/     API/Firestore access + data-mapping helpers
  hooks/        reusable hooks (auth, favorites)
  context/      React context providers
  firebase/     Firebase app initialization
```



...............Prompts Used.............

Master Project Prompt (PRD)

You can use this as your first prompt before beginning development.

You are an expert React Frontend Engineer acting as my AI development assistant.

We are building a production-quality React application called AnimeVerse. The goal is to demonstrate AI-assisted software development while ensuring that all architecture, implementation, and code quality follow professional standards.

Project Overview
----------------
AnimeVerse is an anime discovery platform where users can search for anime, view detailed information, create an account, log in securely, and save favourite anime to their own account.

The application should be inspired by a movie application but must be independently designed and implemented.

Tech Stack
----------
- React 19
- Vite
- React Router DOM
- Firebase Authentication
- Firebase Firestore
- Jikan REST API (https://api.jikan.moe)
- Axios
- CSS Modules or plain CSS (No Tailwind)
- React Hooks
- Functional Components

General Requirements
--------------------
- Write clean, modular, maintainable code.
- Use reusable components.
- Follow React best practices.
- Keep business logic separate from UI.
- Never generate unnecessarily large components.
- Explain every generated file briefly.
- Use meaningful folder names.
- Add comments only where they improve readability.
- Follow consistent naming conventions.
- Handle loading states.
- Handle API errors gracefully.
- Handle empty search results.
- Ensure responsive design.

Folder Structure
----------------

src/

components/
pages/
services/
hooks/
context/
firebase/
styles/
assets/

Application Features
--------------------

Authentication
- Register account
- Login
- Logout
- Protected Routes
- Firebase Authentication
- Persist login session

Anime Search
- Search anime using Jikan API
- Display cards
- Poster
- Rating
- Score
- Episodes
- Status

Anime Details
- Large image
- Synopsis
- Genres
- Studios
- Trailer
- Characters
- Score
- Rank
- Airing status

Favorites
- Save favourites
- Remove favourites
- Store favourites inside Firestore
- Each user only accesses their own favourites

Routing
- Home
- Search
- Details
- Favorites
- Login
- Register
- Profile
- 404 Page

Navbar
- Logo
- Search
- Favorites
- Login/Logout
- Responsive menu

Firebase
---------
Authentication:
- Email/password

Firestore:
users/{uid}/favorites

Each favourite should store:
- animeId
- title
- image
- score
- timestamp

API
---
Use Axios.

Create one dedicated service file for API requests.

Never place API logic inside React components.

UI Requirements
---------------
Modern anime-inspired UI.

Dark Theme.

Primary:
#6C63FF

Background:
#0F172A

Cards:
#1E293B

Accent:
#F43F5E

Text:
#F8FAFC

Rounded cards.

Hover animations.

Responsive grid.

Loading spinner.

Nice transitions.

AI Collaboration Rules
----------------------
Whenever generating code:
- Explain why the implementation was chosen.
- Mention possible improvements.
- Avoid generating unnecessary complexity.
- Follow reusable component architecture.
- Keep files reasonably sized.

Do not generate the entire application at once.

Wait for my next prompt before implementing each feature.
Step-by-Step Prompt Plan

This is what I'd actually submit as the prompts used during development.

Phase 1 – Project Setup
Prompt 1
Create a new React project called AnimeVerse using Vite.

Configure the folder structure for scalability.

Install:
- React Router DOM
- Axios
- Firebase

Create a clean folder structure suitable for medium-sized React applications.

Explain each folder after generating the code.

Do not implement any application features yet.
Prompt 2
Configure React Router.

Create placeholder pages for:

- Home
- Search
- Anime Details
- Favorites
- Login
- Register
- Profile
- NotFound

Add routing using BrowserRouter.

Do not style the pages yet.
Phase 2 – Firebase
Prompt 3
Help me create a Firebase project.

Explain exactly what needs to be created inside Firebase Console.

Then generate firebase.js using Firebase Authentication and Firestore.

Do not implement authentication yet.
Prompt 4
Implement Firebase Authentication.

Requirements:

- Register
- Login
- Logout
- Persist authentication

Use Context API.

Create:

AuthContext

ProtectedRoute

Custom Hook

Do not style forms yet.

Explain each file.
Phase 3 – UI
Prompt 5
Create a modern responsive navigation bar.

Requirements:

Logo

Home

Favorites

Profile

Login

Logout

Desktop and Mobile support.

Do not use Tailwind.

Use plain CSS.
Prompt 6
Design a reusable AnimeCard component.

Card should display:

Poster

Title

Score

Episodes

Status

Favourite Button

Hover Animation

Responsive design

No API integration yet.
Phase 4 – API
Prompt 7
Create an Axios service for the Jikan API.

Implement functions:

searchAnime()

getAnimeDetails()

getTopAnime()

getSeasonalAnime()

Explain why the service pattern is beneficial.
Prompt 8
Implement anime search.

Requirements:

Search bar

Loading state

Error handling

Display AnimeCard components

Responsive grid

No favourites yet.
Phase 5 – Details
Prompt 9
Create the Anime Details page.

Display:

Poster

Synopsis

Genres

Studios

Score

Episodes

Trailer

Characters

Status

Use React Router params.
Phase 6 – Firestore
Prompt 10
Implement favourite functionality.

Requirements:

Logged in users can add favourites.

Guests are redirected to Login.

Store favourites inside Firestore.

Create reusable Firestore service functions.

Handle loading and errors.
Prompt 11
Create the Favorites page.

Display all favourite anime belonging only to the logged in user.

Allow removing favourites.

Handle empty state.
Phase 7 – Profile
Prompt 12
Create the Profile page.

Display:

User email

Account creation date

Number of favourites

Logout button

Responsive layout.
Phase 8 – Polish
Prompt 13
Improve the application's UI.

Requirements:

Dark theme

Smooth hover animations

Responsive layouts

Loading spinner

Empty state

Error state

Nice typography

Consistent spacing

Do not change application functionality.
Prompt 14
Review the entire React application like a senior frontend engineer.

Identify:

Duplicate code

Performance issues

React anti-patterns

Accessibility improvements

Possible refactoring

Suggest improvements before making changes.

After approval, implement the improvements.
Phase 9 – Final Review
Prompt 15
Review the entire project.

Check:

Folder structure

Code quality

Naming conventions

Unused code

Accessibility

Responsive design

Performance



Generate a final checklist before deployment.