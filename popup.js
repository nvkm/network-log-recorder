document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggle-tracking");
  const downloadButton = document.getElementById("download-har");
  const ai_load_case = document.getElementById("ai_load_case");

  // Check the initial state of the toggle button
  chrome.storage.local.get(["trackingState"], (result) => {
    const isTrackingEnabled =
      result.trackingState !== undefined ? result.trackingState : false;
    toggleButton.checked = isTrackingEnabled; // Set the toggle button state based on the value in storage
  });

  // Toggle the tracking state when the button is clicked
  toggleButton.addEventListener("click", () => {
    const isTrackingEnabled = toggleButton.checked;

    // Save the new state to chrome storage
    chrome.storage.local.set({ trackingState: isTrackingEnabled }, () => {
      // Send the updated state to the background script
      chrome.runtime.sendMessage(
        { type: "toggle-tracking", enabled: isTrackingEnabled },
        (response) => {
          if (response.success) {
            // Optionally update UI or handle response here
          }
        }
      );
    });
  });

  downloadButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "get-har" }, (response) => {
      if (response.har) {
        const blob = new Blob([response.har], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "network-calls.har";
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });

  ai_load_case.addEventListener("click", () => {
    console.log("ai_load_case clicked");

    try {
      chrome.runtime.sendMessage({ type: "get-har" }, (response) => {
        if (response?.har) {
          console.log("HAR data received:", response.har);

          // Use the HAR data directly
          const harLog = JSON.parse(response.har); // Parse the HAR JSON if it's a string
          console.log("Parsed HAR log:", harLog);

          if (!harLog) {
            console.error("Failed to capture HAR log.");
            return;
          }

          // 2. Prepare the Payload
          const payload = new FormData();
          payload.append(
            "fileContent",
            new Blob([JSON.stringify(harLog)], { type: "application/json" }),
            "networklog.har"
          );

          // 3. Send the POST Request
          const versionId = "5"
          const endpointURL = "http://dev.testsigma.com/load_clusters/"+versionId+"/create_by_ai/"; // Replace with your actual endpoint
          fetch(endpointURL, {
            method: "POST",
            body: payload,
          })
            .then((serverResponse) => {
              if (serverResponse.ok) {
                console.log("HAR data sent successfully!");
                return serverResponse.json(); // or response.text(), depending on your endpoint
              } else {
                console.error(
                  "Error sending HAR data:",
                  serverResponse.status,
                  serverResponse.statusText
                );
                return serverResponse.text().then((errorText) => {
                  console.error("Error details:", errorText);
                });
              }
            })
            .then((data) => {
              if (data) {
                console.log("Response from server:", data);
              }
              window.alert("Our AI minions are on it! Sit tight, and we’ll email you when the magic is done.");
            })
            .catch((fetchError) => {
              console.error("Error during fetch:", fetchError);
            });
        } else {
          console.error("No HAR data found in response.");
        }
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

});
  