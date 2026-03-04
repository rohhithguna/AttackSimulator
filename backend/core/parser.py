"""
parser.py — Validates and parses incoming JSON architecture input.
"""

import json
from typing import Any

from core.config_loader import get_config

REQUIRED_FIELDS = ["servers", "connections", "open_ports", "permissions", "asset_value", "public_facing"]
VALID_PERMISSIONS = {"low", "medium", "high"}


class ParseError(ValueError):
    pass


def parse_input(raw: str | dict) -> dict:
    """
    Accept a JSON string or dict, validate structure, and return a clean architecture dict.
    Raises ParseError on invalid input.
    """
    config = get_config()
    max_nodes = config.get("simulation", {}).get("max_nodes", 1000)
    max_edges = config.get("simulation", {}).get("max_edges", 5000)

    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ParseError(f"Invalid JSON: {e}")
    elif isinstance(raw, dict):
        data = raw
    else:
        raise ParseError("Input must be a JSON string or dict.")

    # Step 5: Performance Guards
    if "servers" in data and len(data["servers"]) > max_nodes:
        raise ParseError(f"Maximum node limit exceeded: {len(data['servers'])} > {max_nodes}")
    if "connections" in data and len(data["connections"]) > max_edges:
        raise ParseError(f"Maximum edge limit exceeded: {len(data['connections'])} > {max_edges}")

    for field in REQUIRED_FIELDS:
        if field not in data:
            raise ParseError(f"Missing required field: '{field}'")

    if not isinstance(data["servers"], list) or len(data["servers"]) == 0:
        raise ParseError("'servers' must be a non-empty list.")

    if not isinstance(data["connections"], list):
        raise ParseError("'connections' must be a list of [source, target] pairs.")

    for conn in data["connections"]:
        if not (isinstance(conn, list) and len(conn) == 2):
            raise ParseError(f"Each connection must be a 2-element list, got: {conn}")
        src, dst = conn
        if src not in data["servers"]:
            raise ParseError(f"Connection source '{src}' not in servers list.")
        if dst not in data["servers"]:
            raise ParseError(f"Connection target '{dst}' not in servers list.")

    if not isinstance(data["open_ports"], dict):
        raise ParseError("'open_ports' must be a dict mapping server names to port lists.")

    if not isinstance(data["permissions"], dict):
        raise ParseError("'permissions' must be a dict mapping server names to permission levels.")
    for server, perm in data["permissions"].items():
        if perm not in VALID_PERMISSIONS:
            raise ParseError(f"Permission for '{server}' must be one of {VALID_PERMISSIONS}, got '{perm}'.")

    if not isinstance(data["asset_value"], dict):
        raise ParseError("'asset_value' must be a dict mapping server names to numeric values.")
    for server, val in data["asset_value"].items():
        if not isinstance(val, (int, float)):
            raise ParseError(f"Asset value for '{server}' must be numeric, got '{val}'.")

    if not isinstance(data["public_facing"], list):
        raise ParseError("'public_facing' must be a list of server names.")
    for s in data["public_facing"]:
        if s not in data["servers"]:
            raise ParseError(f"Public-facing server '{s}' not in servers list.")

    # Normalize — fill defaults for servers not mentioned
    normalized = {
        "servers": data["servers"],
        "connections": [list(c) for c in data["connections"]],
        "open_ports": {s: data["open_ports"].get(s, []) for s in data["servers"]},
        "permissions": {s: data["permissions"].get(s, "medium") for s in data["servers"]},
        "asset_value": {s: float(data["asset_value"].get(s, 1)) for s in data["servers"]},
        "public_facing": data["public_facing"],
    }
    return normalized
