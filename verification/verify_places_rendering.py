from playwright.sync_api import sync_playwright
import time
import os

def verify_places_rendering():
    # Ensure verification directory exists
    os.makedirs("verification", exist_ok=True)

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to ensure desktop layout
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Wait for Map loaded
            print("Waiting for map...")
            page.wait_for_selector(".leaflet-container", timeout=10000)
            time.sleep(2) # Wait for initial tiles

            # Take initial screenshot
            page.screenshot(path="verification/initial_load.png")
            print("Initial screenshot taken")

            # Click "Add Place" button
            # Button is in PlaceControls which is in PlacesSection
            print("Locating Add Place button...")
            add_btn = page.get_by_text("Add Place", exact=False)

            # There might be multiple "Add Place" texts?
            # The button has "Add Place" span.
            # We want the button.

            # Click
            if add_btn.count() > 0:
                add_btn.first.click()
                print("Clicked Add Place")

                # Wait for dialog
                time.sleep(1)
                page.screenshot(path="verification/add_place_dialog.png")
                print("Dialog screenshot taken")

                # Search input
                print("Searching for London...")
                search_input = page.get_by_placeholder("Type to search (min 3 chars)...")
                if search_input.count() > 0:
                    search_input.fill("London")
                    search_input.press("Enter")

                    # Wait for results
                    print("Waiting for results...")
                    # Results are list items in the dialog
                    # Assuming some delay for API mock or real API
                    # Note: We are using real API in Geocoding service unless mocked in app?
                    # The app uses real API if configured.

                    try:
                        # Wait for a result
                        page.wait_for_selector("ul li", timeout=15000)

                        # Click first result
                        results = page.locator("ul li")
                        if results.count() > 0:
                            print(f"Found {results.count()} results. Clicking first...")
                            results.first.click()

                            # Place should be added and map zoomed
                            time.sleep(3)

                            # Verify place list item exists
                            # Check if "London" or similar appears in list
                            # page.get_by_text("London").first.is_visible()

                            page.screenshot(path="verification/place_added.png")
                            print("Place added screenshot taken: verification/place_added.png")
                        else:
                            print("No results found.")
                    except Exception as e:
                        print(f"Error waiting/clicking results: {e}")
                else:
                    print("Search input not found")
            else:
                print("Add Place button not found")

        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_places_rendering()
