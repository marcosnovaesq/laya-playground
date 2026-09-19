"""Self-hosted server exposing the convaiinnovations/laya decision model behind
the same wire contract as the TypeSafe Jev API (https://docs.typesafe.ai/api.md):

    POST /v1/systemone
    Authorization: Bearer <API_KEY>   (optional here; enable with LAYA_API_KEY)
    Content-Type: application/json

A client written against TypeSafe's API can talk to this server (or vice versa)
by changing only the base URL, since both accept the same request body and
return the same {model, answers, usage} response shape.
"""
import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .model import get_agent, run_system_one
from .schemas import SystemOneRequest

API_KEY = os.environ.get("LAYA_API_KEY")  # unset -> auth disabled, open local server
EAGER_LOAD = os.environ.get("LAYA_EAGER_LOAD", "1") != "0"

app = FastAPI(
    title="Laya Server",
    description="Local System 1 decision API, drop-in compatible with the TypeSafe Jev /v1/systemone contract.",
    version="0.1.0",
)

# Local dev server meant to be called from a browser-based client (e.g. laya-client1) on
# another origin/port; there are no cookies or ambient credentials at risk here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, err_type: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"type": err_type, "message": message}})


@app.on_event("startup")
def _startup() -> None:
    if EAGER_LOAD:
        get_agent()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/systemone")
def systemone(payload: SystemOneRequest, authorization: str | None = Header(default=None)):
    if API_KEY:
        token = (authorization or "").removeprefix("Bearer ").strip()
        if token != API_KEY:
            return _error(401, "authentication_error", "Missing or invalid API key")

    if not payload.questions:
        return _error(422, "invalid_request_error", "`questions` must contain at least one entry")

    try:
        return run_system_one(payload.state, payload.questions, payload.model)
    except Exception as exc:  # model/runtime failure -> surface as 500, matching Jev's 5xx behavior
        raise HTTPException(status_code=500, detail=str(exc))
