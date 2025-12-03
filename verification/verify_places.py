from playwright.sync_api import Page, expect, sync_playwright

def verify_places_ui(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Wait for app to load
    print("Waiting for title...")
    expect(page).to_have_title("StrataLines - GPS Track Visualizer")

    # Wait for ControlsPanel to appear
    print("Waiting for ControlsPanel...")
    expect(page.get_by_text("StrataLines")).to_be_visible()

    # Check for Places section header
    print("Checking for Places section...")
    # The button contains "Places" text and the count
    places_header = page.locator("button").filter(has_text="Places")
    expect(places_header).to_be_visible()

    # Check count badge (should be 0 initially)
    # The badge is inside the button, text "0"
    expect(places_header).to_contain_text("0")

    # Check "Add Place" button
    print("Checking Add Place button...")
    add_place_btn = page.get_by_role("button", name="Add Place")
    expect(add_place_btn).to_be_visible()

    # Click Add Place and handle alert
    print("Clicking Add Place...")
    page.on("dialog", lambda dialog: dialog.accept())
    add_place_btn.click()

    # Check "Advanced Mode" toggle
    print("Toggling Advanced Mode...")
    advanced_toggle = page.get_by_text("Advanced Mode")
    advanced_toggle.click()

    # Check Place Settings
    print("Checking Place Settings...")
    expect(page.get_by_text("Place Settings")).to_be_visible()
    expect(page.get_by_text("Title Size")).to_be_visible()
    expect(page.get_by_text("Show Icons Globally")).to_be_visible()

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/places_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_places_ui(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
