"""Run a lightweight RAG quality benchmark against /ask or local chain."""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

import requests

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@dataclass
class CaseResult:
    case_id: str
    score: float
    passed: bool
    answer: str
    sources_count: int
    details: Dict[str, Any]


def load_cases(path: Path) -> List[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Case file must contain a JSON list")
    return data


def call_api(base_url: str, question: str, history: List[Dict[str, str]] | None = None) -> Dict[str, Any]:
    payload = {"text": question, "history": history or []}
    response = requests.post(f"{base_url.rstrip('/')}/ask", json=payload, timeout=45)
    response.raise_for_status()
    return response.json()


def call_local(question: str, history: List[Dict[str, str]] | None = None) -> Dict[str, Any]:
    from app.core.config import Settings
    from modules.rag.qa_chain import RAGChain

    rag = RAGChain(Settings())
    result = rag.answer_with_sources(question, history=history or [])
    return {"answer": result.get("answer", ""), "sources": result.get("sources", [])}


def contains_any(text: str, terms: List[str]) -> bool:
    if not terms:
        return True
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


def contains_all_ratio(text: str, terms: List[str]) -> float:
    if not terms:
        return 1.0
    lower = text.lower()
    hits = sum(1 for term in terms if term.lower() in lower)
    return hits / len(terms)


def detect_language(answer: str) -> str:
    lower = answer.lower()
    de_markers = [" und ", " der ", " die ", " das ", " ich ", "nicht", "bitte"]
    en_markers = [" and ", " the ", " i ", "please", "cannot", "contact"]
    de_hits = sum(1 for m in de_markers if m in lower)
    en_hits = sum(1 for m in en_markers if m in lower)
    return "de" if de_hits >= en_hits else "en"


def evaluate_case(case: Dict[str, Any], answer: str, sources_count: int, threshold: float) -> CaseResult:
    expected_any = case.get("expected_keywords_any", [])
    expected_all = case.get("expected_keywords_all", [])
    forbidden = case.get("forbidden_keywords", [])
    require_source = bool(case.get("require_source", False))
    expected_lang = case.get("language")

    any_hit = contains_any(answer, expected_any)
    all_ratio = contains_all_ratio(answer, expected_all)
    forbidden_hit = contains_any(answer, forbidden) if forbidden else False
    source_ok = (sources_count > 0) if require_source else True

    lang_ok = True
    if expected_lang in ("de", "en"):
        lang_ok = detect_language(answer) == expected_lang

    score = 0.0
    score += 0.35 if any_hit else 0.0
    score += 0.35 * all_ratio
    score += 0.15 if not forbidden_hit else 0.0
    score += 0.1 if source_ok else 0.0
    score += 0.05 if lang_ok else 0.0

    details = {
        "any_hit": any_hit,
        "all_ratio": round(all_ratio, 3),
        "forbidden_hit": forbidden_hit,
        "source_ok": source_ok,
        "lang_ok": lang_ok,
    }

    return CaseResult(
        case_id=case.get("id", "unknown"),
        score=round(score, 3),
        passed=score >= threshold,
        answer=answer,
        sources_count=sources_count,
        details=details,
    )


def run_benchmark(
    cases: List[Dict[str, Any]],
    mode: str,
    base_url: str,
    threshold: float,
) -> Tuple[List[CaseResult], Dict[str, Any]]:
    results: List[CaseResult] = []

    for case in cases:
        question = case.get("question", "").strip()
        history = case.get("history", [])
        if not question:
            continue

        if mode == "api":
            payload = call_api(base_url, question, history)
        else:
            payload = call_local(question, history)

        answer = (payload.get("answer") or "").strip()
        sources = payload.get("sources") or []
        result = evaluate_case(case, answer, len(sources), threshold)
        results.append(result)

        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.case_id} score={result.score} sources={result.sources_count}")

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    avg_score = statistics.mean(r.score for r in results) if results else 0.0

    summary = {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round((passed / total) * 100.0, 2) if total else 0.0,
        "avg_score": round(avg_score, 3),
        "threshold": threshold,
        "mode": mode,
    }
    return results, summary


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG benchmark runner")
    parser.add_argument("--cases", default=str(ROOT / "eval" / "rag_eval_cases.json"))
    parser.add_argument("--mode", choices=["api", "local"], default="api")
    parser.add_argument("--base-url", default=os.getenv("RAG_API_BASE", "http://localhost:8000"))
    parser.add_argument("--threshold", type=float, default=0.65)
    parser.add_argument("--output", default=str(ROOT / "eval" / "rag_eval_report.json"))
    args = parser.parse_args()

    cases = load_cases(Path(args.cases))
    results, summary = run_benchmark(cases, args.mode, args.base_url, args.threshold)

    report = {
        "summary": summary,
        "results": [
            {
                "case_id": r.case_id,
                "score": r.score,
                "passed": r.passed,
                "sources_count": r.sources_count,
                "details": r.details,
                "answer": r.answer,
            }
            for r in results
        ],
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\nBenchmark summary")
    print(json.dumps(summary, indent=2))
    print(f"Report written to: {output_path}")

    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
