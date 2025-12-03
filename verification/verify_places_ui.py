from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_places_ui(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Wait for app to load (checking for title or main elements)
    expect(page.get_by_text("StrataLines")).to_be_visible(timeout=10000)

    # Check for "Places" section header (h2)
    print("Checking for Places section...")
    places_header = page.get_by_role("heading", name="Places").first
    # Or strict
    # places_header = page.get_by_role("heading", name="Places", level=2)

    expect(places_header).to_be_visible()

    # Check if "No places added yet" is visible
    expect(page.get_by_text("No places added yet.")).to_be_visible()

    # Check Add Place button
    add_place_btn = page.get_by_role("button", name="Add Place")
    expect(add_place_btn).to_be_visible()

    # Handle alert
    page.on("dialog", lambda dialog: dialog.accept())

    # Click Add Place
    print("Clicking Add Place...")
    add_place_btn.click()

    # Take screenshot
    time.sleep(1)
    print("Taking screenshot...")
    page.screenshot(path="verification/places_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to desktop size
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_places_ui(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
