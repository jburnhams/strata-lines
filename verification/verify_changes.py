from playwright.sync_api import sync_playwright

def verify_places(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

    # Load the app
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Wait for app to load
    try:
        page.wait_for_selector("text=Add Files", timeout=10000)
    except Exception:
        if page.is_visible("text=Processing..."):
            print("App is stuck in Processing state.")
        page.screenshot(path="verification/timeout.png")
        raise

    print("App loaded.")

    # 0. Add a Place to enable buttons
    print("Adding a place...")
    page.click("text=Add Place")

    search_input = page.wait_for_selector("input[placeholder*='Type to search']", timeout=5000)
    search_input.fill("London")
    page.wait_for_timeout(2000)

    print("Waiting for search results...")
    try:
        page.wait_for_selector("li", timeout=10000)
        page.click("li")
    except Exception as e:
        print(f"Search failed: {e}")
        page.screenshot(path="verification/search_fail.png")
        raise

    print("Place selected. Waiting for list update...")

    try:
        page.wait_for_selector("div[role='listitem']", timeout=5000)
        print("List item found.")
    except Exception:
        print("List item not found. Place might not be added.")
        page.screenshot(path="verification/add_fail.png")
        raise

    # 1. Verify "Export" button in PlaceControls
    print("Checking Export button...")
    page.wait_for_selector("text=Places")

    export_btn = page.locator("button:has-text('Export')").first

    if export_btn.count() > 0:
        if export_btn.is_disabled():
            print("Export button is disabled!")
            page.screenshot(path="verification/disabled_export.png")
        else:
            print("Export button is enabled. Clicking...")
            export_btn.click()
            try:
                page.wait_for_selector("text=GeoJSON", timeout=3000)
                print("Export menu opened.")
                page.screenshot(path="verification/export_menu.png")
                # Close menu
                page.click("body", position={"x": 0, "y": 0})
            except Exception:
                print("Export menu did not open.")
                page.screenshot(path="verification/menu_fail.png")
    else:
        print("Export button not found!")

    # 2. Verify Multi-Select
    print("Verifying Multi-Select...")
    select_btn = page.locator("button:has-text('Select')")
    if select_btn.count() > 0:
        select_btn.first.click()
        page.wait_for_selector("text=0 Selected")

        checkbox = page.locator("input[type='checkbox']").first
        if checkbox.is_visible():
            checkbox.click()
            page.wait_for_selector("text=1 Selected")
            page.screenshot(path="verification/multi_select.png")
        else:
             print("Checkbox not visible.")

        page.click("button:has-text('Cancel')")
    else:
        print("Select button not found!")

    # 3. Verify Global Settings
    print("Verifying Global Settings...")
    advanced_toggle = page.locator("text=Advanced Mode")
    if advanced_toggle.count() > 0:
        advanced_toggle.click()
        page.wait_for_selector("text=Text Styling")
        page.screenshot(path="verification/global_settings.png")
    else:
        print("Advanced Mode toggle not found!")

    # 4. Verify Hover Effect (Bonus)
    print("Verifying Hover Effect...")
    # We need to find where the place is on the canvas.
    # This is hard blindly. We can assume it's in the center or use the map logic.
    # But since we zoomed to London, it should be in center.
    # Let's hover center of map.
    canvas = page.locator("canvas.leaflet-zoom-animated").first # Leaflet creates multiple canvases, usually overlay pane
    # Actually our PlaceCanvasOverlay is just a canvas in the map container
    # It has z-index 600 and pointer-events: none (wait, I changed that? No, I kept it none but handled mousemove on map).

    # We simulate hover on the map container.
    map_container = page.locator(".leaflet-container")
    bbox = map_container.bounding_box()
    if bbox:
        # Move mouse to center
        page.mouse.move(bbox["x"] + bbox["width"] / 2, bbox["y"] + bbox["height"] / 2)
        page.wait_for_timeout(500)
        # Check cursor
        # Note: canvas pointer-events: none means the map container or map pane handles it.
        # My code updates map.getContainer().style.cursor

        cursor = map_container.evaluate("el => el.style.cursor")
        print(f"Cursor at center: {cursor}")
        # It might be empty if we missed the place or logic failed.
        # But if it's 'pointer', we win.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_places(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
