from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Enable console log
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # Handle alert
    page.on("dialog", lambda dialog: dialog.accept())

    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")

    # Wait for the app to load
    expect(page.get_by_text("StrataLines")).to_be_visible(timeout=30000)

    # Check for Places section
    print("Checking for Places section")
    places_heading = page.get_by_role("heading", name="Places")
    expect(places_heading).to_be_visible()

    # Check for Add Place button
    add_btn = page.get_by_role("button", name="Add Place")
    expect(add_btn).to_be_visible()

    # Click Add Place to trigger alert
    print("Clicking Add Place")
    add_btn.click()

    # Take screenshot
    print("Taking screenshot")
    page.screenshot(path="verification/places_ui.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
