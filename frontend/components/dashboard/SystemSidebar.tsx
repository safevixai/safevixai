'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  BotMessageSquare,
  MapPinPlus,
  HeartPulse,
  AlertTriangle,
  Scale,
  ShieldAlert,
  User,
  Users,
  Settings,
  Phone,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SystemSidebar = memo(function SystemSidebar() {
  const isOpen = useAppStore((state) => state.isSystemSidebarOpen);
  const setOpen = useAppStore((state) => state.setSystemSidebarOpen);
  const pathname = usePathname();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  const navItems = [
    { icon: <MapPin size={24} />, label: 'Map', href: '/', color: 'text-brand-light' },
    { icon: <BotMessageSquare size={24} />, label: 'AI Assistant', href: '/assistant', color: 'text-brand-light' },
    { icon: <MapPinPlus size={24} />, label: 'Locator', href: '/locator', color: 'text-brand-light' },
    { icon: <Users size={24} />, label: 'Tracking', href: '/tracking', color: 'text-brand-light' },
    { icon: <HeartPulse size={24} />, label: 'First Aid', href: '/first-aid', color: 'text-emergency' },
    { icon: <AlertTriangle size={24} />, label: 'Report Road Issue', href: '/report', color: 'text-text-amber' },
    { icon: <Scale size={24} />, label: 'Challan Calculator', href: '/challan', color: 'text-text-3' },
    { icon: <ShieldAlert size={24} />, label: 'Emergency', href: '/emergency', color: 'text-emergency' },
    { icon: <User size={24} />, label: 'Profile', href: '/profile', color: 'text-text-2' },
    { icon: <Settings size={24} />, label: 'Settings', href: '/settings', color: 'text-text-3' },
  ];

  const quickDials = [
    { label: 'Emergency', number: '112', icon: <Phone size={16} /> },
    { label: 'Ambulance', number: '102', icon: <HeartPulse size={16} /> },
    { label: 'Police', number: '100', icon: <ShieldAlert size={16} /> },
    { label: 'Highway', number: '1033', icon: <MapPinPlus size={16} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed top-0 left-0 h-full w-[85vw] sm:w-[340px] max-w-[340px] bg-surface-1 shadow-2xl z-[101] flex flex-col border-r border-border overflow-hidden lg:hidden"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-border bg-surface-2/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/30"
                  aria-hidden="true"
                >
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-text-1 tracking-tight font-mono uppercase">SafeVixAI</h2>
                  <p className="text-[10px] font-bold text-brand-light uppercase tracking-widest font-mono">Protocol Active</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Sidebar"
                autoFocus
                className="p-3 hover:bg-surface-3 rounded-full transition-all text-text-3 hover:text-text-1 active:scale-90"
              >
                <X size={28} strokeWidth={3} />
              </button>
            </div>

            {/* Main Navigation Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.1em] text-text-3 uppercase font-mono mb-4">Operations Console</p>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-3 gap-3"
                >
                  {navItems.map((item) => (
                    <motion.div key={item.label} variants={itemVariants}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all group shadow-sm hover:shadow-md h-24 ${
                          pathname === item.href
                            ? 'bg-brand-light/10 border-brand-light/20 ring-1 ring-brand-light/40'
                            : 'bg-surface-2 border-border hover:bg-surface-3'
                        }`}
                      >
                        <div className={`${item.color} ${pathname === item.href ? 'scale-110' : ''} group-hover:scale-110 transition-transform`}>
                          {item.icon}
                        </div>
                        <span className={`text-[10px] font-bold text-center leading-tight font-mono uppercase ${
                          pathname === item.href
                            ? 'text-brand-light'
                            : 'text-text-2'
                        }`}>
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Quick Dial Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-emergency uppercase font-mono">Emergency Quick Dial</p>
                  <div className="h-px flex-1 bg-emergency/20 ml-4"></div>
                </div>

                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-3"
                >
                  {quickDials.map((dial) => (
                    <motion.div key={dial.label} variants={itemVariants}>
                      <a
                        href={`tel:${dial.number}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-emergency/5 border border-emergency/10 hover:bg-emergency/10 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emergency flex items-center justify-center text-white shadow-lg shadow-emergency/20">
                          {dial.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-emergency uppercase tracking-tighter font-mono">{dial.label}</p>
                          <p className="text-sm font-bold text-text-1 leading-none font-mono">{dial.number}</p>
                        </div>
                      </a>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Primary Action Footer: SOS */}
            <div className="p-6 bg-surface-2 border-t border-border">
              <Link 
                href="/sos" 
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center gap-3 py-4 bg-emergency text-white rounded-lg font-black text-lg shadow-xl shadow-emergency/30 transition-all active:scale-95 group overflow-hidden relative"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white/10"
                />
                <ShieldAlert className="w-8 h-8 relative z-10 text-white" strokeWidth={3} />
                <span className="relative z-10 tracking-widest uppercase font-mono">System SOS</span>
              </Link>
              <p className="text-center text-[10px] font-bold text-text-3 mt-4 tracking-tighter uppercase font-mono">
                SafeVixAI Sentinel • Professional Responder Tier
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default SystemSidebar;
