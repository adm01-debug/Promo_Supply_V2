import * as React from "react";
import { motion } from "framer-motion";

export const SvgIllustrations = {
  search: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.circle cx="85" cy="70" r="40" className="stroke-primary/30" strokeWidth="8" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeInOut" }} />
      <motion.line x1="115" y1="100" x2="145" y2="130" className="stroke-primary/30" strokeWidth="8" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.8 }} />
      <circle cx="85" cy="70" r="25" className="fill-primary/10" />
      <motion.path d="M75 65 L80 75 L95 60" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 1.2 }} />
      <motion.circle cx="150" cy="30" r="8" className="fill-accent/30" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="40" cy="45" r="5" className="fill-secondary/40" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
    </svg>
  ),
  requests: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="55" y="25" width="90" height="110" rx="6" className="fill-card stroke-border" strokeWidth="2"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} />
      <rect x="65" y="40" width="50" height="6" rx="2" className="fill-primary/40" />
      <rect x="65" y="55" width="70" height="4" rx="1" className="fill-muted" />
      <rect x="65" y="65" width="60" height="4" rx="1" className="fill-muted/60" />
      <rect x="65" y="80" width="70" height="4" rx="1" className="fill-muted" />
      <motion.circle cx="130" cy="45" r="10" className="fill-kpi-warning/20 stroke-kpi-warning" strokeWidth="2"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <text x="127" y="49" className="fill-kpi-warning text-xs font-bold">!</text>
      <rect x="65" y="110" width="30" height="12" rx="3" className="fill-primary" />
      <motion.circle cx="40" cy="50" r="5" className="fill-accent/30" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
    </svg>
  ),
  orders: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="45" y="50" width="70" height="80" rx="4" className="fill-card stroke-border" strokeWidth="2"
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }} />
      <motion.rect x="85" y="35" width="70" height="80" rx="4" className="fill-card stroke-border" strokeWidth="2"
        initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} />
      <rect x="95" y="50" width="40" height="5" rx="1" className="fill-primary/40" />
      <rect x="95" y="60" width="50" height="4" rx="1" className="fill-muted" />
      <rect x="95" y="70" width="35" height="4" rx="1" className="fill-muted/60" />
      <rect x="95" y="85" width="50" height="10" rx="2" className="fill-kpi-success/20 stroke-kpi-success" strokeWidth="1" />
      <motion.circle cx="55" cy="70" r="15" className="fill-primary/10" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.path d="M48 70 L53 75 L62 65" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.circle cx="100" cy="55" r="25" className="fill-primary/10 stroke-primary/30" strokeWidth="2"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }} />
      <circle cx="100" cy="50" r="10" className="fill-primary/20" />
      <path d="M85 70 Q100 85 115 70" className="stroke-primary/30" strokeWidth="2" fill="none" />
      <motion.circle cx="55" cy="85" r="18" className="fill-secondary/10 stroke-secondary/30" strokeWidth="2"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
      <circle cx="55" cy="82" r="7" className="fill-secondary/20" />
      <motion.circle cx="145" cy="85" r="18" className="fill-accent/10 stroke-accent/30" strokeWidth="2"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
      <circle cx="145" cy="82" r="7" className="fill-accent/20" />
      <path d="M75 65 L85 70" className="stroke-muted" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M125 65 L115 70" className="stroke-muted" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="70" y="115" width="60" height="18" rx="4" className="fill-card stroke-border" strokeWidth="1" />
      <rect x="80" y="121" width="40" height="6" rx="1" className="fill-muted" />
    </svg>
  ),
  payments: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="40" y="50" width="120" height="70" rx="8" className="fill-card stroke-border" strokeWidth="2"
        initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} />
      <rect x="40" y="65" width="120" height="20" className="fill-primary/20" />
      <motion.circle cx="65" cy="100" r="12" className="fill-kpi-success/20 stroke-kpi-success" strokeWidth="2"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <text x="60" y="105" className="fill-kpi-success text-sm font-bold">$</text>
      <rect x="90" y="95" width="55" height="5" rx="1" className="fill-muted" />
      <rect x="90" y="105" width="40" height="4" rx="1" className="fill-muted/60" />
      <motion.circle cx="155" cy="35" r="8" className="fill-accent/40" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  ),
  documents: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="55" y="20" width="90" height="115" rx="4" className="fill-card stroke-border" strokeWidth="2"
        initial={{ rotate: -5 }} animate={{ rotate: 0 }} transition={{ duration: 0.3 }} />
      <rect x="65" y="35" width="60" height="8" rx="2" className="fill-primary/30" />
      <rect x="65" y="50" width="70" height="4" rx="1" className="fill-muted" />
      <rect x="65" y="60" width="50" height="4" rx="1" className="fill-muted/60" />
      <rect x="65" y="75" width="70" height="4" rx="1" className="fill-muted" />
      <rect x="65" y="85" width="60" height="4" rx="1" className="fill-muted/60" />
      <motion.path d="M70 110 Q90 125 110 110" className="stroke-primary" strokeWidth="2" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.circle cx="135" cy="35" r="10" className="fill-kpi-success/20"
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.path d="M130 35 L133 38 L140 31" className="stroke-kpi-success" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
    </svg>
  ),
  analytics: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <rect x="45" y="30" width="110" height="100" rx="6" className="fill-card stroke-border" strokeWidth="2" />
      <rect x="55" y="45" width="40" height="30" rx="2" className="fill-primary/10 stroke-primary/30" strokeWidth="1" />
      <motion.rect x="60" y="65" width="6" height="5" className="fill-primary/50" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.2 }} style={{ originY: 1 }} />
      <motion.rect x="70" y="58" width="6" height="12" className="fill-primary/60" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.35 }} style={{ originY: 1 }} />
      <motion.rect x="80" y="52" width="6" height="18" className="fill-primary" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.5 }} style={{ originY: 1 }} />
      <rect x="105" y="45" width="40" height="30" rx="2" className="fill-secondary/10 stroke-secondary/30" strokeWidth="1" />
      <motion.circle cx="125" cy="60" r="10" className="fill-none stroke-secondary" strokeWidth="3" strokeDasharray="20 10"
        initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
      <rect x="55" y="85" width="90" height="4" rx="1" className="fill-muted" />
      <rect x="55" y="95" width="70" height="4" rx="1" className="fill-muted/60" />
      <rect x="55" y="105" width="80" height="4" rx="1" className="fill-muted/40" />
    </svg>
  ),
  inbox: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="50" y="45" width="100" height="75" rx="8" className="fill-card stroke-border" strokeWidth="2"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} />
      <motion.path d="M50 70 L100 100 L150 70" className="stroke-primary/40" strokeWidth="2" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
      <rect x="65" y="90" width="70" height="4" rx="1" className="fill-muted/40" />
      <rect x="75" y="100" width="50" height="4" rx="1" className="fill-muted/30" />
      <motion.circle cx="100" cy="60" r="12" className="fill-primary/10 stroke-primary/30" strokeWidth="2"
        animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="155" cy="35" r="6" className="fill-accent/40" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
    </svg>
  ),
  notifications: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.path d="M100 30 L100 40" className="stroke-primary" strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      <motion.path d="M70 60 C70 45 85 35 100 35 C115 35 130 45 130 60 L130 90 L140 100 L60 100 L70 90 Z" 
        className="fill-primary/20 stroke-primary/50" strokeWidth="2"
        initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }} />
      <ellipse cx="100" cy="110" rx="12" ry="8" className="fill-primary/30" />
      <motion.circle cx="125" cy="50" r="12" className="fill-kpi-danger stroke-kpi-danger" strokeWidth="2"
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      <text x="121" y="55" className="fill-white text-xs font-bold">3</text>
    </svg>
  ),
  default: () => (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      <ellipse cx="100" cy="145" rx="80" ry="10" className="fill-muted/30" />
      <motion.rect x="60" y="40" width="80" height="85" rx="6" className="fill-card stroke-border" strokeWidth="2"
        initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} />
      <rect x="75" y="55" width="50" height="6" rx="2" className="fill-muted" />
      <rect x="75" y="70" width="40" height="5" rx="1" className="fill-muted/60" />
      <rect x="75" y="85" width="50" height="5" rx="1" className="fill-muted/40" />
      <motion.circle cx="100" cy="110" r="8" className="fill-primary/20 stroke-primary/40" strokeWidth="2"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  ),
};
