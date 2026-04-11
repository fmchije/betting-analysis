package main

import (
	"encoding/json"
	"net/http"
)

// Definišemo kako izgleda jedan meč
type Match struct {
	ID      string `json:"id"`
	Home    string `json:"home"`
	Away    string `json:"away"`
	Score   string `json:"score"`
	Status  string `json:"status"`
}

func getMatches(w http.ResponseWriter, r *http.Request) {
	// Dozvoljavamo pristup sa frontenda (CORS)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// Hardkodovani podaci (kao mali "mock" tvojih skrejpovanih rezultata)
	matches := []Match{
		{ID: "1", Home: "Partizan", Away: "Crvena Zvezda", Score: "2:1", Status: "Live"},
		{ID: "2", Home: "Real Madrid", Away: "Barcelona", Score: "0:0", Status: "Upcoming"},
	}

	json.NewEncoder(w).Encode(matches)
}

func main() {
	http.HandleFunc("/api/matches", getMatches)
	println("Server pokrenut na portu 8080...")
	http.ListenAndServe(":8080", nil)
}