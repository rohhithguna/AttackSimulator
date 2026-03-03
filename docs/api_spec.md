# AI Attack Simulation Agent: API Specification (v1)

## Endpoint: `/api/v1/simulate`

### Description
Runs a full attack simulation against a provided infrastructure architecture JSON.

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `architecture` | `object` | Yes | The infrastructure definition. |
| `openai_key` | `string` | No | Optional API key for GPT-powered analysis. |
| `monte_carlo` | `boolean` | No | Toggle for Monte Carlo simulation (Default: `true`). |

#### Architecture Object

| Field | Type | Required | Description |
|---|---|---|---|
| `servers` | `array` | Yes | List of node names (strings). |
| `connections` | `array` | Yes | List of directed edges as `[source, target]`. |
| `open_ports` | `object` | Yes | Mapping of server names to lists of integers (ports). |
| `permissions` | `object` | Yes | Mapping of server names to `low`, `medium`, or `high`. |
| `asset_value` | `object` | Yes | Mapping of server names to numeric importance (1-10). |
| `public_facing`| `array` | Yes | List of server names that are internet-exposed. |

---

### Response (JSON)

#### Success (200 OK)

| Field | Type | Description |
|---|---|---|
| `status` | `string` | `success` |
| `request_id` | `string` | Unique identifier for the simulation run. |
| `execution_time` | `number` | Total simulation time in seconds. |
| `version` | `string` | Engine version. |
| `paths` | `array` | All discovered simple attack paths. |
| `path_clusters` | `array` | Grouped paths based on similarity. |
| `risk_score` | `number` | Primary risk score. |
| `risk_components` | `object` | Breakdown of risk factors. |
| `breach_time` | `string` | Human-readable time-to-breach. |
| `exploit_probability`| `number` | Probability of the primary attack path succeeding. |
| `monte_carlo_results`| `object` | Monte Carlo simulation statistics. |
| `centrality_scores` | `object` | Mapping of node names to graph centrality scores. |
| `choke_points` | `array` | Top structurally critical nodes and their impact. |
| `confidence_score`| `number` | Attacker certainty (0-100%). |
| `business_impact` | `object` | Risk assessment of data, operational, and compliance factors. |
| `attack_timeline` | `array` | Chronological steps of the primary attack. |
| `resilience_summary`| `object` | Assessment of system defenses. |
| `ai_analysis` | `object` | Structured AI-generated analyses. |
| `graph` | `object` | Node and edge data for visualization. |

#### Error (400/500)

| Field | Type | Description |
|---|---|---|
| `status` | `string` | `error` |
| `error_type` | `string` | Type of error (e.g., `InvalidSchema`, `SimulationError`). |
| `message` | `string` | Detailed error message. |
| `request_id` | `string` | Unique identifier for the request. |
| `version` | `string` | Engine version. |

---

### Performance Limits
- **Max Nodes**: 1000
- **Max Edges**: 5000
- **Max DFS Depth**: 12
- **Monte Carlo Iterations**: 1000 (capped at 5000)
