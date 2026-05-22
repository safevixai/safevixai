// frontend/components/search/CommandPalette.tsx
// Cmd+K search overlay using cmdk
'use client';

import { Command } from 'cmdk';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cmd+K or Ctrl+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // GSAP animate in/out — useGSAP for proper React 19 cleanup
  useGSAP(() => {
    if (!overlayRef.current || !panelRef.current) return;
    if (open) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.15 }
      );
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.96, y: -8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, { dependencies: [open] });

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-4)',
          border: '1px solid var(--border-md)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <Command>
          <Command.Input
            placeholder="Search hospitals, first aid, emergency..."
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              padding: '12px 16px',
              color: 'var(--text-1)',
              borderBottom: '1px solid var(--border)',
              outline: 'none',
              fontSize: '14px',
              fontFamily: 'var(--font-inter)',
            }}
          />
          <Command.List
            style={{
              maxHeight: 288,
              overflowY: 'auto',
              padding: 8,
            }}
          >
            <Command.Empty
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: '13px',
              }}
            >
              No results found
            </Command.Empty>

            <Command.Group
              heading="Emergency"
              style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-3)', padding: '8px 8px 4px' }}
            >
              <CommandItem onSelect={() => navigate('/locator')}>
                Find nearest hospital
              </CommandItem>
              <CommandItem onSelect={() => navigate('/emergency')}>
                Activate Emergency SOS
              </CommandItem>
            </Command.Group>

            <Command.Group
              heading="Features"
              style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-3)', padding: '8px 8px 4px' }}
            >
              <CommandItem onSelect={() => navigate('/first-aid')}>
                First Aid Guide
              </CommandItem>
              <CommandItem onSelect={() => navigate('/challan')}>
                Calculate Traffic Fine
              </CommandItem>
              <CommandItem onSelect={() => navigate('/report')}>
                Report Road Issue
              </CommandItem>
              <CommandItem onSelect={() => navigate('/assistant')}>
                AI Assistant
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'var(--text-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      className="command-item"
    >
      {children}
    </Command.Item>
  );
}
