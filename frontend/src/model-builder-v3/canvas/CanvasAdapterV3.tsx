import { useEffect, useMemo, type DragEvent } from "react";
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
  useEdgesState,
  useNodesState,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Mb3Graph } from "../domain/types";
import { mb3ToReactFlow } from "./adapter";
import { SelectableWireEdge } from "./SelectableWireEdge";

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
  return (
    <div className="mbv3-junction-node">
      <Handle type="target" position={Position.Top} id="node" />
      {String((data as { label?: string }).label ?? "")}
      <Handle type="source" position={Position.Bottom} id="node" />
    </div>
  );
}

function ComponentNode({ data, selected }: NodeProps) {
  const payload = data as {
    label?: string;
    componentId?: string;
    inspected?: boolean;
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
      <Handle type="target" position={Position.Top} id="p" />
      {String(payload.label ?? "")}
      <Handle type="source" position={Position.Bottom} id="n" />
    </div>
  );
}

const nodeTypes = {
  mbv3Terminal: TerminalNode,
  mbv3Junction: JunctionNode,
  mbv3Component: ComponentNode,
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
}: {
  graph: Mb3Graph;
  selectedComponentId: string | null;
  inspectedComponentId: string | null;
  selectedWireId: string | null;
  onSelectComponent: (componentId: string | null) => void;
  onSelectWire: (wireId: string | null) => void;
  onDeleteWire: (wireId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onMoveEntity: (entityId: string, x: number, y: number) => void;
  onConnectPorts: (connection: Connection) => void;
  onDropTemplate: (templateKey: string, position: { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const flowGraph = useMemo(() => mb3ToReactFlow(graph), [graph]);
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
        onConnect={onConnectPorts}
        onEdgeClick={(_, edge) => onSelectWire(edge.id)}
        onNodeClick={(_, node) => {
          const isComponent = node.type === "mbv3Component";
          onSelectComponent(isComponent ? node.id : null);
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
