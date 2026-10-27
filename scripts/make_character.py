"""Draw Circle's own character with Muse Image: a sibling in the same soft, plush family
as Muse's mascot, but its own creature. Writes candidates to the folder given.

    python scripts/make_character.py OUT_DIR [--ref path/to/reference.png]
"""

import base64
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402

MODEL = "muse-image-1.0"
STYLE = ("a soft 3D plush toy character, fuzzy felt-like fur, simple tiny black dot eyes, small rosy pink cheeks, "
         "a small gentle smile, rounded bean-shaped body with stubby arms, standing, front view, centered, "
         "plain soft off-white studio background, gentle soft light, cute, calm, friendly, no text, no logo")
IDEAS = {
    "sky": "pale sky-blue fur, two small rounded ears on top of the head",
    "sage": "soft sage-green fur, one little leaf-shaped tuft on top of the head",
    "peach": "warm peach fur, a tiny round tail, small round ears",
    "lilac": "light lilac fur, a short rounded hood shape around the face",
}
SIBLING = ("Make a different character from the same family as this one: same soft plush fur, same tiny black dot eyes, "
           "rosy cheeks and gentle smile, same studio look, but a new creature with {idea}. "
           "Not the same character. Front view, centered, plain soft off-white background, no text.")


def save(resp, path):
    item = resp["data"][0]
    if item.get("b64_json"):
        path.write_bytes(base64.b64decode(item["b64_json"]))
    else:
        with urllib.request.urlopen(item["url"], context=muse._SSL) as r:
            path.write_bytes(r.read())
    print("wrote", path)


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    ref = Path(sys.argv[sys.argv.index("--ref") + 1]) if "--ref" in sys.argv else None
    for name, idea in IDEAS.items():
        try:
            if ref:
                data = "data:image/png;base64," + base64.b64encode(ref.read_bytes()).decode()
                resp = muse._post("/images/edits", {"model": MODEL, "prompt": SIBLING.format(idea=idea),
                                                    "images": [{"image_url": data}], "n": 1}, timeout=240)
                save(resp, out / f"sibling-{name}.png")
            else:
                resp = muse._post("/images/generations", {"model": MODEL, "prompt": f"{STYLE}, {idea}", "n": 1}, timeout=240)
                save(resp, out / f"new-{name}.png")
        except Exception as e:  # keep going; one failed drawing shouldn't stop the rest
            print(name, "failed:", str(e)[:300])


if __name__ == "__main__":
    main()
