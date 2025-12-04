from playwright.sync_api import sync_playwright
import time

def verify_positioning():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to app
        page.goto("http://localhost:3000")

        # Wait for map to load
        page.wait_for_selector("button:has-text('Add Place')")

        # Add first place
        page.click("button:has-text('Add Place')")
        page.fill("input[placeholder*='Type to search']", "Tower of London")

        # Wait for results
        page.wait_for_selector("li:has-text('Tower of London')")
        # Click first result
        page.click("li:first-child")

        time.sleep(2) # Wait for map to move/render

        # Add second place
        page.click("button:has-text('Add Place')")
        page.fill("input[placeholder*='Type to search']", "Tower Bridge")

        page.wait_for_selector("li:has-text('Tower Bridge')")
        page.click("li:first-child")

        time.sleep(2) # Wait for map to settle

        # Take screenshot
        page.screenshot(path="verification/positioning_test.png")

        browser.close()

if __name__ == "__main__":
    verify_positioning()
