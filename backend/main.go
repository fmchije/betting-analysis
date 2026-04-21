package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

type Match struct {
	ID        int     `json:"id"`
	Domacin   string  `json:"domacin"`
	Gost      string  `json:"gost"`
	Kvot1Pre  float64 `json:"kvot1Pre"`
	KvotXPre  float64 `json:"kvotXPre"`
	Kvot2Pre  float64 `json:"kvot2Pre"`
	Kvot1Pos  float64 `json:"kvot1Pos"`
	KvotXPos  float64 `json:"kvotXPos"`
	Kvot2Pos  float64 `json:"kvot2Pos"`
	GolDomaci int     `json:"golDomaci"`
	GolGost   int     `json:"golGost"`
	Datum     string  `json:"datum"`
	Liga      string  `json:"liga"`
	Izvor     string  `json:"izvor"`
}

var db *sql.DB

func getMatchesFromDB(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	query := "SELECT idklad, Domacin, Gost, `1pre`, `Xpre`, `2pre`, `1posle`, `Xposle`, `2posle`, " +
		"GolovaDomaci, GolovaGost, DATE_FORMAT(Datum, '%Y-%m-%d') as SredjenDatum, Liga, 'klad' FROM klad " +
		"UNION ALL " +
		"SELECT idklad, Domacin, Gost, `1pre`, `Xpre`, `2pre`, `1posle`, `Xposle`, `2posle`, " +
		"GolovaDomaci, GolovaGost, DATE_FORMAT(Datum, '%Y-%m-%d') as SredjenDatum, Liga, 'igrao' FROM igrao " +
		"ORDER BY SredjenDatum ASC, idklad ASC LIMIT 50 OFFSET ?"

	pageStr := r.URL.Query().Get("page")
	if pageStr == "" {
		pageStr = "1"
	}

	page, _ := strconv.Atoi(pageStr)
	pageSize := 50
	offset := (page - 1) * pageSize

	rows, err := db.Query(query, offset)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var matches []Match
	for rows.Next() {
		var m Match

		// Scan order must match the SELECT query columns
		err := rows.Scan(
			&m.ID, &m.Domacin, &m.Gost,
			&m.Kvot1Pre, &m.KvotXPre, &m.Kvot2Pre,
			&m.Kvot1Pos, &m.KvotXPos, &m.Kvot2Pos,
			&m.GolDomaci, &m.GolGost, &m.Datum,
			&m.Liga, &m.Izvor,
		)
		if err != nil {
			log.Println("Greška pri skeniranju:", err)
			continue
		}

		matches = append(matches, m)
	}
	json.NewEncoder(w).Encode(matches)
}

func analyzeBets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// --- 1. Request Parameter Parsing ---

	oddStart := r.URL.Query().Get("odd")
	oddEnd := r.URL.Query().Get("odd_end")
	conditionSign := r.URL.Query().Get("condition_sign")
	dateFrom := r.URL.Query().Get("from")
	dateTo := r.URL.Query().Get("to")
	marginRange := r.URL.Query().Get("margin")
	trend := r.URL.Query().Get("trend")
	leagueParam := r.URL.Query().Get("league")
	leagueCondition := "1=1" // Default to a truthy condition for easy query building

	if leagueParam != "" && leagueParam != "all" {

		switch leagueParam {
		case "Lige Petice":
			leagueCondition = "Liga IN ('Engleska 1', 'Italija 1', 'Španija 1', 'Nemačka 1', 'Francuska 1')"
		case "Evrokupovi":
			leagueCondition = "Liga IN ('Liga šampiona', 'Liga evrope', 'Liga konferencije')"
		case "Rumunija Sve":

			leagueCondition = "Liga LIKE 'Rumunija 1%'"
		default:

			leagueCondition = fmt.Sprintf("Liga = '%s'", leagueParam)
		}
	}

	timing := "posle"
	if strings.HasSuffix(conditionSign, "pre") {
		timing = "pre"
	}

	// --- 2. Query Building (Business Logic) ---

	marginCalc := fmt.Sprintf("((1/1%s + 1/X%s + 1/2%s - 1) * 100)", timing, timing, timing)

	trendCondition := "1=1"
	if trend != "" && trend != "all" {
		baseSign := conditionSign[:1]
		switch trend {
		case "falling":
			trendCondition = fmt.Sprintf("%sposle < %spre", baseSign, baseSign)
		case "rising":
			trendCondition = fmt.Sprintf("%sposle > %spre", baseSign, baseSign)
		case "same":
			trendCondition = fmt.Sprintf("%sposle = %spre", baseSign, baseSign)
		}
	}

	conditionColumn := "`" + conditionSign + "`"

	query := fmt.Sprintf(`
    SELECT idklad, Domacin, Gost, 1pre, Xpre, 2pre, 1posle, Xposle, 2posle, GolovaDomaci, GolovaGost, Datum, Liga, izvor
    FROM (
        SELECT idklad, Domacin, Gost, 1pre, Xpre, 2pre, 1posle, Xposle, 2posle, GolovaDomaci, GolovaGost, Datum, Liga, 'klad' as izvor FROM klad 
        UNION ALL 
        SELECT idklad, Domacin, Gost, 1pre, Xpre, 2pre, 1posle, Xposle, 2posle, GolovaDomaci, GolovaGost, Datum, Liga, 'igrao' as izvor FROM igrao
    ) as raw
    WHERE GolovaDomaci IS NOT NULL AND GolovaGost IS NOT NULL
      AND %s BETWEEN ? AND ? 
      AND Datum BETWEEN ? AND ?
      AND %s %s
      AND %s
	  AND %s
    ORDER BY Datum ASC`,
		conditionColumn, marginCalc, getMarginSQL(marginRange), trendCondition, leagueCondition,
	)

	// --- 3. Execute Primary Analysis ---

	rows, err := db.Query(query, oddStart, oddEnd, dateFrom, dateTo)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var filteredMatches []Match
	var p1, pX, p2 float64

	for rows.Next() {
		var m Match
		err := rows.Scan(&m.ID, &m.Domacin, &m.Gost, &m.Kvot1Pre, &m.KvotXPre, &m.Kvot2Pre, &m.Kvot1Pos, &m.KvotXPos, &m.Kvot2Pos, &m.GolDomaci, &m.GolGost, &m.Datum, &m.Liga, &m.Izvor)
		if err != nil {
			continue
		}

		// Manually calculate profit for each bet type to ensure precision
		if m.GolDomaci > m.GolGost {
			p1 += (m.Kvot1Pos - 1)
			pX -= 1
			p2 -= 1
		} else if m.GolDomaci == m.GolGost {
			pX += (m.KvotXPos - 1)
			p1 -= 1
			p2 -= 1
		} else {
			p2 += (m.Kvot2Pos - 1)
			p1 -= 1
			pX -= 1
		}

		filteredMatches = append(filteredMatches, m)
	}

	var common1, commonX, common2 float64
	var comboCount int

	// Fetch the most frequent odds combination within the filtered set
	comboQuery := fmt.Sprintf(`
    SELECT 1%s, X%s, 2%s, COUNT(*) as occurrence
    FROM (SELECT * FROM klad UNION ALL SELECT * FROM igrao) as raw
    WHERE %s BETWEEN ? AND ? 
      AND Datum BETWEEN ? AND ? 
      AND %s
    GROUP BY 1%s, X%s, 2%s
    ORDER BY occurrence DESC
    LIMIT 1`, timing, timing, timing, conditionSign, leagueCondition, timing, timing, timing)

	// --- 4. Statistics & Common Patterns ---
	// Fetch the most frequent odds combination within the filtered set
	db.QueryRow(comboQuery, oddStart, oddEnd, dateFrom, dateTo).Scan(&common1, &commonX, &common2, &comboCount)

	percentage := 0.0
	if len(filteredMatches) > 0 {
		percentage = (float64(comboCount) / float64(len(filteredMatches))) * 100
	}

	response := map[string]interface{}{
		"totalBets":   len(filteredMatches),
		"profit1":     p1,
		"profitX":     pX,
		"profit2":     p2,
		"matches":     filteredMatches,
		"commonCombo": fmt.Sprintf("%.2f - %.2f - %.2f", common1, commonX, common2),
		"comboFreq":   fmt.Sprintf("%.1f%%", percentage),
	}
	json.NewEncoder(w).Encode(response)
}

func getLeagues(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	var leagues []string

	query := `SELECT DISTINCT Liga FROM (SELECT Liga FROM klad UNION SELECT Liga FROM igrao) as t WHERE Liga IS NOT NULL AND Liga != '' ORDER BY Liga ASC`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var l string
		if err := rows.Scan(&l); err == nil {
			leagues = append(leagues, l)
		}
	}
	json.NewEncoder(w).Encode(leagues)
}

func main() {
	var err error

	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "root:admin@tcp(127.0.0.1:3306)/klad?charset=utf8mb4&parseTime=true"
	}

	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}

	// Provera konekcije
	err = db.Ping()
	if err != nil {
		log.Fatal("Baza nije dostupna: ", err)
	}

	http.HandleFunc("/api/matches", getMatchesFromDB)
	http.HandleFunc("/api/analyze", analyzeBets)
	http.HandleFunc("/api/leagues", getLeagues)
	fmt.Println("Server radi na portu 8080 i povezan je na MySQL...")
	log.Fatal(http.ListenAndServe(":8080", nil))

}

func getMarginSQL(marginRange string) string {
	switch marginRange {
	case "1.93-3.18":
		return "BETWEEN 1.93 AND 3.18"
	case "4-6":
		return "BETWEEN 4 AND 6"
	case "6-8.5":
		return "BETWEEN 6 AND 8.5"
	case ">8.5":
		return "> 8.5"
	default:
		return "BETWEEN 0 AND 100"
	}
}
