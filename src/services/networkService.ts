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
    console.log('[NetworkService] Initializing...');
    // Initial connectivity check
    const isConnected = await this.testInternetConnection();
    console.log('[NetworkService] Initial connection test result:', isConnected);
    this.updateStatus({
      isConnected,
      type: "unknown",
      isInternetReachable: isConnected,
    });

    // Set up periodic connectivity checks (every 30 seconds)
    setInterval(async () => {
      console.log('[NetworkService] Running periodic connectivity check...');
      const isConnected = await this.testInternetConnection();
      console.log('[NetworkService] Periodic check result:', isConnected);
      this.updateStatus({
        isConnected,
        type: this.currentStatus.type,
        isInternetReachable: isConnected,
      });
    }, 30000);
  }

  private updateStatus(newStatus: NetworkStatus) {
    console.log('[NetworkService] Updating status:', {
      old: this.currentStatus,
      new: newStatus
    });
    // Only notify if status actually changed
    if (
      newStatus.isConnected !== this.currentStatus.isConnected ||
      newStatus.isInternetReachable !== this.currentStatus.isInternetReachable
    ) {
      console.log('[NetworkService] Status changed, notifying listeners');
      this.currentStatus = newStatus;
      this.notifyListeners(newStatus);
    } else {
      console.log('[NetworkService] Status unchanged, skipping notification');
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
    console.log('[NetworkService] Testing internet connection...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[NetworkService] Connection test timed out after', timeout, 'ms');
        controller.abort();
      }, timeout);

      console.log('[NetworkService] Fetching https://www.google.com/favicon.ico');
      const response = await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      });

      clearTimeout(timeoutId);
      console.log('[NetworkService] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      return response.ok;
    } catch (error) {
      console.error('[NetworkService] Connection test failed:', error);
      console.error('[NetworkService] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
