//     This file is part of Play/Pause extension for Mozilla Firefox
//     https://github.com/DanielKamkha/PlayPauseFirefox
//     (c) 2015 Daniel Kamkha
//     Play/Pause is free software distributed under the terms of the MIT license.

(function() {
  "use strict";

  function startListening(worker) {
    worker.port.on("detect", function (tabHasPlayer) {
      if (tabHasPlayer) {
        // TODO: init tab listeners
      } else {
        // TODO: kill tab listeners
      }
    });
  }

  exports.main = function () {
    require("sdk/page-mod").PageMod({
      include: "*", // Match everything
      attachTo: ["existing", "top", "frame"],
      //contentStyleFile: [
      //  self.data.url("content-style.css")
      //],
      contentScriptFile: [
        self.data.url("content-script.js")
      ],
      onAttach: startListening
    });
  };
})();
