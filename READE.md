# 🎫 SupportIQ — AI-Powered Support Ticket Intelligence

SupportIQ is a full-stack AI support ticket management platform that helps support agents triage, analyse, and resolve tickets faster using local LLMs and semantic search.

![Tech Stack](https://img.shields.io/badge/Spring%20Boot-3.3-green) ![React](https://img.shields.io/badge/React-18-blue) ![Ollama](https://img.shields.io/badge/Ollama-llama3.2-orange) ![Qdrant](https://img.shields.io/badge/Qdrant-RAG-purple)

---

## ✨ Features

- **AI Ticket Summarisation** — one-click summary of any ticket using llama3.2
- **Similar Resolved Tickets** — RAG-powered search finds previously resolved tickets with the same issue
- **Resolution Suggester** — AI suggests resolution steps based on similar past tickets
- **Draft Client Response** — generates a professional email response for the agent to send
- **Inline Editing** — update status, priority, and assigned agent directly on the ticket
- **Internal & Resolution Notes** — editable notes persisted to the database
- **New Ticket Creation** — full modal with SLA preview based on priority
- **Duplicate Detection** — AI automatically flags potential duplicate tickets at creation using semantic similarity (threshold 0.75), with agent confirm/dismiss workflow
- **SLA Tracking** — real-time SLA risk indicators (Green / Amber / Red / Breached)
- **Dashboard** — filterable, sortable ticket table with stats cards

---

## 🏗 Architecture

```
Browser
  └── Nginx (port 80)
        ├── serves React frontend (static files)
        └── proxies /api/ → Spring Boot (port 8080)
                              ├── H2 embedded database (persisted volume)
                              ├── Qdrant vector store (port 6334)
                              └── Ollama LLM (host machine, port 11434)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Backend | Spring Boot 3.3 + Spring AI 1.0.0-M1 + Java 21 |
| LLM | Ollama — llama3.2:1b (chat) + mxbai-embed-large (embeddings) |
| Vector DB | Qdrant (RAG + duplicate detection) |
| Database | H2 embedded (file mode) |
| Container | Docker + Docker Compose + Nginx |

---

## 🚀 Running with Docker (Recommended)

### Prerequisites

1. **Docker Desktop** — [download here](https://www.docker.com/products/docker-desktop)
2. **Ollama** — [download here](https://ollama.ai)

### Step 1 — Install and start Ollama

```bash
# Install via Homebrew (Mac)
brew install ollama

# Pull required models (one time, ~2GB total)
ollama pull llama3.2:1b
ollama pull mxbai-embed-large

# Start Ollama
ollama serve
```

### Step 2 — Clone the repo

```bash
git clone https://github.com/lohithmm/support-ticket-intelligence.git
cd support-ticket-intelligence
```

### Step 3 — Copy environment config

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edit application.properties and set your preferred DB username/password
```

### Step 4 — Start everything

```bash
docker compose up --build
```

First run takes ~3–5 minutes to build images. Subsequent starts are fast:

```bash
docker compose up
```

### Step 5 — Open the app

| Service | URL |
|---|---|
| **SupportIQ UI** | http://localhost |
| Backend API | http://localhost:8080 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

---

## 💻 Running Locally (Development)

### Prerequisites

- Java 21
- Maven 3.9+
- Node.js 20+
- Docker (for Qdrant)
- Ollama

### Step 1 — Start dependencies

```bash
# Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Ollama
ollama serve
```

### Step 2 — Configure application.properties

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Edit `application.properties`:
```properties
spring.application.name=support-ticket-intelligence
spring.ai.model.chat=ollama
spring.ai.model.embedding=ollama
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=llama3.2:1b
spring.ai.ollama.embedding.options.model=mxbai-embed-large:latest
spring.datasource.url=jdbc:h2:file:~/supportiq;AUTO_SERVER=true
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=YOUR_USERNAME
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=create-drop
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
spring.ai.vectorstore.qdrant.initialize-schema=true
spring.ai.vectorstore.qdrant.host=localhost
spring.ai.vectorstore.qdrant.port=6334
spring.ai.vectorstore.qdrant.collection-name=support-tickets
server.port=8080
```

### Step 3 — Start the backend

```bash
mvn spring-boot:run
```

### Step 4 — Start the frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5174
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tickets` | Get all tickets with SLA risk |
| GET | `/api/tickets/{id}` | Get single ticket |
| POST | `/api/tickets` | Create new ticket |
| PATCH | `/api/tickets/{id}` | Update ticket fields |
| POST | `/api/tickets/{id}/summarise` | AI summary |
| GET | `/api/tickets/{id}/similar` | Similar resolved tickets (RAG) |
| GET | `/api/tickets/{id}/resolve` | Resolution suggestion |
| POST | `/api/tickets/{id}/draft-response` | Draft client email |
| GET | `/api/tickets/{id}/duplicates` | Manual duplicate scan |
| POST | `/api/tickets/{id}/confirm-duplicate` | Agent confirms duplicate |
| POST | `/api/tickets/{id}/dismiss-duplicate` | Agent dismisses duplicate flag |

---

## 🔁 Duplicate Detection

When a new ticket is created, SupportIQ automatically:

1. Searches Qdrant for semantically similar **open** tickets
2. If similarity score ≥ **0.75** → flags the ticket as a potential duplicate
3. Stores the matching ticket number and similarity score
4. Shows an amber warning banner on the ticket detail page
5. Shows a 🔁 badge on the dashboard table row

The agent can then:
- **✓ Confirm** — marks as a confirmed duplicate, links to original ticket
- **✕ Dismiss** — clears the flag, never shows again
- **↻ Rescan** — re-runs the duplicate check manually

The threshold of 0.75 was chosen because `mxbai-embed-large` scores differently-worded descriptions of the same issue around 0.75–0.80. A higher threshold (0.90+) would only catch near-identical text and miss real duplicates.

---

## 🗂 Project Structure

```
support-ticket-intelligence/
├── Dockerfile                          # Backend Docker image
├── docker-compose.yml                  # Full stack orchestration
├── pom.xml
├── src/main/java/com/hackathon/support_ticket_intelligence/
│   ├── api/
│   │   ├── TicketController.java       # REST endpoints
│   │   └── CorsConfig.java
│   ├── ai/
│   │   └── TicketAiService.java        # LLM summarise/resolve/draft
│   ├── rag/
│   │   ├── TicketIngestionService.java # Qdrant ingestion on startup
│   │   ├── TicketRetrievalService.java # Similar ticket search
│   │   └── DuplicateDetectionService.java # Duplicate flagging
│   ├── tickets/
│   │   ├── Ticket.java                 # JPA entity
│   │   ├── TicketRepository.java
│   │   └── MockDataLoader.java         # Seeds 20 mock tickets on startup
│   └── config/
│       └── CorsConfig.java
├── src/main/resources/
│   ├── application.properties          # Local dev config (gitignored)
│   ├── application.properties.example  # Template to copy
│   ├── application-docker.properties   # Docker config (auto-activated)
│   └── mock-tickets.json               # 20 seed tickets
└── frontend/
    ├── Dockerfile                      # Frontend Docker image (Nginx)
    ├── nginx.conf                      # Nginx config (serve + proxy)
    └── src/
        ├── App.jsx                     # All UI components
        ├── index.css                   # Global styles
        └── services/api.js             # API client
```

---

## 🛠 Useful Commands

```bash
# View logs
docker logs supportiq-backend -f
docker logs supportiq-frontend -f
docker logs supportiq-qdrant -f

# Restart a single service
docker compose restart backend

# Wipe Qdrant vectors (forces re-ingestion on next restart)
curl -X DELETE http://localhost:6333/collections/support-tickets

# Stop everything
docker compose down

# Stop and remove all data volumes (full reset)
docker compose down -v

# Rebuild after code changes
docker compose up --build
```

---

## ⚙️ Configuration

### Duplicate detection threshold

In `DuplicateDetectionService.java`:
```java
private static final double DUPLICATE_THRESHOLD = 0.75;
```
Increase for stricter matching, decrease for broader matching.

### SLA policies (auto-set on ticket creation)

| Priority | SLA Deadline |
|---|---|
| CRITICAL | 4 hours |
| HIGH | 8 hours |
| MEDIUM | 24 hours |
| LOW | 48 hours |

### Mock data

20 tickets are seeded on first startup from `mock-tickets.json` — 8 RESOLVED (used for RAG) and 12 OPEN/IN_PROGRESS. MockDataLoader skips seeding if tickets already exist in the database.

---

## 📋 Known Limitations

- H2 is an embedded database — suitable for demo/development, not production. Replace with PostgreSQL for production use
- Ollama must run on the host machine (not in Docker) due to model size. GPU acceleration requires Ollama running natively
- Mock ticket dates are historical (2024) so all mock tickets show as SLA breached — this is expected behaviour for demo data

---

## 🔮 Potential Future Features

- Dashboard charts (category breakdown, agent workload, SLA breach trends)
- Analytics page with trends over time
- Email notifications on SLA breach
- Ticket merging for confirmed duplicates
- PostgreSQL support for production deployment
- Authentication and role-based access

---

## 👨‍💻 Author

Built by **Lohith** as an AI-powered support intelligence platform demonstrating local LLM integration with RAG, semantic duplicate detection, and full-stack containerisation.