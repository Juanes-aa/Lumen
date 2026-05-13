"""Test configuration: deshabilita el rate limiter por defecto.

Tests específicos que necesiten el limiter deben re-habilitarlo manualmente
y resetear el storage entre llamadas.
"""

from __future__ import annotations

import pytest

from app.dependencies.rate_limit import limiter


@pytest.fixture(autouse=True)
def _disable_rate_limit() -> None:
    limiter.enabled = False
