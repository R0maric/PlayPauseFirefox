//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  let pseudoPlayer = null;
  let titleObserver = null;

  function createTitleObserver() {
    const titleElement = document.querySelector('head > title');
    let observer = new window.MutationObserver(function() { self.port.emit("title", titleElement.text); });
    observer.observe(titleElement, { subtree: true, characterData: true, childList: true });
    return observer;
  }

  function togglePlayPause() {
    if (pseudoPlayer) {
      if (pseudoPlayer.paused) {
        pseudoPlayer.play();
      } else {
        pseudoPlayer.pause();
      }
    }
  }

  function doAttach() {
    pseudoPlayer = window.PseudoPlayers.detectPseudoPlayer();
    if (!pseudoPlayer) {
      return false;
    }

    titleObserver = createTitleObserver();
    self.port.emit("init");

    self.port.on("toggle", togglePlayPause);
    self.port.on("query", function() { self.port.emit("paused", pseudoPlayer.paused); });
    self.port.on("detach", doDetach);

    return true;
  }

  function doDetach(reason) {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (pseudoPlayer) {
      pseudoPlayer.destroy(reason);
      pseudoPlayer = null;
    }
  }

  if (!doAttach()) {
    self.port.emit("disable");
  }
})();
