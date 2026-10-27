"""Fetch the Utrecht University set of generated Instagram packages (11 accounts).

Boeschoten, van den Goorbergh and Oberski (2021). "Instagram data-download example
dataset". Zenodo. https://doi.org/10.5281/zenodo.4472606. License CC BY 4.0.
Researchers created these accounts and used them for about a week; names and
contact details were replaced with random values.

Only the JSON files are kept (no photos or videos), in data/real_exports/<account>/.
That folder is not committed; run this script to get it.

    python3 scripts/fetch_real_exports.py
"""

import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "real_exports"
RECORD = "https://zenodo.org/api/records/4472606"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(RECORD, timeout=60) as r:
        record = json.load(r)
    for f in record["files"]:
        if not f["key"].endswith(".zip"):
            continue
        name = f["key"][:-4]
        dest = OUT / name
        if dest.exists() and any(dest.glob("*.json")):
            print("have", name)
            continue
        with urllib.request.urlopen(f["links"]["self"], timeout=300) as r:
            data = r.read()
        dest.mkdir(exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for member in z.namelist():
                p = Path(member)
                if p.suffix == ".json" and len(p.parts) == 1:  # top-level JSON files only
                    (dest / p.name).write_bytes(z.read(member))
        print("got", name)
    print("saved to", OUT.relative_to(ROOT))


if __name__ == "__main__":
    sys.exit(main())
