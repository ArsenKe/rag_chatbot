import json
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_regression_cases() -> list[dict]:
    path = ROOT / "eval" / "rag_eval_cases.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return [case for case in data if case.get("regression", False)]


def _contains_any(text: str, terms: list[str]) -> bool:
    if not terms:
        return True
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


@pytest.mark.skipif(
    os.getenv("RUN_RAG_REGRESSION") != "1",
    reason="Set RUN_RAG_REGRESSION=1 to run live RAG regression tests",
)
@pytest.mark.parametrize("case", _load_regression_cases(), ids=lambda c: c["id"])
def test_rag_regression_live(case: dict):
    from app.core.config import Settings
    from modules.rag.qa_chain import RAGChain

    rag = RAGChain(Settings())
    result = rag.answer_with_sources(case["question"], history=case.get("history", []))

    answer = (result.get("answer") or "").strip()
    assert answer, "Answer is empty"

    forbidden = case.get("forbidden_keywords", [])
    assert not _contains_any(answer, forbidden), f"Answer contains forbidden content: {forbidden}"

    expected_any = case.get("expected_keywords_any", [])
    assert _contains_any(answer, expected_any), f"Answer missed expected hints: {expected_any}"
