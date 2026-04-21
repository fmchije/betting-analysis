Sports-Tech Integration Demo (Go + React)
🚀 Overview
This project is a high-performance, decoupled prototype built as a 24-hour challenge to demonstrate full-stack proficiency in a modern sports-tech environment. It features a scalable Golang backend and a reactive TypeScript + React frontend.

The project simulates a real-world sports data stream, drawing inspiration from my previous experience with web scraping sports results and betting odds.

🏗️ Architecture
The system follows a Decoupled Architecture to ensure independent scalability and easier maintenance:

Backend (Golang): A lightweight REST API running on port 8080. It handles data structures for matches, live scores, and status updates. Go was chosen for its concurrency model and efficiency in handling high-frequency sports data.

Frontend (React + TypeScript): A modern UI running on port 5173 (Vite). It uses TypeScript to ensure data integrity and the fetch API for real-time interaction with the Go service.


Shutterstock
Explore
🛠️ Tech Stack
Language: Go (Golang)

Frontend: React 18, TypeScript, Vite

API Standard: RESTful JSON

DevOps/Tools: Git, NPM, Go Modules

🌟 Key Features
Type-Safe Communication: Shared interfaces between the backend logic and frontend display.

CORS Management: Secure cross-origin data sharing between different development ports.

Live Status Logic: Dynamic UI updates based on match status (Live vs. Upcoming).

Audit-Ready Code: Structured with clear separation of concerns (Models, Handlers, Components).

📈 Future Roadmap (The "Sporting Rock" Vision)
If expanded, this system would integrate:

Real-Time Data Scraping: Integrating my existing Python/Playwright scrapers to feed live odds from providers like MozzartBet directly into the Go service.

WebSocket Integration: Moving from polling to WebSockets for sub-second score updates.

Database Persistence: Migrating from in-memory mock data to PostgreSQL or MongoDB for historical data analysis.

⚙️ How to Run
Backend:

Bash
cd backend
go run main.go
Frontend:

Bash
cd frontend
npm install
npm run dev
💡 Why this project?
I built this to show that I am not just a developer who follows instructions, but a "full-stack thinker" who can adapt to a new tech stack (Go/React) instantly when the business logic requires it. It bridges my interest in sports data with the robust engineering standards required at Sporting Rock.