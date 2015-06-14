//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let hasPlayerCached = false;

  function checkForPlayer() {
    let hasPlayer = checkWindowAndFrames(window);
    if (hasPlayer != hasPlayerCached) {
      self.port.emit("detect", hasPlayer);
      hasPlayerCached = hasPlayer;
    }
  }

  function onMutation(mutations) {
    for (let m of mutations) {
      for (let n of m.removedNodes) {
        if (("matches" in n && n.matches(this.lookFor)) ||
          ("querySelector" in n && n.querySelector(this.lookFor))) {
          checkForPlayer();
          return;
        }
      }
    }
  }

  function checkWindowAndFrames(win) {
    let hasMedia = Array.some(
      win.document.querySelectorAll("audio, video"),
      v => !v.error
    );

    if (hasMedia) {
      let mediaObserver = new win.MutationObserver(onMutation);
      mediaObserver.lookFor = "audio, video";
      mediaObserver.observe(win.document.documentElement, {
        childList: true,
        subtree: true
      });

      if (win != win.top) {
        let parent = win.parent;
        let iframeObserver = new parent.MutationObserver(onMutation);
        iframeObserver.lookFor = "iframe";
        iframeObserver.observe(parent.document.documentElement, {
          childList: true,
          subtree: true
        });
      }

      return true;
    }

    return Array.some(
      win.document.querySelectorAll("iframe"),
      f => checkWindowAndFrames(f.contentWindow)
    );
  }

})();
