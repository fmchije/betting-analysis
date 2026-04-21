from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import time
import re

# --- KONFIGURACIJA ---
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'admin',
    'database': 'klad'
}

ELITNE_LIGE = [
    "Engleska 1", "Francuska 1", "Nemačka 1", 
    "Italija 1", "Španija 1", "Liga šampiona"
]

def format_league_name(text):
    if not text: 
        return ""
    delovi = text.strip().split()
    cist_tekst = " ".join(delovi)
    return cist_tekst.lower().capitalize()

def clean_mozzart_date(raw_date):
    try:
        parts = raw_date.split()
        day_month, time_part = parts[0], parts[2]
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

def save_to_db(table_name, data):
    try:
        import mysql.connector
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        query = f"""INSERT INTO {table_name} 
                   (Liga, Domacin, Gost, Datum, 1posle, Xposle, 2posle, GolovaDomaci, GolovaGost) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        
        cursor.execute(query, data)
        conn.commit()
        
        res = cursor.rowcount > 0
        cursor.close()
        conn.close()
        return res
    except mysql.connector.Error as err:
        print(f"SQL GREŠKA: {err}")
        return False
    except Exception as e:
        print(f"GENERALNA GREŠKA: {e}")
        return False

def run_scraper():
    url = "https://oldsite.mozzartbet.com/sr#/livescores"
    
    user_in = input("Pritisni ENTER za JUČE ili unesi datum (YYYY-MM-DD): ").strip()
    target_day = user_in if user_in else (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    print(f"\nTražimo mečeve za 'fudbalski dan': {target_day} (05:00 -> 05:00)")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.goto(url)

        print("\nNamesti datum na Mozzartu i pritisni ENTER...")
        input()

        competitions = page.query_selector_all(".competition")
        
        print(f"{'LIGA':<20} | {'MEČ':<30} | {'MARŽA':<8} | {'DESTINACIJA'}")
        print("-" * 85)

        for comp in competitions:
            league_raw = comp.query_selector(".leagueheader")
            if not league_raw: 
                continue
            
            league_name = format_league_name(league_raw.inner_text())

            for row in comp.query_selector_all(".match-row"):
                try:
                    time_raw = row.query_selector(".date-time-white")
                    if not time_raw: continue
                    sql_dt = clean_mozzart_date(time_raw.inner_text().strip())
                    
                    if not is_in_time_window(sql_dt, target_day):
                        continue
                    
                    team_spans = row.query_selector(".pairs").query_selector_all("span")
                    home = team_spans[0].inner_text().strip()
                    away = team_spans[1].inner_text().strip()
                    
                    g_domaci, g_gost = None, None
                    score_container = row.query_selector(".results")
                    
                    if score_container:
                        active_spans = score_container.query_selector_all("span.active")
                        if len(active_spans) >= 2:
                            g_domaci = active_spans[0].inner_text().strip()
                            g_gost = active_spans[1].inner_text().strip()
                        else:
                            first_div = score_container.query_selector("div")
                            if first_div:
                                first_div_spans = first_div.query_selector_all("span")
                                if len(first_div_spans) >= 2:
                                    g_domaci = first_div_spans[0].inner_text().strip()
                                    g_gost = first_div_spans[1].inner_text().strip()

                    odd_el = row.query_selector(".match-right").query_selector_all(".odd-font")
                    if len(odd_el) < 3: continue
                    
                    k1 = odd_el[0].inner_text().strip().replace(',', '.')
                    kX = odd_el[1].inner_text().strip().replace(',', '.')
                    k2 = odd_el[2].inner_text().strip().replace(',', '.')
                    if "-" in [k1, kX, k2]: continue

                    margin = calculate_margin(k1, kX, k2)
                    data = (league_name, home, away, sql_dt, k1, kX, k2, g_domaci, g_gost)

                    target_table = None
                    if league_name in ELITNE_LIGE or (0.0 <= margin <= 4.0):
                        target_table = "klad"
                    elif (4.0 < margin <= 6.0) and (2.00 <= float(k1) <= 4.00):
                        target_table = "igrao"

                    if target_table:
                        if save_to_db(target_table, data):
                            print(f"{league_name[:20]:<20} | {home[:13]}-{away[:13]:<15} | {margin:<8}% | -> {target_table}")
                
                except Exception as e:
                    continue

        print("\nProces završen.")
        browser.close()

if __name__ == "__main__":
    run_scraper()