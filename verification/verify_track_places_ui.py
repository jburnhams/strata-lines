from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser error: {err}"))

        print("Loading app...")
        page.goto("http://localhost:3000")

        # Wait for "Add Files" button to ensure loaded
        page.get_by_text("Add Files").wait_for()

        print("Uploading file...")
        file_path = os.path.abspath("verification/sample.gpx")

        # Try finding input by testid
        input_loc = page.locator('data-testid=hidden-file-input')
        input_loc.set_input_files(file_path)

        # Wait for track to appear
        print("Waiting for track...")
        try:
            page.get_by_text("Test Track").wait_for(timeout=10000)
        except Exception as e:
            print(f"Failed to find track: {e}")
            page.screenshot(path="verification/error.png")
            raise e

        # Click Manage Places (Pin Icon)
        print("Opening places panel...")
        page.get_by_title("Manage Places").click()

        # Verify Panel opens
        expect(page.get_by_text("Places:")).to_be_visible()

        # Click Start Place (S button)
        print("Adding start place...")
        page.get_by_title("Add Start Place").click()

        # Wait for it to become active
        # Active button title changes to "Remove Start Place"
        expect(page.get_by_title("Remove Start Place")).to_be_visible()

        print("Taking screenshot...")
        page.screenshot(path="verification/track_places_ui.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
