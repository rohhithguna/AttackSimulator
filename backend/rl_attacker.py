"""
rl_attacker.py — RL-based attacker module for discovering alternative attack paths.
Uses Q-Learning to learn optimal exploit sequences based on rewards.
"""

import random
import networkx as nx
from typing import List, Dict, Tuple, Optional


class RLAttacker:
    """
    RL Agent that uses Q-Learning to discover high-reward attack paths in a network graph.
    """
    def __init__(
        self, 
        G: nx.DiGraph, 
        alpha: float = 0.2, 
        gamma: float = 0.8, 
        epsilon: float = 0.2,
        episodes: int = 1000,
        max_steps: int = 15
    ):
        """
        Initialize the RL Agent.
        
        Args:
            G: The network graph (Environment).
            alpha: Learning rate.
            gamma: Discount factor.
            epsilon: Exploration rate for epsilon-greedy policy.
            episodes: Number of training episodes.
            max_steps: Maximum steps allowed per episode.
        """
        self.G = G
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.episodes = episodes
        self.max_steps = max_steps
        
        # Q-Table: {state_node_id: {neighbor_node_id: q_value}}
        self.q_table = {}

    def _get_q_value(self, state: str, action: str) -> float:
        """Retrieve Q-value for a state-action pair, initializing if necessary."""
        if state not in self.q_table:
            self.q_table[state] = {neighbor: 0.0 for neighbor in self.G.neighbors(state)}
        return self.q_table[state].get(action, 0.0)

    def _set_q_value(self, state: str, action: str, value: float):
        """Update Q-value for a state-action pair."""
        if state not in self.q_table:
            self.q_table[state] = {neighbor: 0.0 for neighbor in self.G.neighbors(state)}
        self.q_table[state][action] = value

    def _choose_action(self, state: str) -> Optional[str]:
        """Epsilon-greedy action selection."""
        neighbors = list(self.G.neighbors(state))
        if not neighbors:
            return None
        
        if random.random() < self.epsilon:
            return random.choice(neighbors)
        
        # Greedy choice: pick action with highest Q-value
        q_values = [self._get_q_value(state, n) for n in neighbors]
        max_q = max(q_values)
        
        # Tie-breaking
        best_actions = [neighbors[i] for i, q in enumerate(q_values) if q == max_q]
        return random.choice(best_actions)

    def _calculate_reward(self, u: str, v: str, target_node: str) -> float:
        """
        Compute reward for moving from node u to node v.
        
        Rewards are grounded in CVSS/Vulnerability metrics where available.
        """
        v_data = self.G.nodes[v]
        vuln_score = v_data.get("vulnerability_score", 0.5)
        
        # Base reward: successful exploit (+1.0), scaled by vulnerability confidence
        reward = 1.0 + (vuln_score * 0.1)
        
        u_data = self.G.nodes[u]
        
        # Privilege escalation check (+0.1)
        u_perm = u_data.get("permission", "low")
        v_perm = v_data.get("permission", "low")
        perm_map = {"low": 0, "medium": 1, "high": 2}
        if perm_map.get(v_perm, 0) > perm_map.get(u_perm, 0):
            reward += 0.1
            
        # Lateral movement bonus (+0.05)
        reward += 0.05
        
        # Target node bonus (+0.2)
        if v == target_node:
            reward += 0.2
            
        # Extra bonus for high-value intermediate assets
        v_asset = v_data.get("asset_value", 1)
        if v_asset >= 8:
            reward += 0.1
            
        return reward

    def train(self, entry_points: List[str], target_node: str):
        """Train the RL agent using Q-Learning."""
        if not entry_points:
            return

        for _ in range(self.episodes):
            state = random.choice(entry_points)
            for _ in range(self.max_steps):
                action = self._choose_action(state)
                if not action:
                    break
                
                reward = self._calculate_reward(state, action, target_node)
                next_state = action
                
                # Q-Learning update: Q(s,a) = Q(s,a) + alpha * [R + gamma * max(Q(s',a')) - Q(s,a)]
                next_neighbors = list(self.G.neighbors(next_state))
                max_next_q = 0.0
                if next_neighbors:
                    max_next_q = max([self._get_q_value(next_state, n) for n in next_neighbors])
                
                old_q = self._get_q_value(state, action)
                new_q = old_q + self.alpha * (reward + self.gamma * max_next_q - old_q)
                self._set_q_value(state, action, new_q)
                
                state = next_state
                if state == target_node:
                    break

    def get_best_path(self, entry_point: str, target_node: str) -> Tuple[List[str], float]:
        """Extract the best discovered path from the trained Q-table."""
        path = [entry_point]
        state = entry_point
        total_reward = 0.0
        visited = {entry_point}
        
        for _ in range(self.max_steps):
            neighbors = list(self.G.neighbors(state))
            if not neighbors:
                break
            
            # Select greedy action from Q-table, avoiding cycles
            q_values = [self._get_q_value(state, n) for n in neighbors]
            
            # Filter neighbors to prevent infinite loops in path extraction
            valid_indices = [i for i, n in enumerate(neighbors) if n not in visited]
            if not valid_indices:
                break
                
            filtered_q = [q_values[i] for i in valid_indices]
            max_q = max(filtered_q)
            
            best_actions = [neighbors[valid_indices[i]] for i, q in enumerate(filtered_q) if q == max_q]
            action = random.choice(best_actions)
            
            total_reward += self._calculate_reward(state, action, target_node)
            state = action
            path.append(state)
            visited.add(state)
            
            if state == target_node:
                break
                
        return path, total_reward


def train_rl_agent(G: nx.DiGraph, entry_points: List[str], target_node: str, episodes: int = 1000) -> RLAttacker:
    """Helper function to train and return an RL attacker."""
    agent = RLAttacker(G, episodes=episodes)
    agent.train(entry_points, target_node)
    return agent


def simulate_rl_path(agent: RLAttacker, entry_point: str, target_node: str) -> Dict:
    """Helper function to get best path and reward from a trained agent."""
    path, reward = agent.get_best_path(entry_point, target_node)
    return {
        "path": path,
        "reward": round(reward, 3)
    }


def compare_rl_vs_deterministic(rl_path: List[str], det_path: List[str]) -> str:
    """Generate a textual explanation comparing RL results with deterministic models."""
    if not rl_path:
        return "RL agent failed to identify a viable path."
    
    if rl_path == det_path:
        return "The RL agent converged on the same optimal path as the deterministic model, validating the CVSS-grounded probability logic."
    
    if len(rl_path) < len(det_path) and det_path:
        return f"The RL agent discovered a more efficient shortcut ({len(rl_path)} steps) compared to the deterministic path ({len(det_path)} steps)."
    
    return "The RL agent prioritized cumulative reward (privilege gains and high-value intermediate assets) over the highest single-node exploit probabilities."


if __name__ == "__main__":
    # Demo test script
    print("--- RL Attacker Demo ---")
    G = nx.DiGraph()
    G.add_node("entry", permission="low", asset_value=1, public_facing=True)
    G.add_node("mid1", permission="medium", asset_value=5, public_facing=False)
    G.add_node("mid2", permission="low", asset_value=2, public_facing=False)
    G.add_node("target", permission="high", asset_value=10, public_facing=False)
    
    G.add_edge("entry", "mid1")
    G.add_edge("entry", "mid2")
    G.add_edge("mid1", "target")
    G.add_edge("mid2", "target")
    
    agent = train_rl_agent(G, ["entry"], "target", episodes=500)
    result = simulate_rl_path(agent, "entry", "target")
    
    print(f"RL Discovered Path: {' -> '.join(result['path'])}")
    print(f"Cumulative Reward: {result['reward']}")
    
    det_path = ["entry", "mid1", "target"]
    print(f"Deterministic Path: {' -> '.join(det_path)}")
    print(f"Comparison: {compare_rl_vs_deterministic(result['path'], det_path)}")
