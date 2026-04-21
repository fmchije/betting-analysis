import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';


interface Match {
  id: number;
  domacin: string;
  gost: string;
  kvot1Pre: number;
  kvotXPre: number;
  kvot2Pre: number;
  kvot1Pos: number;
  kvotXPos: number;
  kvot2Pos: number;
  golDomaci: number;
  golGost: number;
  datum: string;
  liga: string;
  izvor: string;
}

interface AnalysisResult {
  totalBets: number;
  profit1: number;
  profitX: number;
  profit2: number;
  commonCombo: string; 
  comboFreq: string;     
}

const LEAGUE_GROUPS: Record<string, string[]> = {
  "Lige Petice": ["Premier League", "Serie A", "LaLiga", "Bundesliga", "Ligue 1"],
  "Evrokupovi": ["Champions League", "Europa League", "Conference League"],
  "Rumunija Sve": ["Rumunija 1", "Rumunija 1 - Play Off", "Rumunija 1 - Relegation"],
};

const MatchList: React.FC = () => {
  const [analysisMatches, setAnalysisMatches] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  
  
  const [targetOdd, setTargetOdd] = useState<string>("2.05");
  const [sign, setSign] = useState<string>("1posle");
  const [dateFrom, setDateFrom] = useState<string>("2025-01-01");
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [margin, setMargin] = useState<string>("all");
  const [betSign, setBetSign] = useState<string>("1"); 
  const [trend, setTrend] = useState<string>("all");
  const [isRange, setIsRange] = useState<boolean>(false);
  const [targetOddEnd, setTargetOddEnd] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [tempPage, setTempPage] = useState(page.toString());
  const [leagueInput, setLeagueInput] = useState("");
const [selectedLeague, setSelectedLeague] = useState("all");
const [allLeagues, setAllLeagues] = useState<string[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);

const exportToExcel = () => {
  if (analysisMatches.length === 0) {
    alert("Nema podataka za izvoz! Prvo pokreni analizu.");
    return;
  }

  
  const dataToExport = analysisMatches.map(m => ({
    Datum: m.datum,
    Liga: m.liga,
    Domacin: m.domacin,
    Gost: m.gost,
    Rezultat: `${m.golDomaci}:${m.golGost}`,
    'Kvota 1 Pre': m.kvot1Pre,
    'Kvota X Pre': m.kvotXPre,
    'Kvota 2 Pre': m.kvot2Pre,
    'Kvota 1 Posle': m.kvot1Pos,
    'Kvota X Posle': m.kvotXPos,
    'Kvota 2 Posle': m.kvot2Pos,
    Izvor: m.izvor
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Analiza");

  
  const fileName = `Analiza_${selectedLeague}_${targetOdd}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};


useEffect(() => {
  fetch("http://localhost:8080/api/leagues")
    .then(res => res.json())
    .then(data => setAllLeagues(data));
}, []);

const suggestions = useMemo(() => {
  const commonGroups = Object.keys(LEAGUE_GROUPS);
  const combined = [...commonGroups, ...allLeagues];
  if (!leagueInput) return commonGroups; // Pokaži samo grupe ako je prazno
  return combined.filter(l => l.toLowerCase().includes(leagueInput.toLowerCase())).slice(0, 20);
}, [leagueInput, allLeagues]);


  useEffect(() => {
  setTempPage(page.toString());
}, [page]);

  const handleAnalyze = () => {

  const finalOddEnd = isRange ? targetOddEnd : targetOdd;
  const url = `http://localhost:8080/api/analyze?odd=${targetOdd}&odd_end=${finalOddEnd}&condition_sign=${sign}&from=${dateFrom}&to=${dateTo}&margin=${margin}&trend=${trend}&league=${selectedLeague}`;
  

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      setAnalysisResult(data);
      
      setAnalysisMatches(data.matches || []); 
    })
    .catch((err) => console.error("Greška:", err));
};


  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8080/api/matches?page=${page}`)
      .then((response) => response.json())
      .then((data) => {
        setMatches(data);
        setLoading(false);
        window.scrollTo(0, 0);
      })
      .catch((error) => {
        console.error('Greška pri povlačenju podataka:', error);
        setLoading(false);
      });
  }, [page]);

  

  
  const { chartData, metrics } = useMemo(() => {
  const targetData = analysisMatches.length > 0 ? analysisMatches : matches;
  
  let cumulative = 0;
  let maxProfit = 0;
  let maxDrawdown = 0;
  let currentLosingStreak = 0;
  let maxLosingStreak = 0;
  let totalEdge = 0;

  const chartData = targetData.map(m => {
    let matchProfit = 0;
    const homeWin = m.golDomaci > m.golGost;
    const draw = m.golDomaci === m.golGost;
    const awayWin = m.golGost > m.golDomaci;

    if (betSign === "1") {
      matchProfit = homeWin ? (m.kvot1Pos - 1) : -1;
    } else if (betSign === "X") {
      matchProfit = draw ? (m.kvotXPos - 1) : -1;
    } else if (betSign === "2") {
      matchProfit = awayWin ? (m.kvot2Pos - 1) : -1;
    }

    cumulative += matchProfit;

    // --Max Drawdown--
    if (cumulative > maxProfit) maxProfit = cumulative;
    const currentDD = maxProfit - cumulative;
    if (currentDD > maxDrawdown) maxDrawdown = currentDD;

    // --Losing Streak--
    if (matchProfit < 0) {
      currentLosingStreak++;
      if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
    } else if (matchProfit > 0) {
      currentLosingStreak = 0;
    }

    // --Edge--
    const qPre = betSign === "1" ? m.kvot1Pre : betSign === "X" ? m.kvotXPre : m.kvot2Pre;
    const qPos = betSign === "1" ? m.kvot1Pos : betSign === "X" ? m.kvotXPos : m.kvot2Pos;
    if (qPre > 0 && qPos > 0) totalEdge += (qPre / qPos - 1);

    return {
      datum: m.datum,
      cumulativeProfit: parseFloat(cumulative.toFixed(2))
    };
  });

  return {
    chartData,
    metrics: {
      maxDrawdown: maxDrawdown.toFixed(2),
      maxLosingStreak,
      avgEdge: targetData.length > 0 ? ((totalEdge / targetData.length) * 100).toFixed(2) : "0.00"
    }
  };
}, [analysisMatches, matches, betSign]); 
  if (loading) return <p className="text-center py-10">Učitavanje podataka...</p>;

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 border-b pb-2 text-gray-800">Backtesting Analiza</h2>
        
        {/* FILTERI */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Kvota: 
                <input type="checkbox" className="ml-2" checked={isRange} onChange={() => setIsRange(!isRange)} /> 
                <span className="text-xs font-normal ml-1">Raspon?</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="text" value={targetOdd} onChange={(e) => setTargetOdd(e.target.value)} className="w-full p-2 border rounded" placeholder="Od" />
                {isRange && (
                  <>
                    <span>-</span>
                    <input type="text" value={targetOddEnd} onChange={(e) => setTargetOddEnd(e.target.value)} className="w-full p-2 border rounded" placeholder="Do" />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Znak:</label>
              <select value={sign} onChange={(e) => setSign(e.target.value)} className="w-full p-2 border rounded">
                <option value="1posle">1 (Posle)</option>
                <option value="Xposle">X (Posle)</option>
                <option value="2posle">2 (Posle)</option>
                <option value="1pre">1 (Pre)</option>
                <option value="Xpre">X (Pre)</option>
                <option value="2pre">2 (Pre)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Igram na:</label>
              <select value={betSign} onChange={(e) => setBetSign(e.target.value)} className="w-full p-2 border rounded">
                <option value="1">Domaćina (1)</option>
                <option value="X">Nerešeno (X)</option>
                <option value="2">Gosta (2)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Marža:</label>
              <select value={margin} onChange={(e) => setMargin(e.target.value)} className="w-full p-2 border rounded">
                <option value="all">Sve marže</option>
                <option value="1.93-3.18">1.93% - 3.18%</option>
                <option value="4-6">4% - 6%</option>
                <option value="6-8.5">6% - 8.5%</option>
                <option value=">8.5">Preko 8.5%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Trend:</label>
              <select value={trend} onChange={(e) => setTrend(e.target.value)} className="w-full p-2 border rounded">
                <option value="all">Svejedno</option>
                <option value="falling">Samo pad</option>
                <option value="rising">Samo rast</option>
                <option value="same">Nepromenjena</option>
              </select>
            </div>

            {/*POLJA ZA DATUM */}
            <div>
              <label className="block text-sm font-medium mb-1">Od datuma:</label>
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="w-full p-2 border rounded text-sm" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Do datuma:</label>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="w-full p-2 border rounded text-sm" 
              />
            </div>
            {/* LIGA FILTER SA SEARCH MEHANIZMOM */}
<div className="relative">
  <label className="block text-sm font-medium mb-1 text-gray-700">Liga / Grupa:</label>
  <div className="relative">
    <input 
      type="text" 
      value={leagueInput}
      onChange={(e) => {
        setLeagueInput(e.target.value);
        setShowSuggestions(true);
      }}
      onFocus={() => setShowSuggestions(true)}
      placeholder="Traži ligu ili grupu..."
      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
    />
    {leagueInput && (
      <button 
        onClick={() => {setLeagueInput(""); setSelectedLeague("all")}}
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    )}
  </div>

  {showSuggestions && (
    <div className="absolute z-[100] w-full bg-white border rounded-md shadow-2xl mt-1 max-h-60 overflow-y-auto border-gray-200">
      <div 
        className="p-2 hover:bg-blue-50 cursor-pointer font-bold text-blue-600 border-b text-sm"
        onClick={() => {
          setSelectedLeague("all");
          setLeagueInput("");
          setShowSuggestions(false);
        }}
      >
        --- Sve Lige ---
      </div>
      
      {suggestions.map((s) => {
        const isGroup = !!LEAGUE_GROUPS[s];
        return (
          <div 
            key={s}
            className={`p-2 hover:bg-blue-100 cursor-pointer text-xs border-b border-gray-50 flex justify-between items-center ${isGroup ? 'bg-orange-50 font-bold' : ''}`}
            onClick={() => {
              setSelectedLeague(s);
              setLeagueInput(s);
              setShowSuggestions(false);
            }}
          >
            <span>{s}</span>
            {isGroup && <span className="text-[10px] bg-orange-200 text-orange-800 px-1 rounded">GRUPA</span>}
          </div>
        );
      })}
    </div>
  )}
</div>
            
          </div>

          <div className="flex justify-center border-t pt-4">
            <button onClick={handleAnalyze} className="bg-green-600 text-white px-10 py-3 rounded-full hover:bg-green-700 font-bold transition shadow-md">
              POKRENI ANALIZU
            </button>
            {analysisMatches.length > 0 && (
    <button onClick={exportToExcel} className="bg-blue-600 text-white px-10 py-3 rounded-full hover:bg-blue-700 font-bold transition shadow-md flex items-center gap-2">
      📥 IZVEZI U EXCEL
    </button>
  )}
          </div>
        </div>

{loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600 font-medium">Učitavanje podataka...</p>
        </div>
      ) : (
        <>
        {/* GRAFIKON I REZULTATI */}
        {analysisResult && (
          <>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-700">
                Kriva kumulativnog profita ({analysisMatches.length > 0 ? "Analiza" : "Trenutna stranica"})
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="datum" hide />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="cumulativeProfit" stroke="#16a34a" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-10 border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-700 text-center">Analiza ishoda</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <th className="p-3 border-b">Tip</th>
                      <th className="p-3 border-b text-center">Mečeva</th>
                      <th className="p-3 border-b text-center">Profit (1 unit)</th>
                      <th className="p-3 border-b text-center">ROI %</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { label: "Domaćin (1)", val: analysisResult.profit1, key: "1" },
                      { label: "Nerešeno (X)", val: analysisResult.profitX, key: "X" },
                      { label: "Gost (2)", val: analysisResult.profit2, key: "2" },
                    ].map((item) => {
                      const currentRoi = analysisResult.totalBets > 0 ? (item.val / analysisResult.totalBets) * 100 : 0;
                      return (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="p-3 border-b font-bold">{item.label}</td>
                          <td className="p-3 border-b text-center">{analysisResult.totalBets}</td>
                          <td className={`p-3 border-b text-center font-bold ${item.val >= 0 ? 'text-green-600' : 'text-red-600'}`}>{item.val.toFixed(2)}</td>
                          <td className={`p-3 border-b text-center font-black ${currentRoi >= 0 ? 'text-green-700' : 'text-red-700'}`}>{currentRoi.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center shadow-sm">
    <p className="text-sm text-red-600 font-bold uppercase tracking-wider">Maks. Pad (Drawdown)</p>
    <p className="text-2xl font-black text-red-900">-{metrics.maxDrawdown}</p>
    <p className="text-[10px] text-red-400 mt-1 italic">Najveći pad profita od vrha</p>
  </div>
  
  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-center shadow-sm">
    <p className="text-sm text-orange-600 font-bold uppercase tracking-wider">Najduži "Crni Niz"</p>
    <p className="text-2xl font-black text-orange-900">{metrics.maxLosingStreak}</p>
    <p className="text-[10px] text-orange-400 mt-1 italic">Maks. uzastopnih promašaja</p>
  </div>

  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center shadow-sm">
    <p className="text-sm text-emerald-600 font-bold uppercase tracking-wider">Prosečan Edge (CLV)</p>
    <p className="text-2xl font-black text-emerald-900">{metrics.avgEdge}%</p>
    <p className="text-[10px] text-emerald-400 mt-1 italic">Prednost u odnosu na završnu kvotu</p>
  </div>
</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
    <p className="text-sm text-blue-600 font-medium uppercase">Karakteristična kombinacija</p>
    <p className="text-2xl font-black text-blue-900">{analysisResult.commonCombo}</p>
  </div>
  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
    <p className="text-sm text-purple-600 font-medium uppercase">Učestalost kombinacije</p>
    <p className="text-2xl font-black text-purple-900">{analysisResult.comboFreq}</p>
  </div>
</div>
              </div>
            </div>
          </>
        )}

        {/* TABELA MEČEVA */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
    <h1 className="text-xl font-bold">
      {analysisMatches.length > 0 ? `Prikaz analize (${analysisMatches.length} mečeva)` : "Pregled poslednjih mečeva"}
    </h1>
    {analysisMatches.length > 0 && (
      <button 
        onClick={() => setAnalysisMatches([])} 
        className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition"
      >
        Resetuj na sve mečeve
      </button>
    )}
  </div>
  
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead className="bg-gray-100 text-sm">
        <tr>
          <th className="border p-2 text-left">Datum</th>
          <th className="border p-2 text-left">Liga</th>
          <th className="border p-2 text-left">Domaćin</th>
          <th className="border p-2 text-left">Gost</th>
          <th className="border p-2 text-center">Rezultat</th>
          <th className="border p-2 text-center">Kvota (P)</th>
          <th className="border p-2 text-center">Izvor</th>
        </tr>
      </thead>
      <tbody className="text-sm">
        {/* LOGIKA: Ako imamo analizu, prikaži nju. Ako ne, prikaži obične mečeve iz baze */}
        {(analysisMatches.length > 0 ? analysisMatches : matches).map((match) => (
          <tr key={`${match.izvor}-${match.id}`} className="hover:bg-gray-50">
            <td className="border p-2 text-xs">{match.datum || 'N/A'}</td>
            <td className="border p-2 text-xs truncate max-w-[100px]">{match.liga}</td>
            <td className="border p-2 font-medium">{match.domacin}</td>
            <td className="border p-2 font-medium">{match.gost}</td>
            <td className="border p-2 text-center bg-gray-50">{match.golDomaci} : {match.golGost}</td>
            <td className="border p-2 text-blue-700 text-center font-bold">
              {/* Prikazujemo kvotu za znak koji je izabran u filteru */}
              {sign.startsWith('1') ? match.kvot1Pos?.toFixed(2) : 
               sign.startsWith('X') ? match.kvotXPos?.toFixed(2) : 
               match.kvot2Pos?.toFixed(2)}
            </td>
            <td className="border p-2 italic text-[10px] text-center text-gray-400">{match.izvor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* PAGINACIJA - Prikazuje se samo kada nema aktivne analize */}
{analysisMatches.length === 0 && (
  <div className="flex items-center justify-center gap-6 py-6 bg-gray-50 border-t">
    <button 
      onClick={() => setPage(p => Math.max(p - 1, 1))} 
      disabled={page === 1} 
      className="px-4 py-2 bg-white border rounded shadow-sm disabled:opacity-50 hover:bg-gray-50 transition"
    >
      ← Prethodna
    </button>

    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Stranica:</span>
      <input 
        type="text" 
        value={tempPage} 
        onChange={(e) => setTempPage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = parseInt(tempPage);
            if (!isNaN(val) && val > 0) setPage(val);
          }
        }}
        onBlur={() => {
          const val = parseInt(tempPage);
          if (!isNaN(val) && val > 0) setPage(val);
          else setTempPage(page.toString());
        }}
        className="w-16 p-2 border rounded text-center font-bold text-blue-700 shadow-inner focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>

    <button 
      onClick={() => setPage(p => p + 1)} 
      disabled={matches.length < 50} 
      className="px-4 py-2 bg-blue-600 text-white rounded shadow-md hover:bg-blue-700 transition"
    >
      Sledeća →
    </button>
  </div>
  
)}
</div> 
    </>
      )}
  </div>
  </div>
);}


export default MatchList;
