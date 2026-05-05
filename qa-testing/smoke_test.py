import asyncio
from playwright.async_api import async_playwright

async def run_smoke_test():
    async with async_playwright() as p:
        # Pokrećemo browser (headless=True znači da ne vidimo prozor, što je brže)
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("🚀 Starting Smoke Test: Betting Analyzer Dashboard")
        
        try:
            # 1. Provera da li se sajt učitava
            await page.goto("http://localhost:5173/") # Zameni sa tvojim URL-om
            await page.wait_for_load_state("networkidle")
            
            # 2. Provera naslova ili nekog ključnog elementa
            header = page.locator("h2:has-text('Backtesting Analiza')")
            await expect(header).to_be_visible()
            print("✅ Dashboard header 'Backtesting Analiza' is visible.")

            # 3. Provera da li su podaci stigli iz API-ja (npr. provera da li tabela postoji)
            # Čekamo da se pojavi selektor za tvoju tabelu sa podacima
            await page.wait_for_selector("tbody tr", timeout=8000)
            rows = await page.locator("tbody tr").count()
            if rows > 0:
                print(f"✅ Data table loaded with {rows} match entries.")
            else:
                raise Exception("Table loaded but no matches found."
                
            # 4. Provera dugmeta za analizu (da potvrdimo da je UI interaktivan)
            analyze_btn = page.locator("button:has-text('POKRENI ANALIZU')")
            await expect(analyze_btn).to_be_enabled()
            print("✅ Analysis button is present and enabled.")

            # 5. Screenshot kao dokaz za QA Report
            await page.screenshot(path="dashboard_check.png")
            print("📸 Screenshot saved as dashboard_check.png")

        except Exception as e:
            print(f"❌ Test Failed: {e}")
            await page.screenshot(path="failure_report.png")
        
        finally:
            await browser.close()

asyncio.run(run_smoke_test())