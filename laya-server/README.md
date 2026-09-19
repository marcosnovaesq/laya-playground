# laya-server

A tiny FastAPI server around the [`laya`](https://huggingface.co/convaiinnovations/laya)
decision model (`pip install laya`) that speaks the exact same wire contract as
[TypeSafe's Jev API](https://docs.typesafe.ai/introduction) (`POST /v1/systemone`).

Point a client at this server instead of `https://api.typesafe.ai`, and it works
unmodified — same request body, same response shape. Laya runs locally (CPU, CUDA,
or Apple MPS), so there's no API key and no per-token cost required to use it.

## Install

```bash
cd laya-server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

The first request (or server startup, by default) downloads the model weights
from the Hugging Face Hub and caches them locally.

Config is via environment variables — see `.env.example`:

- `LAYA_API_KEY` — if set, requests must send `Authorization: Bearer <key>`. Unset by default (open local server).
- `LAYA_MODEL_ID` — HF repo id or local path. Defaults to `convaiinnovations/laya`.
- `LAYA_DEVICE` — `cuda` / `mps` / `cpu`. Auto-detected if unset.
- `LAYA_EAGER_LOAD` — set to `0` to load the model lazily on first request instead of at startup.

## API

### `POST /v1/systemone`

Same schema as [docs.typesafe.ai/api.md](https://docs.typesafe.ai/api.md):

```json
{
  "state": "Help! My payouts have been failing for 3 days.",
  "model": "laya-latest",
  "questions": {
    "is_urgent": {
      "type": "noul",
      "instructions": "Does this convey urgency?",
      "criteria": { "true": "Explicitly time-sensitive", "false": "No urgency expressed" }
    }
  }
}
```

```json
{
  "model": "laya-latest",
  "answers": {
    "is_urgent": { "type": "noul", "noul": 0.92, "confidence": 0.84 }
  },
  "usage": { "input_tokens": 41, "output_tokens": 0 }
}
```

Question types (`choice`, `score`, `noul`) and answer shapes match TypeSafe's
primitives exactly:

| type | request `criteria` | response fields |
|---|---|---|
| `choice` | `{option: description \| null}` | `choice`, `probabilities`, `confidence` |
| `score` | `[level0, level1, ...]` | `score`, `legend`, `probabilities`, `confidence` |
| `noul` | `{true?, false?}` (optional) | `noul` |

Errors: `401` (bad/missing key, only if `LAYA_API_KEY` is set), `422` (malformed
request), `500` (model/runtime failure). Since this is a local, non-rate-limited
server, `429`/`529` never apply.

### `GET /health`

Liveness check, returns `{"status": "ok"}`.

## Swapping between TypeSafe and laya-server

Because the contract is identical, a client just needs its base URL (and auth)
made configurable:

```python
import os
import requests

BASE_URL = os.environ.get("SYSTEMONE_BASE_URL", "https://api.typesafe.ai")
API_KEY = os.environ.get("SYSTEMONE_API_KEY", "")

resp = requests.post(
    f"{BASE_URL}/v1/systemone",
    headers={"Authorization": f"Bearer {API_KEY}"} if API_KEY else {},
    json={
        "state": {"subject": "Duplicate billing on invoice #4411"},
        "model": "laya-latest",  # or "jev-latest" against the real TypeSafe API
        "questions": {
            "department": {
                "type": "choice",
                "instructions": "Which department should handle this?",
                "criteria": {"billing": "invoices, refunds", "technical": "bugs, outages"},
            }
        },
    },
)
print(resp.json())
```

Run it against TypeSafe with `SYSTEMONE_BASE_URL=https://api.typesafe.ai
SYSTEMONE_API_KEY=sk-...`, or against this server with
`SYSTEMONE_BASE_URL=http://localhost:8000` — no other code changes.
