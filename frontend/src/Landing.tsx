/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {useNavigate } from "react-router-dom";
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Mukta+Vaani:wght@400;500;600;700&display=swap');

:root {
  --font-sans: "Mukta Vaani", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Mukta Vaani", sans-serif;
  --color-slate-900: #1a1a1a;
  --container-max-width: 1280px;
}

body {
  font-family: var(--font-sans);
  color: #3DD6D0;
  background: var(--color-slate-900);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  margin: 0;
}

::selection {
  background: #3DD6D0;
  color: #1a1a1a;
}

::-moz-selection {
  background: #3DD6D0;
  color: #1a1a1a;
}

.app-container {
  min-height: 100vh;
}

.max-width-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero-section {
  padding-top: 3rem;
  padding-bottom: 5rem;
  position: relative;
  overflow: hidden;
}

.hero-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 50vh;
}

.hero-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 5rem;
  line-height: 1;
  letter-spacing: -0.05em;
  margin-bottom: 2rem;
  background: linear-gradient(to bottom, #ffffff, #3DD6D0);
  -webkit-background-clip: text;
  color: transparent;
  max-width: 900px;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 6.5rem;
  }
}

.hero-description {
  color: #3DD6D0;
  opacity: 0.8;
  font-size: 1.25rem;
  max-width: 32rem;
  margin-bottom: 2.5rem;
  line-height: 1.625;
}

.cta-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 32rem;
}

.get-started-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  background: transparent;
  color: #3DD6D0;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1.125rem;
}

.get-started-btn:hover {
  opacity: 0.8;
}

.get-started-btn svg {
  transition: transform 0.2s ease;
}

.get-started-btn:hover svg {
  transform: translateX(4px);
}

.graph-canvas {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  overflow: hidden;
  z-index: 1;
}

.graph-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.graph-node {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  pointer-events: none;
  box-shadow: 0 0 0 6px rgba(148, 163, 184, 0.1);
}

.node-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  opacity: 0.4;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2.5); opacity: 0; }
}
`;


interface Node {
  id: string;
  x: number;
  y: number;
}

export default function Landing() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const navigate = useNavigate();


  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Filter out clicks on inputs or buttons
    if ((e.target as HTMLElement).closest('button, input')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const id = Math.random().toString(36).substr(2, 9);
    const newNode: Node = {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setNodes((prev) => [...prev, newNode]);

    // Nodes vanish after 4 seconds, effectively the id on the current click instance. 
    setTimeout(() => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);


  return (
    <div className="app-container">
      <style>{styles}</style>
      {/* Hero Section */}
      <main className="hero-section" onClick={handleCanvasClick}>
        {/* Interactive Graph Background */}
        <div className="graph-canvas">
          {/* SVG first to be behind nodes */}
          <svg className="graph-svg">
            <AnimatePresence>
              {nodes.map((node, i) => (
                <React.Fragment key={`lines-${node.id}`}>
                  {/* Connect to previous node if it still exists */}
                  {i > 0 && nodes[i-1] && (
                    <motion.path
                      initial={{ pathLength: 0, opacity: 0, stroke: "#3DD6D0" }}
                      animate={{ pathLength: 1, opacity: [0, 1, 0], stroke: ["#3DD6D0", "#94a3b8"] }}
                      transition={{ duration: 4, times: [0, 0.05, 1] }}
                      exit={{ opacity: 0 }}
                      d={`M ${nodes[i - 1].x} ${nodes[i - 1].y} L ${node.x} ${node.y}`}
                      strokeWidth="1.5"
                      fill="none"
                    />
                  )}
                  {/* Web connections to nearby nodes */}
                  {nodes.slice(0, i).map(other => {
                    const dist = Math.hypot(node.x - other.x, node.y - other.y);
                    if (dist < 200 && dist > 10) {
                      return (
                        <motion.path
                          key={`connection-${node.id}-${other.id}`}
                          initial={{ opacity: 0, stroke: "#3DD6D0" }}
                          animate={{ opacity: [0, 0.3, 0], stroke: ["#3DD6D0", "#94a3b8"] }}
                          transition={{ duration: 4, times: [0, 0.05, 1] }}
                          exit={{ opacity: 0 }}
                          d={`M ${other.x} ${other.y} L ${node.x} ${node.y}`}
                          strokeWidth="1"
                          fill="none"
                        />
                      );
                    }
                    return null;
                  })}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </svg>

          {/* Nodes second to be in front of paths */}
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0, backgroundColor: "#3DD6D0" }}
                animate={{ 
                  scale: [0, 1, 1],
                  opacity: [0, 1, 0], 
                  backgroundColor: ["#3DD6D0", "#94a3b8"],
                }}
                transition={{ 
                  duration: 4, 
                  times: [0, 0.05, 1], 
                  ease: "linear"
                }}
                exit={{ scale: 0, opacity: 0 }}
                className="graph-node"
                style={{ left: node.x - 8, top: node.y - 8 }}
              >
                <motion.div 
                  animate={{ 
                    backgroundColor: ["#3DD6D0", "#94a3b8"],
                    opacity: [0.4, 0],
                  }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="node-pulse" 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="max-width-container hero-centered">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 1 }}
            className="hero-content"
            style={{ pointerEvents: 'auto' }}
          >
            <h1 className="hero-title">
              Map Your Universe <br /> with Synapse
            </h1>
            
            <p className="hero-description">
              Visualize, brainstorm, and  develop every idea. Have a place to organize and house hours worth of your notes
            </p>

            <div className="cta-group">
              <button className="get-started-btn" onClick={() => navigate('/signup')}>
                Start mapping <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </main>

    </div>
  );
}
