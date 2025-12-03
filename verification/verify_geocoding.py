from playwright.sync_api import sync_playwright

def verify_geocoding_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            # Navigate to the app
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Wait for map to load (or at least the controls)
            print("Waiting for controls...")
            page.wait_for_selector("text=Add Place")

            # Click "Add Place" button
            print("Clicking Add Place...")
            page.click("text=Add Place")

            # Verify dialog opens
            print("Verifying dialog...")
            page.wait_for_selector("input[placeholder='Search for a location...']")

            # Type "Paris" into search
            print("Typing search query...")
            page.fill("input[placeholder='Search for a location...']", "Paris")

            # Wait for ANY result to appear (wait for a list item)
            print("Waiting for results list...")
            # We look for a list item inside the dialog
            page.wait_for_selector("ul > li", timeout=15000)

            # Get text of first result
            first_result = page.text_content("ul > li:first-child")
            print(f"First result found: {first_result}")

            if "Paris" not in first_result:
                print("Warning: 'Paris' not found in first result.")

            # Take screenshot with results
            print("Taking screenshot 2...")
            page.screenshot(path="verification/geocoding_dialog_results.png")

            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/geocoding_failure.png")

            # Try to print what IS visible
            try:
                content = page.content()
                print("Page content length:", len(content))
                # Check for error message
                error_msg = page.locator(".text-red-500").text_content() if page.locator(".text-red-500").is_visible() else "No error msg"
                print(f"Visible error message: {error_msg}")
            except:
                pass
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_geocoding_dialog()
