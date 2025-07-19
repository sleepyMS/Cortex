# Copilot Instructions for Cortex

## Overview
Cortex is a platform designed to simplify investment strategies by leveraging data-driven insights, community sharing, and automated trading. The project is structured into distinct frontend and backend components, each with its own responsibilities and technologies.

### Key Components
- **Frontend**: Built with Next.js, React, and TypeScript. It includes reusable UI components, domain-specific features, and internationalization support.
- **Backend**: Developed using FastAPI and Python. It handles database interactions, authentication, and business logic.
- **Database**: Uses PostgreSQL, TimescaleDB, and Redis for data storage and caching.
- **Deployment**: Dockerized for containerized deployment, with Vercel and AWS as hosting options.

## Developer Workflows

### Setting Up the Project
1. Clone the repository:
   ```bash
   git clone https://github.com/sleepyMS/Cortex.git
   cd Cortex
   ```
2. Follow the setup instructions in the respective `README.md` files for the frontend and backend.

### Running the Frontend
- Start the development server:
  ```bash
  npm run dev
  ```
- Access the app at [http://localhost:3000](http://localhost:3000).

### Running the Backend
- Use the provided `docker-compose.yml` to start the backend services:
  ```bash
  docker-compose up
  ```

### Testing
- Frontend: Use `jest` and `react-testing-library` for unit and integration tests.
- Backend: Use `pytest` for testing Python modules.

## Project-Specific Conventions

### Frontend
- **File Structure**: Organized by feature/domain under `src/app` and `src/components`.
- **Styling**: Tailwind CSS is used for styling.
- **Internationalization**: Managed using `next-intl`. See `src/i18n/routing.ts` for locale configurations.

### Backend
- **File Structure**: Organized into `app/` for core logic, `routers/` for API endpoints, and `services/` for business logic.
- **Database Migrations**: Managed using Alembic. Migration scripts are in `migrations/versions/`.

## Integration Points
- **Frontend-Backend Communication**: Uses RESTful APIs. Refer to `06_API_Specification.md` in `docs/` for details.
- **Authentication**: OAuth is implemented in `backend/app/services/oauth.py`.
- **Task Queue**: Celery is used for background tasks.

## Examples
- **Adding a New Locale**:
  Update `locales` in `src/i18n/routing.ts` and add corresponding JSON files in `src/messages/`.

- **Creating a New API Endpoint**:
  1. Add a new router in `backend/app/routers/`.
  2. Define the endpoint logic in the router file.
  3. Register the router in `main.py`.

## Additional Resources
- Refer to `docs/` for detailed documentation on architecture, API specifications, and coding conventions.
- Use the `README.md` files in the root and `frontend/` directories for quick setup and deployment instructions.
