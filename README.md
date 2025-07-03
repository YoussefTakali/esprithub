# EspritHub

A full-stack platform for student project management, GitHub integration, and collaborative workflows.

## Features
- Student dashboard with GitHub repository integration
- Dynamic repository browsing (files, commits, branches, contributors)
- File upload (drag & drop), editing, and commit history
- Admin, teacher, and chief modules
- PostgreSQL and Redis support via Docker

## Prerequisites
- [Node.js](https://nodejs.org/) (for frontend)
- [Java 17+](https://adoptopenjdk.net/) (for backend)
- [Maven](https://maven.apache.org/) (for backend)
- [Docker & Docker Compose](https://docs.docker.com/compose/) (for database/services)

## Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd esprithub
```

### 2. Backend Setup
1. **Configure Environment:**
   - Copy `.env.example` to `.env` in the `server/` directory and fill in required secrets (DB, GitHub OAuth, etc).
   - Example:
     ```bash
     cp server/.env.example server/.env
     # Edit server/.env with your values
     ```
2. **Start Database & Services:**
   - Choose one of the provided Docker Compose files:
     - `docker-compose.yml` (default, recommended)
     - `docker-compose-old.yml` (legacy, alternative)
     - `docker-compose-new.yml` (experimental)
   - Example:
     ```bash
     docker-compose up -d
     # or for a specific file:
     docker-compose -f docker-compose-old.yml up -d
     ```
3. **Start Backend:**
   - From the main project folder:
     ```bash
     sh start-backend.sh
     ```
   - Or manually:
     ```bash
     cd server
     mvn spring-boot:run
     ```

### 3. Frontend Setup
1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```
2. **Start Angular app:**
   ```bash
   npm start
   # or
   ng serve
   ```
3. **Access the app:**
   - Open [http://localhost:4200](http://localhost:4200) in your browser.

## Project Structure
```
.
├── client/         # Angular frontend
├── server/         # Spring Boot backend
├── docker-compose.yml
├── docker-compose-old.yml
├── docker-compose-new.yml
├── start-backend.sh
├── start-dev.sh
├── test-api.sh
└── ...
```

## Environment Variables
- Backend: `server/.env` (see `.env.example` for required keys)
- Frontend: `client/src/environments/environment.ts` (edit if needed)

## Useful Scripts
- `start-backend.sh` — Start backend server (Linux)
- `start-dev.sh` — Start both backend and frontend in dev mode
- `test-api.sh` — Run backend API tests

## Troubleshooting
- **Database connection errors:**
  - Ensure Docker containers are running and `.env` is configured.
- **Port conflicts:**
  - Change ports in Docker Compose or Angular config if needed.
- **GitHub integration issues:**
  - Make sure your GitHub OAuth credentials are correct in `.env`.

## License
MIT

---

For more details, see the `docs/` folder or contact the maintainers.
