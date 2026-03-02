"""
visualization.py — Builds an interactive Plotly network graph of the infrastructure
with attack path highlighted.

Uses Plotly (no Pyvis dependency issues with Streamlit).
"""

import plotly.graph_objects as go
import networkx as nx
import math


# Color palette
NODE_COLORS = {
    "entry"      : "#e74c3c",   # red   — attacker entry
    "target"     : "#8e44ad",   # purple — exfil target
    "on_path"    : "#f39c12",   # orange — traversed
    "default"    : "#2c3e50",   # dark   — untouched
    "public"     : "#e67e22",   # orange shade for public nodes
}

EDGE_COLORS = {
    "attack"  : "#e74c3c",
    "default" : "#7f8c8d",
}


def build_plotly_graph(
    G           : nx.DiGraph,
    attack_path : list[str],
    entry_point : str | None = None,
    target      : str | None = None,
) -> go.Figure:
    """
    Returns a Plotly Figure with:
    - All nodes positioned via spring layout
    - All edges drawn
    - Attack path highlighted in red
    - Node color-coded by role
    - Hover shows node metadata
    """
    pos = _layout(G)

    attack_edges = set(zip(attack_path[:-1], attack_path[1:])) if len(attack_path) > 1 else set()

    edge_traces = _build_edge_traces(G, pos, attack_edges)
    node_trace  = _build_node_trace(G, pos, attack_path, entry_point, target)

    layout = go.Layout(
        paper_bgcolor = "#0d1117",
        plot_bgcolor  = "#0d1117",
        showlegend    = False,
        hovermode     = "closest",
        margin        = dict(b=20, l=5, r=5, t=40),
        xaxis         = dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis         = dict(showgrid=False, zeroline=False, showticklabels=False),
        title         = dict(
            text      = "Infrastructure Attack Graph",
            font      = dict(color="#ecf0f1", size=16),
            x         = 0.5,
        ),
        annotations   = _build_legend_annotations(),
    )

    fig = go.Figure(data=edge_traces + [node_trace], layout=layout)
    return fig


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _layout(G: nx.DiGraph) -> dict:
    """Compute spring layout with fixed seed for reproducibility."""
    if len(G.nodes) == 0:
        return {}
    pos = nx.spring_layout(G, seed=42, k=2.5)
    return pos


def _build_edge_traces(
    G           : nx.DiGraph,
    pos         : dict,
    attack_edges: set,
) -> list[go.Scatter]:
    """Build one trace per edge (allows individual coloring)."""
    traces = []

    for src, dst in G.edges():
        x0, y0 = pos[src]
        x1, y1 = pos[dst]

        is_attack = (src, dst) in attack_edges
        color     = EDGE_COLORS["attack"] if is_attack else EDGE_COLORS["default"]
        width     = 3.0 if is_attack else 1.0
        dash      = "solid" if is_attack else "dot"

        # Arrow using annotation-style via a thin scatter with marker symbol
        traces.append(go.Scatter(
            x          = [x0, x1, None],
            y          = [y0, y1, None],
            mode       = "lines",
            line       = dict(width=width, color=color, dash=dash),
            hoverinfo  = "none",
        ))

        # Arrow head
        if is_attack:
            traces.append(_arrow_head(x0, y0, x1, y1, color))

    return traces


def _arrow_head(x0, y0, x1, y1, color: str) -> go.Scatter:
    """Draw a small marker at the destination to simulate an arrowhead."""
    return go.Scatter(
        x         = [x1],
        y         = [y1],
        mode      = "markers",
        marker    = dict(symbol="arrow", size=12, color=color,
                         angleref="previous",
                         line=dict(width=1, color=color)),
        hoverinfo = "none",
    )


def _build_node_trace(
    G           : nx.DiGraph,
    pos         : dict,
    attack_path : list[str],
    entry_point : str | None,
    target      : str | None,
) -> go.Scatter:
    """Single scatter trace for all nodes."""
    x_vals, y_vals = [], []
    colors, sizes  = [], []
    texts, hovers  = [], []

    path_set = set(attack_path)

    for node in G.nodes():
        x, y = pos[node]
        x_vals.append(x)
        y_vals.append(y)

        data = G.nodes[node]
        color, size = _node_style(node, data, path_set, entry_point, target)
        colors.append(color)
        sizes.append(size)
        texts.append(node)
        hovers.append(_hover_text(node, data, attack_path, entry_point, target))

    return go.Scatter(
        x          = x_vals,
        y          = y_vals,
        mode       = "markers+text",
        marker     = dict(
            size   = sizes,
            color  = colors,
            line   = dict(width=2, color="#ecf0f1"),
        ),
        text       = texts,
        textposition = "top center",
        textfont   = dict(color="#ecf0f1", size=13),
        hovertext  = hovers,
        hoverinfo  = "text",
    )


def _node_style(
    node        : str,
    data        : dict,
    path_set    : set,
    entry_point : str | None,
    target      : str | None,
) -> tuple[str, int]:
    if node == entry_point:
        return NODE_COLORS["entry"], 30
    if node == target:
        return NODE_COLORS["target"], 30
    if node in path_set:
        return NODE_COLORS["on_path"], 24
    if data.get("public_facing", False):
        return NODE_COLORS["public"], 22
    return NODE_COLORS["default"], 20


def _hover_text(
    node        : str,
    data        : dict,
    attack_path : list[str],
    entry_point : str | None,
    target      : str | None,
) -> str:
    role = []
    if node == entry_point:
        role.append("ENTRY POINT")
    if node == target:
        role.append("EXFIL TARGET")
    if node in attack_path and node not in (entry_point, target):
        role.append("ON ATTACK PATH")
    if data.get("public_facing", False):
        role.append("Public-Facing")

    ports = data.get("open_ports", [])
    lines = [
        f"<b>{node}</b>",
        f"Role: {', '.join(role) if role else 'Internal'}",
        f"Permission: {data.get('permission', 'N/A')}",
        f"Asset Value: {data.get('asset_value', 'N/A')}",
        f"Exposure Score: {round(data.get('exposure_score', 0), 2)}",
        f"Open Ports: {', '.join(str(p) for p in ports) if ports else 'None'}",
    ]
    return "<br>".join(lines)


def _build_legend_annotations() -> list[dict]:
    legend_items = [
        ("● Entry Point",  NODE_COLORS["entry"]),
        ("● Exfil Target", NODE_COLORS["target"]),
        ("● Attack Path",  NODE_COLORS["on_path"]),
        ("● Untouched",    NODE_COLORS["default"]),
    ]
    annotations = []
    for i, (label, color) in enumerate(legend_items):
        annotations.append(dict(
            xref="paper", yref="paper",
            x=0.01 + i * 0.14, y=-0.04,
            text=f'<span style="color:{color}">{label}</span>',
            showarrow=False,
            font=dict(size=11, color=color),
        ))
    return annotations
