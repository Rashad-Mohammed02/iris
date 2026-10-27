"""Check that the Meta Model API key works. Prints the reply, never the key."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.muse import ask, DEFAULT_MODEL  # noqa: E402

print("Model:", DEFAULT_MODEL)
print("Text reply:", ask("Be brief.", "Say hello in five words.", label="check"))

schema = {
    "title": "check",
    "type": "object",
    "properties": {"ok": {"type": "boolean"}, "word": {"type": "string"}},
    "required": ["ok", "word"],
    "additionalProperties": False,
}
print("JSON reply:", ask("Reply in JSON.", "Set ok to true and word to 'circle'.", schema=schema, label="check"))
