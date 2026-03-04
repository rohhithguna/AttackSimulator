"""
validator.py — Schema validation for simulation inputs.
"""

import json
import os
from jsonschema import validate, ValidationError

def validate_input(data: dict) -> None:
    """
    Validates input data against input_schema.json.
    Raises ValidationError if invalid.
    """
    schema_path = os.path.join(os.path.dirname(__file__), "..", "input_schema.json")
    with open(schema_path, 'r') as f:
        schema = json.load(f)
    
    validate(instance=data, schema=schema)

def get_error_response(e: Exception) -> dict:
    """
    Returns a structured error response.
    """
    if isinstance(e, ValidationError):
        return {
            "status": "error",
            "error_type": "InvalidSchema",
            "message": e.message,
            "path": list(e.path)
        }
    return {
        "status": "error",
        "error_type": type(e).__name__,
        "message": str(e)
    }
