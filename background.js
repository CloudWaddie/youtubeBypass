// Browser API will be provided by the polyfill
const browser = chrome || browser;

// Error handling for the browser API
if (typeof browser === 'undefined') {
  console.error('Browser API not available. This extension requires a compatible browser.');
  throw new Error('Browser API not available');
}

// Check if we're running in Chrome (which uses Manifest V3)
const isChrome = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest && 
  chrome.runtime.getManifest().manifest_version === 3;

// Default restriction level
let currentRestrictionLevel = 'none';

// List of YouTube domains to intercept
const YOUTUBE_DOMAINS = [
  'youtube.com',
  'm.youtube.com',
  'www.youtube.com',
  'youtubei.googleapis.com',
  'youtube.googleapis.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com'
];

// Handle Firefox headers
function handleFirefoxHeaders(details) {
  // Determine the restriction value based on current level
  let restrictionValue;
  switch(currentRestrictionLevel) {
    case 'strict':
      restrictionValue = 'Strict';
      break;
    case 'moderate':
      restrictionValue = 'Moderate';
      break;
    case 'none':
      restrictionValue = 'None';
      break;
    default:
      restrictionValue = 'None-Spoof';
  }

  console.log(`Setting YouTube-Restrict header to: ${restrictionValue}`);

  // Add or update the YouTube-Restrict header
  const requestHeaders = details.requestHeaders || [];
  let headerExists = false;
  const newHeaders = requestHeaders.map(header => {
    if (header.name.toLowerCase() === 'youtube-restrict') {
      headerExists = true;
      return { name: 'YouTube-Restrict', value: restrictionValue };
    }
    return header;
  });

  if (!headerExists) {
    newHeaders.push({
      name: 'YouTube-Restrict',
      value: restrictionValue
    });
  }

  return { requestHeaders: newHeaders };
}

// Function to update the declarativeNetRequest rules (for Chrome)
async function updateHeaderRules() {
  if (!isChrome) return; // Only for Chrome

  try {
    console.log('Updating Chrome header rules...');
    
    // First, remove any existing rules
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);
    
    if (ruleIdsToRemove.length > 0) {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      });
    }

    // Always send the header with the current restriction level
    const restrictionValue = currentRestrictionLevel === 'strict' ? 'Strict' : 
                           currentRestrictionLevel === 'moderate' ? 'Moderate' : 'None';
                           
    console.log('Setting YouTube-Restrict header to:', restrictionValue);

    console.log('Updating header rules with restriction:', restrictionValue);

    // Create rules for each YouTube domain
    const rules = YOUTUBE_DOMAINS.flatMap((domain, index) => [
      // Rule for main domain
      {
        id: index * 2 + 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{
            header: 'YouTube-Restrict',
            operation: 'set',
            value: restrictionValue
          }]
        },
        condition: {
          urlFilter: `||${domain}/*`,
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
        }
      },
      // Rule for subdomains
      {
        id: index * 2 + 2,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{
            header: 'YouTube-Restrict',
            operation: 'set',
            value: restrictionValue
          }]
        },
        condition: {
          urlFilter: `*://*.${domain}/*`,
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
        }
      }
    ]);
    
    console.log('Updating rules:', rules);
    
    // Add new rules in chunks to avoid hitting the rule limit
    const CHUNK_SIZE = 20;
    for (let i = 0; i < rules.length; i += CHUNK_SIZE) {
      const chunk = rules.slice(i, i + CHUNK_SIZE);
      await browser.declarativeNetRequest.updateDynamicRules({
        addRules: chunk
      });
    }
  } catch (error) {
    console.error('Error updating header rules:', error);
  }
}

// Function to update headers for Firefox
async function updateFirefoxHeaders() {
  if (isChrome) return; // Only for Firefox
  
  try {
    // Remove any existing listener
    browser.webRequest.onBeforeSendHeaders.removeListener(handleFirefoxHeaders);
    
    if (currentRestrictionLevel !== 'none') {
      // Add the listener with the current restriction level
      browser.webRequest.onBeforeSendHeaders.addListener(
        handleFirefoxHeaders,
        {
          urls: YOUTUBE_DOMAINS.map(domain => `*://*.${domain}/*`),
          types: ['main_frame', 'sub_frame', 'xmlhttprequest']
        },
        ["blocking", "requestHeaders"]
      );
    }
  } catch (error) {
    console.error('Error updating Firefox headers:', error);
  }
}

// Initialize the extension
async function init() {
  try {
    // Load settings
    const result = await browser.storage.local.get('restrictionLevel');
    currentRestrictionLevel = result.restrictionLevel || 'none';
    console.log('Extension initialized with restriction level:', currentRestrictionLevel);
    
    // Update rules based on browser
    if (isChrome) {
      await updateHeaderRules();
    } else {
      // For Firefox, set up the listener
      await updateFirefoxHeaders();
    }
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Function to reload all YouTube tabs
async function reloadYouTubeTabs() {
  try {
    console.log('Finding YouTube tabs to reload...');
    const tabs = await browser.tabs.query({});
    const youtubeTabs = tabs.filter(tab => 
      tab.url && (tab.url.includes('youtube.com') || tab.url.includes('youtu.be'))
    );
    
    console.log(`Found ${youtubeTabs.length} YouTube tabs to reload`);
    
    // Process tabs sequentially to avoid overwhelming the browser
    for (const tab of youtubeTabs) {
      try {
        console.log(`Reloading tab: ${tab.id} - ${tab.url}`);
        // Add a small delay between tab reloads to be gentle on the browser
        await new Promise(resolve => setTimeout(resolve, 100));
        await browser.tabs.reload(tab.id);
      } catch (error) {
        console.error(`Error reloading tab ${tab.id}:`, error);
      }
    }
    
    console.log('Finished reloading YouTube tabs');
  } catch (error) {
    console.error('Error in reloadYouTubeTabs:', error);
    // Try to reload tabs one by one if batch operation fails
    try {
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && (tab.url.includes('youtube.com') || tab.url.includes('youtu.be'))) {
          try {
            await browser.tabs.reload(tab.id);
          } catch (e) {
            console.error(`Secondary error reloading tab ${tab.id}:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Secondary error in tab reload fallback:', e);
    }
  }
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle the message
  const handleMessage = async (request, sender) => {
    try {
      if (request.action === 'updateRestriction') {
        console.log('Updating restriction level to:', request.level);
        
        // Save the new restriction level
        currentRestrictionLevel = request.level;
        await browser.storage.local.set({ restrictionLevel: request.level });
        
        // Update the header rules based on browser
        if (isChrome) {
          await updateHeaderRules();
        } else {
          await updateFirefoxHeaders();
        }
        
        // Reload YouTube tabs to apply changes
        console.log('Reloading YouTube tabs...');
        await reloadYouTubeTabs();
        
        // Return success response
        return { status: 'success', level: request.level };
      } else if (request.action === 'getRestriction') {
        return { status: 'success', level: currentRestrictionLevel };
      }
      
      return { status: 'error', message: 'Unknown action' };
    } catch (error) {
      console.error('Error handling message:', error);
      return { status: 'error', message: error.message };
    }
  };
  
  // Call the handler and return true to indicate we'll respond asynchronously
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep the message channel open for the async response
});

// Listen for tab updates to handle page loads (mainly for Firefox)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      YOUTUBE_DOMAINS.some(domain => tab.url.includes(domain))) {
    console.log('YouTube page loaded, current restriction level:', currentRestrictionLevel);
    
    // For Firefox, we need to update the headers
    if (!isChrome) {
      updateFirefoxHeaders();
    }
  }
});

// Start the extension
init();
