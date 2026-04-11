import { useEffect, useState } from 'react'

// Definišemo tip podatka (TypeScript magija koju traže u oglasu)
interface Match {
  id: string;
  home: string;
  away: string;
  score: string;
  status: string;
}

function App() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    // Pozivamo tvoj Go backend
    fetch('http://localhost:8080/api/matches')
      .then(response => response.json())
      .then(data => setMatches(data))
      .catch(err => console.error("Greška pri povlačenju podataka:", err));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Sporting Rock - Live Scores</h1>
      <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th>Match</th>
            <th>Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => (
            <tr key={match.id}>
              <td>{match.home} vs {match.away}</td>
              <td style={{ fontWeight: 'bold' }}>{match.score}</td>
              <td>
                <span style={{ color: match.status === 'Live' ? 'red' : 'gray' }}>
                  ● {match.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App