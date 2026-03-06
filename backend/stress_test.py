"""
stress_test.py — Stress test for the AI Attack Simulation Agent.

Generates a synthetic infrastructure with 1000 nodes and 5000 edges,
runs the full simulation pipeline, and reports per-phase timing.
"""

import sys
import os
import time
import random
import json

# Ensure backend directory is in path
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)


# ─────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────
NUM_NODES = 1000
NUM_EDGES = 5000
SEED = 42
MAX_ACCEPTABLE_TIME_SECONDS = 120

# ─────────────────────────────────────────────────────────
# Synthetic graph generation
# ─────────────────────────────────────────────────────────
def generate_synthetic_infrastructure(num_nodes: int, num_edges: int, seed: int = 42) -> dict:
    """
    Generate a synthetic infrastructure dictionary compatible with the parser.

    Strategy:
      1. Create `num_nodes` servers named node_0 .. node_{n-1}.
      2. Build a random spanning tree to guarantee full connectivity.
      3. Add remaining random edges until we reach `num_edges`.
      4. Mark ~5% of nodes as public_facing (at least 3).
      5. Assign the highest asset value to one non-public node (the target).
      6. Randomly assign ports, permissions, and asset values.
    """
    rng = random.Random(seed)

    servers = [f"node_{i}" for i in range(num_nodes)]

    # ── Spanning tree (ensures connectivity: n-1 edges) ──
    shuffled = servers[:]
    rng.shuffle(shuffled)
    connections = []
    for i in range(1, len(shuffled)):
        connections.append([shuffled[i - 1], shuffled[i]])

    # ── Additional random edges ──
    existing = set(tuple(c) for c in connections)
    attempts = 0
    max_attempts = num_edges * 10  # avoid infinite loops
    while len(connections) < num_edges and attempts < max_attempts:
        src = rng.choice(servers)
        dst = rng.choice(servers)
        if src != dst and (src, dst) not in existing:
            connections.append([src, dst])
            existing.add((src, dst))
        attempts += 1

    # ── Public-facing nodes (~5%, min 3) ──
    num_public = max(3, int(num_nodes * 0.05))
    public_facing = rng.sample(servers, num_public)

    # ── Ports ──
    port_sets = [
        [80, 443],
        [22, 80],
        [80, 443, 22],
        [3306, 80],
        [5432, 443],
        [27017],
        [80],
        [443],
        [22],
        [],  # some nodes have no open ports
    ]
    open_ports = {}
    for s in servers:
        open_ports[s] = rng.choice(port_sets)

    # ── Permissions ──
    perm_options = ["low", "medium", "high"]
    permissions = {}
    for s in servers:
        permissions[s] = rng.choice(perm_options)

    # ── Asset values ──
    asset_value = {}
    for s in servers:
        asset_value[s] = rng.randint(1, 8)

    # Make one non-public node the high-value target
    non_public = [s for s in servers if s not in public_facing]
    target = rng.choice(non_public)
    asset_value[target] = 10  # highest value

    return {
        "servers": servers,
        "connections": connections,
        "open_ports": open_ports,
        "permissions": permissions,
        "asset_value": asset_value,
        "public_facing": public_facing,
    }


# ─────────────────────────────────────────────────────────
# Phase timer helper
# ─────────────────────────────────────────────────────────
class PhaseTimer:
    def __init__(self):
        self.phases = []
        self._start = None
        self._phase_name = None

    def start(self, name: str):
        self._phase_name = name
        self._start = time.perf_counter()

    def stop(self) -> float:
        elapsed = time.perf_counter() - self._start
        self.phases.append((self._phase_name, elapsed))
        return elapsed

    def report(self):
        print("\n" + "=" * 70)
        print("  STRESS TEST TIMING REPORT")
        print("=" * 70)
        total = sum(t for _, t in self.phases)
        for name, elapsed in self.phases:
            pct = (elapsed / total * 100) if total > 0 else 0
            print(f"  {name:<40s}  {elapsed:8.2f}s  ({pct:5.1f}%)")
        print("-" * 70)
        print(f"  {'TOTAL':<40s}  {total:8.2f}s")
        print("=" * 70)
        return total


# ─────────────────────────────────────────────────────────
# Main stress test
# ─────────────────────────────────────────────────────────
def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║       ATTACK SIMULATOR — STRESS TEST (1000N / 5000E)       ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")

    timer = PhaseTimer()

    # ── 1. Generate synthetic infrastructure ──
    timer.start("1. Generate synthetic infrastructure")
    arch = generate_synthetic_infrastructure(NUM_NODES, NUM_EDGES, SEED)
    gen_time = timer.stop()
    print(f"✔ Generated infrastructure: {len(arch['servers'])} nodes, "
          f"{len(arch['connections'])} edges, "
          f"{len(arch['public_facing'])} public-facing nodes  ({gen_time:.2f}s)")

    # ── 2. Build payload ──
    payload = {"architecture": arch}

    # ── 3. Run simulation ──
    timer.start("2. Full simulation pipeline")
    from main import run_simulation_logic

    result = run_simulation_logic(
        raw_input=payload,
        monte_carlo_enabled=True,
        attacker_skill=1.0,
        harden_node=None,
    )
    sim_time = timer.stop()
    print(f"✔ Simulation completed  ({sim_time:.2f}s)")

    # ── 4. Validate result ──
    timer.start("3. Result validation")
    status = result.get("status", "unknown")
    assert status == "success", f"Simulation failed with status: {status}, message: {result.get('message', 'N/A')}"

    # Core metrics
    risk_score = result.get("risk_score", 0)
    attack_path = result.get("attack_path", [])
    entry_point = result.get("entry_point")
    target = result.get("target")
    exec_time = result.get("execution_time", 0)
    num_paths = len(result.get("paths", []))
    mc_results = result.get("monte_carlo_results", {})
    rl_path = result.get("rl_attack_path", [])
    confidence = result.get("confidence_score", 0)
    severity = result.get("severity", "N/A")
    advanced_risk = result.get("advanced_risk", 0)
    choke_points = result.get("choke_points", [])
    sensitivity = result.get("sensitivity_analysis", {})
    val_time = timer.stop()

    print(f"✔ Result validated  ({val_time:.2f}s)\n")

    # ── 5. Detailed output ──
    print("─" * 50)
    print("  SIMULATION RESULTS SUMMARY")
    print("─" * 50)
    print(f"  Status:              {status}")
    print(f"  Execution Time:      {exec_time}s")
    print(f"  Risk Score:          {risk_score}")
    print(f"  Advanced Risk:       {advanced_risk}")
    print(f"  Severity:            {severity}")
    print(f"  Confidence:          {confidence}")
    print(f"  Entry Point:         {entry_point}")
    print(f"  Target:              {target}")
    print(f"  Attack Path Length:  {len(attack_path)}")
    print(f"  Total Paths Found:   {num_paths}")
    print(f"  RL Path Length:      {len(rl_path)}")
    print(f"  Monte Carlo Rate:    {mc_results.get('breach_success_rate', 'N/A')}%")
    print(f"  MC Avg Time:         {mc_results.get('average_time_if_successful', 'N/A')}")
    print(f"  Choke Points:        {len(choke_points)}")
    print(f"  Sensitivity Scenes:  {len(sensitivity.get('scenarios', []))}")
    print("─" * 50)

    # ── 6. Timing report ──
    total = timer.report()

    # ── 7. Pass/Fail ──
    print()
    if total <= MAX_ACCEPTABLE_TIME_SECONDS:
        print(f"✅ STRESS TEST PASSED — completed in {total:.2f}s "
              f"(limit: {MAX_ACCEPTABLE_TIME_SECONDS}s)")
    else:
        print(f"❌ STRESS TEST FAILED — took {total:.2f}s "
              f"(limit: {MAX_ACCEPTABLE_TIME_SECONDS}s)")

    return total <= MAX_ACCEPTABLE_TIME_SECONDS


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
