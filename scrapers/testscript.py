from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import re

# --- KONFIGURACIJA ---
ELITNE_LIGE = [
    "Engleska 1", "Francuska 1", "Nemačka 1", 
    "Italija 1", "Španija 1", "Liga šampiona"
]

def format_league_name(text):
    if not text: return ""
    delovi = text.strip().split()
    return " ".join(delovi).lower().capitalize()

def clean_mozzart_date(raw_date):
    try:
        # Regex je sigurniji za čišćenje datuma
        date_match = re.search(r'(\d{2}\.\d{2}\.)', raw_date)
        time_match = re.search(r'(\d{2}:\d{2})', raw_date)
        if not date_match or not time_match: return None
        
        day_month = date_match.group(1)
        time_part = time_match.group(1)
        current_year = 2026
        full_str = f"{day_month}{current_year} {time_part}"
        return datetime.strptime(full_str, "%d.%m.%Y %H:%M").strftime("%Y-%m-%d %H:%M:%S")
    except:
        return None

def is_in_time_window(sql_dt_str, target_date_str):
    if not sql_dt_str: return False
    try:
        match_dt = datetime.strptime(sql_dt_str, "%Y-%m-%d %H:%M:%S")
        target_start = datetime.strptime(target_date_str + " 05:00:00", "%Y-%m-%d %H:%M:%S")
        target_end = target_start + timedelta(hours=24)
        return target_start <= match_dt < target_end
    except:
        return False

def calculate_margin(k1, kX, k2):
    try:
        k1, kX, k2 = float(k1), float(kX), float(k2)
        return round((1/k1 + 1/kX + 1/k2 - 1) * 100, 2)
    except: return 100

def run_scraper():
    url = "https://oldsite.mozzartbet.com/sr#/livescores"
    
    user_in = input("Pritisni ENTER za JUČE ili unesi datum (YYYY-MM-DD): ").strip()
    target_day = user_in if user_in else (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    print(f"\n--- TEST MOD (BEZ UPISA U BAZU) ---")
    print(f"Tražimo mečeve za dan: {target_day}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.goto(url)

        print("\nNamesti datum na Mozzartu i pritisni ENTER u terminalu...")
        input()

        competitions = page.query_selector_all(".competition")
        
        print(f"\n{'LIGA':<20} | {'MEČ':<30} | {'MARŽA':<8} | {'STATUS'}")
        print("-" * 85)

        for comp in competitions:
            league_raw = comp.query_selector(".leagueheader")
            if not league_raw: continue
            
            league_name = format_league_name(league_raw.inner_text())
            # Provera elitne lige
            je_elitna = any(elitna.lower() in league_name.lower() for elitna in ELITNE_LIGE)

            for row in comp.query_selector_all(".match-row"):
                try:
                    # Vreme
                    time_raw = row.query_selector(".date-time-white")
                    if not time_raw: continue
                    sql_dt = clean_mozzart_date(time_raw.inner_text().strip())
                    
                    if not is_in_time_window(sql_dt, target_day):
                        continue
                    
                    # Timovi
                    team_spans = row.query_selector(".pairs").query_selector_all("span")
                    home = team_spans[0].inner_text().strip()
                    away = team_spans[1].inner_text().strip()
                    
                    # Kvote
                    odd_el = row.query_selector(".match-right").query_selector_all(".odd-font")
                    if len(odd_el) < 3: continue
                    
                    k1 = odd_el[0].inner_text().strip().replace(',', '.')
                    kX = odd_el[1].inner_text().strip().replace(',', '.')
                    k2 = odd_el[2].inner_text().strip().replace(',', '.')
                    
                    if "-" in [k1, kX, k2]: continue
                    margin = calculate_margin(k1, kX, k2)

                    # LOGIKA FILTRIRANJA (ovde proveravamo gde bi meč otišao)
                    target_table = None
                    if je_elitna or (0.0 <= margin <= 4.0):
                        target_table = "klad"
                    elif (4.0 < margin <= 6.0) and (2.00 <= float(k1) <= 4.00):
                        target_table = "igrao"

                    # ISPIS REZULTATA
                    if target_table:
                        print(f"{league_name[:20]:<20} | {home[:13]}-{away[:13]:<30} | {margin:<8}% | -> {target_table}")
                    else:
                        # Ako je neka od "sumnjivih" liga, ispiši zašto nije prošla
                        if "belgija" in league_name.lower() or "brazil" in league_name.lower():
                            print(f"INFO: {league_name[:14]}.. | {home[:10]} - Preskočeno (Marža: {margin}%, K1: {k1})")

                except Exception as e:
                    continue

        print("\nProces završen. Browser se zatvara.")
        browser.close()

if __name__ == "__main__":
    run_scraper()