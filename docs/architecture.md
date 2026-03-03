# AI Attack Simulation Agent: Architecture Overview

## System Context
The RedTeam Box is a deterministic and probabilistic predictive breach intelligence engine. It models infrastructure architecture as a directed graph and simulates various attack paths from public entry points to high-value targets.

## Components

### 1. Core Engine (Python Backend)
The backend is structured into several specialized modules:
- **Parser**: Validates input JSON against schemas and enforces performance limits.
- **Graph Engine**: Converts architectural descriptions into NetworkX directed graphs.
- **Attack Engine**: Discovers attack paths using DFS and optimizes them with Dijkstra/A* for weighted analysis.
- **Scoring**: Computes structural and advanced risk scores based on exposure, privilege, and impact.
- **Probability Layer**: Assigns exploit probabilities and calculates path success rates.
- **Monte Carlo Simulation**: Runs thousands of randomized simulations to estimate real-world breach likelihood.
- **Centrality Analysis**: Identifies critical infrastructure choke points using graph theory metrics.
- **AI Explainer**: Provides executive and technical summaries of attack paths.

### 2. Next.js Frontend
A modern, responsive dashboard for visualizing attack graphs, metrics, and AI analysis.
- **Attack Graph**: Interactive visualization of the network topology and active attack paths.
- **Metrics Dashboard**: Real-time display of risk scores, severity, and breach time estimates.
- **Mitigation Re-Simulation**: Interactive tool to modify architecture and observe risk reduction.

### 3. API Layer
A stateless JSON-based API that orchestrates the simulation process.
- **Endpoint**: `/api/v1/simulate`
- **Mechanism**: Next.js API route spawns the Python core engine via subprocess.

## Data Flow
1. User provides infrastructure JSON.
2. Schema validation ensures data integrity.
3. Graph Engine builds the network model.
4. Attack Engine finds all viable paths.
5. Risk/Probability/Monte Carlo models analyze the paths.
6. AI Explainer generates human-readable insights.
7. Final result is returned as a structured JSON.
