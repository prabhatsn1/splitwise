// Simplified network service for React Native without external dependencies
export interface NetworkStatus {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
}

export class NetworkService {
  private static instance: NetworkService;
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    isConnected: true, // Assume connected by default
    type: "wifi",
    isInternetReachable: null,
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private async initialize() {
    // Initial connectivity check
    const isConnected = await this.testInternetConnection();
    this.updateStatus({
      isConnected,
      type: "unknown",
      isInternetReachable: isConnected,
    });

    // Set up periodic connectivity checks (every 30 seconds)
    setInterval(async () => {
      const isConnected = await this.testInternetConnection();
      this.updateStatus({
        isConnected,
        type: this.currentStatus.type,
        isInternetReachable: isConnected,
      });
    }, 30000);
  }

  private updateStatus(newStatus: NetworkStatus) {
    // Only notify if status actually changed
    if (
      newStatus.isConnected !== this.currentStatus.isConnected ||
      newStatus.isInternetReachable !== this.currentStatus.isInternetReachable
    ) {
      this.currentStatus = newStatus;
      this.notifyListeners(newStatus);
    }
  }

  private notifyListeners(status: NetworkStatus) {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in network status listener:", error);
      }
    });
  }

  public addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public async checkConnectivity(): Promise<boolean> {
    const isConnected = await this.testInternetConnection();
    this.updateStatus({
      ...this.currentStatus,
      isConnected,
      isInternetReachable: isConnected,
    });
    return isConnected;
  }

  // Simple ping test to verify actual internet connectivity
  public async testInternetConnection(timeout = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
