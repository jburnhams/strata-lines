import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Wait for app to load
    print("Waiting for app to load...")
    page.wait_for_selector("button:has-text('Add Place')")

    # Add a place manually
    print("Adding a place...")
    page.screenshot(path="verification/step1_before_add.png")
    page.locator("button", has_text="Add Place").click()

    print("Waiting for dialog...")
    page.wait_for_selector("text=Search Location")

    page.screenshot(path="verification/step2_after_add.png")

    # Geocoding dialog opens
    # Type "London"
    page.locator("input[placeholder*='Type to search']").fill("London")
    # Wait for results
    page.wait_for_selector("li:has-text('London')", timeout=10000)
    # Click first result
    page.click("li:has-text('London')")

    # Wait for place to appear in list
    print("Waiting for place in list...")
    page.wait_for_selector("div:has-text('London')")

    # Double click to zoom
    print("Zooming to place...")
    # Target the text inside the list item to avoid clicking buttons
    page.locator("span", has_text="London").first.dblclick()

    # Wait for map to move/zoom (animation)
    time.sleep(3)

    # Click the center of the map.
    # Map takes remaining space. Assuming ControlsPanel is ~350px.
    # Map width approx 900px. Center approx 450px.
    # Let's verify map container size if possible, or just guess.
    map_size = page.evaluate("() => { const el = document.querySelector('.leaflet-container'); return { width: el.clientWidth, height: el.clientHeight }; }")
    print(f"Map size: {map_size}")

    center_x = map_size['width'] / 2
    center_y = map_size['height'] / 2

    print(f"Clicking at {center_x}, {center_y}...")
    page.mouse.click(center_x, center_y)

    # Wait for overlay
    print("Waiting for edit overlay...")
    try:
        page.wait_for_selector("text=Edit Place", timeout=5000)
        print("Overlay opened!")
    except:
        print("Overlay did not open. Trying slightly offset click...")
        # Maybe title is slightly off center?
        page.mouse.click(center_x + 10, center_y + 10)
        page.wait_for_selector("text=Edit Place", timeout=5000)

    # Modify title
    print("Modifying title...")
    # Find input near "Title" label
    page.locator("div", has_text="Title").locator("input").first.fill("New London")
    page.keyboard.press("Enter")

    # Verify update in list (optimistic update should happen)
    expect(page.locator("span", has_text="New London").first).to_be_visible()

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
