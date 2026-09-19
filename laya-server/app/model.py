"""Loads the convaiinnovations/laya model once and runs it against typed questions,
reshaping laya's native output into the exact TypeSafe Jev answer schema.
"""
import os
import threading
from typing import Any, Dict

from .schemas import Question, State

_agent = None
_lock = threading.Lock()


def get_agent():
    """Lazily load and cache the laya Agent (downloads weights from the HF Hub on first use)."""
    global _agent
    if _agent is None:
        with _lock:
            if _agent is None:
                import laya

                model_id = os.environ.get("LAYA_MODEL_ID", "convaiinnovations/laya")
                device = os.environ.get("LAYA_DEVICE") or None
                _agent = laya.load(model_id, device=device)
    return _agent


def run_system_one(state: State, questions: Dict[str, Question], response_model: str) -> Dict[str, Any]:
    agent = get_agent()

    # Pydantic models -> plain dicts in laya's expected {"type", "instructions", "criteria"} shape.
    plain_questions = {qid: q.model_dump(exclude_none=True) for qid, q in questions.items()}

    result = agent.predict(state, plain_questions)

    answers = {}
    for qid, ans in result["answers"].items():
        ans = dict(ans)
        ans.pop("action", None)  # laya-specific extra field, not part of the Jev contract
        answers[qid] = ans

    return {
        "model": response_model,
        "answers": answers,
        "usage": result["usage"],
    }
