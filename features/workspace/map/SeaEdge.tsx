"use client";

import { BaseEdge, type Edge, type EdgeProps, useInternalNode } from "@xyflow/react";
import { memo } from "react";
import { edgePoint } from "./geometry";

export type SeaEdgeData = { kind: "tie" | "bridge" };
export type SeaFlowEdge = Edge<SeaEdgeData, "sea">;

function center(node: NonNullable<ReturnType<typeof useInternalNode>>) {
  const w = node.measured.width ?? 0;
  const h = node.measured.height ?? 0;
  return {
    c: { x: node.internals.positionAbsolute.x + w / 2, y: node.internals.positionAbsolute.y + h / 2 },
    size: { w, h },
  };
}

/** Uydu bağı: düz ince çizgi. Köprü: kavisli kesikli çizgi. İkisi de ada kenarından başlar. */
function SeaEdgeView({ source, target, data, selected, markerEnd, style }: EdgeProps<SeaFlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const A = center(s);
  const B = center(t);
  const p1 = edgePoint(A.c, A.size, B.c);
  const p2 = edgePoint(B.c, B.size, A.c);

  let path = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
  if (data?.kind === "bridge") {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const bend = Math.min(80, len * 0.18);
    const cx = mx + (-(p2.y - p1.y) / len) * bend;
    const cy = my + ((p2.x - p1.x) / len) * bend;
    path = `M${p1.x},${p1.y} Q${cx},${cy} ${p2.x},${p2.y}`;
  }

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      interactionWidth={data?.kind === "bridge" ? 18 : 0}
      className={`ark-edge ark-edge--${data?.kind ?? "tie"}${selected ? " is-selected" : ""}`}
      style={style}
    />
  );
}

export const SeaEdge = memo(SeaEdgeView);
