"use client";

import { useEffect, useRef } from "react";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPath: string[];
  entryPoint: string | null;
  target: string | null;
}

const NODE_COLORS = {
  entry: "#e74c3c",
  target: "#8e44ad",
  on_path: "#f39c12",
  public: "#e67e22",
  default: "#2c3e50",
};

const EDGE_COLORS = {
  attack: "#e74c3c",
  default: "#4a5568",
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

  // Arrowhead
  const headLen = 12;
  const headAngle = Math.PI / 6;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(angle - headAngle),
    endY - headLen * Math.sin(angle - headAngle)
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(angle + headAngle),
    endY - headLen * Math.sin(angle + headAngle)
  );
  ctx.stroke();
}

export default function AttackGraph({
  nodes,
  edges,
  attackPath,
  entryPoint,
  target,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathSet = new Set(attackPath);
  const attackEdgeSet = new Set(
    attackPath.slice(0, -1).map((n, i) => `${n}→${attackPath[i + 1]}`)
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const laid = springLayout(nodes, edges, W, H);
    const posMap: Record<string, { x: number; y: number }> = {};
    laid.forEach((n) => (posMap[n.id] = { x: n.x, y: n.y }));

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Draw edges
    for (const edge of edges) {
      const s = posMap[edge.source];
      const t = posMap[edge.target];
      if (!s || !t) continue;

      const isAttack = attackEdgeSet.has(`${edge.source}→${edge.target}`);
      ctx.strokeStyle = isAttack ? EDGE_COLORS.attack : EDGE_COLORS.default;
      ctx.lineWidth = isAttack ? 2.5 : 1.2;

      if (!isAttack) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      drawArrow(ctx, s.x, s.y, t.x, t.y, 20);
      ctx.setLineDash([]);
    }

    // Draw nodes
    const nodeR = 22;
    for (const node of laid) {
      const pos = posMap[node.id];

      let color = NODE_COLORS.default;
      if (node.id === entryPoint) color = NODE_COLORS.entry;
      else if (node.id === target) color = NODE_COLORS.target;
      else if (pathSet.has(node.id)) color = NODE_COLORS.on_path;
      else if (node.public_facing) color = NODE_COLORS.public;

      // Glow for path nodes
      if (node.id === entryPoint || node.id === target || pathSet.has(node.id)) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ecf0f1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeR, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#ecf0f1";
      ctx.font = "bold 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.id, pos.x, pos.y);

      // Sub-label (asset value)
      ctx.fillStyle = "#8b949e";
      ctx.font = "10px ui-sans-serif, sans-serif";
      ctx.fillText(`v:${node.asset_value}`, pos.x, pos.y + nodeR + 12);
    }

    // Legend
    const legendItems = [
      { label: "Entry Point", color: NODE_COLORS.entry },
      { label: "Exfil Target", color: NODE_COLORS.target },
      { label: "Attack Path", color: NODE_COLORS.on_path },
      { label: "Untouched", color: NODE_COLORS.default },
    ];
    ctx.font = "11px ui-sans-serif, sans-serif";
    let lx = 16;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + 6, H - 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8b949e";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, lx + 16, H - 18);
      lx += ctx.measureText(item.label).width + 36;
    }
  }, [nodes, edges, attackPath, entryPoint, target, pathSet, attackEdgeSet]);

  return (
    <canvas
      ref={canvasRef}
      width={760}
      height={360}
      style={{ width: "100%", height: "auto", borderRadius: "8px" }}
    />
  );
}
