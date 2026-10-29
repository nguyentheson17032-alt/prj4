import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class RealtimeService {
  constructor() {
    this.client = null;
    this.sseSource = null;
    this.messageListeners = new Set();
    this.notificationListeners = new Set();
    this.countsListeners = new Set();
    this.isConnected = false;
    this.currentUserId = null;
    this.currentToken = null;
  }

  connect(userId, token) {
    if (this.isConnected && this.currentUserId === userId) {
      return;
    }

    this.disconnect();
    this.currentUserId = userId;
    this.currentToken = token;

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const wsUrl = `${API_BASE}/ws`;

    // 1. Initialize STOMP client with SockJS fallback
    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: token ? `Bearer ${token}` : '',
        token: token || ''
      },
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.isConnected = true;
        // When WebSocket connects successfully, immediately shut down SSE fallback to prevent duplicate events
        this.closeSseFallback();

        if (userId) {
          // Subscribe to recipient messages
          this.client.subscribe(`/topic/messages/user/${userId}`, (stompMessage) => {
            try {
              const data = JSON.parse(stompMessage.body);
              this.notifyMessageListeners(data);
            } catch (err) {
              console.error('Error parsing WS chat message:', err);
            }
          });

          // Subscribe to notifications
          this.client.subscribe(`/topic/notifications/user/${userId}`, (stompMessage) => {
            try {
              const data = JSON.parse(stompMessage.body);
              this.notifyNotificationListeners(data);
            } catch (err) {
              console.error('Error parsing WS notification:', err);
            }
          });

          // Subscribe to counters
          this.client.subscribe(`/topic/counts/user/${userId}`, (stompMessage) => {
            try {
              const data = JSON.parse(stompMessage.body);
              this.notifyCountsListeners(data);
            } catch (err) {
              console.error('Error parsing WS counts:', err);
            }
          });
        }
      },
      onStompError: (frame) => {
        console.warn('STOMP broker error, activating SSE fallback:', frame?.headers?.['message']);
        this.initSseFallback(userId, token, API_BASE);
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        // Activate SSE fallback when WebSocket drops or fails
        if (this.currentUserId && !this.sseSource) {
          this.initSseFallback(this.currentUserId, this.currentToken, API_BASE);
        }
      }
    });

    try {
      this.client.activate();
    } catch (e) {
      console.warn('WebSocket activate error, using SSE fallback:', e);
      this.initSseFallback(userId, token, API_BASE);
    }
  }

  initSseFallback(userId, token, apiBase) {
    if (this.sseSource || !userId) return;

    try {
      const sseUrl = `${apiBase}/api/realtime/stream?token=${encodeURIComponent(token || '')}`;
      this.sseSource = new EventSource(sseUrl, { withCredentials: true });

      this.sseSource.addEventListener('chat_message', (e) => {
        // If STOMP has already reconnected, ignore SSE events
        if (this.isConnected) return;
        try {
          const data = JSON.parse(e.data);
          this.notifyMessageListeners(data);
        } catch (_) {}
      });

      this.sseSource.addEventListener('notification', (e) => {
        // If STOMP has already reconnected, ignore SSE events
        if (this.isConnected) return;
        try {
          const data = JSON.parse(e.data);
          this.notifyNotificationListeners(data);
        } catch (_) {}
      });

      this.sseSource.addEventListener('counts_update', (e) => {
        // If STOMP has already reconnected, ignore SSE events
        if (this.isConnected) return;
        try {
          const data = JSON.parse(e.data);
          this.notifyCountsListeners(data);
        } catch (_) {}
      });

      this.sseSource.onerror = () => {
        this.closeSseFallback();
      };
    } catch (err) {
      console.warn('SSE fallback error:', err);
    }
  }

  closeSseFallback() {
    if (this.sseSource) {
      try {
        this.sseSource.close();
      } catch (_) {}
      this.sseSource = null;
    }
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (_) {}
      this.client = null;
    }
    this.closeSseFallback();
    this.isConnected = false;
    this.currentUserId = null;
    this.currentToken = null;
  }

  onMessage(listener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onNotification(listener) {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onCountsUpdate(listener) {
    this.countsListeners.add(listener);
    return () => this.countsListeners.delete(listener);
  }

  notifyMessageListeners(message) {
    this.messageListeners.forEach((fn) => {
      try { fn(message); } catch (e) { console.error(e); }
    });
  }

  notifyNotificationListeners(notification) {
    this.notificationListeners.forEach((fn) => {
      try { fn(notification); } catch (e) { console.error(e); }
    });
  }

  notifyCountsListeners(counts) {
    this.countsListeners.forEach((fn) => {
      try { fn(counts); } catch (e) { console.error(e); }
    });
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
