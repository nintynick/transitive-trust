'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NetworkNode {
  id: string;
  type: string;
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
  domain: string;
}

interface TrustNetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  viewerId: string;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
  isViewer: boolean;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  weight: number;
  domain: string;
}

export function TrustNetworkGraph({ nodes, edges, viewerId }: TrustNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  // Wait for mount to ensure we have correct dimensions
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !svgRef.current || !containerRef.current) return;

    // Clear any existing visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 500;

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare node data - add viewer node
    const d3Nodes: D3Node[] = [
      {
        id: viewerId,
        displayName: 'You',
        effectiveTrust: 1,
        hopDistance: 0,
        isViewer: true,
      },
      ...nodes.map((n) => ({
        id: n.id,
        displayName: n.displayName,
        effectiveTrust: n.effectiveTrust,
        hopDistance: n.hopDistance,
        isViewer: false,
      })),
    ];

    // Create a map for quick lookup
    const nodeMap = new Map(d3Nodes.map((n) => [n.id, n]));

    // Prepare link data
    const d3Links: D3Link[] = edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
        weight: e.weight,
        domain: e.domain,
      }));

    // Color scale for hop distance (0=green, 3+=red)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 1, 2, 3])
      .range(['#10b981', '#84cc16', '#f59e0b', '#ef4444'])
      .clamp(true);

    // Edge width scale based on weight
    const edgeWidthScale = d3.scaleLinear()
      .domain([0, 1])
      .range([1, 6]);

    // Create arrow markers for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#6b7280');

    // Create the simulation
    const simulation = d3.forceSimulation<D3Node>(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
        .id((d) => d.id)
        .distance(100)
        .strength((d) => d.weight * 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw the links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(d3Links)
      .join('line')
      .attr('stroke', '#9ca3af')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => edgeWidthScale(d.weight))
      .attr('marker-end', 'url(#arrowhead)');

    // Draw the nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, D3Node>('circle')
      .data(d3Nodes)
      .join('circle')
      .attr('r', (d) => d.isViewer ? 16 : 12)
      .attr('fill', (d) => d.isViewer ? '#3b82f6' : colorScale(d.hopDistance))
      .attr('stroke', (d) => d.isViewer ? '#1d4ed8' : '#fff')
      .attr('stroke-width', (d) => d.isViewer ? 3 : 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add labels
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(d3Nodes)
      .join('text')
      .text((d) => d.displayName || d.id.slice(0, 8) + '...')
      .attr('font-size', 11)
      .attr('font-weight', (d) => d.isViewer ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .style('pointer-events', 'none');

    // Node hover events
    node
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: d.isViewer
            ? 'You (viewer)'
            : `${d.displayName || d.id.slice(0, 16)}...\nTrust: ${(d.effectiveTrust * 100).toFixed(0)}%\nHops: ${d.hopDistance}`,
        });
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    // Link hover events
    link
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        const sourceNode = typeof d.source === 'object' ? d.source : nodeMap.get(d.source as string);
        const targetNode = typeof d.target === 'object' ? d.target : nodeMap.get(d.target as string);
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: `${sourceNode?.displayName || (sourceNode?.id.slice(0, 8) + '...')} → ${targetNode?.displayName || (targetNode?.id.slice(0, 8) + '...')}\nWeight: ${(d.weight * 100).toFixed(0)}%\nDomain: ${d.domain}`,
        });
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x!)
        .attr('y1', (d) => (d.source as D3Node).y!)
        .attr('x2', (d) => (d.target as D3Node).x!)
        .attr('y2', (d) => (d.target as D3Node).y!);

      node
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!);

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [mounted, nodes, edges, viewerId]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: 500 }}>
      <svg ref={svgRef} className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg" style={{ height: 500 }} />

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-10 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none whitespace-pre-line"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md text-sm">
        <div className="font-semibold mb-2">Hop Distance</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
          <span>1 hop</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#84cc16' }} />
          <span>2 hops</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          <span>3 hops</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span>4+ hops</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md text-xs text-gray-500">
        Scroll to zoom • Drag to pan • Drag nodes to rearrange
      </div>
    </div>
  );
}
