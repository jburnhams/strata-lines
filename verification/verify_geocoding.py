from playwright.sync_api import sync_playwright

def verify_geocoding_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Navigate to the app
            page.goto("http://localhost:3000")

            # Wait for map or initial UI to load
            page.wait_for_timeout(5000)

            # Click "Add Place" button
            page.get_by_role("button", name="Add Place").click()

            # Verify dialog opens
            dialog = page.locator(".fixed.inset-0")
            dialog.wait_for()

            # Type in search box
            search_input = page.get_by_placeholder("Search for a location...")
            search_input.fill("London")

            page.wait_for_timeout(2000)

            # Take screenshot
            page.screenshot(path="verification/geocoding_dialog.png")
            print("Screenshot saved to verification/geocoding_dialog.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_geocoding_dialog()
