# TaskFlow

A full-stack task management application built with **Vue 3** (frontend) and **Django REST Framework** (backend).

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

---

## Running the Backend

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your values

# 4. Apply migrations
python manage.py migrate

# 5. Start the development server
python manage.py runserver
```

The API will be available at `http://localhost:8000`.

---

## Running the Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app will open at `http://localhost:5173`.

The Vite dev server proxies all `/api` requests to `http://localhost:8000`, so no CORS issues during development.

---

## Required Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key — use a long random string in production |
| `DEBUG` | `True` for development, `False` for production |
| `OPENROUTER_API_KEY` | API key from [openrouter.ai](https://openrouter.ai) for AI features |

---

## Running Tests

```bash
# Backend tests
python manage.py test
```

---

## Design Decisions & Justifications

### AI Feature — Subtask Breakdown

The AI feature generates a concrete, numbered list of subtasks for any given task. This was chosen because it directly addresses the core use case of a task manager: helping users break down complex work into actionable steps. The prompt is scoped to the task's title, description, status, and due date, making suggestions contextually relevant. The `mistralai/mistral-7b-instruct` model via OpenRouter provides a fast, cost-effective solution with good instruction-following for this structured output.

### Custom Action — `/complete/`

The `POST /api/tasks/{id}/complete/` endpoint was added as a custom DRF action (rather than a plain PATCH) for semantic clarity: it atomically sets `status = "done"` and records `completed_at = now()`. This separation of concerns prevents clients from manually setting `completed_at` to an arbitrary value and makes the intent explicit in the API contract.

### UI Library — PrimeVue with Aura Theme

PrimeVue v4 with the Aura preset was chosen for:
- **Comprehensive component set**: DataTable, Drawer, DatePicker, Dialog, Tag, Paginator, etc. cover all UI requirements out of the box.
- **CSS-variable-based theming**: The Aura preset uses design tokens, making it trivial to customize or switch to dark mode.
- **Vue 3 native**: Built for the Composition API with full TypeScript support.

### Token Storage Strategy

- **Access token**: Stored in Pinia reactive state (in-memory) only. Never written to localStorage or cookies. This limits XSS exposure — if a script injects, it cannot persist the token across page loads.
- **Refresh token**: Stored in `localStorage`. This enables silent re-authentication when the user opens a new tab or refreshes the page (`hydrate()` is called on every protected route navigation). The trade-off (localStorage is readable by JS) is accepted because the refresh token has a limited 7-day lifetime and will be rotated on each use (SimpleJWT `ROTATE_REFRESH_TOKENS = True`).
- **Axios interceptor**: Handles 401 responses by transparently refreshing the access token and replaying the original request. A queue prevents multiple concurrent refresh attempts (single-flight pattern).

### URL-Synchronized Filters

Dashboard filters (status, search, due date range, page) are synced to the URL query string via `router.replace()`. This means:
- Refreshing the page preserves the current filter state.
- Users can share/bookmark filtered views.
- Browser back/forward navigation works as expected.

---

## What Would Be Improved With More Time

1. **End-to-end tests** using Playwright — covering the full register → create → filter → AI suggest flow.
2. **Optimistic UI updates** — tasks update immediately in the list before the server confirms, with rollback on error.
3. **Dark mode toggle** — the Aura theme supports it natively via `.dark` class; just needs a toggle button in the navbar.
4. **Task ordering via drag-and-drop** — PrimeVue's `OrderList` or a library like `vuedraggable` would work well here.
5. **Websocket / SSE for real-time updates** — useful if multiple users collaborate or if tasks are updated externally.
6. **Pagination with infinite scroll** — as an alternative to the current page-based pagination for better mobile UX.
7. **httpOnly cookie for refresh token** — move from localStorage to a `Set-Cookie: HttpOnly; Secure; SameSite=Strict` cookie served by the backend for stronger XSS protection.
8. **Rate limiting on the backend** — add `django-ratelimit` to the AI endpoint and auth endpoints.
