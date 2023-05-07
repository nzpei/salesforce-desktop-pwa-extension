# Salesforce Desktop (PWA) Extension
This extension injects a layer on top of Salesforce Lightning Experience that will:
* Meet the minimum criteria to be "Installable" as an App (PWA)
* Detect if you have been logged out and attempt to automatically reauthenticate your session

When fully installed and configured, you will have a desktop app named "Salesforce Desktop (PWA)" which will open in its own window similar to other PWAs.

![Salesforce as a PWA](/images/pwa-screenshot.png)

## Installation 
This extension requires a two-part installation.

### Static Resources
Create a new Static Resource in your Salesforce org named "pwa" and upload the `/pwa/pwa.zip` file. This file will contain files that need to be hosted in Salesforce, including the updated manifest.json, service worker, and offline error page.

### Install and Configure Chrome Extension
1. Open the Chrome Extensions page `chrome://extensions` 
1. Enable "Developer Mode"
1. Click on "Load unpacked" and navigate to the root of this directory
1. Once complete, you should see the "Salesforce Desktop PWA" extension is installed
1. From the Extensions bar in the main browser, click on the Salesforce icon (or right click, Options) to launch the Options page
1. Enter details for the Connected App as prompted on the page and click "Save Settings"
1. Click on "Authorize". You will be prompted to log into your Salesforce org and give consent for the Connected App 
    1. If successful, the Authorize button should be grayed out

### Usage
When logged into Salesforce, you should now see the "Install" button visible in the browser address bar, similar to any other web application with PWA capablities. If you don't see it right away, try refreshing your browser tab and/or clearing cache and trying again.

![PWA Install Screenshot](/images/chrome-install-screenshot.png)

Click on the button to install the App.

## Disclaimer
This extension was developed as a proof of concept / learning exercise, and is for educational purposes only. Use in a production setting is strongly discouraged for security reasons. Standard legal discalimer below:

> THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF
> ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
> OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
> IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
> USE OR OTHER DEALINGS IN THE SOFTWARE.

## Known Issues / Needs Fixing

### General
* Code has limited error handling, input validation, and has no unit tests. This is not production-level code and as such should be treated with caution.
* This extension has only been tested against a Developer Org and has not been validated with Sandbox, Production, Scratch or other org types. In theory it should work, but is untested. 
* Extension assumes only one org/credential is in use browser-wide. Does not support multiple logins.

### background.js
* Ideally `chrome.webRequest.onAuthRequired` should be used to detect when a session has expired, however it doesn't seem to fire for some reason - still unresolved

### rules.json
* Rule 2 - Currently strips out CSP Headers. This NOT A GOOD IDEA and is just a workaround, as ideally we'd just need to add `manifest-src 'self' https://*.my.salesforce.com` - but for some reason doesn't work. Chrome seems to drop the `manifest-src` header entirely if you have more than one source listed when using `append` - not sure exactly why (suspect it's a bug)

## Acknowledgements
Portions of this extension are based on code from https://github.com/georgwittberger/salesforce-community-pwa 