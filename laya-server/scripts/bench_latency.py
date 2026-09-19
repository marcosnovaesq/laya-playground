#!/usr/bin/env python3
"""Latency benchmark for laya-server's POST /v1/systemone endpoint.

Measures end-to-end HTTP round-trip time (client-side wall clock), not just
model inference time, so it includes request serialization, network, and
FastAPI overhead. Stdlib only -- no extra dependencies.

Usage:
    python3 scripts/bench_latency.py
    python3 scripts/bench_latency.py --questions 10 --requests 50
    python3 scripts/bench_latency.py --base-url http://localhost:8000 --api-key secret
"""
import argparse
import json
import statistics
import time
import urllib.error
import urllib.request


def build_payload(n_questions: int) -> dict:
    questions = {
        f"q{i}": {"type": "noul", "instructions": "Does this message convey urgency?"}
        for i in range(n_questions)
    }
    return {
        "state": "Help! My payouts have been failing for 3 days and I need this fixed immediately.",
        "model": "laya-latest",
        "questions": questions,
    }


def timed_post(url: str, payload: dict, api_key: str | None) -> float:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")
    start = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        resp.read()
    return (time.perf_counter() - start) * 1000.0


def percentile(data: list[float], pct: float) -> float:
    data = sorted(data)
    k = (len(data) - 1) * (pct / 100)
    f, c = int(k), min(int(k) + 1, len(data) - 1)
    if f == c:
        return data[f]
    return data[f] + (data[c] - data[f]) * (k - f)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--questions", type=int, default=1, help="questions per request")
    parser.add_argument("--requests", type=int, default=30, help="timed requests")
    parser.add_argument("--warmup", type=int, default=3)
    args = parser.parse_args()

    url = f"{args.base_url.rstrip('/')}/v1/systemone"
    payload = build_payload(args.questions)

    try:
        for _ in range(args.warmup):
            timed_post(url, payload, args.api_key)
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not reach {url}: {exc}") from exc

    times = [timed_post(url, payload, args.api_key) for _ in range(args.requests)]

    print(f"requests={args.requests}  questions/request={args.questions}  target={url}")
    print(f"  min   {min(times):8.1f} ms")
    print(f"  p50   {percentile(times, 50):8.1f} ms")
    print(f"  p95   {percentile(times, 95):8.1f} ms")
    print(f"  max   {max(times):8.1f} ms")
    print(f"  mean  {statistics.mean(times):8.1f} ms")


if __name__ == "__main__":
    main()
