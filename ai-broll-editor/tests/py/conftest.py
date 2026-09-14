import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "py"))
FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def fixture():
    def _load(name: str):
        with open(FIXTURES / name, "r", encoding="utf-8") as f:
            return json.load(f)
    return _load
