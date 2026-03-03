# AI Attack Simulation Agent (RedTeam Box)

A production-grade, graph-based security analysis tool that models infrastructure architecture and simulates multi-hop attack paths using probabilistic exploit modeling and Monte Carlo simulations.

## 🚀 Overview

The AI Attack Simulation Agent allows security teams to visualize infrastructure risk from an attacker's perspective. It transforms a static architectural description into a dynamic attack graph, identifying the most likely breach paths to your highest-value assets.

### Key Features
- **Graph-Based Modeling**: Converts JSON architecture into a directed graph of servers and connections.
- **Weighted Path Discovery**: Uses DFS and Dijkstra to find primary, secondary, and optimized attack routes.
- **Probabilistic Risk Scoring**: Calculates structural risk based on exposure, privilege, and asset value.
- **Advanced Analytics**:
  - **Monte Carlo Simulation**: Estimates breach success rates across 1000+ randomized attempts.
  - **Choke Point Analysis**: Uses graph centrality to identify critical infrastructure nodes.
  - **Breach Time Estimation**: Models the time-to-compromise based on node security posture.
- **AI Explanation Layer**: Generates executive and technical summaries of the attack chain (OpenAI fallback included).
- **Interactive Dashboard**: Modern Next.js frontend with real-time graph visualization and mitigation sandboxing.

---

## 🏗 Architecture

The project is split into a robust Python backend and a responsive Next.js frontend.

- **Backend**: `/backend`
  - `core/`: Parser, Graph Engine, Attack Engine, Validator.
  - `analysis/`: Risk Scoring, Monte Carlo, Centrality, AI Explainer.
  - `main.py`: Unified entry point for the simulation engine.
- **Frontend**: `/frontend`
  - Built with Next.js 15, Tailwind CSS, and React 19.
  - Features interactive graph visualization (Graphology/Sigma.js) and real-time metrics.
- **Docs**: `/docs`
  - Comprehensive documentation on threat models, risk formulas, and architecture.

---

## 🛠 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 20+

### 1. Run the Backend Simulation
```bash
cd backend
pip install -r requirements.txt
python main.py < sample_input.json
```

### 2. Run the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📊 Example Input JSON

```json
{
  "architecture": {
    "servers": ["web", "app", "db"],
    "connections": [["web", "app"], ["app", "db"]],
    "open_ports": { "web": [80, 22], "app": [8080], "db": [3306] },
    "permissions": { "web": "low", "app": "medium", "db": "high" },
    "asset_value": { "web": 2, "app": 5, "db": 10 },
    "public_facing": ["web"]
  }
}
```

---

## 📑 Documentation
- [Architecture Detail](docs/architecture.md)
- [Threat Model Assumptions](docs/threat_model.md)
- [Risk Scoring Formulas](docs/risk_model.md)
- [API Specification](docs/api_spec.md)

## 🛡 Disclaimer
This tool is for educational, research, and predictive modeling purposes only. It is not a vulnerability scanner and does not perform actual exploits against live infrastructure.
