// Import the browser API using the WebExtension polyfill
import 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async function() {
  const toggleOptions = document.querySelectorAll('.toggle-option');
  const currentStatusElement = document.getElementById('currentStatus');
  
  // Function to update the UI based on the current level
  function updateUI(level) {
    updateActiveToggle(level);
    updateStatusText(level);
  }
  
  // Load saved setting from local storage
  async function loadSavedSetting() {
    try {
      const result = await browser.storage.local.get(['restrictionLevel']);
      const savedLevel = result.restrictionLevel || 'none';
      updateUI(savedLevel);
      
      // Also verify with background script
      try {
        const response = await browser.runtime.sendMessage({action: 'getRestriction'});
        if (response && response.level && response.level !== savedLevel) {
          // If there's a mismatch, update from background script
          updateUI(response.level);
        }
      } catch (error) {
        console.error('Error getting restriction level:', error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  // Initial load
  loadSavedSetting();

  // Add click handler for test page button
  document.getElementById('testPageBtn').addEventListener('click', () => {
    browser.tabs.create({ url: 'https://www.youtube.com/check_content_restrictions' });
  });

  // Add click handlers for each toggle option
  toggleOptions.forEach(option => {
    option.addEventListener('click', async function() {
      const level = this.getAttribute('data-value');
      updateUI(level);
      
      // Save the setting and notify background script
      try {
        const response = await browser.runtime.sendMessage({
          action: 'updateRestriction', 
          level: level
        });
        
        if (!response || response.status !== 'success') {
          console.error('Error updating restriction level:', response?.message || 'Failed to update restriction level');
        } else {
          console.log('Restriction level updated to:', level);
        }
      } catch (error) {
        console.error('Error updating restriction level:', error);
      }
    });
  });


  // Update the visual indicator of which option is active
  function updateActiveToggle(level) {
    // Remove active class from all options
    toggleOptions.forEach(opt => {
      opt.classList.remove('active');
    });
    
    // Add active class to selected option
    const selectedOption = document.querySelector(`.toggle-option[data-value="${level}"]`);
    if (selectedOption) {
      selectedOption.classList.add('active');
    }
  }

  function updateStatusText(level) {
    let statusText = level.charAt(0).toUpperCase() + level.slice(1);
    currentStatusElement.textContent = statusText;
    
    // Update status text color based on level
    switch(level) {
      case 'strict':
        currentStatusElement.style.color = '#ff3333';
        break;
      case 'moderate':
        currentStatusElement.style.color = '#ff8533';
        break;
      case 'none':
      default:
        currentStatusElement.style.color = '#33cc33';
    }
  }
});
