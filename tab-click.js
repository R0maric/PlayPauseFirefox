//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const { viewFor } = require("sdk/view/core");

  const tabIconMarginLeft = 32;
  const tabMarginTop = 4;
  const hitBoxX = 12;
  const hitBoxY = 18;

  function clickHandler(worker, event) {
    // Check there's only one click of the left button.
    if (event.button != 0 || event.detail != 1) {
      return;
    }

    // Check hitbox
    if ((event.layerX - tabIconMarginLeft > hitBoxX) || (event.layerY - tabMarginTop > hitBoxY)) {
      return;
    }

    worker.port.emit("toggle");
    event.stopPropagation();
  }

  function addClickHandlerForTab(sdkWorker) {
    let xulTab = viewFor(sdkWorker.tab);
    let chromeDocument = xulTab.ownerDocument;
    let tabLabel = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "tab-label");
    let handler = clickHandler.bind(undefined, sdkWorker);

    tabLabel.style.pointerEvents = "all";
    tabLabel.addEventListener("mousedown", handler, true);

      /*
       xulTab.addEventListener("TabMove", updateOnRearrange, false);
       xulTab.addEventListener("TabAttrModified", fixBinding, false);
       xulTab.addEventListener("TabPinned", fixBinding, false);
       xulTab.addEventListener("TabUnpinned", fixBinding, false);
       */
    return handler;
  }

  exports.addClickHandlerForTab = addClickHandlerForTab;
})();

/*
function fixBinding(event) {
	let xulTab = event.target;
	let chromeDocument = xulTab.ownerDocument;
	let closeButton = chromeDocument.getAnonymousElementByAttribute(xulTab, "anonid", "close-button");
	if (!closeButton) {
		return;
	}

	if (xulTab.pinned) {
		closeButton.setAttribute("pinned", "true");
	} else {
		closeButton.removeAttribute("pinned");
	}

	if (xulTab.selected) {
		closeButton.setAttribute("selected", "true");
	} else {
		closeButton.removeAttribute("selected");
	}
}

function updateOnRearrange(event) {
	let xulTab = event.target;
	let chromeDocument = xulTab.ownerDocument;
	let chromeWindow = chromeDocument.defaultView;
	chromeWindow.gBrowser.getBrowserForTab(xulTab).messageManager.sendAsyncMessage("NoiseControl:checkNoise");
}
*/
