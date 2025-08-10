// Extension popup script
class CalendarExtension {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.init();
  }

  async init() {
    console.log('Initializing Calendar Extension...');
    
    // Try to detect if we're running on Replit
    try {
      const replitUrl = await this.detectReplitUrl();
      if (replitUrl) {
        this.serverUrl = replitUrl;
        console.log('Detected Replit URL:', replitUrl);
      }
    } catch (error) {
      console.log('Not running on Replit, using localhost');
    }

    console.log('Using server URL:', this.serverUrl);

    // Test server connection
    const isConnected = await this.testConnection();
    
    if (isConnected) {
      this.loadApp();
    } else {
      this.showError();
    }
  }

  async detectReplitUrl() {
    // Get current tab to detect if we're on a Replit domain
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          const url = new URL(tabs[0].url);
          console.log('Current tab URL:', url.hostname);
          
          if (url.hostname.includes('replit.app')) {
            // Extract the Replit app URL
            const replitUrl = `https://${url.hostname}`;
            resolve(replitUrl);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  async testConnection() {
    try {
      console.log(`Testing connection to ${this.serverUrl}...`);
      
      // First try a simple fetch to see if server is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.serverUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Server response status:', response.status);
      
      // Accept any response that's not a network error
      return response.status < 500 || response.status === 401; // 401 is OK (not authenticated)
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // If localhost fails, try alternative URLs
      if (this.serverUrl.includes('localhost')) {
        console.log('Localhost failed, trying 127.0.0.1...');
        this.serverUrl = 'http://127.0.0.1:5000';
        return this.testConnection();
      }
      
      return false;
    }
  }

  loadApp() {
    console.log('Loading app...');
    const loading = document.getElementById('loading');
    const appContent = document.getElementById('app-content');
    const iframe = document.getElementById('app-container');

    if (!loading || !appContent || !iframe) {
      console.error('Required DOM elements not found');
      this.showError();
      return;
    }

    // Hide loading and show app
    loading.style.display = 'none';
    appContent.style.display = 'block';

    // Load the calendar app in iframe
    iframe.src = this.serverUrl;
    console.log('Setting iframe src to:', this.serverUrl);
    
    // Handle iframe load events
    iframe.onload = () => {
      console.log('Calendar app loaded successfully');
    };

    iframe.onerror = (error) => {
      console.error('Failed to load calendar app:', error);
      this.showError();
    };

    // Add timeout fallback
    setTimeout(() => {
      if (iframe.contentDocument && iframe.contentDocument.readyState !== 'complete') {
        console.warn('Iframe taking too long to load, showing error');
        this.showError();
      }
    }, 15000); // 15 second timeout
  }

  showError() {
    console.log('Showing error state');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appContent = document.getElementById('app-content');
    
    if (loading) loading.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (error) error.style.display = 'block';
  }
}

// Initialize extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded, initializing extension...');
  new CalendarExtension();
});

// Handle popup resize for better UX
window.addEventListener('resize', () => {
  const iframe = document.getElementById('app-container');
  if (iframe) {
    iframe.style.height = `${window.innerHeight - 60}px`; // Account for header
  }
});

// Add error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error in popup:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in popup:', event.reason);
});