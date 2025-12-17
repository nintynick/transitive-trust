'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useEnsNames } from '@/hooks/useEns';

interface PublicNode {
  id: string;
  type: 'principal' | 'subject';
  displayName?: string;
  trustCount: number;
  endorsementCount: number;
}

interface PublicEdge {
  from: string;
  to: string;
  type: 'trust' | 'endorsement';
  weight: number;
  domain: string;
}

interface NetworkStats {
  totalPrincipals: number;
  totalEdges: number;
  totalSubjects: number;
  totalEndorsements: number;
}

interface PublicNetworkExplorerProps {
  nodes: PublicNode[];
  edges: PublicEdge[];
  stats: NetworkStats;
  onConnect?: () => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  nodeType: 'principal' | 'subject';
  displayName?: string;
  trustCount: number;
  endorsementCount: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  edgeType: 'trust' | 'endorsement';
  weight: number;
}

export function PublicNetworkExplorer({ nodes, edges, stats, onConnect }: PublicNetworkExplorerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  // Get all principal addresses for ENS lookup
  const principalAddresses = useMemo(() => {
    return nodes
      .filter(n => n.type === 'principal' && n.id.startsWith('0x'))
      .map(n => n.id);
  }, [nodes]);

  // Fetch ENS names for all principals
  const { ensNames } = useEnsNames(principalAddresses);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !svgRef.current || !containerRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare node data
    const d3Nodes: D3Node[] = nodes.map((n) => ({
      id: n.id,
      nodeType: n.type,
      displayName: n.displayName,
      trustCount: n.trustCount,
      endorsementCount: n.endorsementCount,
    }));

    const nodeMap = new Map(d3Nodes.map((n) => [n.id, n]));

    // Prepare link data
    const d3Links: D3Link[] = edges
      .filter(e => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
        edgeType: e.type,
        weight: e.weight,
      }));

    // Define arrow markers
    const defs = svg.append('defs');

    // Trust arrow
    defs.append('marker')
      .attr('id', 'arrowhead-trust-public')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#3b82f6')
      .attr('fill-opacity', 0.7);

    // Endorsement arrow
    defs.append('marker')
      .attr('id', 'arrowhead-endorsement-public')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#10b981')
      .attr('fill-opacity', 0.6);

    // Create simulation
    const simulation = d3.forceSimulation<D3Node>(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(d3Links)
      .join('line')
      .attr('stroke', (d) => d.edgeType === 'endorsement' ? '#10b981' : '#3b82f6')
      .attr('stroke-opacity', (d) => d.edgeType === 'endorsement' ? 0.4 : 0.5)
      .attr('stroke-width', (d) => d.edgeType === 'endorsement' ? 1 : Math.max(1, d.weight * 2))
      .attr('stroke-dasharray', (d) => d.edgeType === 'endorsement' ? '5,3' : 'none')
      .attr('marker-end', (d) => d.edgeType === 'endorsement' ? 'url(#arrowhead-endorsement-public)' : 'url(#arrowhead-trust-public)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(d3Nodes)
      .join('g')
      .style('cursor', 'pointer');

    // Add circles
    node.append('circle')
      .attr('r', (d) => {
        if (d.nodeType === 'subject') return 10;
        return Math.min(20, 8 + d.trustCount * 2);
      })
      .attr('fill', (d) => d.nodeType === 'subject' ? '#a855f7' : '#3b82f6')
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels
    node.append('text')
      .attr('dy', (d) => d.nodeType === 'subject' ? -14 : -Math.min(24, 12 + d.trustCount * 2))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', 'currentColor')
      .attr('class', 'fill-gray-700 dark:fill-gray-300')
      .text((d) => {
        if (d.nodeType === 'subject') {
          return d.displayName || 'Business';
        }
        // Use ENS name if available
        const ensName = ensNames.get(d.id);
        if (ensName) return ensName;
        if (d.displayName) return d.displayName;
        return `${d.id.slice(0, 6)}...${d.id.slice(-4)}`;
      });

    // Tooltip handling
    node.on('mouseover', (event, d) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const ensName = d.nodeType === 'principal' ? ensNames.get(d.id) : undefined;

      let content = '';
      if (d.nodeType === 'subject') {
        content = d.displayName || 'Business';
      } else {
        const displayId = ensName || `${d.id.slice(0, 10)}...${d.id.slice(-6)}`;
        content = `${d.displayName ? `${d.displayName}\n` : ''}${displayId}\n${d.trustCount} connections`;
      }

      setTooltip({
        visible: true,
        x: event.pageX - rect.left + 10,
        y: event.pageY - rect.top - 10,
        content,
      });
    })
    .on('mouseout', () => {
      setTooltip({ visible: false, x: 0, y: 0, content: '' });
    });

    // Drag behavior
    const drag = d3.drag<SVGGElement, D3Node>()
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
      });

    node.call(drag);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit content
    const initialScale = 0.85;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
      .scale(initialScale));

    return () => {
      simulation.stop();
    };
  }, [mounted, nodes, edges, ensNames]);

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Network is growing!</h3>
        <p className="text-gray-500 text-sm mb-4">
          Be one of the first to join and start building your trust network.
        </p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Connect Wallet to Join
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.totalPrincipals}</span>
            <span className="text-gray-500 ml-1">people</span>
          </div>
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.totalEdges}</span>
            <span className="text-gray-500 ml-1">trust connections</span>
          </div>
          <div>
            <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.totalSubjects}</span>
            <span className="text-gray-500 ml-1">businesses</span>
          </div>
          <div>
            <span className="font-semibold text-green-600 dark:text-green-400">{stats.totalEndorsements}</span>
            <span className="text-gray-500 ml-1">reviews</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            People
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            Businesses
          </span>
        </div>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="relative h-[400px]">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute pointer-events-none bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-10 whitespace-pre-line"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.content}
          </div>
        )}

        {/* CTA overlay */}
        {onConnect && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 bg-gradient-to-t from-white dark:from-gray-800 via-transparent to-transparent pointer-events-none">
            <button
              onClick={onConnect}
              className="pointer-events-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Wallet to Join Network
            </button>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="px-4 py-3 text-xs text-gray-500 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        Drag to explore • Scroll to zoom • This is a live view of the trust network
      </div>
    </div>
  );
}
