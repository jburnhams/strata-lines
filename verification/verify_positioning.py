from playwright.sync_api import sync_playwright
import time
import json

def verify_positioning():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a slightly smaller viewport to ensure density if needed, or standard to match user
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Define mocks
        mocks = {
            "Tower of London": {
                "lat": "51.5081",
                "lon": "-0.0759",
                "display_name": "Tower of London, London, UK",
                "address": {"city": "Tower of London"}
            },
            "Tower Bridge": {
                "lat": "51.5055",
                "lon": "-0.0754",
                "display_name": "Tower Bridge, London, UK",
                "address": {"city": "Tower Bridge"}
            },
            "HMS Belfast": {
                "lat": "51.5066",
                "lon": "-0.0813",
                "display_name": "HMS Belfast, London, UK",
                "address": {"city": "HMS Belfast"}
            }
        }

        # Intercept network requests
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
                            "boundingbox": ["51.5", "51.6", "-0.1", "0.0"]
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
            page.click("button:has-text('Add Place')")
            page.fill("input[placeholder*='Type to search']", name)
            page.wait_for_selector(f"li:has-text('{name}')")
            page.click("li:first-child")
            page.wait_for_selector(f"div:has-text('{name}')")

        add_place("Tower of London")
        add_place("Tower Bridge")
        add_place("HMS Belfast")

        # Zoom in by double-clicking the title text in the list
        print("Double-clicking HMS Belfast to zoom...")
        # Target the span specifically which is inside the clickable div
        page.dblclick("span:text-is('HMS Belfast')")

        # Wait for map to flyTo/zoom
        time.sleep(3)

        print("Taking screenshot...")
        page.screenshot(path="verification/positioning_test.png")
        print("Done.")

        browser.close()

if __name__ == "__main__":
    verify_positioning()
