import json
import os

class HistoricalValidator:
    def __init__(self):
        # In-memory dataset of real-world breach patterns for Stage 4 validation.
        # Minimal set as requested: Log4Shell, SolarWinds, ProxyShell, PrintNightmare.
        self.breaches = [
            {
                "incident_name": "Log4Shell (CVE-2021-44228)",
                "attack_chain": ["internet", "web_server", "app_server", "db_server"],
                "description": "Unauthenticated RCE via LDAP/JNDI lookup leading to lateral movement and data exfiltration."
            },
            {
                "incident_name": "SolarWinds Supply Chain (UNC2452)",
                "attack_chain": ["internet", "update_server", "active_directory", "office365"],
                "description": "Supply chain compromise via malicious update leading to identity provider access."
            },
            {
                "incident_name": "ProxyShell (CVE-2021-34473)",
                "attack_chain": ["internet", "exchange_server", "active_directory", "domain_controller"],
                "description": "Pre-auth SSRF and Remote Code Execution on Microsoft Exchange servers."
            },
            {
                "incident_name": "PrintNightmare (CVE-2021-34527)",
                "attack_chain": ["internal_user", "print_spooler", "domain_controller"],
                "description": "Remote code execution in the Windows Print Spooler service for privilege escalation."
            }
        ]

    def validate_path(self, path_nodes):
        """
        Validates a simulated attack path against historical breach data.
        Returns a score (0-1) and the most similar incident.
        """
        if not path_nodes:
            return 0.0, None

        best_score = 0.0
        best_match = None

        # Simple overlap-based scoring for Stage 4
        for breach in self.breaches:
            breach_chain = breach["attack_chain"]
            
            # Count common nodes
            common_nodes = set(path_nodes).intersection(set(breach_chain))
            
            # Simple Jaccard-like similarity for sequence comparison
            if not breach_chain:
                continue
                
            # Weighted by sequence position similarity (bonus if start/end match)
            base_overlap = len(common_nodes) / max(len(path_nodes), len(breach_chain))
            
            # Position bonus (Entry point match)
            entry_match = 0.15 if path_nodes[0].lower() == breach_chain[0].lower() else 0.0
            
            # Target match (last node)
            target_match = 0.15 if path_nodes[-1].lower() == breach_chain[-1].lower() else 0.0
            
            total_score = min(base_overlap + entry_match + target_match, 1.0)
            
            if total_score > best_score:
                best_score = total_score
                best_match = breach["incident_name"]

        # Ensure validation_score is None if no meaningful match found (as per fallback requirement)
        if best_score < 0.2:
            return None, None

        return round(best_score, 2), best_match
