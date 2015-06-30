//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const mediaSelector = "audio, video";

  const pseudoPlayers = [
    { // Pandora
      regex: /.*\.pandora\.com.*/,
      create: createPandoraPseudoPlayer
    },
    {  // Bandcamp
      selector: ".play-btn, .playbutton, .item_link_play",
      create: createBandcampPseudoPlayer
    },
    {  // Generic catch-all HTML5 media
      selector: mediaSelector,
      create: createGenericPseudoPlayer
    }
  ];

  function emitPausedState(paused) {
    if (paused !== null) {
      self.port.emit("paused", paused);
    }
  }

  function createBandcampPseudoPlayer(buttons) {
    let paused = true;
    let currentButton = buttons[0];
    let clickHandler = function(event) {
      currentButton = event.target;
    };
    let mediaEventHandler = function(event) {
      let player = event.target;
      if (player) {
        paused = player.paused;
        emitPausedState(paused);
      }
    };

    let media = document.querySelectorAll(mediaSelector);
    if (buttons.length == 1) { // album page? if playing, update the state
      if (media.length == 1 && !media[0].paused) {
        paused = false;
      }
    } else { // front page or collection? if playing, unset the state; it will update on next click event
      for (let i = 0; i < media.length; i++) {
        if (!media[i].paused) {
          paused = null;
          break;
        }
      }
    }

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", clickHandler);
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);

    return {
      get paused() { return paused; },
      play: function() { currentButton.click(); },
      pause: function() { currentButton.click(); },
      destroy: function(reason) {
        if (reason) {
          window.removeEventListener("playing", mediaEventHandler, true);
          window.removeEventListener("pause", mediaEventHandler, true);
        }
        for (let i = 0; i < buttons.length; i++) {
          let button = buttons[i];
          if (button) {
            button.removeEventListener("click", clickHandler);
          }
        }
      }
    };
  }

  function createPandoraPseudoPlayer() {
    let paused = true;
    let playButton = document.querySelector(".playButton");
    let pauseButton = document.querySelector(".pauseButton");
    if (!playButton || !pauseButton) {
      return null;
    }

    let observer = new MutationObserver(function() {
      paused = (playButton.style.display != "none");
      emitPausedState(paused);
    });
    observer.observe(playButton, { attributes: true, attributeFilter: ["style"] });

    return {
      get paused() { return paused; },
      play: function() { playButton.click(); },
      pause: function() { pauseButton.click(); },
      destroy: function() { observer.disconnect(); }
    }
  }

  function createGenericPseudoPlayer(players) {
    let paused = true;
    let currentPlayer = players[0];
    let mediaEventHandler = function(event) {
      let player = event.target;
      if (player) {
        paused = player.paused;
        emitPausedState(paused);
      }
    };

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (!players[i].paused) {
        currentPlayer = players[i];
        paused = false;
        break;
      }
    }

    window.addEventListener("playing", mediaEventHandler, true);
    window.addEventListener("pause", mediaEventHandler, true);

    return {
      get paused() { return paused; },
      play: function() { currentPlayer.play(); },
      pause: function() { currentPlayer.pause(); },
      destroy: function(reason) {
        if (reason) {
          window.removeEventListener("playing", mediaEventHandler, true);
          window.removeEventListener("pause", mediaEventHandler, true);
        }
      }
    };
  }

  function detectPseudoPlayer() {
    for (let i = 0; i < pseudoPlayers.length; i++) {
      let pseudoPlayer = pseudoPlayers[i];
      let player = null;
      if (pseudoPlayer.selector) {
        let elements = document.querySelectorAll(pseudoPlayer.selector);
        if (elements.length > 0) {
          player = pseudoPlayer.create(elements);
        }
      } else {
        if (pseudoPlayer.regex.test(window.location.href)) {
          player = pseudoPlayer.create();
        }
      }
      if (player) {
        return player;
      }
    }
    return null;
  }

  window.PseudoPlayers = {
    emitPausedState: emitPausedState,
    detectPseudoPlayer: detectPseudoPlayer
  }
})();
