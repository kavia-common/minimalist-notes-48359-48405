# Minimalist Notes (React)

A modern, minimal note-taking UI built with Create React App and styled to the Ocean Professional theme.

## Features
- Create, edit, delete notes
- Search/filter notes
- Smooth transitions, rounded surfaces, subtle gradients
- Responsive layout (single column on mobile)
- Local persistence (localStorage) when no backend is configured
- Optional backend support via environment variables

## Environment Variables
The app reads the following Create React App environment variables:

- REACT_APP_API_BASE: Base URL of the backend (e.g., https://api.example.com). If set, the app will use `${REACT_APP_API_BASE}/notes` endpoints.
- REACT_APP_BACKEND_URL: Alternative to REACT_APP_API_BASE. If both are set, REACT_APP_API_BASE takes precedence.
- REACT_APP_FRONTEND_URL, REACT_APP_WS_URL, REACT_APP_NODE_ENV, REACT_APP_NEXT_TELEMETRY_DISABLED, REACT_APP_ENABLE_SOURCE_MAPS, REACT_APP_PORT, REACT_APP_TRUST_PROXY, REACT_APP_LOG_LEVEL, REACT_APP_HEALTHCHECK_PATH, REACT_APP_FEATURE_FLAGS, REACT_APP_EXPERIMENTS_ENABLED: Present for completeness; not explicitly consumed by this app.

If neither REACT_APP_API_BASE nor REACT_APP_BACKEND_URL is set, the app will gracefully fall back to localStorage for all data.

## Local Development

- npm start
- The preview system expects the app to run at http://localhost:3000

## Expected Backend Shape (Optional)
If a backend is configured, the app expects:
- GET {API_BASE}/notes -> 200 JSON array of notes
- POST {API_BASE}/notes -> 201 created note JSON
- PUT {API_BASE}/notes/:id -> 200 updated note JSON
- DELETE {API_BASE}/notes/:id -> 204/200

Note model:
```
{
  id: string,
  title: string,
  content: string,
  createdAt?: string,
  updatedAt?: string
}
```

## Theme
Ocean Professional color palette:
- Primary: #2563EB
- Secondary: #F59E0B
- Error: #EF4444
- Background: #f9fafb
- Surface: #ffffff
- Text: #111827

## Testing
- npm test

## Build
- npm run build
