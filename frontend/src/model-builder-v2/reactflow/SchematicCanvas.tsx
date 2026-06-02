import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SchematicGraph, PortRef } from "../domain/schematicTypes";
import { addComponentFromPreset, connectPorts, deleteComponent, deleteWire, moveNode } from "../domain/schematicMutations";
import { validateSchematicGraph } from "../domain/graphValidation";
import { schematicToReactFlow } from "./reactFlowAdapter";
import { TerminalNode } from "./nodes/TerminalNode";
import { JunctionNode } from "./nodes/JunctionNode";
import { ComponentNode } from "./nodes/ComponentNode";
import { OrthogonalWireEdge } from "./edges/OrthogonalWireEdge";

const nodeTypes = { terminal: TerminalNode, junction: JunctionNode, component: ComponentNode };
const edgeTypes = { orthogonalWire: OrthogonalWireEdge };

function handleToPortRef(nodeId: string | null, handleId: string | null): PortRef | null {
  if (!nodeId) return null;
  if (handleId === "p" || handleId === "n") return { kind: "component", id: nodeId, port: handleId };
  return { kind: "node", id: nodeId };
}

function CanvasInner({
  graph,
  selectedComponentId,
  activePresetId,
  onGraphChange,
  onSelectComponent,
}: {
  graph: SchematicGraph;
  selectedComponentId: string | null;
  activePresetId: string;
  onGraphChange: (graph: SchematicGraph) => void;
  onSelectComponent: (componentId: string | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fitViewTimerRef = useRef<number | null>(null);
  const reactFlow = useReactFlow();
  const validation = useMemo(() => validateSchematicGraph(graph), [graph]);
  const onDeleteWire = useCallback((wireId: string) => onGraphChange(deleteWire(graph, wireId)), [graph, onGraphChange]);
  const flowGraph = useMemo(() => schematicToReactFlow(graph, validation, onDeleteWire), [graph, validation, onDeleteWire]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flowGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowGraph.edges);
  useEffect(() => { setNodes(flowGraph.nodes); }, [flowGraph.nodes, setNodes]);
  useEffect(() => { setEdges(flowGraph.edges); }, [flowGraph.edges, setEdges]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const requestFit = () => {
      if (fitViewTimerRef.current !== null) window.clearTimeout(fitViewTimerRef.current);
      fitViewTimerRef.current = window.setTimeout(() => {
        reactFlow.fitView({ padding: 0.2, duration: 120 });
      }, 80);
    };
    const observer = new ResizeObserver(requestFit);
    observer.observe(node);
    requestFit();
    return () => {
      observer.disconnect();
      if (fitViewTimerRef.current !== null) window.clearTimeout(fitViewTimerRef.current);
    };
  }, [reactFlow, flowGraph.nodes.length, flowGraph.edges.length]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const from = handleToPortRef(connection.source, connection.sourceHandle);
    const to = handleToPortRef(connection.target, connection.targetHandle);
    if (!from || !to) return;
    if (from.kind === "component" && to.kind === "component" && from.id === to.id) return;
    onGraphChange(connectPorts(graph, from, to));
  }, [graph, onGraphChange]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    onGraphChange(moveNode(graph, node.id, node.position));
  }, [graph, onGraphChange]);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const presetId = event.dataTransfer.getData("application/x-ivfitter-component-preset") || activePresetId;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const clientX = bounds ? event.clientX - bounds.left : event.clientX;
    const clientY = bounds ? event.clientY - bounds.top : event.clientY;
    const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const snapped = { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 };
    const result = addComponentFromPreset(graph, presetId, bounds ? snapped : { x: clientX, y: clientY });
    onGraphChange(result.graph);
    onSelectComponent(result.componentId);
  }, [activePresetId, graph, onGraphChange, onSelectComponent, reactFlow]);

  const onPaneClick = useCallback(() => onSelectComponent(null), [onSelectComponent]);
  const onNodeClick = useCallback((_event: MouseEvent, node: Node) => {
    if (graph.components.some((component) => component.id === node.id)) onSelectComponent(node.id);
  }, [graph.components, onSelectComponent]);
  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedComponentId) {
      event.preventDefault();
      onGraphChange(deleteComponent(graph, selectedComponentId));
      onSelectComponent(null);
    }
  }, [graph, onGraphChange, onSelectComponent, selectedComponentId]);

  return (
    <div
      className="mbv2-canvas"
      ref={wrapperRef}
      onDrop={onDrop}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-testid="model-builder-v2-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        snapToGrid
        snapGrid={[20, 20]}
        connectionLineType={ConnectionLineType.Step}
        defaultEdgeOptions={{ type: "orthogonalWire" }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} className="mbv2-minimap" />
      </ReactFlow>
    </div>
  );
}

export function SchematicCanvas(props: Parameters<typeof CanvasInner>[0]) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
