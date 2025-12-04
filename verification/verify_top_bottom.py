from playwright.sync_api import sync_playwright
import time
import json
import traceback

def verify_top_bottom():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1000, 'height': 800})
        page = context.new_page()

        # Define mocks for a "sandwich" scenario to force Top/Bottom
        # Middle Place needs to be squeezed by Left and Right neighbors
        base_lat = 51.505
        base_lon = -0.09

        # NOTE: address.city determines the Place Title in the App logic.
        mocks = {
            "Middle Place": {
                "lat": str(base_lat),
                "lon": str(base_lon),
                "display_name": "Middle Place, London",
                "address": {"city": "Middle Place"}
            },
            "Left Blocker": {
                "lat": str(base_lat),
                "lon": str(base_lon - 0.0015), # ~100m Left
                "display_name": "Left Blocker",
                "address": {"city": "Left Blocker"}
            },
            "Right Blocker": {
                "lat": str(base_lat),
                "lon": str(base_lon + 0.0015), # ~100m Right
                "display_name": "Right Blocker",
                "address": {"city": "Right Blocker"}
            },
             "Top Blocker": {
                "lat": str(base_lat + 0.001),
                "lon": str(base_lon),
                "display_name": "Top Blocker",
                "address": {"city": "Top Blocker"}
            },
            "Bottom Blocker": {
                "lat": str(base_lat - 0.001),
                "lon": str(base_lon),
                "display_name": "Bottom Blocker",
                "address": {"city": "Bottom Blocker"}
            }
        }

        def handle_route(route):
            url = route.request.url
            if "nominatim.openstreetmap.org/search" in url:
                import urllib.parse
                parsed = urllib.parse.urlparse(url)
                params = urllib.parse.parse_qs(parsed.query)
                q = params.get('q', [''])[0]

                result = []
                for key, data in mocks.items():
                    if key in q:
                        result = [{
                            "lat": data["lat"],
                            "lon": data["lon"],
                            "display_name": data["display_name"],
                            "address": data["address"],
                            "boundingbox": ["51.4", "51.6", "-0.1", "0.0"]
                        }]
                        break

                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(result)
                )
            else:
                route.continue_()

        page.route("**/*", handle_route)

        page.goto("http://localhost:3000")
        page.wait_for_selector("button:has-text('Add Place')")

        def add_place(name):
            print(f"Adding {name}...")
            try:
                page.click("button:has-text('Add Place')")
                page.fill("input[placeholder*='Type to search']", name)

                # Wait for results in the dialog
                result_selector = f".fixed li:has-text('{name}')"
                page.wait_for_selector(result_selector)
                page.click(result_selector)

                # Wait for it to appear in the Places list
                # Relaxed selector: just check if text appears in the list container
                # The text in the list will match the 'city' in the mock, which matches 'name' now
                list_selector = f"div[role='list'] >> text='{name}'"
                page.wait_for_selector(list_selector)
            except Exception as e:
                print(f"Failed to add {name}: {e}")
                page.screenshot(path=f"verification/error_adding_{name.replace(' ', '_')}.png")
                raise e

        try:
            # Add blockers first to establish "existing bounds"
            add_place("Left Blocker")
            add_place("Right Blocker")
            # Now add middle, it should see Left and Right occupied
            add_place("Middle Place")

            # Force zoom to relevant area
            print("Focusing on Middle Place...")
            page.dblclick("div[role='list'] >> text='Middle Place'")
            time.sleep(3) # Wait for zoom

            print("Taking screenshot 1 (Horizontal Squeeze)...")
            page.screenshot(path="verification/top_bottom_test_1.png")

            # Test 2: Vertical Squeeze (Force Left/Right)
            # Clear Places
            print("Clearing places...")
            page.reload()
            page.wait_for_selector("button:has-text('Add Place')")

            add_place("Top Blocker")
            add_place("Bottom Blocker")
            add_place("Middle Place")

            print("Focusing on Middle Place...")
            page.dblclick("div[role='list'] >> text='Middle Place'")
            time.sleep(3)

            print("Taking screenshot 2 (Vertical Squeeze)...")
            page.screenshot(path="verification/top_bottom_test_2.png")

        except Exception as e:
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    verify_top_bottom()
