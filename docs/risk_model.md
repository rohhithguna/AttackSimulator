# Risk Model Documentation

## Overview

This document formally specifies the risk scoring, confidence scoring, and breach time
estimation models used by the AI Attack Simulation Agent. All formulas are deterministic,
interpretable, and grounded in security engineering principles.

---

## 1. Risk Scoring Formula

### Formula

```
risk_score = exposure_weight × privilege_weight × asset_value_weight × depth_weight
```

All four weights are multiplicative. This means that a system with a low score on ANY
dimension significantly reduces the total risk — reflecting the real-world principle that
defense-in-depth is effective.

### Weight Definitions

#### 1.1 `exposure_weight` — Range: 1.1 – 2.0

Measures how easily an attacker can reach nodes on the attack path.

```
exposure_weight = 1.0 + avg(exposure_score across all path nodes)
```

Where `exposure_score` per node is computed as:

| Condition                        | Score Added |
|----------------------------------|-------------|
| Public-facing node               | +0.60       |
| Port 22 (SSH) open               | +0.20       |
| Port 80 or 443 (HTTP/S) open     | +0.15       |
| Port 3306 / 5432 / 27017 (DB)    | +0.25       |
| Not public-facing (base)         | 0.10        |

Maximum exposure_score per node: 1.0 (clamped)

**Rationale:** Public-facing nodes with open ports provide direct, known attack
surfaces. Database ports exposed directly multiply risk significantly.

#### 1.2 `privilege_weight` — Range: 0.8 – 1.5

Represents the maximum privilege encountered on the attack path.

| Permission Level | Multiplier |
|-----------------|------------|
| `low`           | 0.8        |
| `medium`        | 1.2        |
| `high`          | 1.5        |

```
privilege_weight = max(privilege_weight of all nodes on path)
```

**Rationale:** Compromising a high-privilege node has severe consequences. A path
that reaches only low-privilege nodes is less impactful even if easily traversed.

#### 1.3 `asset_value_weight` — Range: 0.2 – 2.0

Normalizes the peak asset value on the attack path to a scoring multiplier.

```
asset_value_weight = max(asset_value on path) / 5.0
```

Asset values are user-provided integers 1–10. Division by 5 maps this to:
- `asset_value = 10` → weight = 2.0 (maximum)
- `asset_value = 5`  → weight = 1.0 (neutral)
- `asset_value = 1`  → weight = 0.2 (low impact)

**Rationale:** The business impact of a breach is proportional to the value of the
data or systems at risk. An attack that only reaches low-value nodes carries
minimal business risk regardless of how "complete" the path is.

#### 1.4 `depth_weight` — Range: 1.0 – 2.5

Penalizes longer attack chains as they expose more attack surface.

```
depth_weight = min(1.0 + (chain_length - 1) × 0.3, 2.5)
```

| Chain Length | depth_weight |
|-------------|--------------|
| 1 hop       | 1.0          |
| 2 hops      | 1.3          |
| 3 hops      | 1.6          |
| 4 hops      | 1.9          |
| 5 hops      | 2.2          |
| 6+ hops     | 2.5 (cap)    |

**Rationale:** Longer chains mean more nodes are involved, increasing the blast radius.
The attacker has more pivot opportunities, and defenders have more places to
fail to detect lateral movement.

---

## 2. Severity Mapping

| Risk Score Range | Severity | Interpretation |
|-----------------|----------|----------------|
| 0 – 4.99        | **Low**      | Limited blast radius, isolated exposure |
| 5 – 8.99        | **Medium**   | Meaningful risk; remediation recommended |
| 9 – 12.99       | **High**     | Significant breach potential; urgent action |
| 13+             | **Critical** | Full-system compromise risk; immediate action |

---

## 3. Worked Example

### Input Architecture

```json
{
  "servers": ["web", "db"],
  "connections": [["web", "db"]],
  "open_ports": { "web": [80, 22] },
  "permissions": { "web": "low", "db": "high" },
  "asset_value": { "web": 3, "db": 9 },
  "public_facing": ["web"]
}
```

### Step-by-step Calculation

**Attack path identified:** `web → db`

**Node exposure scores:**
- `web`: public (0.60) + port 22 (0.20) + port 80 (0.15) = **0.95**
- `db`:  not public (0.10) = **0.10**

**exposure_weight:**
```
avg_exposure = (0.95 + 0.10) / 2 = 0.525
exposure_weight = 1.0 + 0.525 = 1.525
```

**privilege_weight:**
- `web`: low → 0.8
- `db`: high → 1.5
- max = **1.5**

**asset_value_weight:**
- max asset value = 9 (db)
- `9 / 5.0 = 1.8`

**depth_weight:**
- chain length = 2
- `1.0 + (2 - 1) × 0.3 = 1.3`

**Final risk score:**
```
risk_score = 1.525 × 1.5 × 1.8 × 1.3
           = 1.525 × 1.5 = 2.2875
           = 2.2875 × 1.8 = 4.1175
           = 4.1175 × 1.3 ≈ 5.35
```

**Severity: Medium** (5.35 falls in 5–8.99 range)

---

## 4. Confidence Scoring Model

Confidence (0–100%) quantifies how certain the simulation is about the identified
attack path. Higher confidence = attacker has a clearer, more direct route.

### Base Score: 80

Starting assumption is "moderately confident" for any identified path.

### Adjustments

| Factor | Condition | Adjustment |
|--------|-----------|------------|
| Direct exposure bonus | Entry is public AND chain ≤ 2 hops | +10 |
| Known port vector | Entry has ports in {22, 80, 443, 3306, 5432, 27017} | +5 |
| Speculation penalty | Entry has NO risky ports | -8 |
| High exposure bonus | Entry exposure_score ≥ 0.8 | +5 |
| Low exposure penalty | Entry exposure_score < 0.3 | -5 |
| Chain length penalty | Per extra hop beyond 1 | -5 each |
| Lateral movement penalty | Per lateral pivot step | -4 each |
| Privilege escalation penalty | Per priv-esc vulnerability | -3 each |

**Final range:** clamped to [10, 97] — no path is ever 100% certain or 100% unknown.

### Confidence Labels

| Score | Label | Interpretation |
|-------|-------|----------------|
| 80–97 | Very High | Direct, clear, well-understood attack vector |
| 65–79 | High | Reliable path with minor assumptions |
| 45–64 | Moderate | Plausible but involves indirect pivots |
| 10–44 | Low | Speculative; significant uncertainty |

**Color coding:** Very High = Red (danger), Low = Green (uncertainty favors defender)

---

## 5. Breach Time Model

Each attack step contributes estimated time based on step type, privilege level,
and port configuration.

### Base Times (minutes)

| Step Type             | Base Time |
|-----------------------|-----------|
| Initial Exploit       | 30        |
| Privilege Escalation  | 20        |
| Lateral Movement      | 15        |
| Data Exfiltration     | 25        |

### Privilege Modifiers

| Permission | Multiplier | Reason |
|-----------|------------|--------|
| `low`     | ×0.75      | Easy target, weak controls |
| `medium`  | ×1.00      | Standard hardening |
| `high`    | ×1.40      | Hardened, takes longer |

### Port Speed Bonuses (subtracted from adjusted time)

| Port  | Bonus | Reason |
|-------|-------|--------|
| 22    | -5    | SSH credential stuffing is fast |
| 80    | -3    | Web exploits are automated |
| 443   | -3    | Same as 80 |
| 3306  | -8    | Exposed DB = very rapid access |
| 5432  | -8    | Same as 3306 |
| 27017 | -8    | MongoDB has known default configs |

**Minimum per step:** 5 minutes (floor prevents unrealistic zero times)

**Total:** Sum of all adjusted step times

---

## 6. Business Impact Model

Deterministic rule-based logic with three dimensions:

### Data Risk
- `asset_value ≥ 7` AND severity High/Critical → **CRITICAL DATA EXPOSURE**
- `asset_value ≥ 7` AND other severity → **ELEVATED DATA RISK**
- High-value intermediate nodes → **MODERATE DATA RISK**
- All low-value → **LOW DATA RISK**

### Operational Risk
- Breach time < 60 min AND confidence ≥ 65% → **RAPID COMPROMISE WARNING**
- Severity High/Critical → **SIGNIFICANT OPERATIONAL DISRUPTION**
- Chain length ≥ 3 → **MODERATE OPERATIONAL RISK**
- Short chain → **CONTAINED OPERATIONAL RISK**

### Compliance Risk (additive — all that apply)
- DB/storage nodes + high asset value → **GDPR/CCPA obligation**
- High-privilege nodes on path → **SOC 2 / ISO 27001**
- Risk score ≥ 9 → **PCI DSS network segmentation**
- Multiple public-facing nodes → **NIST CSF surface**

---

## 7. Dual Path Generation

The engine uses `networkx.all_simple_paths(cutoff=12)` to enumerate all non-cyclic paths
from the best entry point to the highest-value target. Paths are ranked by:

```
path_risk = sum(asset_value) × avg(exposure_score) × max(privilege_weight)
```

- **Primary path**: highest path_risk
- **Secondary path**: second highest (if exists)

Cutoff of 12 prevents exponential explosion on dense graphs (tested up to 15 nodes).

---

## 8. Weight Justification

The multiplicative formula was chosen over additive for these reasons:

1. **Defense-in-depth modeling**: If ANY factor is very low (e.g., low asset value),
   the total risk drops significantly — reflecting real security architecture.

2. **Interpretability**: Each component has a direct, bounded meaning.

3. **No magic constants**: All weights derive from logical mappings (port risk → exposure,
   permission level → privilege weight, asset value → normalized multiplier).

4. **Calibration**: The 0–15+ range was empirically calibrated against realistic
   architectures ranging from simple 2-node setups to 10-node enterprise chains,
   with the severity thresholds set to align with CVSS-equivalent intuitions.
