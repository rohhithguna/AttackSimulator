import json
import os
import networkx as nx

class DefenderPrioritization:
    def __init__(self, G, all_paths):
        self.G = G
        self.all_paths = all_paths
        
    def get_recommendations(self, top_n=5):
        """
        Analyzes attack paths to rank nodes by defense criticality.
        Returns top N nodes to patch/harden first with reasons and priority scores.
        """
        if not self.all_paths:
            return []
            
        # 1. Path Centrality: How many attack paths pass through this node?
        node_frequency = {}
        for path in self.all_paths:
            for node in path:
                node_frequency[node] = node_frequency.get(node, 0) + 1
        
        # 2. Risk Scoring for Prioritization
        # risk_score = f(frequency_in_paths, exposure_score, vulnerability_presence, proximity_to_target)
        node_rankings = []
        
        # Find the target node from paths
        target_node = self.all_paths[0][-1]
        
        for node in self.G.nodes():
            # Skip entry/target nodes if they are synthetic/fixed
            if node.lower() in ["internet", "internal_user"]:
                continue
                
            node_data = self.G.nodes[node]
            
            # Base components
            frequency = node_frequency.get(node, 0) / len(self.all_paths) if self.all_paths else 0
            exposure  = node_data.get("exposure_score", 0.5)
            asset_val = node_data.get("asset_value", 1.0)
            
            # Vulnerability component (CVSS logic from Stage 2)
            cves = node_data.get("cves", [])
            vulnerability_factor = 0.5 # Default heuristic
            if cves:
                vulnerability_factor = 0.85 # Higher if CVEs exist
            
            # Proximity factor
            try:
                shortest_path_to_target = nx.shortest_path_length(self.G, source=node, target=target_node)
                # Closer to target = higher priority (exponential decay)
                proximity_score = 1.0 / (shortest_path_to_target + 1)
            except:
                proximity_score = 0.05
            
            # Weighted priority calculation
            # frequency: 40%, exposure: 20%, vulnerability: 20%, proximity: 20%
            priority_score = (
                (frequency * 0.4) + 
                (exposure * 0.2) + 
                (vulnerability_factor * 0.2) + 
                (proximity_score * 0.2)
            ) * (asset_val / 5.0) # Scale by asset value
            
            # Normalized score (0-1)
            priority_score = min(priority_score, 1.0)
            
            # Generate reasoned explanation
            reasons = []
            if frequency > 0.5:
                reasons.append(f"Crucial choke point in {int(frequency*100)}% of attack paths.")
            if cves:
                reasons.append(f"Contains {len(cves)} known CVEs.")
            if proximity_score > 0.5:
                reasons.append("High proximity to target asset.")
            if exposure > 0.7:
                reasons.append("High public exposure score.")
                
            if not reasons:
                reasons = ["Intermediate node with significant lateral movement potential."]
                
            node_rankings.append({
                "node": node,
                "reason": " ".join(reasons),
                "priority_score": round(priority_score, 2)
            })
            
        # Sort by priority score descending
        sorted_rankings = sorted(node_rankings, key=lambda x: x["priority_score"], reverse=True)
        
        return sorted_rankings[:top_n]
