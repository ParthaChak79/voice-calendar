// Background script for the Voice Calendar Scheduler extension
class CalendarBackground {
  constructor() {
    this.serverUrls = [
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    this.activeServerUrl = null;
    this.isInitialized = false;
    
    // Wait for Chrome APIs to be available
    if (this.checkAPIsAvailability()) {
      this.init();
    } else {
      // Retry initialization after a short delay
      setTimeout(() => this.init(), 100);
    }
  }

  checkAPIsAvailability() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.notifications && 
           chrome.alarms &&
           chrome.action;
  }

  async init() {
    if (this.isInitialized || !this.checkAPIsAvailability()) {
      return;
    }

    try {
      console.log('Initializing Voice Calendar Scheduler background script...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Find working server URL
      await this.findWorkingServer();
      
      // Set up periodic event checking
      await this.setupPeriodicCheck();
      
      this.isInitialized = true;
      console.log('Background script initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize background script:', error);
    }
  }

  setupEventListeners() {
    // Extension installation/update handler
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details).catch(error => {
        console.error('Error in onInstalled handler:', error);
      });
    });

    // Extension icon click handler
    chrome.action.onClicked.addListener((tab) => {
      this.onActionClicked(tab).catch(error => {
        console.error('Error in onActionClicked handler:', error);
      });
    });

    // Notification click handler
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.onNotificationClicked(notificationId).catch(error => {
        console.error('Error in onNotificationClicked handler:', error);
      });
    });

    // Alarm handler for periodic checks
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.checkUpcomingEvents(alarm).catch(error => {
        console.error('Error in alarm handler:', error);
      });
    });

    console.log('Event listeners set up successfully');
  }

  async findWorkingServer() {
    console.log('Searching for available server...');
    
    for (const url of this.serverUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${url}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        // Consider server working if it responds (even with auth errors)
        if (response.status < 500) {
          this.activeServerUrl = url;
          console.log('Found working server:', url);
          return true;
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Server timeout:', url);
        } else {
          console.log('Server not available:', url, error.message);
        }
      }
    }
    
    console.log('No working server found');
    return false;
  }

  async onInstalled(details) {
    console.log('Extension event:', details.reason);
    
    try {
      if (details.reason === 'install') {
        // Show welcome notification
        await chrome.notifications.create('welcome', {
          type: 'basic',
          iconUrl: 'extension/icons/icon48.png',
          title: 'Voice Calendar Scheduler',
          message: 'Extension installed! Click the calendar icon to get started.',
          priority: 1
        });
        
        console.log('Welcome notification sent');
      } else if (details.reason === 'update') {
        console.log('Extension updated to version', chrome.runtime.getManifest().version);
      }
    } catch (error) {
      console.error('Error handling installation:', error);
    }
  }

  async onActionClicked(tab) {
    console.log('Extension icon clicked on tab:', tab.url);
    
    try {
      // Try to open the calendar app
      const serverUrl = this.activeServerUrl || this.serverUrls[0];
      
      await chrome.tabs.create({ 
        url: serverUrl,
        active: true
      });
      
      console.log('Opened calendar app in new tab');
    } catch (error) {
      console.error('Error opening calendar app:', error);
      
      // Show error notification
      await this.showErrorNotification('Failed to open calendar app');
    }
  }

  async onNotificationClicked(notificationId) {
    console.log('Notification clicked:', notificationId);
    
    try {
      // Clear the notification
      await chrome.notifications.clear(notificationId);
      
      // Open the calendar app
      const serverUrl = this.activeServerUrl || this.serverUrls[0];
      await chrome.tabs.create({ 
        url: serverUrl,
        active: true
      });
      
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  async setupPeriodicCheck() {
    try {
      // Clear any existing alarm
      await chrome.alarms.clear('checkUpcomingEvents');
      
      // Create new alarm for checking events every 5 minutes
      await chrome.alarms.create('checkUpcomingEvents', {
        delayInMinutes: 1,
        periodInMinutes: 5,
      });
      
      console.log('Periodic event checking alarm set up');
    } catch (error) {
      console.error('Error setting up periodic check:', error);
    }
  }

  async checkUpcomingEvents(alarm) {
    if (alarm.name !== 'checkUpcomingEvents') {
      return;
    }

    console.log('Checking for upcoming events...');

    // Ensure we have a working server
    if (!this.activeServerUrl) {
      const found = await this.findWorkingServer();
      if (!found) {
        console.log('No server available for event checking');
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.activeServerUrl}/api/events`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated - skipping event check');
        } else {
          console.log('Failed to fetch events:', response.status, response.statusText);
        }
        return;
      }

      const events = await response.json();
      
      if (Array.isArray(events) && events.length > 0) {
        await this.processUpcomingEvents(events);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Event check request timed out');
      } else {
        console.error('Error checking upcoming events:', error);
      }
      
      // Reset server URL to force re-discovery on next check
      this.activeServerUrl = null;
    }
  }

  async processUpcomingEvents(events) {
    const now = new Date();
    const processedNotifications = new Set();
    
    for (const event of events) {
      try {
        if (!event.startDate || !event.title) {
          continue; // Skip invalid events
        }
        
        const eventDate = new Date(event.startDate);
        if (isNaN(eventDate.getTime())) {
          continue; // Skip events with invalid dates
        }
        
        const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
        
        // Show notifications for events starting in 15 minutes, 30 minutes, or 1 hour
        const shouldNotify = minutesUntil === 15 || minutesUntil === 30 || minutesUntil === 60;
        
        if (shouldNotify) {
          const notificationKey = `${event.id}-${minutesUntil}`;
          
          if (!processedNotifications.has(notificationKey)) {
            await this.showEventNotification(event, minutesUntil);
            processedNotifications.add(notificationKey);
          }
        }
        
      } catch (error) {
        console.error('Error processing event:', event, error);
      }
    }
  }

  async showEventNotification(event, minutesUntil) {
    try {
      let message;
      let priority = 0;
      
      if (minutesUntil <= 15) {
        message = `Starting in ${minutesUntil} minutes`;
        priority = 2; // High priority for imminent events
      } else if (minutesUntil <= 30) {
        message = `Starting in ${minutesUntil} minutes`;
        priority = 1;
      } else if (minutesUntil <= 60) {
        message = `Starting in 1 hour`;
        priority = 0;
      }

      const notificationId = `event-${event.id}-${minutesUntil}`;
      
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'extension/icons/icon48.png',
        title: event.title || 'Upcoming Event',
        message: message,
        contextMessage: event.description || 'Calendar reminder',
        priority: priority,
        requireInteraction: minutesUntil <= 15 // Require interaction for urgent notifications
      });

      console.log(`Event notification sent: ${event.title} (${minutesUntil} minutes)`);
      
    } catch (error) {
      console.error('Error showing event notification:', error);
    }
  }

  async showErrorNotification(message) {
    try {
      await chrome.notifications.create('error', {
        type: 'basic',
        iconUrl: 'extension/icons/icon48.png',
        title: 'Calendar Extension Error',
        message: message,
        priority: 1
      });
    } catch (error) {
      console.error('Error showing error notification:', error);
    }
  }
}

// Initialize the background script when the service worker starts
console.log('Starting Voice Calendar Scheduler background script...');
const calendarBackground = new CalendarBackground();
