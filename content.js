(() => {
  const serviceWorkerPath = `/resource/pwa/serviceworker.js`;

  // Save the app installation prompt event
  let deferredInstallPrompt;
  window.addEventListener('beforeinstallprompt', (event) => {
    deferredInstallPrompt = event;
  });

  window.addEventListener('load', () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(serviceWorkerPath, { scope: "/" });
    }

    // Hack to make sure manifest.json is loaded even via VF resession. 
    // Create a hidden iframe to cause the manifest.json to be loaded correctly 
    // and allow the session to be established for static resources
    // This is due to the use of a JS based redirect, not a 301/302.
    // User may still need to refresh the page on first install/usage of the extension
    let linkTags = document.head.getElementsByTagName('link');
    for (let i = 0; i < linkTags.length; i++) {
      let currLinkTag = linkTags[i];      

      if (currLinkTag.href && currLinkTag.href.includes('manifest.json')) {
        let newLinkTag = currLinkTag.cloneNode();
        let ifrm = document.createElement("iframe");
        ifrm.setAttribute("src", currLinkTag.href);
        ifrm.style.width = "0px";
        ifrm.style.height = "0px";
        document.body.appendChild(ifrm);

        // Destroy the current manifest.json tag and replace it
        currLinkTag.remove();
        document.head.appendChild(newLinkTag);
      }
    }
  });
})();