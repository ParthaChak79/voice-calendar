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
      }
    } catch (error) {
      console.log('Not running on Replit, using localhost');
    }

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
      const response = await fetch(`${this.serverUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Server response status:', response.status);
      return response.status < 500; // Accept 401 (not authenticated) but not 500 (server error)
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  loadApp() {
    console.log('Loading app...');
    const loading = document.getElementById('loading');
    const appContent = document.getElementById('app-content');
    const iframe = document.getElementById('app-container');

    // Hide loading and show app
    loading.style.display = 'none';
    appContent.style.display = 'block';

    // Load the calendar app in iframe
    iframe.src = this.serverUrl;
    
    // Handle iframe load events
    iframe.onload = () => {
      console.log('Calendar app loaded successfully');
    };

    iframe.onerror = () => {
      console.error('Failed to load calendar app');
      this.showError();
    };
  }

  showError() {
    console.log('Showing error state');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    loading.style.display = 'none';
    error.style.display = 'block';
  }
}

// Initialize extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new CalendarExtension();
});

// Handle popup resize for better UX
window.addEventListener('resize', () => {
  const iframe = document.getElementById('app-container');
  if (iframe) {
    iframe.style.height = `${window.innerHeight - 60}px`; // Account for header
  }
});