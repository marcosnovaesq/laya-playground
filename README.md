# laya-test

A local, drop-in replacement for [TypeSafe's Jev API](https://docs.typesafe.ai/introduction)
built on the [`laya`](https://huggingface.co/convaiinnovations/laya) decision model, plus a
minimal web UI for trying it out.

Both pieces speak the exact same `POST /v1/systemone` wire contract as TypeSafe, so a client
written against the real API works against the local server unmodified — just change the base
URL. Laya runs locally (CPU, CUDA, or Apple MPS), so there's no API key and no per-token cost.

## Structure

| Directory | What it is |
|---|---|
| [`laya-server`](laya-server) | FastAPI server exposing the laya model as `/v1/systemone` |
| [`laya-client1`](laya-client1) | Dependency-free HTML/CSS/JS UI for building requests and inspecting responses |

See each directory's own README for setup and usage details.

## Quick start

```bash
# 1. Server
cd laya-server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Client (in another terminal)
cd laya-client1
python3 -m http.server 5500
```

Open http://localhost:5500, confirm the client's base URL points at
`http://localhost:8000`, click **Ping /health**, then **Load example** and **Run**.

## Why

`laya-server` lets you develop and test against the TypeSafe `/v1/systemone` contract without
network calls, API keys, or per-token cost — swap `SYSTEMONE_BASE_URL` between this server and
`https://api.typesafe.ai` to compare behavior with no other code changes. `laya-client1` is a
small harness for poking at the contract by hand while building or debugging questions.
