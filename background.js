const salesforceURLs = { urls: ["https://*.lightning.force.com/*", "https://*.my.salesforce.com/*"] };

// NO IDEA WHY THIS DOESN'T EVER FIRE!!! This would be a better approach than manually detecting the 401 in onCompleted 
chrome.webRequest.onAuthRequired.addListener((details) => {
    console.log('onAuthRequired: ' + details.url);
    console.log(details.statusCode);
}, salesforceURLs, ["blocking"]);

// Instead, we try to look for a 401 on a regular webRequest
chrome.webRequest.onCompleted.addListener(async (details) => {
    console.log('onCompleted: ' + details.url);
    // Detect if browser is going to the login page for some reason
    if (details.url.endsWith('.my.salesforce.com/') && details.statusCode == 200){
        console.log('Load of home screen');
        reAuthSalesforce();
    }

    // Detect if session has timed out
    if (details.statusCode == '401') {
        console.log('401 detected. Reauth needed');
        reAuthSalesforce();
    }
}, salesforceURLs);

// Manual trigger point - clicking on the Extension icon
chrome.action.onClicked.addListener(async (tab) => {
    chrome.storage.local.get(['sf_refresh_token', 'sf_mydomain_url']).then((result) => {
        if (result.sf_refresh_token && result.sf_mydomain_url) {
            reAuthSalesforce(tab);
        } else { // User hasn't configured or authorized account, open the options page.
            chrome.runtime.openOptionsPage();
        }
    });
});

function reAuthSalesforce(tab) {
    chrome.storage.local.get(['sf_client_id', 'sf_client_secret', 'sf_mydomain_url', 'sf_refresh_token']).then((result) => {

        if (result.sf_refresh_token) {
            fetch("https://" + result.sf_mydomain_url + "/services/oauth2/token", {
                method: "POST",
                body: "grant_type=refresh_token&client_id=" + result.sf_client_id + "&client_secret=" + result.sf_client_secret + "&refresh_token=" + result.sf_refresh_token,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })
                .then((response) => {
                    if (response.status >= 200 && response.status <= 299) {
                        return response.json();
                    } else {
                        throw Error(response.statusText);
                    }
                })
                .then((json => {
                    // Update the access token
                    chrome.storage.local.set({
                        sf_access_token: json.access_token
                    });

                    // Redirect to frontdoor
                    let frontdoorURL = "https://" + result.sf_mydomain_url + "/secur/frontdoor.jsp?sid=" + json.access_token;
                    if (tab == null) { // Condition where background monitoring detects reauth required (I think!!!)
                        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
                            console.log('Found Active Tab: ' + JSON.stringify(tab, null, 4));
                            if (tab.length > 0 && (!(tab[0].url && tab[0].url.includes('frontdoor.jsp')) || !(tab[0].pendingUrl && tab[0].pendingUrl.includes('frontdoor.jsp')))) {
                                let tabURL = (tab[0].url == null || tab[0].url.includes('frontdoor.jsp')) ? tab[0].pendingUrl : tab[0].url;
                                reloadSalesforceTab(tab[0].id, tabURL, frontdoorURL,);
                            }
                        });
                    } else { // Condition when extension is manually triggered (I think!!!)
                        reloadSalesforceTab(tab.id, tab.url, frontdoorURL);
                    }
                }))
                .catch((error) => {
                    console.log('Error getting access_token from refresh_token:' + error);
                });
        }
    });
}

function reloadSalesforceTab(tabId, currTabURL, frontdoorURL) {
    let retURLParam = currTabURL == null ? "&retURL=/one/one.app" : "&retURL=" + currTabURL.substring(currTabURL.indexOf('force.com/') + 9);
    console.log('Current Tab URL: ' + currTabURL);
    console.log('Refreshing session with ' + frontdoorURL + retURLParam);
    chrome.tabs.update(tabId, { url: frontdoorURL + retURLParam });
}