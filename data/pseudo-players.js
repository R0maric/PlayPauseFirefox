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
    { // SoundCloud on-site
      regex: /.*soundcloud\.com.*/,
      selector: "button.playControl",
      create: createSoundCloudPseudoPlayer
    },
    {  // YouTube HTML5
      selector: ".ytp-button-play, .ytp-button-pause",
      create: createSingleButtonPseudoPlayer
    },
    {  // YouTube Flash
      selector: "object, embed",
      create: createYoutubeFlashPseudoPlayer
    },
    {  // Bandcamp
      selector: "a.play-btn, div.playbutton, span.item_link_play",
      create: createSingleButtonPseudoPlayer
    },
    { // SoundCloud embedded
      selector: "button.playButton",
      create: createSoundCloudPseudoPlayer
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

  function createSingleButtonPseudoPlayer(win, selector) {
    let buttons = win.document.querySelectorAll(selector);
    if (buttons.length == 0) {
      return null;
    }
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

    let media = win.document.querySelectorAll(mediaSelector);
    if (buttons.length == 1) { // just one player on the page? if playing, update the state
      if (media.length == 1 && !media[0].paused) {
        paused = false;
      }
    } else { // multiple players on the page? if playing, unset the state; it will update on next click event
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

    win.addEventListener("playing", mediaEventHandler, true);
    win.addEventListener("pause", mediaEventHandler, true);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { currentButton.click(); },
      pause: function() { currentButton.click(); },
      destroy: function(reason) {
        if (reason) {
          win.removeEventListener("playing", mediaEventHandler, true);
          win.removeEventListener("pause", mediaEventHandler, true);
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

  function createPandoraPseudoPlayer(win) {
    let paused = true;
    let playButton = win.document.querySelector(".playButton");
    let pauseButton = win.document.querySelector(".pauseButton");
    if (!playButton || !pauseButton) {
      return null;
    }

    let observer = new MutationObserver(function() {
      paused = (playButton.style.display != "none");
      emitPausedState(paused);
    });
    observer.observe(playButton, { attributes: true, attributeFilter: ["style"] });

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { playButton.click(); },
      pause: function() { pauseButton.click(); },
      destroy: function() { observer.disconnect(); }
    }
  }

  function createYoutubeFlashPseudoPlayer(win, selector) {
    const youtubeRegex = /.*\.youtube\.com.*/;
    let flash = win.document.querySelectorAll(selector);
    if (flash.length == 0) {
      return null;
    }
    let players = [];
    for (let i = 0; i < flash.length; i++) {
      let sourceUrl = flash[i].tagName == "OBJECT" ? flash[i].data : flash[i].src;
      if (sourceUrl && youtubeRegex.test(sourceUrl) && flash[i].wrappedJSObject) {
        players.push(flash[i].wrappedJSObject);
      }
    }
    if (players.length == 0) {
      return null;
    }

    let paused = null;
    let currentPlayer = players[0];

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (players[i].getPlayerState) {
        paused = true;
        if (players[i].getPlayerState() == 1) {
          currentPlayer = players[i];
          paused = false;
          break;
        }
      }
    }

    // "onStateChange" either isn't fired or fails to reach our code; thus, a workaround
    function stateChangeHandler() {
      let newState = (currentPlayer.getPlayerState() != 1);
      if (newState != paused) {
        paused = newState;
        emitPausedState(paused);
      }
    }
    let timer = win.setInterval(stateChangeHandler, 500);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { currentPlayer.playVideo(); },
      pause: function() { currentPlayer.pauseVideo(); },
      destroy: function(reason) {
        if (reason) {
          win.clearInterval(timer);
        }
      }
    };
  }

  function createSoundCloudPseudoPlayer(win, selector) {
    let paused = true;
    let button = win.document.querySelector(selector);
    if (!button) {
      return null;
    }

    if (button.className.indexOf("disabled") != -1) {
      paused = null;
    }

    let observer = new MutationObserver(function() {
      paused = (button.className.indexOf("playing") == -1);
      emitPausedState(paused);
    });
    observer.observe(button, { attributes: true, attributeFilter: ["class"] });

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { button.click(); },
      pause: function() { button.click(); },
      destroy: function() { observer.disconnect(); }
    }
  }

  function createGenericPseudoPlayer(win, selector) {
    let players = win.document.querySelectorAll(selector);
    if (players.length == 0) {
      return null;
    }
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

    win.addEventListener("playing", mediaEventHandler, true);
    win.addEventListener("pause", mediaEventHandler, true);

    //noinspection JSUnusedGlobalSymbols
    return {
      get paused() { return paused; },
      play: function() { currentPlayer.play(); },
      pause: function() { currentPlayer.pause(); },
      destroy: function(reason) {
        if (reason) {
          win.removeEventListener("playing", mediaEventHandler, true);
          win.removeEventListener("pause", mediaEventHandler, true);
        }
      }
    };
  }

  function detectPseudoPlayer(win) {
    // Test for win.document access, fail gracefully for unexpected iframes
    try {
      //noinspection JSUnusedLocalSymbols
      let dummy = win.document;
    } catch (exception) {
      if (exception.message.toLowerCase().indexOf('permission denied') !== -1) {
        return null;
      } else {
        throw exception;
      }
    }

    for (let i = 0; i < pseudoPlayers.length; i++) {
      let pseudoPlayer = pseudoPlayers[i];
      let player = null;
      if (!pseudoPlayer.regex || pseudoPlayer.regex.test(window.location.href)) {
        player = pseudoPlayer.create(win, pseudoPlayer.selector);
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
