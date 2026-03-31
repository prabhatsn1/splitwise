import { Alert } from "react-native";

export interface ErrorHandler {
  handleError: (error: Error, context?: string) => void;
  setErrorCallback?: (callback: (error: Error, context?: string) => void) => void;
}

class GlobalErrorHandler implements ErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCallback?: (error: Error, context?: string) => void;

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  setErrorCallback(callback: (error: Error, context?: string) => void) {
    this.errorCallback = callback;
  }

  handleError(error: Error, context?: string) {
    console.error(`[GlobalErrorHandler] ${context || "Error"}:`, error);

    // Call the registered callback if available
    if (this.errorCallback) {
      this.errorCallback(error, context);
    } else {
      // Fallback to Alert if no callback is registered
      Alert.alert(
        "Error",
        error.message || "An unexpected error occurred",
        [{ text: "OK" }]
      );
    }
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    if (typeof global !== "undefined") {
      const originalHandler = global.Promise;
      if (originalHandler) {
        // @ts-ignore
        global.onunhandledrejection = (event: PromiseRejectionEvent) => {
          event.preventDefault();
          const error = event.reason instanceof Error 
            ? event.reason 
            : new Error(String(event.reason));
          this.handleError(error, "Unhandled Promise Rejection");
        };
      }
    }

    // Handle global errors
    if (typeof ErrorUtils !== "undefined") {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        if (isFatal) {
          this.handleError(error, "Fatal Error");
        } else {
          this.handleError(error, "Global Error");
        }
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  // Helper method to wrap async functions with error handling
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          context
        );
        throw error;
      }
    }) as T;
  }

  // Helper method to wrap sync functions with error handling
  wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          context
        );
        throw error;
      }
    }) as T;
  }
}

export default GlobalErrorHandler;
