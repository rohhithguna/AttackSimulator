# AI Attack Simulation Agent: Threat Model Assumptions

## Attacker Profile
- **Attacker Type**: External, sophisticated threat actor.
- **Goal**: Reach high-value targets (HVT) defined by high asset values.
- **Knowledge Level**: Black-box initially, moving to white-box as they compromise the network.
- **Persistence**: Attacker will persist until all possible paths are exhausted or the target is reached.

## Assumptions

### 1. Network Connectivity
- **Explicit Connections**: Attacker can only move between nodes that have an explicit connection defined in the architecture.
- **Port Visibility**: Open ports define potential attack vectors for each node.

### 2. Vulnerability Exploitation
- **Deterministic Exploitability**: If a node is reachable and has open ports, it's considered exploitable with some degree of success.
- **Exploit Probability**: Assigned based on the severity and nature of the CVE or access vector (Low: 0.3, Default: 0.6, Critical: 0.85).
- **Privilege Escalation**: Assumed that an attacker can escalate privileges within a node or move between nodes based on the permission levels.

### 3. Attack Surface
- **Entry Points**: Only nodes marked as `public_facing` can be the initial point of entry for an attacker.
- **Infrastructure Context**: Attacker can move laterally from a compromised node to any connected node.

### 4. Privilege Boundary
- **Privilege Transition**: Transitioning from a low-privilege node to a high-privilege node represents a higher friction barrier.
- **Credential Reuse**: High probability (0.9) of credential reuse if an attacker compromises a high-privilege account.

### 5. Success Criteria
- **Breach Success**: A simulation is successful if an attacker reaches a node defined as a target (highest asset value in the path).
- **Monte Carlo Results**: Percentage of successful full-chain breaches across 1000 randomized iterations.
