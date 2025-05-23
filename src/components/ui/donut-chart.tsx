"use client";

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

interface DonutChartData {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutChartData[];
  colors?: string[];
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
}

export function DonutChart({
  data,
  colors = ["#A65A20", "#00501B", "#0747A1", "#7A1113"],
  width = 220,
  height = 220,
  innerRadius = 60,
  outerRadius = 90,
  valueFormatter = (value: number) => value.toString(),
  showAnimation = false
}: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !data.length || !svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up the SVG container
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Calculate total for percentages
    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Generate color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.name))
      .range(colors);

    // Generate the pie layout
    const pie = d3.pie<DonutChartData>()
      .sort(null)
      .value(d => d.value);

    // Generate the arcs
    const arc = d3.arc<d3.PieArcDatum<DonutChartData>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    // Generate the donut segments
    const arcs = svg.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw the segments
    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => colorScale(d.data.name))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.8);
      });

    // Add a center text for the total
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("font-size", "1.2rem")
      .attr("font-weight", "bold")
      .text(valueFormatter(total));

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("font-size", "0.8rem")
      .attr("fill", "#6b7280")
      .text("Total");

    // Add a legend
    const legend = svg.selectAll(".legend")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${outerRadius + 15}, ${-outerRadius + 30 + i * 20})`);

    // Add colored rectangles to the legend
    legend.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => colorScale(d.name));

    // Add text labels to the legend with percentages
    legend.append("text")
      .attr("x", 15)
      .attr("y", 10)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .text(d => `${d.name} (${Math.round((d.value / total) * 100)}%)`);

    // Add animation if enabled
    if (showAnimation) {
      arcs.select("path")
        .transition()
        .duration(1000)
        .attrTween("d", function(d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return function(t) {
            return arc(interpolate(t)) || "";
          };
        });
    }

    // Make the chart responsive
    function resize() {
      const containerWidth = svgRef.current?.parentElement?.clientWidth || width;
      const newWidth = Math.min(containerWidth, width);
      const scale = newWidth / width;
      
      d3.select(svgRef.current)
        .attr("width", newWidth)
        .attr("height", height * scale);
      
      d3.select(svgRef.current).select("g")
        .attr("transform", `translate(${newWidth / 2}, ${(height * scale) / 2})`);
    }

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [data, colors, width, height, innerRadius, outerRadius, isMounted, valueFormatter, showAnimation]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex justify-center items-center h-full">
      <svg ref={svgRef} className="overflow-visible" />
    </div>
  );
} 