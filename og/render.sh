#!/usr/bin/env bash
#
# Renders og/card.html to static/img/og.jpg at 1200x630.
#
# Uses headless Chrome (already on most dev machines) plus macOS `sips`, so the
# project needs no extra npm dependencies. Run after editing og/card.html:
#
#   npm run og
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/og/card.html"
png="$root/og/.render.png"
out="$root/static/img/og.jpg"

# JPEG quality for the final file. The card is photographic, so JPEG beats PNG
# on size by roughly 10x with no visible difference at feed scale.
quality=82

chrome=""
for candidate in \
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
	"/Applications/Chromium.app/Contents/MacOS/Chromium" \
	"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
	"$(command -v google-chrome || true)" \
	"$(command -v chromium || true)"; do
	if [ -n "$candidate" ] && [ -x "$candidate" ]; then
		chrome="$candidate"
		break
	fi
done

if [ -z "$chrome" ]; then
	echo "error: no Chrome/Chromium found. Install Google Chrome, or open" >&2
	echo "       og/card.html in a browser and export a 1200x630 screenshot" >&2
	echo "       to static/img/og.jpg by hand." >&2
	exit 1
fi

echo "Rendering og/card.html with $(basename "$chrome")..."

# --virtual-time-budget gives the Google Fonts stylesheet time to load and
# apply; without it Chrome can screenshot mid-swap and fall back to Georgia.
"$chrome" \
	--headless \
	--disable-gpu \
	--hide-scrollbars \
	--force-device-scale-factor=2 \
	--window-size=1200,630 \
	--virtual-time-budget=10000 \
	--screenshot="$png" \
	"file://$src" >/dev/null 2>&1

if [ ! -f "$png" ]; then
	echo "error: Chrome produced no screenshot" >&2
	exit 1
fi

# Rendered at 2x for crisp type, then downsampled to the 1200x630 that the
# scrapers actually want.
sips --resampleHeightWidth 630 1200 "$png" >/dev/null
sips -s format jpeg -s formatOptions "$quality" "$png" --out "$out" >/dev/null
rm -f "$png"

echo "Wrote $(cd "$root" && echo "${out#$root/}") ($(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixel/ {printf "%s", $2 " "}' | awk '{print $1"x"$2}'), $(du -h "$out" | cut -f1))"
