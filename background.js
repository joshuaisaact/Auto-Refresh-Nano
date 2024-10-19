let isRunning = false;
let intervalId = null;
let stopPrompt = '';
let showAlert = false;
let monitorMode = 'presence';
let currentTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    if (!isRunning) {
      const { interval, stopPrompt: promptText, showAlert: alertEnabled, monitorMode: newMonitorMode } = message;
      stopPrompt = promptText;
      showAlert = alertEnabled;
      monitorMode = newMonitorMode || 'presence';

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          currentTabId = tabs[0].id;

          intervalId = setInterval(() => {
            chrome.scripting.executeScript({
              target: { tabId: currentTabId },
              func: refreshTab,
              args: [stopPrompt, monitorMode],
            });
          }, interval);

          isRunning = true;
          sendResponse({ status: 'running' });
        }
      });
    }
  } else if (message.action === 'stop') {
    stopAutoRefresh(true, message.stopPrompt, message.monitorMode);
    sendResponse({ status: 'stopped' });
  } else if (message.action === 'getStatus') {
    sendResponse({ isRunning });
  }

  return true;
});

// Refactored stop function
function stopAutoRefresh(autoStopped = true) {
  clearInterval(intervalId);
  isRunning = false;

  if (showAlert) {
    // Determine the action (appeared/disappeared)
    let actionMessage = monitorMode === 'presence' ? 'appeared' : 'disappeared';

    // Create the notification with more context
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '🔔 Auto-refresh Stopped! 🔔',
      message: 'The auto-refresh has been stopped. Please take action now.',
      priority: 2
    });

  }

  chrome.runtime.sendMessage({ action: 'autoRefreshStopped', autoStopped });
}

function refreshTab(prompt, monitorMode) {
  if (prompt && prompt.trim().length > 0) {
    const pageText = document.body.innerText;
    const wordExists = pageText.includes(prompt);

    if ((monitorMode === 'presence' && wordExists) || (monitorMode === 'absence' && !wordExists)) {
      chrome.runtime.sendMessage({ action: 'stop' });
    } else {
      window.location.reload();
    }
  } else {
    window.location.reload();
  }
}
