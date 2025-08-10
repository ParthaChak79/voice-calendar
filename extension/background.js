// Background script for the calendar extension
class CalendarBackground {
  constructor() {
    this.serverUrls = [
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    this.activeServerUrl = null;
    this.init();
  }

  init() {
    // Set up event listeners
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
    chrome.action.onClicked.addListener(this.onActionClicked.bind(this));
    chrome.notifications.onClicked.addListener(this.onNotificationClicked.bind(this));
    
    // Find working server URL
    this.findWorkingServer();
    
    // Set up alarm for periodic event checking
    this.setupPeriodicCheck();
  }

  async findWorkingServer() {
    for (const url of this.serverUrls) {
      try {
        const response = await fetch(`${url}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.status < 500) {
          this.activeServerUrl = url;
          console.log('Found working server:', url);
          break;
        }
      } catch (error) {
        console.log('Server not available:', url);
      }
    }
  }
  async onInstalled(details) {
    console.log('Calendar extension installed:', details.reason);
    
    if (details.reason === 'install') {
      // Show welcome notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'extension/icons/icon48.png',
        title: 'Voice Calendar Scheduler',
        message: 'Extension installed! Click the calendar icon to get started.',
      });
    }
  }

  async onActionClicked(tab) {
    // This is called when the extension icon is clicked
    console.log('Extension icon clicked');
  }

  async onNotificationClicked(notificationId) {
    // Handle notification clicks
    console.log('Notification clicked:', notificationId);
    
    // Open the calendar app in a new tab
    const serverUrl = this.activeServerUrl || this.serverUrls[0];
    chrome.tabs.create({ url: serverUrl });
  }

  async setupPeriodicCheck() {
    // Create an alarm to check for upcoming events every 5 minutes
    chrome.alarms.create('checkUpcomingEvents', {
      delayInMinutes: 1,
      periodInMinutes: 5,
    });

    // Listen for the alarm
    chrome.alarms.onAlarm.addListener(this.checkUpcomingEvents.bind(this));
  }

  async checkUpcomingEvents(alarm) {
    if (alarm.name !== 'checkUpcomingEvents') return;

    if (!this.activeServerUrl) {
      await this.findWorkingServer();
      if (!this.activeServerUrl) return;
    }

    try {
      console.log('Checking for upcoming events...');
      
      // Get events from the server
      const response = await fetch(`${this.activeServerUrl}/api/events`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Failed to fetch events or user not authenticated');
        return;
      }

      const events = await response.json();
      await this.processUpcomingEvents(events);
    } catch (error) {
      console.error('Error checking upcoming events:', error);
    }
  }

  async processUpcomingEvents(events) {
    const now = new Date();
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.startDate);
      const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
      
      // Show notifications for events starting in 15 minutes or 1 hour
      return minutesUntil === 15 || minutesUntil === 60;
    });

    for (const event of upcomingEvents) {
      await this.showEventNotification(event);
    }
  }

  async showEventNotification(event) {
    const eventDate = new Date(event.startDate);
    const now = new Date();
    const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
    
    let message;
    if (minutesUntil <= 15) {
      message = `Starting in ${minutesUntil} minutes`;
    } else if (minutesUntil <= 60) {
      message = `Starting in 1 hour`;
    } else {
      message = `Starting at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    chrome.notifications.create(`event-${event.id}`, {
      type: 'basic',
      iconUrl: 'extension/icons/icon48.png',
      title: event.title,
      message: message,
      contextMessage: event.description || 'Upcoming event',
    });
  }
}

// Initialize background script
new CalendarBackground();