import os
import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Attach listeners
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        try:
            # Go to app
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Wait for app to load
            print("Waiting for app title...")
            expect(page.get_by_text("StrataLines")).to_be_visible(timeout=10000)

            # Upload file
            file_path = os.path.abspath("test_track.gpx")
            print(f"Uploading file: {file_path}")

            # Force show the input to ensure interaction works?
            # page.evaluate("document.querySelector('input[type=file]').classList.remove('hidden')")

            page.set_input_files("input[type='file']", file_path)

            print("Waiting for track to appear...")
            # Wait for track to appear
            try:
                expect(page.get_by_text("Test Track")).to_be_visible(timeout=10000)
            except AssertionError:
                print("Track not found. Saving screenshot.")
                page.screenshot(path="verification/step2_track_not_found.png")
                raise

            page.screenshot(path="verification/step2_track_found.png")

            # Find the "Manage Places" button (Pin icon)
            print("Opening Manage Places...")
            manage_btn = page.locator("button[title='Manage Places']")
            expect(manage_btn).to_be_visible()
            manage_btn.click()

            # Verify Places section appears
            expect(page.get_by_text("Places:")).to_be_visible()

            # Find "Add Start Place" button
            print("Adding Start Place...")
            start_btn = page.locator("button[title='Add Start Place']")
            expect(start_btn).to_be_visible()

            # Click it
            start_btn.click()

            # Wait for it to become "Remove Start Place"
            remove_btn = page.locator("button[title='Remove Start Place']")
            expect(remove_btn).to_be_visible()

            # Click Batch Add All
            print("Batch adding all places...")
            all_btn = page.locator("button[title='Add All']")
            all_btn.click()

            # Wait for all 3 to be active
            expect(page.locator("button[title='Remove Middle Place']")).to_be_visible()
            expect(page.locator("button[title='Remove End Place']")).to_be_visible()

            # Verify place count badge (color change on pin icon)
            expect(manage_btn).to_have_class(re.compile(r"text-orange-400"))

            # Take final screenshot
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/track_places.png")
            print("Screenshot saved to verification/track_places.png")

        except Exception as e:
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
