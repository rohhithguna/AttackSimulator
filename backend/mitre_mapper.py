from typing import List, Optional

class MitreMapper:
    """
    Modular mapping layer between CVE intelligence and MITRE ATT&CK techniques.
    Rule-based, deterministic, and lightweight.
    """

    def __init__(self):
        # Hardcoded minimal dictionary for requested techniques
        self.TECHNIQUES = {
            "T1190": {
                "technique_id": "T1190",
                "technique_name": "Exploit Public-Facing Application",
                "tactic": "Initial Access"
            },
            "T1068": {
                "technique_id": "T1068",
                "technique_name": "Exploitation for Privilege Escalation",
                "tactic": "Privilege Escalation"
            },
            "T1021": {
                "technique_id": "T1021",
                "technique_name": "Remote Services",
                "tactic": "Lateral Movement"
            },
            "T1041": {
                "technique_id": "T1041",
                "technique_name": "Exfiltration Over C2 Channel",
                "tactic": "Exfiltration"
            }
        }

    def map_cve_to_techniques(
        self, 
        cve_intel: dict, 
        is_priv_esc: bool = False, 
        is_lateral_movement: bool = False, 
        is_high_value_access: bool = False
    ) -> List[dict]:
        """
        Maps CVE characteristics and path context to MITRE ATT&CK techniques.
        """
        mapped_techniques = []

        # Rule 1: NETWORK attack vector -> T1190
        if cve_intel.get("attack_vector") == "NETWORK":
            mapped_techniques.append(self.TECHNIQUES["T1190"])

        # Rule 2: LOW or NONE privileges required + Privilege Escalation -> T1068
        privs = cve_intel.get("privileges_required")
        if privs in ("LOW", "NONE") and is_priv_esc:
            mapped_techniques.append(self.TECHNIQUES["T1068"])

        # Rule 3: Node-to-node movement -> T1021
        if is_lateral_movement:
            mapped_techniques.append(self.TECHNIQUES["T1021"])

        # Rule 4: Data access on high-value node -> T1041
        if is_high_value_access:
            mapped_techniques.append(self.TECHNIQUES["T1041"])

        return mapped_techniques

if __name__ == "__main__":
    # Test Block for verification
    mapper = MitreMapper()
    
    # Test 1: Network RCE CVE
    mock_cve = {"attack_vector": "NETWORK", "privileges_required": "NONE"}
    print(f"Test 1: {mapper.map_cve_to_techniques(mock_cve)}")
    
    # Test 2: Privilege escalation path
    print(f"Test 2: {mapper.map_cve_to_techniques(mock_cve, is_priv_esc=True)}")
    
    # Test 3: Lateral movement
    print(f"Test 3: {mapper.map_cve_to_techniques({}, is_lateral_movement=True)}")
    
    # Test 4: High-value access
    print(f"Test 4: {mapper.map_cve_to_techniques({}, is_high_value_access=True)}")
