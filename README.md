# 📊 Odds Analytics & Market Efficiency Tool

![Project Demo](./assests/Betting_analysis.gif)

*(Napomena: Ovde možeš staviti link ka GIF-u tvog ekrana dok skroluješ kroz dashboard)*

## 🚀 The Vision
I built this project to solve a specific problem: most betting tools provide raw data, but few allow for **historical backtesting of market efficiency**. This system tracks how odds shift from opening to closing lines (**CLV - Closing Line Value**), allowing users to identify patterns and calculate real-time ROI across different leagues.

---

## 🛠️ Tech Stack
| Layer | Technology | Why? |
| :--- | :--- | :--- |
| **Backend** | **Go (Golang)** | Concurrency and high-speed data processing. |
| **Frontend** | **React & TypeScript** | Type-safety and interactive data visualization. |
| **Data Engine** | **Python (Playwright)** | Robust headless browsing and complex data extraction. |
| **Database** | **MySQL** | Reliable relational storage for match histories. |
| **Styling** | **Tailwind CSS** | Rapid UI development with a consistent design system. |

---

## 🏗️ System Architecture & Features

### 1. Data Acquisition (The "Cleaner")
The Python scraper uses **Playwright** to navigate dynamic content. 
* **Regex Mastery:** I implemented complex Regex patterns to sanitize raw HTML strings, ensuring that league names and odd formats are consistent before they hit the database.
* **Margin Calculation:** The scraper doesn't just grab numbers; it calculates the bookmaker's margin on the fly to flag "low-juice" markets.

### 2. High-Performance API (The "Engine")
The Go backend is designed for speed.
* **Smart Aggregation:** Instead of heavy frontend processing, the Go server performs SQL aggregations to calculate profits (`p1`, `pX`, `p2`) and ROI percentages.
* **Environment Safety:** Uses `os.Getenv` for database DSNs, following DevOps best practices for secure deployment.

### 3. Interactive Analytics (The "Visualizer")
The React dashboard uses **Chart.js** to transform thousands of rows into actionable insights.
* **Dynamic Filtering:** Users can toggle between "Lige Petice", "Evrokupovi", or custom date ranges.
* **Responsive Design:** Fully optimized for different screen sizes using Tailwind's utility-first approach.



---

## 💡 Engineering Decisions
* **Why Go?** I wanted a backend that could handle thousands of concurrent data points with minimal overhead.
* **Server-Side Logic:** I moved the profit-calculation logic to the server to ensure that the mobile and web versions of an app would always see identical, pre-computed results.
* **Clean Code:** Focused on removing "dead code" (ESLint cleanup) and following Tailwind's spacing scales for a professional UI finish.

---

## 📈 Future Roadmap
- [ ] **Go-Native Scraper:** Migrating the Python engine to Go (Colly/Go-Playwright) for 5x faster data ingestion.
- [ ] **Live WebSockets:** Real-time dashboard updates without page refreshes.
- [ ] **Advanced Metrics:** Adding "Value Bet" detection based on historical deviation.

---

## 🔧 Installation & Setup
1. **Database:** Import the provided SQL schema into your MySQL instance.
2. **Backend:** Run `go run main.go` (ensure `DB_URL` env variable is set).
3. **Frontend:** Run `npm install` and `npm start`.

---
*Developed with passion for sports-tech and clean engineering.*
