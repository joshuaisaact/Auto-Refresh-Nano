document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const toggleButton = document.getElementById('toggleButton');
  const stopPromptInput = document.getElementById('monitorPrompt');
  const alertToggle = document.getElementById('alertToggle');
  const statusDiv = document.getElementById('status');
  const themeToggle = document.getElementById('themeToggle');
  const randomToggle = document.getElementById('randomToggle');
  const monitorModeSelect = document.getElementById('monitorMode');

  // Load saved settings
  chrome.storage.sync.get(['theme', 'interval', 'randomize', 'alertEnabled'], (data) => {
    // Set theme
    if (data.theme === 'light') {
      document.body.classList.remove('dark-mode');
      themeToggle.checked = false;
    } else {
      document.body.classList.add('dark-mode');
      themeToggle.checked = true;
    }

    // Set initial button state
    if (data.isRunning) {
      setButtonToStop();
      updateStatus(true);
    } else {
      setButtonToStart();
      updateStatus(false);
    }

    // Set interval input
    intervalInput.value = data.interval ? data.interval : 1;

    // Set random toggle
    randomToggle.checked = data.randomize ? data.randomize : false;

    // Set alert toggle
    alertToggle.checked = data.alertEnabled ? data.alertEnabled : false;
  });

  // Theme toggle event listener
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      document.body.classList.add('dark-mode');
      chrome.storage.sync.set({ theme: 'dark' });
    } else {
      document.body.classList.remove('dark-mode');
      chrome.storage.sync.set({ theme: 'light' });
    }
  });

  // Alert toggle event listener
  alertToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ alertEnabled: alertToggle.checked });
  });

  // Update status function
  function updateStatus(isRunning) {
    statusDiv.textContent = isRunning ? 'Auto-refresh is running' : 'Auto-refresh is stopped';
  }

  // Set button to Start
  function setButtonToStart() {
    toggleButton.textContent = 'Start Auto Refresh';
    toggleButton.classList.remove('stop');
    toggleButton.classList.add('start');
  }

  // Set button to Stop
  function setButtonToStop() {
    toggleButton.textContent = 'Stop Auto Refresh';
    toggleButton.classList.remove('start');
    toggleButton.classList.add('stop');
  }

  // Get current auto-refresh status on load
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    updateStatus(response.isRunning);
    if (response.isRunning) {
      setButtonToStop();
    } else {
      setButtonToStart();
    }
  });

  // Toggle button event listener
  toggleButton.addEventListener('click', () => {
    if (toggleButton.classList.contains('start')) {
      // Start auto-refresh
      const baseInterval = Math.max(1, parseInt(intervalInput.value, 10)) * 1000;
      const randomize = randomToggle.checked;
      let finalInterval = baseInterval;

      if (randomize) {
        const randomOffset = baseInterval * 0.1 * (Math.random() * 2 - 1);
        finalInterval = baseInterval + randomOffset;
      }

      const stopPrompt = stopPromptInput.value;
      const showAlert = alertToggle.checked;
      const monitorMode = monitorModeSelect.value;

      // Save settings
      chrome.storage.sync.set({
        interval: intervalInput.value,
        randomize: randomToggle.checked,
        isRunning: true,
        stopPrompt: stopPrompt,
        monitorMode: monitorMode
      });

      chrome.runtime.sendMessage({ action: 'start', interval: finalInterval, stopPrompt, showAlert, monitorMode }, (response) => {
        if (response.status === 'running') {
          setButtonToStop();
          updateStatus(true);
        }
      });
    } else {
      chrome.storage.sync.get(['stopPrompt', 'monitorMode'], (data) => {
        chrome.runtime.sendMessage({ action: 'stop', stopPrompt: data.stopPrompt, monitorMode: data.monitorMode }, (response) => {
          if (response.status === 'stopped') {
            setButtonToStart();
            updateStatus(false);
            chrome.storage.sync.set({ isRunning: false });
          }
        });
      });
    }
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'autoRefreshStopped') {
      setButtonToStart();
      updateStatus(false);
      chrome.storage.sync.set({ isRunning: false });

      if (message.autoStopped) {
        statusDiv.textContent = 'Auto-refresh automatically stopped';
      }
    }
  });
});