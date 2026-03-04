"use client";

import { useEffect, useRef } from "react";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPath: string[];        // primary path
  secondaryPath?: string[];    // secondary path (optional)
  activePath?: "primary" | "secondary";
  entryPoint: string | null;
  target: string | null;
}

const NODE_COLORS = {
  entry:    "#e74c3c",
  target:   "#8e44ad",
  on_path:  "#f39c12",
  secondary_path: "#3498db",
  public:   "#e67e22",
  default:  "#2c3e50",
};

const EDGE_COLORS = {
  attack:    "#e74c3c",
  secondary: "#3498db",
  default:   "#4a5568",
};

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function springLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): LayoutNode[] {
  const positions: LayoutNode[] = nodes.map((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const r = Math.min(width, height) * 0.32;
    return {
      ...n,
      x: width / 2 + r * Math.cos(angle),
      y: height / 2 + r * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const idxMap: Record<string, number> = {};
  positions.forEach((n, i) => (idxMap[n.id] = i));

  for (let iter = 0; iter < 300; iter++) {
    // Repulsion
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 4000 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[j].vx += fx;
        positions[j].vy += fy;
      }
    }

    // Attraction (spring)
    for (const edge of edges) {
      const si = idxMap[edge.source];
      const ti = idxMap[edge.target];
      if (si === undefined || ti === undefined) continue;
      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealLen = 160;
      const force = (dist - idealLen) * 0.05;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      positions[si].vx += fx;
      positions[si].vy += fy;
      positions[ti].vx -= fx;
      positions[ti].vy -= fy;
    }

    // Center pull
    for (const n of positions) {
      n.vx += (width / 2 - n.x) * 0.005;
      n.vy += (height / 2 - n.y) * 0.005;
    }

    // Dampen + apply
    const damping = 0.85 - iter * 0.001;
    for (const n of positions) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(50, Math.min(width - 50, n.x));
      n.y = Math.max(50, Math.min(height - 50, n.y));
    }
  }

  return positions;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const ux = dx / len;
  const uy = dy / len;

  const endX = x2 - ux * (r + 2);
  const endY = y2 - uy * (r + 2);

  ctx.beginPath();
  ctx.moveTo(x1 + ux * r, y1 + uy * r);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headLen   = 12;
  const headAngle = Math.PI / 6;
  const angle     = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * Math.cos(angle - headAngle), endY - headLen * Math.sin(angle - headAngle));
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * Math.cos(angle + headAngle), endY - headLen * Math.sin(angle + headAngle));
  ctx.stroke();
}

export default function AttackGraph({
  nodes,
  edges,
  attackPath,
  secondaryPath = [],
  activePath = "primary",
  entryPoint,
  target,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const primarySet   = new Set(attackPath);
  const secondarySet = new Set(secondaryPath);

  const primaryEdgeSet = new Set(
    attackPath.slice(0, -1).map((n, i) => `${n}→${attackPath[i + 1]}`)
  );
  const secondaryEdgeSet = new Set(
    secondaryPath.slice(0, -1).map((n, i) => `${n}→${secondaryPath[i + 1]}`)
  );

  // Active display sets
  const activePathSet  = activePath === "primary" ? primarySet   : secondarySet;
  const activeEdgeSet  = activePath === "primary" ? primaryEdgeSet : secondaryEdgeSet;
  const inactivePathSet = activePath === "primary" ? secondarySet : primarySet;
  const inactiveEdgeSet = activePath === "primary" ? secondaryEdgeSet : primaryEdgeSet;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const laid   = springLayout(nodes, edges, W, H);
    const posMap: Record<string, { x: number; y: number }> = {};
    laid.forEach((n) => (posMap[n.id] = { x: n.x, y: n.y }));

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // ── Draw edges ──────────────────────────────────────────────────────────
    for (const edge of edges) {
      const s = posMap[edge.source];
      const t = posMap[edge.target];
      if (!s || !t) continue;

      const key       = `${edge.source}→${edge.target}`;
      const isActive  = activeEdgeSet.has(key);
      const isInactive = inactiveEdgeSet.has(key);

      if (isActive) {
        ctx.strokeStyle = activePath === "primary" ? EDGE_COLORS.attack : EDGE_COLORS.secondary;
        ctx.lineWidth   = 2.5;
        ctx.setLineDash([]);
      } else if (isInactive) {
        // Show other path faintly
        ctx.strokeStyle = activePath === "primary"
          ? `${EDGE_COLORS.secondary}55`
          : `${EDGE_COLORS.attack}55`;
        ctx.lineWidth   = 1.2;
        ctx.setLineDash([3, 5]);
      } else {
        ctx.strokeStyle = EDGE_COLORS.default;
        ctx.lineWidth   = 1.0;
        ctx.setLineDash([4, 4]);
      }

      drawArrow(ctx, s.x, s.y, t.x, t.y, 22);
      ctx.setLineDash([]);
    }

    // ── Draw nodes ──────────────────────────────────────────────────────────
    const nodeR = 22;
    for (const node of laid) {
      const pos = posMap[node.id];
      let color = NODE_COLORS.default;

      if (node.id === entryPoint) {
        color = NODE_COLORS.entry;
      } else if (node.id === target) {
        color = NODE_COLORS.target;
      } else if (activePathSet.has(node.id)) {
        color = activePath === "primary" ? NODE_COLORS.on_path : NODE_COLORS.secondary_path;
      } else if (inactivePathSet.has(node.id)) {
        // Dim the inactive path nodes
        color = activePath === "primary"
          ? `${NODE_COLORS.secondary_path}66`
          : `${NODE_COLORS.on_path}66`;
      } else if (node.public_facing) {
        color = NODE_COLORS.public;
      }

      // Glow for active path nodes
      const isHighlighted = node.id === entryPoint || node.id === target || activePathSet.has(node.id);
      if (isHighlighted) {
        ctx.shadowColor = color;
        ctx.shadowBlur  = 20;
      } else {
        ctx.shadowBlur  = 0;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur  = 0;
      ctx.strokeStyle = isHighlighted ? "#ecf0f1" : "#4a5568";
      ctx.lineWidth   = isHighlighted ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeR, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#ecf0f1";
      ctx.font      = "bold 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.id, pos.x, pos.y);

      // Sub-label (asset value)
      ctx.fillStyle = "#8b949e";
      ctx.font      = "10px ui-sans-serif, sans-serif";
      ctx.fillText(`v:${node.asset_value}`, pos.x, pos.y + nodeR + 12);
    }

    // ── Legend ──────────────────────────────────────────────────────────────
    const legendItems = [
      { label: "Entry Point",     color: NODE_COLORS.entry      },
      { label: "Exfil Target",    color: NODE_COLORS.target     },
      { label: "Primary Path",    color: NODE_COLORS.on_path    },
      { label: "Secondary Path",  color: NODE_COLORS.secondary_path },
      { label: "Untouched",       color: NODE_COLORS.default    },
    ];
    ctx.font = "10px ui-sans-serif, sans-serif";
    let lx = 14;
    for (const item of legendItems) {
      ctx.fillStyle    = item.color;
      ctx.shadowBlur   = 0;
      ctx.beginPath();
      ctx.arc(lx + 5, H - 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle    = "#8b949e";
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, lx + 14, H - 16);
      lx += ctx.measureText(item.label).width + 30;
    }
  }, [nodes, edges, attackPath, secondaryPath, activePath, entryPoint, target,
      primarySet, secondarySet, primaryEdgeSet, secondaryEdgeSet,
      activePathSet, activeEdgeSet, inactivePathSet, inactiveEdgeSet]);

  return (
    <canvas
      ref={canvasRef}
      width={760}
      height={380}
      style={{ width: "100%", height: "auto", borderRadius: "8px" }}
    />
  );
}
