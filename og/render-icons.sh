#!/usr/bin/env bash
#
# Renders og/favicon.html to the app icon set in static/.
#
#   npm run icons
#
# Same zero-dependency approach as render.sh: headless Chrome for the render,
# macOS `sips` for the resizes.
#
# The page is rendered ONCE at 1024x1024 and every icon is downsampled from
# that master. Rendering each size directly does not work: headless Chrome
# enforces a minimum window size, so a request below ~256px silently captures
# only the top-left corner of a larger viewport and the centred mark falls
# outside the frame. Downsampling also antialiases the thin leaf shapes far
# better than a small native render would.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/og/favicon.html"
master="$root/og/.icon-master.png"

render=1024

# target-size:output-filename
targets=(
	"32:favicon.png"
	"180:apple-touch-icon.png"
	"192:icon-192.png"
	"512:icon-512.png"
)

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
	echo "       og/favicon.html and export the sizes by hand." >&2
	exit 1
fi

echo "Rendering og/favicon.html with $(basename "$chrome")..."

"$chrome" \
	--headless \
	--disable-gpu \
	--hide-scrollbars \
	--window-size="$render,$render" \
	--virtual-time-budget=10000 \
	--screenshot="$master" \
	"file://$src" >/dev/null 2>&1

if [ ! -f "$master" ]; then
	echo "error: Chrome produced no screenshot" >&2
	exit 1
fi

# A blank tile means the mark did not render; catch it here rather than
# shipping four green squares.
if [ "$(stat -f%z "$master" 2>/dev/null || stat -c%s "$master")" -lt 2000 ]; then
	echo "error: render looks blank (master is suspiciously small)" >&2
	rm -f "$master"
	exit 1
fi

for target in "${targets[@]}"; do
	size="${target%%:*}"
	name="${target##*:}"
	out="$root/static/$name"

	sips --resampleHeightWidth "$size" "$size" "$master" --out "$out" >/dev/null
	echo "  static/$name  ${size}x${size}  $(du -h "$out" | cut -f1 | tr -d ' ')"
done

rm -f "$master"
echo "Done."
