import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";

type RawNode = { id: string; title: string };
type RawEdge = { source: string; target: string };
type GraphResponse = { nodes: RawNode[]; edges: RawEdge[] };

type GraphNode = {
  id: string;
  title: string;
  val: number;
};

type GraphLink = {
  source: string;
  target: string;
};

export default function Graph() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token") || "";
        const res = await fetch(
          `http://localhost:8000/workspaces/${workspaceId}/graph`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Failed to load graph (${res.status})`);
        const json: GraphResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => {
    if (!data) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const seen = new Set<string>();
    const dedupedEdges: RawEdge[] = [];
    for (const e of data.edges) {
      if (e.source === e.target) continue;
      const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedupedEdges.push(e);
    }

    const degree = new Map<string, number>();
    for (const e of dedupedEdges) {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    }

    const nodesOut: GraphNode[] = data.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      val: 2 + Math.sqrt(degree.get(n.id) || 0) * 3,
    }));

    const linksOut: GraphLink[] = dedupedEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    return { nodes: nodesOut, links: linksOut };
  }, [data]);

  const stateMessage = (msg: string) => (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "calc(100vh - 3px)",
        background: "#111",
        color: "#888",
        padding: "40px",
        boxSizing: "border-box",
      }}
    >
      {msg}
    </div>
  );

  if (loading) return stateMessage("Loading graph...");
  if (error) return stateMessage(`Error: ${error}`);
  if (nodes.length === 0)
    return stateMessage("No files in this workspace yet. Create some in the editor.");

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "calc(100vh - 3px)",
        background: "#111",
      }}
    >
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D
          graphData={{ nodes, links }}
          width={size.width}
          height={size.height}
          backgroundColor="#111"
          nodeRelSize={4}
          nodeVal={(n: GraphNode) => n.val}
          nodeColor={() => "#3DD6D0"}
          nodeLabel={(n: GraphNode) => n.title}
          linkColor={() => "rgba(61,214,208,0.85)"}
          linkWidth={3}
          linkDirectionalArrowLength={0}
          onNodeClick={(n: GraphNode) =>
            navigate(`/editor/${workspaceId}?file=${n.id}`)
          }
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.title;
            const fontSize = 12 / globalScale;
            const radius = Math.sqrt(node.val) * 4;
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#ddd";
            const nodeWithCoords = node as GraphNode & { x?: number; y?: number };
            const x = nodeWithCoords.x ?? 0;
            const y = nodeWithCoords.y ?? 0;
            ctx.fillText(label, x, y + radius + 2);
          }}
        />
      )}
    </div>
  );
}
