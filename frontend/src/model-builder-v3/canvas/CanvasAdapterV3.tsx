import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  useEdgesState,
  useNodesState,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MathFormula } from "../../components/MathFormula";
import { buildMb3VoltageLabels } from "../domain/compile";
import type { Mb3Graph } from "../domain/types";
import { mb3ToReactFlow } from "./adapter";
import { SelectableWireEdge } from "./SelectableWireEdge";

const DEFAULT_LABEL_OFFSET = { x: 15, y: -18 };

function portSideToPosition(side?: string): Position {
  switch (side) {
    case "right":
      return Position.Right;
    case "bottom":
      return Position.Bottom;
    case "left":
      return Position.Left;
    case "top":
    default:
      return Position.Top;
  }
}

function TerminalNode({ data }: NodeProps) {
  const payload = data as { label?: string; role?: "positive" | "ground" };
  const isV = payload.role === "positive";
  const isGnd = payload.role === "ground";
  return (
    <div className="mbv3-terminal-node">
      {isGnd ? <Handle type="target" position={Position.Top} id="node" /> : null}
      {String(payload.label ?? "")}
      {isV ? <Handle type="source" position={Position.Bottom} id="node" /> : null}
    </div>
  );
}

function JunctionNode({ data }: NodeProps) {
  const payload = data as {
    label?: string;
    voltageLabel?: string;
    nodeId?: string;
    position?: { x: number; y: number };
    zoom?: number;
    onMoveEntity?: (entityId: string, x: number, y: number) => void;
  };
  const voltageLabel = payload.voltageLabel;
  const nodePosition = payload.position ?? { x: 0, y: 0 };
  const [draftPosition, setDraftPosition] = useState(nodePosition);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setDraftPosition(nodePosition);
  }, [nodePosition.x, nodePosition.y]);

  const startLabelDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (!payload.nodeId || !payload.onMoveEntity) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: draftPosition.x,
      originY: draftPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveLabelDrag = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const zoom = payload.zoom && Number.isFinite(payload.zoom) ? payload.zoom : 1;
    const nextPosition = {
      x: drag.originX + (event.clientX - drag.startX) / zoom,
      y: drag.originY + (event.clientY - drag.startY) / zoom,
    };
    setDraftPosition(nextPosition);
    if (payload.nodeId && payload.onMoveEntity) {
      payload.onMoveEntity(payload.nodeId, nextPosition.x, nextPosition.y);
    }
  };

  const endLabelDrag = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (payload.nodeId && payload.onMoveEntity) {
      payload.onMoveEntity(payload.nodeId, draftPosition.x, draftPosition.y);
    }
  };

  return (
    <div className="mbv3-junction-node">
      <Handle type="target" position={Position.Top} id="node" />
      {String(payload.label ?? "")}
      {voltageLabel ? (
        <span
          className="mbv3-node-voltage-label"
          style={{ left: DEFAULT_LABEL_OFFSET.x, top: DEFAULT_LABEL_OFFSET.y }}
          title="Drag junction node"
          onPointerDown={startLabelDrag}
          onPointerMove={moveLabelDrag}
          onPointerUp={endLabelDrag}
          onPointerCancel={endLabelDrag}
        >
          {voltageLabel}
        </span>
      ) : null}
      <Handle type="source" position={Position.Bottom} id="node" />
    </div>
  );
}

function ComponentNode({ data, selected }: NodeProps) {
  const payload = data as {
    label?: string;
    componentId?: string;
    inspected?: boolean;
    portSides?: { p?: string; n?: string };
    onDeleteComponent?: (componentId: string) => void;
  };
  const className = [
    "mbv3-component-node",
    payload.inspected ? "mbv3-component-node-inspected" : "",
    selected ? "mbv3-component-node-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <button
        type="button"
        className="mbv3-component-delete"
        aria-label="Delete component"
        title="Delete component"
        onClick={(event) => {
          event.stopPropagation();
          if (payload.componentId && payload.onDeleteComponent) {
            payload.onDeleteComponent(payload.componentId);
          }
        }}
      >
        x
      </button>
      <Handle type="target" position={portSideToPosition(payload.portSides?.p)} id="p" />
      {String(payload.label ?? "")}
      <Handle type="source" position={portSideToPosition(payload.portSides?.n ?? "bottom")} id="n" />
    </div>
  );
}

function FormulaNode({ data }: NodeProps) {
  const payload = data as { formulaLatex?: string[] };
  const lines = payload.formulaLatex ?? [];
  return (
    <div className="mbv3-formula-node" aria-label="Compiled fitting equations">
      <div className="mbv3-formula-node-title">Fitting equations</div>
      <div className="mbv3-formula-node-lines">
        {lines.map((line, index) => (
          <MathFormula
            key={`${index}-${line}`}
            latex={line}
            label={`Fitting equation ${index + 1}`}
            className="mbv3-formula-node-line"
          />
        ))}
      </div>
    </div>
  );
}

const nodeTypes = {
  mbv3Terminal: TerminalNode,
  mbv3Junction: JunctionNode,
  mbv3Component: ComponentNode,
  mbv3Formula: FormulaNode,
};

const edgeTypes = {
  mbv3SelectableEdge: SelectableWireEdge,
};

function CanvasInner({
  graph,
  selectedComponentId,
  inspectedComponentId,
  selectedWireId,
  onSelectComponent,
  onSelectWire,
  onDeleteWire,
  onDeleteComponent,
  onMoveEntity,
  onConnectPorts,
  onDropTemplate,
  formulaLatex,
  activeComponentIds,
}: {
  graph: Mb3Graph;
  formulaLatex: string[];
  activeComponentIds: string[];
  selectedComponentId: string | null;
  inspectedComponentId: string | null;
  selectedWireId: string | null;
  onSelectComponent: (componentId: string | null, screenPos?: { x: number; y: number }) => void;
  onSelectWire: (wireId: string | null) => void;
  onDeleteWire: (wireId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onMoveEntity: (entityId: string, x: number, y: number) => void;
  onConnectPorts: (connection: Connection, position?: { x: number; y: number }) => void;
  onDropTemplate: (templateKey: string, position: { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const { zoom } = useViewport();
  const flowGraph = useMemo(
    () => mb3ToReactFlow(graph, formulaLatex, activeComponentIds),
    [graph, formulaLatex, activeComponentIds],
  );
  const voltageLabels = useMemo(() => buildMb3VoltageLabels(graph), [graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flowGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowGraph.edges);

  useEffect(() => setNodes(flowGraph.nodes), [flowGraph.nodes, setNodes]);
  useEffect(() => setEdges(flowGraph.edges), [flowGraph.edges, setEdges]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const templateKey =
      event.dataTransfer.getData("application/x-mb3-component-template") ||
      event.dataTransfer.getData("text/plain");
    if (!templateKey) return;
    event.preventDefault();
    event.stopPropagation();
    onDropTemplate(
      templateKey,
      screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    );
  };

  return (
    <div
      className="mbv3-canvas"
      data-testid="model-builder-v3-canvas"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          selected: node.id === selectedComponentId,
          data:
            node.type === "mbv3Component"
              ? {
                  ...(node.data ?? {}),
                  componentId: node.id,
                  inspected: node.id === inspectedComponentId,
                  onDeleteComponent,
                }
              : node.type === "mbv3Junction"
                ? {
                    ...(node.data ?? {}),
                    nodeId: node.id,
                    voltageLabel: voltageLabels.get(node.id),
                    position: graph.nodes.find((graphNode) => graphNode.id === node.id)?.position,
                    zoom,
                    onMoveEntity,
                  }
              : node.data,
        }))}
        edges={edges.map((edge) => ({
          ...edge,
          type: "mbv3SelectableEdge",
          selected: edge.id === selectedWireId,
          data: {
            ...(edge.data ?? {}),
            onDeleteWire,
          },
          style:
            edge.id === selectedWireId
              ? { ...(edge.style ?? {}), stroke: "#2563eb", strokeWidth: 3.4 }
              : edge.style,
        }))}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(connection) => {
          const sourceNode = nodes.find((node) => node.id === connection.source);
          const targetNode = nodes.find((node) => node.id === connection.target);
          const midpoint =
            sourceNode && targetNode
              ? {
                  x: (sourceNode.position.x + targetNode.position.x) / 2,
                  y: (sourceNode.position.y + targetNode.position.y) / 2,
                }
              : undefined;
          onConnectPorts(connection, midpoint);
        }}
        onEdgeClick={(_, edge) => onSelectWire(edge.id)}
        onNodeClick={(_, node) => {
          const isComponent = node.type === "mbv3Component";
          if (isComponent) {
            const screenPos = flowToScreenPosition({ x: node.position.x + 130, y: node.position.y });
            onSelectComponent(node.id, screenPos);
          } else {
            onSelectComponent(null);
          }
          onSelectWire(null);
        }}
        onSelectionChange={({ nodes: selectedNodes }) => {
          const selectedComponentNode = selectedNodes.find((node) => node.type === "mbv3Component");
          if (selectedComponentNode) {
            onSelectComponent(selectedComponentNode.id);
            onSelectWire(null);
          }
        }}
        onPaneClick={() => {
          onSelectComponent(null);
          onSelectWire(null);
        }}
        onNodeDragStop={(_, node) => {
          onMoveEntity(node.id, node.position.x, node.position.y);
        }}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{ type: "mbv3SelectableEdge" }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  );
}

export function CanvasAdapterV3(props: Parameters<typeof CanvasInner>[0]) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
