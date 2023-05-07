window.addEventListener("load", () => {
    const OAUTH_REDIRECT_URI = 'https://' + chrome.runtime.id + '.chromiumapp.org/callback';
    document.getElementById('oauthCallbackURLDisplay').innerText = OAUTH_REDIRECT_URI;

    // Parse the user input and save in local storage.
    // Local storage is used to limit scope of this extension to the local browser only.
    function saveOptions() {
        // Get form values
        const optionsFormElements = document.getElementsByTagName('form')[0].elements;

        let client_id = optionsFormElements.client_id.value;
        let client_secret = optionsFormElements.client_secret.value;
        let mydomain_url = optionsFormElements.mydomain_url.value;

        chrome.storage.local.set({
            sf_client_id: client_id,
            sf_client_secret: client_secret,
            sf_mydomain_url: mydomain_url
        })
            .then(() => {
                alert('Settings Saved');
            });
            

        // Add a CORS rule to allow manifest.json to load properly. This needs to be a dynamic rule as we don't know what the domain is.
        chrome.declarativeNetRequest.updateDynamicRules(
            {addRules:[{
                "id": 4,
                "priority": 2,
                "action": {
                    "type": "modifyHeaders",
                    "responseHeaders": [
                        {
                            "header": "Access-Control-Allow-Origin",
                            "operation": "set",
                            "value": "https://" + mydomain_url.substring(0, mydomain_url.indexOf('.my.')) + ".lightning.force.com"
                        }
                    ]
                },
                "condition": {
                    "urlFilter": "https://*.my.salesforce.com/visualforce/session?*",
                    "resourceTypes": [
                        "main_frame",
                        "stylesheet",
                        "sub_frame",
                        "script",
                        "image",
                        "font",
                        "object",
                        "xmlhttprequest",
                        "ping",
                        "csp_report",
                        "media",
                        "other"
                    ]
                }}
              ],
              removeRuleIds: [4]
            },
         )
    }

    // Start the authorization process to retreive an access_token and refresh_token for later use.
    function startAuthorize() {
        // Get form values
        const optionsFormElements = document.getElementsByTagName('form')[0].elements;

        let client_id = optionsFormElements.client_id.value;
        let client_secret = optionsFormElements.client_secret.value;
        let mydomain_url = optionsFormElements.mydomain_url.value;

        // Construct the OAuth initialization URL. Note parameter of prompt=select_account%20consent to 
        // force user to always click "Allow" on a consent screen, or be prompted to choose from multiple logins
        let initURL = "https://" + mydomain_url + "/services/oauth2/authorize?client_id=" + client_id + "&redirect_uri=" + OAUTH_REDIRECT_URI + "&response_type=code&prompt=select_account%20consent";

        // Launch the OAuth flow. This will use Chrome's built in capability and open a webview to prompt for input.
        chrome.identity.launchWebAuthFlow(
            { 'url': initURL, 'interactive': true },
            function (redirect_url) {
                // If redirect_uri is blank, then it means that the flow didn't complete successfully
                if (!redirect_url) {
                    alert('Error authenticating user. Please verify your Consumer Key, Consumer Secret, and My Domain URL is correct and try again.');
                    document.getElementById("authBtn").disabled = false;
                    return;
                }

                /* Extract token from redirect_url */
                console.log(redirect_url);
                const params = new Proxy(new URLSearchParams(redirect_url.slice(redirect_url.indexOf('?') + 1)), {
                    get: (searchParams, prop) => searchParams.get(prop),
                });
                let authCode = params.code;

                fetch("https://" + mydomain_url + "/services/oauth2/token", {
                    method: "POST",
                    body: "grant_type=authorization_code&code=" + authCode + "&client_id=" + client_id + "&client_secret=" + client_secret + "&redirect_uri=" + OAUTH_REDIRECT_URI,
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
                        chrome.storage.local.set({
                            sf_access_token: json.access_token,
                            sf_refresh_token: json.refresh_token
                        });

                        document.getElementById("authBtn").disabled = true;
                        document.getElementById("deleteTokensBtn").disabled = false;
                    }))
                    .catch((error) => {
                        alert('Error getting refresh_token: ' + error + '. Please verify your Consumer Key, Consumer Secret, and My Domain URL is correct and try again.');
                        document.getElementById("authBtn").disabled = false;
                    });
            });
    }

    // Call Salesforce to revoke the refresh_token and any associated access_tokens
    // Note /revoke endpoint may return a 40x error if the refresh token is already expired/revoked
    // so we blindly delete keys from storage regardless of success/failure of revokation.
    function deleteTokensAndRevokeSession() {
        // Kill the token
        chrome.storage.local.get(['sf_refresh_token', 'sf_mydomain_url']).then((result) => {
            fetch("https://" + result.sf_mydomain_url + "/services/oauth2/revoke", {
                method: "POST",
                body: "token=" + result.sf_refresh_token,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            })
                .then((response => {
                    console.log('Revokation response: ' + response);
                    chrome.storage.local.remove(
                        ['sf_access_token', 'sf_refresh_token']
                    );

                    document.getElementById("authBtn").disabled = false;
                    document.getElementById("deleteTokensBtn").disabled = true;
                }));
        });
    }


    // Retreive current values from storage and prepopulate form
    chrome.storage.local.get(['sf_client_id', 'sf_client_secret', 'sf_mydomain_url', 'sf_refresh_token']).then((result) => {
        if (result.sf_client_id) {
            document.getElementsByTagName('form')[0].elements.client_id.value = result.sf_client_id;
        }
        if (result.sf_client_secret) {
            document.getElementsByTagName('form')[0].elements.client_secret.value = result.sf_client_secret;
        }
        if (result.sf_mydomain_url) {
            document.getElementsByTagName('form')[0].elements.mydomain_url.value = result.sf_mydomain_url;
        }

        if (result.sf_refresh_token) {
            document.getElementById("authBtn").disabled = true;
            document.getElementById("deleteTokensBtn").disabled = false;
        } else {
            document.getElementById("authBtn").disabled = false;
            document.getElementById("deleteTokensBtn").disabled = true;
        }
    });

    // Add handler for form and buttons
    let form = document.getElementById("optionsForm");
    // Add 'submit' event handler
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveOptions();
    });

    let authorizeBtn = document.getElementById("authBtn");
    authorizeBtn.addEventListener("click", (event) => {
        authorizeBtn.disabled = true;
        startAuthorize();
    });

    let deleteTokensBtn = document.getElementById("deleteTokensBtn");
    deleteTokensBtn.addEventListener("click", (event) => {
        deleteTokensBtn.disabled = true;
        deleteTokensAndRevokeSession();
    });
});