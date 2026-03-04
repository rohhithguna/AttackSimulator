"""
config_loader.py — Unified configuration management for Stage 4.
"""

import os
import yaml

_CONFIG = None

def get_config() -> dict:
    """
    Load and return config from config.yaml.
    """
    global _CONFIG
    if _CONFIG:
        return _CONFIG
    
    config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
    if not os.path.exists(config_path):
        return {} # Should not happen in production
        
    with open(config_path, 'r') as f:
        _CONFIG = yaml.safe_load(f)
    
    return _CONFIG

def get_limit(category: str, key: str, default):
    """
    Helper to get a specific limit.
    """
    config = get_config()
    return config.get(category, {}).get(key, default)
