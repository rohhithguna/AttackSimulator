# AI Attack Simulation Agent: Limitations & Disclaimers

## Limitations

### 1. Static Topology
The engine currently models attacks based on a static architectural snapshot. It does not account for dynamic network changes, active firewall state transitions, or adaptive security responses during a breach.

### 2. Rule-Based Probabilities
Probabilities for exploits (e.g., CVEs) are assigned based on general severity categories rather than real-time threat intelligence or specific software versions.

### 3. Graph Depth
To ensure performance, the path discovery algorithm uses a maximum depth cutoff (default: 12 hops). Extremely complex, deep network chains beyond this depth may not be fully explored.

### 4. Human Behavior
The model assumes a rational attacker seeking high-value targets. It does not account for social engineering, insider threats with legitimate but abused access, or accidental misconfigurations created during the attack.

## Disclaimers

### 1. Educational Use Only
The RedTeam Box is designed for educational, research, and CTF purposes. It is NOT a substitute for professional penetration testing or a real-time vulnerability scanner.

### 2. Not a Real Scanner
This tool does not "scan" real infrastructure. It simulates attacks based on a provided *description* of an architecture. It will not find vulnerabilities in your actual running code.

### 3. Risk Score Interpretation
Risk scores are relative metrics intended to help prioritize hardening efforts. They should not be used as the sole basis for critical business or safety decisions.

### 4. Third-Party API Usage
AI-generated analysis depends on external providers (e.g., OpenAI). The quality and availability of these insights are subject to the service levels of those providers.
