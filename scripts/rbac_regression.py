"""Run RBAC regression checks against a running Svelte service.

Usage:
  python scripts/rbac_regression.py --base-url http://localhost:5173 \
    --admin-cookie "token=...; sb-access-token=..." \
    --manager-cookie "token=...; sb-access-token=..." \
    --driver-cookie "token=...; sb-access-token=..."
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import requests

ROOT = Path(__file__).resolve().parent.parent


def load_matrix(path: Path) -> List[Dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("checks", [])


def run_check(base_url: str, cookie: str, method: str, path: str) -> int:
    headers = {"Cookie": cookie, "Accept": "application/json"}
    response = requests.request(method, f"{base_url.rstrip('/')}{path}", headers=headers, timeout=20)
    return response.status_code


def main() -> int:
    parser = argparse.ArgumentParser(description="RBAC matrix regression runner")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--matrix", default=str(ROOT / "eval" / "rbac_matrix.json"))
    parser.add_argument("--admin-cookie", required=True)
    parser.add_argument("--manager-cookie", required=True)
    parser.add_argument("--driver-cookie", required=True)
    args = parser.parse_args()

    checks = load_matrix(Path(args.matrix))
    role_cookies = {
        "admin": args.admin_cookie,
        "manager": args.manager_cookie,
        "driver": args.driver_cookie,
    }

    failures: List[Tuple[str, str, int, int]] = []

    for check in checks:
        method = check["method"]
        path = check["path"]
        expected = check["expected"]

        for role, cookie in role_cookies.items():
            actual = run_check(args.base_url, cookie, method, path)
            wanted = int(expected[role])
            ok = actual == wanted
            status = "PASS" if ok else "FAIL"
            print(f"[{status}] {role:7} {method:4} {path:24} expected={wanted} got={actual}")
            if not ok:
                failures.append((role, path, wanted, actual))

    print("\nSummary")
    print(f"Total checks: {len(checks) * 3}")
    print(f"Failures: {len(failures)}")

    if failures:
        print("\nFailed cases:")
        for role, path, wanted, actual in failures:
            print(f"- {role} {path}: expected {wanted}, got {actual}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
