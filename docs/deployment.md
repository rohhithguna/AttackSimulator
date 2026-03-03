# AI Attack Simulation Agent: Deployment Instructions

## Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ (with `npm` or `bun`)
- **OpenAI API Key**: Optional, for AI-generated analysis.

## 1. Clone the Repository
```bash
git clone https://github.com/user/redteam-box.git
cd redteam-box
```

## 2. Backend Setup
The backend runs as a stateless Python process orchestrated by the frontend API.
```bash
pip install -r backend/requirements.txt
```

## 3. Frontend Setup
The frontend is a Next.js application.
```bash
cd frontend
npm install
# or
bun install
```

## 4. Run Development Server
```bash
# From the root directory:
cd frontend && npm run dev
```
The application will be available at `http://localhost:3000`.

## 5. Configuration
You can tune the simulation parameters in `backend/config.yaml`. This file controls:
- **Performance Limits**: Max nodes, edges, and DFS depth.
- **Risk Weights**: Exposure, privilege, and depth multipliers.
- **Probability Model**: Default exploit success rates.
- **Time Estimation**: Port-based breach time constants.

## 6. Running Tests
The simulation core includes a comprehensive test suite.
```bash
# From the root directory:
pytest tests/
```

## 7. Production Build (Next.js)
```bash
cd frontend
npm run build
npm run start
```
Note: Ensure the backend directory is accessible to the Next.js process, as specified in the API route.
