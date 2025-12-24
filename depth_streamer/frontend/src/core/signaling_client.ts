export interface SignalingMessage {
  type: string;
  [key: string]: any;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (message: any) => void> = new Map();

  constructor(private serverUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('Signaling connection opened');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse signaling message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('Signaling connection closed');
          this.ws = null;
        };

        this.ws.onerror = (error) => {
          console.error('Signaling connection error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Signaling connection not ready');
    }
  }

  onMessage(type: string, handler: (message: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  private handleMessage(message: SignalingMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.log('Unhandled signaling message:', message);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}


