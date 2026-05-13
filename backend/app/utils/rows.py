"""Helpers para leer campos de filas Supabase con tipo seguro.

Las filas devueltas por Supabase llegan como dicts con valores `Any` (incluso
con TypedDicts, los tipos son sólo guía estática). Estos helpers consolidan
los patrones repetitivos de coerción defensiva (`int(str(row.get(k, 0)))`,
`str(row[k]) if row.get(k) else None`) en funciones que documentan la
intención y evitan errores en runtime cuando un campo puede faltar o ser None.

Usar SOLO donde mejore legibilidad. No forzar.
"""
from collections.abc import Mapping
from typing import Any, overload


@overload
def get_str(row: Mapping[str, Any], key: str) -> str | None: ...
@overload
def get_str(row: Mapping[str, Any], key: str, default: str) -> str: ...
def get_str(
    row: Mapping[str, Any], key: str, default: str | None = None
) -> str | None:
    """Devuelve `str(row[key])` o `default` si la clave falta o es None."""
    val = row.get(key)
    return str(val) if val is not None else default


def get_int(row: Mapping[str, Any], key: str, default: int = 0) -> int:
    """Devuelve `int(row[key])` o `default` si la clave falta o es None."""
    val = row.get(key)
    return int(val) if val is not None else default


def get_list_str(row: Mapping[str, Any], key: str) -> list[str]:
    """Devuelve la lista convertida a `list[str]`, o `[]` si no es lista."""
    val = row.get(key)
    return [str(item) for item in val] if isinstance(val, list) else []
