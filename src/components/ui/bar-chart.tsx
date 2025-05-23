"use client";

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

type DataItem = Record<string, any>;

interface BarChartProps {
  data: DataItem[];
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
  height?: number;
  width?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showAnimation?: boolean;
  valueFormatter?: (value: number) => string;
}

export function BarChart({
  data,
  xAxisKey = "name",
  yAxisKey = "value",
  color = "#0747A1", 
  height = 250,
  width = 0, // Will be calculated from container width
  margin = { top: 20, right: 20, bottom: 50, left: 40 },
  showAnimation = false,
  valueFormatter = (value: number) => value.toString()
}: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !data || data.length === 0 || !svgRef.current || !containerRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Calculate chart dimensions based on container
    const containerWidth = containerRef.current.clientWidth;
    const chartWidth = width || containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create main SVG element
    const svg = d3
      .select(svgRef.current)
      .attr("width", chartWidth + margin.left + margin.right)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create x scale
    const x = d3.scaleBand<string>()
      .domain(data.map(d => String(d[xAxisKey])))
      .range([0, chartWidth])
      .padding(0.2);

    // Create y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => Number(d[yAxisKey])) || 0])
      .nice()
      .range([chartHeight, 0]);

    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x) as any)
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Add y-axis
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5) as any)
      .selectAll("text")
      .style("font-size", "10px");

    // Add bars
    svg.selectAll<SVGRectElement, DataItem>(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(String(d[xAxisKey])) || 0)
      .attr("width", x.bandwidth())
      .attr("y", chartHeight) // Start from bottom for animation
      .attr("height", 0) // Start with height 0 for animation
      .attr("fill", color)
      .attr("rx", 4) // Rounded corners
      .style("opacity", 0.8)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.8);
      });
      
    // Animate bars if showAnimation is true
    if (showAnimation) {
      svg.selectAll<SVGRectElement, DataItem>(".bar")
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .attr("y", d => y(Number(d[yAxisKey])))
        .attr("height", d => chartHeight - y(Number(d[yAxisKey])));
    } else {
      svg.selectAll<SVGRectElement, DataItem>(".bar")
        .attr("y", d => y(Number(d[yAxisKey])))
        .attr("height", d => chartHeight - y(Number(d[yAxisKey])));
    }

    // Add labels on top of bars
    svg.selectAll<SVGTextElement, DataItem>(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("x", d => (x(String(d[xAxisKey])) || 0) + x.bandwidth() / 2)
      .attr("y", d => y(Number(d[yAxisKey])) - 5)
      .text(d => valueFormatter(Number(d[yAxisKey])))
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("opacity", showAnimation ? 0 : 1);
      
    // Animate labels if showAnimation is true
    if (showAnimation) {
      svg.selectAll<SVGTextElement, DataItem>(".label")
        .transition()
        .duration(800)
        .delay((d, i) => i * 50 + 300)
        .style("opacity", 1);
    }

    // Make the chart responsive
    function resize() {
      if (!containerRef.current) return;
      
      const newWidth = containerRef.current.clientWidth;
      const chartWidth = newWidth - margin.left - margin.right;
      
      // Update SVG and scales
      d3.select(svgRef.current)
        .attr("width", chartWidth + margin.left + margin.right);
      
      x.range([0, chartWidth]);
      
      // Update all elements that depend on x scale
      svg.selectAll<SVGRectElement, DataItem>(".bar")
        .attr("x", d => x(String(d[xAxisKey])) || 0)
        .attr("width", x.bandwidth());
      
      svg.selectAll<SVGTextElement, DataItem>(".label")
        .attr("x", d => (x(String(d[xAxisKey])) || 0) + x.bandwidth() / 2);
      
      // Update x-axis
      svg.select("g")
        .call(d3.axisBottom(x) as any)
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    }

    // Add resize listener
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [data, xAxisKey, yAxisKey, color, height, width, margin, isMounted, showAnimation, valueFormatter]);

  if (!isMounted) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
} 