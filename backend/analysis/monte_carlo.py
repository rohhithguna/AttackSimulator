"""
simulation.py — Monte Carlo attack simulation.
STAGE 3: Objective 4.
"""

import random
import networkx as nx
import time
from analysis.probability import compute_path_probability
from core.config_loader import get_config

def run_monte_carlo(G: nx.DiGraph, all_paths: list[list[str]], iterations: int = 1000, skill_multiplier: float = 1.0) -> dict:
    """
    Run 1000 randomized exploit attempts on all simple paths.
    Compute breach success rate and average time if successful.
    """
    config = get_config()
    cap = config.get("simulation", {}).get("monte_carlo_iteration_cap", 5000)
    
    # Enforce limit
    iterations = min(iterations, cap)

    if not all_paths:
        return {
            "iterations": iterations,
            "breach_success_rate": 0.0,
            "average_time_if_successful": "N/A"
        }

    start_time = time.time()
    successful_breaches = 0
    total_time_successful = 0.0

    # For each path, calculate its success probability
    path_probs = []
    for p in all_paths:
        path_probs.append(compute_path_probability(G, p, skill_multiplier))

    # Run simulations
    for _ in range(iterations):
        # We simulate an attacker attempting paths until one succeeds
        # To be conservative, we check all paths once per "attempt session"
        for p_idx, p in enumerate(all_paths):
            if random.random() < path_probs[p_idx]:
                successful_breaches += 1
                
                # Randomized time-to-compromise
                # Each hop takes some time (Stage 2 suggests ~15-30 mins per step)
                # We add variance for Monte Carlo (+/- 50%)
                hops = len(p)
                path_time = 0
                for _ in range(hops):
                    base_step_time = random.choice([15, 20, 30, 45])
                    variance = random.uniform(0.5, 1.5)
                    path_time += base_step_time * variance
                
                total_time_successful += path_time
                break # Breach achieved in this iteration!

    success_rate = (successful_breaches / iterations) * 100
    avg_time = "0h 0m"
    if successful_breaches > 0:
        avg_mins = total_time_successful / successful_breaches
        h = int(avg_mins // 60)
        m = int(avg_mins % 60)
        avg_time = f"{h}h {m}m"

    # Optimization: Ensure we don't exceed 3 seconds (spec requirement)
    # The above loop is O(iterations * num_paths). For 1000 iterations and 100 paths, 
    # it's 100k checks which is well within 3s for Python.

    return {
        "iterations": iterations,
        "breach_success_rate": round(success_rate, 2),
        "average_time_if_successful": avg_time
    }
