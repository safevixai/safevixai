'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export type WSStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseWebSocketOptions {
  onMessage: (data: unknown) => void;
  onStatusChange?: (status: WSStatus) => void;
  reconnectMaxAttempts?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  heartbeatIntervalMs?: number;
}

interface UseWebSocketReturn {
  status: WSStatus;
  connect: (url: string) => void;
  disconnect: () => void;
  send: (data: string) => void;
  reconnectAttempt: number;
}

const RECONNECT_MAX_ATTEMPTS = 50;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 25000;

function fullJitter(delay: number): number {
  return Math.random() * delay;
}

export function useWebSocket({
  onMessage,
  onStatusChange,
  reconnectMaxAttempts = RECONNECT_MAX_ATTEMPTS,
  reconnectBaseDelayMs = RECONNECT_BASE_DELAY,
  reconnectMaxDelayMs = RECONNECT_MAX_DELAY,
  heartbeatIntervalMs = HEARTBEAT_INTERVAL,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<WSStatus>('idle');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const intentionalCloseRef = useRef(false);

  const updateStatus = useCallback((newStatus: WSStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, [clearTimers]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || intentionalCloseRef.current || !urlRef.current) return;
    setReconnectAttempt((prev) => {
      const attempt = prev + 1;
      if (attempt > reconnectMaxAttempts) {
        updateStatus('disconnected');
        return attempt;
      }
      const delay = Math.min(reconnectBaseDelayMs * Math.pow(2, attempt - 1), reconnectMaxDelayMs);
      const jitteredDelay = fullJitter(delay);
      updateStatus('reconnecting');
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && urlRef.current) {
          connectToUrl(urlRef.current);
        }
      }, jitteredDelay);
      return attempt;
    });
  }, [reconnectMaxAttempts, reconnectBaseDelayMs, reconnectMaxDelayMs, updateStatus]);

  const startHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'pong' }));
        pongTimeoutRef.current = setTimeout(() => {
          intentionalCloseRef.current = false;
          cleanup();
          scheduleReconnect();
        }, 10000);
      }
    }, heartbeatIntervalMs);
  }, [heartbeatIntervalMs, cleanup, scheduleReconnect]);

  const connectToUrl = useCallback((url: string) => {
    if (!mountedRef.current) return;
    cleanup();
    intentionalCloseRef.current = false;
    updateStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        updateStatus('connected');
        setReconnectAttempt(0);
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          onMessage(data);
        } catch {
          onMessage(event.data);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        updateStatus(intentionalCloseRef.current ? 'disconnected' : 'disconnected');
        clearTimers();
        if (!intentionalCloseRef.current) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
      };
    } catch {
      updateStatus('disconnected');
      if (!intentionalCloseRef.current) {
        scheduleReconnect();
      }
    }
  }, [cleanup, updateStatus, startHeartbeat, scheduleReconnect, onMessage]);

  const connect = useCallback((url: string) => {
    urlRef.current = url;
    setReconnectAttempt(0);
    intentionalCloseRef.current = false;
    connectToUrl(url);
  }, [connectToUrl]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    cleanup();
    urlRef.current = null;
    setReconnectAttempt(0);
    updateStatus('idle');
  }, [cleanup, updateStatus]);

  const send = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      intentionalCloseRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return { status, connect, disconnect, send, reconnectAttempt };
}
