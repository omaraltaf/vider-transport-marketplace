# Vider Frontend

React-based frontend for the Vider transport marketplace platform.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query (React Query)** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible UI components

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (routes)
├── hooks/          # Custom React hooks
├── services/       # API services and external integrations
├── contexts/       # React contexts (Auth, etc.)
├── lib/            # Library configurations (React Query, etc.)
├── types/          # TypeScript type definitions
└── assets/         # Static assets (images, fonts, etc.)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Key Features

### Authentication

The app uses JWT-based authentication with tokens stored in localStorage. The `AuthContext` provides authentication state throughout the app.

### API Client

Centralized API client in `services/api.ts` handles all HTTP requests with automatic token injection.

### React Query

Server state is managed with TanStack Query (React Query) for efficient caching, background updates, and optimistic updates.

### Form Handling

Forms use React Hook Form with Zod validation for type-safe form handling and validation.

### Routing

React Router v6 handles client-side routing with protected routes for authenticated pages.

## Development Guidelines

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Use `ProtectedRoute` wrapper if authentication is required

### Adding a New API Service

1. Create service file in `src/services/`
2. Use the `apiClient` for HTTP requests
3. Define TypeScript types in `src/types/`

### Creating Custom Hooks

1. Create hook file in `src/hooks/`
2. Follow React hooks naming convention (`use*`)
3. Export hook as named export

## Next Steps

- Implement authentication UI (Task 23)
- Create navigation and layout components (Task 24)
- Build company profile management (Task 25)
- Develop listing management features (Tasks 26-27)
- Implement search and filtering (Task 28)
