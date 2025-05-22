let isTrackingEnabled = false;

const capturedRequests = [];

// Listener to capture network requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isTrackingEnabled) {
      const request = {
        startedDateTime: new Date(details.timeStamp).toISOString(),
        request: {
          method: details.method,
          url: details.url,
          headers: [],
          postData: details.requestBody ? JSON.stringify(details.requestBody) : null,
        },
        response: {
          status: null,
          statusText: null,
          headers: [],
          body: null, // Placeholder for response body
        },
        timings: {
          wait: 0, // Placeholder
        },
      };
      capturedRequests.push(request);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Listener to capture response headers and status
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (isTrackingEnabled) {
      const matchingRequest = capturedRequests.find((req) => req.request.url === details.url);
      if (matchingRequest) {
        matchingRequest.response.status = details.statusCode;
        matchingRequest.response.statusText = details.statusLine;
        matchingRequest.response.headers = details.responseHeaders;
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "toggle-tracking") {
    isTrackingEnabled = message.enabled;
    sendResponse({ success: true, isTrackingEnabled });
  } else if (message.type === "get-har") {
    const har = generateHAR(capturedRequests);
    sendResponse({ har });
  }
  return true;
});

// Function to generate a proper HAR file
function generateHAR(calls) {
  return JSON.stringify({
    log: {
      version: "1.2",
      creator: {
        name: "Network Call Tracker",
        version: "1.1",
      },
      entries: calls.map((call) => ({
        startedDateTime: call.startedDateTime,
        time: call.timings.wait,
        request: {
          method: call.request.method,
          url: call.request.url,
          headers: call.request.headers,
          postData: call.request.postData
            ? {
                mimeType: "application/json",
                text: call.request.postData,
              }
            : null,
        },
        response: {
          status: call.response.status,
          statusText: call.response.statusText,
          headers: call.response.headers,
          content: {
            mimeType: "application/json", // Adjust as needed
            text: call.response.body,
          },
        },
      })),
    },
  });
}
