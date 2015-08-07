//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  const mediaSelector = "audio, video";

  const generalPlayers = [
    { // Pandora
      regex: /.*\.pandora\.com.*/,
      playButtonSelector: ".playButton",
      pauseButtonSelector: ".pauseButton",
      create: createTwoButtonPseudoPlayer
    },
    { // SoundCloud on-site
      regex: /.*soundcloud\.com.*/,
      selector: "button.playControl",
      create: createSingleButtonPseudoPlayer
    },
    { // Hype Machine
      regex: /.*hypem\.com.*/,
      selector: "#playerPlay",
      playingClass: "pause",
      create: createSingleButtonPseudoPlayer
    },
    { // Amazon Music
      regex: /.*amazon\..*/,
      selector: ".acs-mp3-play, .acs-mp3-pause, div.sample-button",
      create: createHtml5PseudoPlayer
    },
    { // AllMusic
      regex: /.*allmusic\.com.*/,
      selector: "a.audio-player",
      create: createSingleButtonPseudoPlayer
    },
    { // Rdio
      regex: /.*rdio\.com.*/,
      selector: "button.play_pause",
      waitForButton: true,
      create: createSingleButtonPseudoPlayer
    },
    { // 8tracks
      regex: /.*8tracks\.com.*/,
      playButtonSelector: "#player_play_button",
      pauseButtonSelector: "#player_pause_button",
      waitForButton: true,
      create: createTwoButtonPseudoPlayer
    },
    {  // Bandcamp
      selector: "a.play-btn, div.playbutton, span.item_link_play",
      create: createHtml5PseudoPlayer
    }
  ];

  const nonEmbedPlayers = [
    {  // YouTube HTML5 on-site (or on Last.fm, or on Songza)
      regex: /.*(youtube\.com|last\.fm|songza\.com).*/,
      selector: ".ytp-play-button",
      create: createHtml5PseudoPlayer
    },
    {  // YouTube Flash on-site (or on Last.fm)
      regex: /.*(youtube\.com|last\.fm).*/,
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: createFlashDirectAccessPseudoPlayer
    },
    {  // Twitch.tv on-site
      regex: /.*twitch\.tv.*/,
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      create: createFlashDirectAccessPseudoPlayer
    }
  ];

  const embedPlayers = [
    {  // YouTube HTML5
      selector: ".ytp-play-button",
      create: createHtml5PseudoPlayer
    },
    {  // YouTube Flash
      selector: "object, embed",
      srcRegex: /.*\.youtube\.com.*/,
      stateGetterName: "getPlayerState",
      playStateValue: 1,
      create: createFlashDirectAccessPseudoPlayer
    },
    {  // Twitch.tv
      selector: "object, embed",
      srcRegex: /.*TwitchPlayer\.swf.*/,
      stateGetterName: "isPaused",
      playStateValue: false,
      create: createFlashDirectAccessPseudoPlayer
    },
    { // SoundCloud embedded
      selector: "button.playButton",
      create: createSingleButtonPseudoPlayer
    },
    {  // Generic catch-all HTML5 media
      selector: mediaSelector,
      create: ButtonlessHtml5Player
    }
  ];

  function emitStateChanged(id) {
    self.port.emit("stateChanged", id);
  }

  function ButtonlessHtml5Player(id, win, selector) {
    let players = win.document.querySelectorAll(selector);

    this._win = win;
    this._paused = true;
    this._currentPlayer = players[0];

    let that = this;
    Object.defineProperty(this, "paused", { get: function() { return that._paused; } } );

    this._mediaEventHandler = function(event) {
      let player = event.target;
      if (player) {
        that._paused = player.paused;
        emitStateChanged(id);
        if (!that._paused) {
          that._currentPlayer = player;
        }
      }
    };

    win.addEventListener("playing", this._mediaEventHandler, true);
    win.addEventListener("pause", this._mediaEventHandler, true);

    // if one of the media is playing, make it the current player
    for (let i = 0; i < players.length; i++) {
      if (!players[i].paused) {
        this._currentPlayer = players[i];
        this._paused = false;
        break;
      }
    }
  }
  ButtonlessHtml5Player.preCondition = (win, selector) => !!win.document.querySelector(selector);
  ButtonlessHtml5Player.prototype.play = function() { this._currentPlayer.play(); };
  ButtonlessHtml5Player.prototype.pause = function() { this._currentPlayer.pause(); };
  ButtonlessHtml5Player.prototype.destroy = function(reason) {
    if (reason) {
      this._win.removeEventListener("playing", this._mediaEventHandler, true);
      this._win.removeEventListener("pause", this._mediaEventHandler, true);
    }
  };

  function createHtml5PseudoPlayer(id, win, selector) {
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
        emitStateChanged(id);
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

    return {
      get paused() { return paused; },
      play: function() { if (this.paused) { currentButton.click(); } },
      pause: function() { if (!this.paused) { currentButton.click(); } },
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

  //noinspection JSUnusedLocalSymbols
  function createTwoButtonPseudoPlayer(id, win, selector, playerData) {
    let waitForButton = false;
    let playButton = win.document.querySelector(playerData.playButtonSelector);
    let pauseButton = win.document.querySelector(playerData.pauseButtonSelector);
    if (!playButton || !pauseButton) {
      if (playerData.waitForButton) {
        waitForButton = true;
      } else {
        return null;
      }
    }
    let observer = null;

    function initButtonObserver() {
      observer = new MutationObserver(() => { emitStateChanged(id); });
      observer.observe(playButton, {attributes: true, attributeFilter: ["style"]});
    }

    if (waitForButton) {
      PseudoPlayers.waitForElementPromise(playerData.playButtonSelector, win.document.body)
        .then(function(buttonElem) {
          playButton = buttonElem;
          pauseButton = playButton.parentNode.querySelector(playerData.pauseButtonSelector);
          initButtonObserver();
          emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }

    return {
      get paused() { return playButton ? (playButton.style.display != "none") : null; },
      play: function() { if (this.paused) { playButton.click(); } },
      pause: function() { if (!this.paused) { pauseButton.click(); } },
      destroy: function() { if (observer) { observer.disconnect(); } }
    }
  }

  function createFlashDirectAccessPseudoPlayer(id, win, selector, playerData) {
    let flash = win.document.querySelectorAll(selector);
    if (flash.length == 0) {
      return null;
    }

    const srcRegex = playerData.srcRegex;
    const stateGetterName = playerData.stateGetterName;
    const playStateValue = playerData.playStateValue;

    let players = [];
    for (let i = 0; i < flash.length; i++) {
      let sourceUrl = flash[i].tagName == "OBJECT" ? flash[i].data : flash[i].src;
      if (sourceUrl && srcRegex.test(sourceUrl) && flash[i].wrappedJSObject) {
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
      if (players[i][stateGetterName]) {
        paused = true;
        if (players[i][stateGetterName]() == playStateValue) {
          currentPlayer = players[i];
          paused = false;
          break;
        }
      }
    }

    // "onStateChange" either isn't fired or fails to reach our code; thus, a workaround
    function stateChangeHandler() {
      if (currentPlayer[stateGetterName]) {
        let newState = (currentPlayer[stateGetterName]() != playStateValue);
        if (newState != paused) {
          paused = newState;
          emitStateChanged(id);
        }
      }
    }
    let timer = win.setInterval(stateChangeHandler, 500);

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

  function createSingleButtonPseudoPlayer(id, win, selector, playerData) {
    let waitForButton = false;
    let button = win.document.querySelector(selector);
    if (!button) {
      if (playerData.waitForButton) {
        waitForButton = true;
      } else {
        return null;
      }
    }
    let observer = null;
    let playingClass = playerData.playingClass || "playing";

    function initButtonObserver() {
      observer = new MutationObserver(() => { emitStateChanged(id); });
      observer.observe(button, {attributes: true, attributeFilter: ["class"]});
    }

    if (waitForButton) {
      PseudoPlayers.waitForElementPromise(selector, win.document.body)
        .then(function(buttonElem) {
          button = buttonElem;
          initButtonObserver();
          emitStateChanged(id);
        }
      );
    } else {
      initButtonObserver();
    }

    return {
      get paused() {
        return (button && button.className.indexOf("disabled") == -1) ?
          (button.className.indexOf(playingClass) == -1) :
          null;
      },
      play: function() { if (this.paused) { button.click(); } },
      pause: function() { if (!this.paused) { button.click(); } },
      destroy: function() { if (observer) { observer.disconnect(); } }
    }
  }

  function detectPseudoPlayer(id, win) {
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

    let pseudoPlayers = generalPlayers.concat(window.PseudoPlayers.options.doEmbeds ? embedPlayers : nonEmbedPlayers);
    for (let i = 0; i < pseudoPlayers.length; i++) {
      let playerData = pseudoPlayers[i];
      let player = null;
      if (!playerData.regex || playerData.regex.test(win.location.href)) {
        let preCondition = playerData.create.preCondition;
        if (preCondition) {
          player = preCondition(win, playerData.selector) ?
            new playerData.create(id, win, playerData.selector, playerData) :
            null;
        } else {
          player = playerData.create(id, win, playerData.selector, playerData);
        }
      }
      if (player) {
        return player;
      }
    }
    return null;
  }

  window.PseudoPlayers = window.PseudoPlayers || {};
  window.PseudoPlayers.options = {};
  window.PseudoPlayers.detectPseudoPlayer = detectPseudoPlayer;
})();
