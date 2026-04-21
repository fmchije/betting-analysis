import os
import mysql.connector
from bs4 import BeautifulSoup
from datetime import datetime

# --- KONFIGURACIJA ---
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'admin',
    'database': 'klad'
}

HTML_FILE_PATH = r'C:\Users\Filip\Downloads\1604.html'

def update_opening_odds():
    if not os.path.exists(HTML_FILE_PATH):
        print(f"GREŠKA: Fajl nije pronađen: {HTML_FILE_PATH}")
        return

    print(f"Analiziram fajl: {HTML_FILE_PATH}...")
    
    with open(HTML_FILE_PATH, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Na sačuvanim stranicama Mozzart često koristi .match klasu za ceo red
    matches = soup.select(".match") 
    if not matches:
        # Fallback ako je struktura ipak slična onoj od ranije
        matches = soup.select(".match-row")

    updated_count = 0

    for match in matches:
        try:
            # 1. Izvlačenje timova
            # Tražimo spanove unutar .pairs (ili sličnog kontejnera)
            team_elements = match.select(".pairs span")
            if not team_elements: continue
            
            home = team_elements[0].get_text(strip=True)
            away = team_elements[1].get_text(strip=True)

            # 2. Izvlačenje kvota iz tvog novog HTML-a (.partvar.odds)
            odds_elements = match.select(".partvar.odds .odd-font")
            if len(odds_elements) < 3:
                # Fallback na staru klasu ako zatreba
                odds_elements = match.select(".odd-font")
            
            if len(odds_elements) < 3: continue

            k1_pre = odds_elements[0].get_text(strip=True).replace(',', '.')
            kX_pre = odds_elements[1].get_text(strip=True).replace(',', '.')
            k2_pre = odds_elements[2].get_text(strip=True).replace(',', '.')

            # 3. Pametni SQL UPDATE
            # Koristimo % % oko imena timova da izbegnemo probleme sa "Inter" vs "Inter Milan"
            for table in ['klad', 'igrao']:
                update_query = f"""
                    UPDATE {table} 
                    SET 1pre = %s, Xpre = %s, 2pre = %s 
                    WHERE (Domacin LIKE %s OR %s LIKE CONCAT('%', Domacin, '%'))
                      AND (Gost LIKE %s OR %s LIKE CONCAT('%', Gost, '%'))
                      AND 1pre IS NULL
                """
                # Pokušavamo da uparimo što približnije
                cursor.execute(update_query, (k1_pre, kX_pre, k2_pre, 
                                            f"%{home}%", home, 
                                            f"%{away}%", away))
                
                if cursor.rowcount > 0:
                    print(f"Upešno: {home} - {away} ({k1_pre}, {kX_pre}, {k2_pre}) -> {table}")
                    updated_count += 1
                    break

        except Exception as e:
            continue

    conn.commit()
    cursor.close()
    conn.close()
    print(f"\nZavršeno! Ažurirano: {updated_count}")

if __name__ == "__main__":
    update_opening_odds()