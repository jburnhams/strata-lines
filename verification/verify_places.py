from playwright.sync_api import sync_playwright

def verify_places(page):
    page.goto('http://localhost:3000')

    # Wait for app to load by checking for Places section
    page.wait_for_selector('text=Places', timeout=60000)

    # Take a screenshot of the initial state
    page.screenshot(path='verification/initial_state.png')

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_places(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
