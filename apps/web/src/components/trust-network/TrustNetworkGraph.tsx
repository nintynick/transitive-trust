'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useEnsNames } from '@/hooks/useEns';

interface NetworkNode {
  id: string;
  type: 'principal' | 'subject' | string;
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
  subjectMetadata?: {
    name?: string;
    description?: string;
  };
}

interface NetworkEdge {
  from: string;
  to: string;
  type?: 'trust' | 'endorsement';
  weight: number;
  domain: string;
  rating?: number;
  summary?: string;
}

interface TrustNetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  viewerId: string;
  showEndorsements?: boolean;
  showLegend?: boolean;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  nodeType: 'principal' | 'subject' | 'viewer';
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
  isViewer: boolean;
  subjectMetadata?: {
    name?: string;
    description?: string;
  };
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  edgeType: 'trust' | 'endorsement';
  weight: number;
  domain: string;
  rating?: number;
  summary?: string;
}

export function TrustNetworkGraph({ nodes, edges, viewerId, showEndorsements = true, showLegend = true }: TrustNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  // Get all principal addresses for ENS lookup (including viewerId)
  const principalAddresses = useMemo(() => {
    const addresses = nodes
      .filter(n => n.type === 'principal' && n.id.startsWith('0x'))
      .map(n => n.id);
    if (viewerId.startsWith('0x') && !addresses.includes(viewerId)) {
      addresses.push(viewerId);
    }
    return addresses;
  }, [nodes, viewerId]);

  // Fetch ENS names for all principals
  const { ensNames } = useEnsNames(principalAddresses);

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

    // Filter nodes and edges based on showEndorsements
    const filteredNodes = showEndorsements
      ? nodes
      : nodes.filter(n => n.type !== 'subject');
    const filteredEdges = showEndorsements
      ? edges
      : edges.filter(e => e.type !== 'endorsement');

    // Prepare node data - add viewer node
    const d3Nodes: D3Node[] = [
      {
        id: viewerId,
        nodeType: 'viewer',
        displayName: 'You',
        effectiveTrust: 1,
        hopDistance: 0,
        isViewer: true,
      },
      ...filteredNodes.map((n) => ({
        id: n.id,
        nodeType: (n.type === 'subject' ? 'subject' : 'principal') as 'principal' | 'subject',
        displayName: n.displayName || n.subjectMetadata?.name,
        effectiveTrust: n.effectiveTrust,
        hopDistance: n.hopDistance,
        isViewer: false,
        subjectMetadata: n.subjectMetadata,
      })),
    ];

    // Create a map for quick lookup
    const nodeMap = new Map(d3Nodes.map((n) => [n.id, n]));

    // Prepare link data
    const d3Links: D3Link[] = filteredEdges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
        edgeType: (e.type || 'trust') as 'trust' | 'endorsement',
        weight: e.weight,
        domain: e.domain,
        rating: e.rating,
        summary: e.summary,
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
    const defs = svg.append('defs');

    // Arrow for trust edges
    defs.append('marker')
      .attr('id', 'arrowhead-trust')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#6b7280');

    // Arrow for endorsement edges (different color)
    defs.append('marker')
      .attr('id', 'arrowhead-endorsement')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#8b5cf6');

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
      .attr('stroke', (d) => d.edgeType === 'endorsement' ? '#8b5cf6' : '#9ca3af')
      .attr('stroke-opacity', (d) => d.edgeType === 'endorsement' ? 0.5 : 0.6)
      .attr('stroke-width', (d) => d.edgeType === 'endorsement' ? 2 : edgeWidthScale(d.weight))
      .attr('stroke-dasharray', (d) => d.edgeType === 'endorsement' ? '5,3' : 'none')
      .attr('marker-end', (d) => d.edgeType === 'endorsement' ? 'url(#arrowhead-endorsement)' : 'url(#arrowhead-trust)');

    // Draw the nodes - separate groups for principals (circles) and subjects (squares)
    const nodesGroup = g.append('g').attr('class', 'nodes');

    // Filter nodes by type
    const principalNodes = d3Nodes.filter(n => n.nodeType !== 'subject');
    const subjectNodes = d3Nodes.filter(n => n.nodeType === 'subject');

    // Draw principal nodes (circles)
    const principalNode = nodesGroup
      .selectAll<SVGCircleElement, D3Node>('circle')
      .data(principalNodes)
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

    // Draw subject nodes (rounded squares)
    const subjectNode = nodesGroup
      .selectAll<SVGRectElement, D3Node>('rect')
      .data(subjectNodes)
      .join('rect')
      .attr('width', 22)
      .attr('height', 22)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', '#8b5cf6')
      .attr('stroke', '#7c3aed')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGRectElement, D3Node>()
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

    // Helper to get display name with ENS preference
    const getDisplayLabel = (d: D3Node) => {
      if (d.isViewer) return 'You';
      const ensName = ensNames.get(d.id);
      if (ensName) return ensName;
      if (d.displayName) return d.displayName;
      if (d.nodeType === 'subject') return 'Unknown';
      return d.id.startsWith('0x') ? `${d.id.slice(0, 6)}...${d.id.slice(-4)}` : d.id.slice(0, 8) + '...';
    };

    // Add labels
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(d3Nodes)
      .join('text')
      .text((d) => getDisplayLabel(d))
      .attr('font-size', 11)
      .attr('font-weight', (d) => d.isViewer ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .style('pointer-events', 'none');

    // Principal node hover events
    principalNode
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        const ensName = ensNames.get(d.id);
        const shortAddr = d.id.startsWith('0x') ? `${d.id.slice(0, 6)}...${d.id.slice(-4)}` : d.id;
        const name = ensName || d.displayName || shortAddr;
        const addressLine = ensName ? `\n(${shortAddr})` : '';
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: d.isViewer
            ? `You (viewer)${addressLine}\n(Click to view profile)`
            : `${name}${addressLine}\nTrust: ${(d.effectiveTrust * 100).toFixed(0)}%\nHops: ${d.hopDistance}\n(Click to view profile)`,
        });
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on('click', (event, d) => {
        // Don't navigate if this was a drag
        if (event.defaultPrevented) return;
        // Navigate to the profile page
        window.location.href = `/profile/${d.id}`;
      });

    // Subject node hover events
    subjectNode
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        const name = d.displayName || 'Unknown business';
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: `${name}\n(Reviewed business/service)\n(Click to view details)`,
        });
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on('click', (event, d) => {
        // Don't navigate if this was a drag
        if (event.defaultPrevented) return;
        // Navigate to the subject detail page
        window.location.href = `/subject/${d.id}`;
      });

    // Link hover events
    link
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        const sourceNode = typeof d.source === 'object' ? d.source : nodeMap.get(d.source as string);
        const targetNode = typeof d.target === 'object' ? d.target : nodeMap.get(d.target as string);
        const getNodeDisplayName = (node: D3Node | undefined) => {
          if (!node) return 'Unknown';
          // Check for ENS name first
          const ensName = ensNames.get(node.id);
          if (ensName) return ensName;
          if (node.displayName) return node.displayName;
          if (node.nodeType === 'subject') return 'Unknown business';
          return node.id.startsWith('0x') ? `${node.id.slice(0, 6)}...${node.id.slice(-4)}` : 'Unknown';
        };
        const content = d.edgeType === 'endorsement'
          ? `${getNodeDisplayName(sourceNode)} reviewed ${getNodeDisplayName(targetNode)}\nRating: ${((d.rating || 0) * 100).toFixed(0)}%${d.summary ? '\n' + d.summary : ''}`
          : `${getNodeDisplayName(sourceNode)} → ${getNodeDisplayName(targetNode)}\nWeight: ${(d.weight * 100).toFixed(0)}%\nDomain: ${d.domain}`;
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content,
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

      principalNode
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!);

      subjectNode
        .attr('x', (d) => (d.x || 0) - 11)
        .attr('y', (d) => (d.y || 0) - 11);

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [mounted, nodes, edges, viewerId, showEndorsements, ensNames]);

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
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md text-sm">
          <div className="font-semibold mb-2">People (by hop distance)</div>
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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span>4+ hops</span>
          </div>

          {showEndorsements && (
            <>
              <div className="font-semibold mb-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">Reviews</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                <span>Business/Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t-2 border-dashed" style={{ borderColor: '#8b5cf6' }} />
                <span>Review</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Controls hint */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md text-xs text-gray-500">
          Click nodes for details • Scroll to zoom • Drag to pan
        </div>
      )}
    </div>
  );
}
