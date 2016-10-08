/* jshint esversion: 6 */
self.port.on('panel', (msg) => {
	document.getElementById('h1').appendChild(document.createTextNode(msg.title));
	var inputToggle = document.getElementById('inputToggle');
	var inputSmartPause = document.getElementById('inputSmartPause');
	var cboxToggle = document.getElementById('cboxToggle');
	var cboxSmartPause = document.getElementById('cboxSmartPause');

	inputToggle.select();
	inputToggle.value = msg.toggleAllTabs;
	inputSmartPause.value = msg.smartPause;

	if (msg.toggleAllTabs !== "") cboxToggle.checked = true;
	if (msg.smartPause !== "") cboxSmartPause.checked = true;

	if (!cboxToggle.checked) inputToggle.style.visibility = "hidden";
	if (!cboxSmartPause.checked) inputSmartPause.style.visibility = "hidden";

	cboxToggle.addEventListener('change', function(event) {
		if (event.target.checked) {
			inputToggle.style.visibility = "";
			inputToggle.select();
		} else {
			inputToggle.style.visibility = "hidden";
			inputToggle.value = "";
			self.port.emit("toggleAllTabs", "");
		}
	});
	cboxSmartPause.addEventListener('change', function(event) {
		if (event.target.checked) {
			inputSmartPause.style.visibility = "";
			inputSmartPause.select();
		} else {
			inputSmartPause.style.visibility = "hidden";
			inputSmartPause.value = "";
			self.port.emit("smartPause", "");
		}
	});

	var r;

	inputToggle.addEventListener('keydown', downedToggle, false);
	inputToggle.addEventListener('keyup', stop, false);
	inputToggle.addEventListener('keypress', stop, false);
	inputSmartPause.addEventListener('keydown', downedSmartPause, false);
	inputSmartPause.addEventListener('keyup', stop, false);
	inputSmartPause.addEventListener('keypress', stop, false);

	function stop(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	function listKey(e) {
		e.preventDefault();
		if (e.repeat) return;
		var str = [];

		if (e.altKey) str.push('alt');
		if (e.shiftKey) str.push('shift');
		if (e.metaKey) str.push('accel'); //meta
		if (e.ctrlKey) str.push('ctrl');
		str.push(String.fromCharCode(e.keyCode));
		return str.join('-');
	}

	function downedToggle(e) {
		r = listKey(e);
		if (r.match(/[^\x20-\x7E]+/) === null) {
			inputToggle.value = r;
			self.port.emit("toggleAllTabs", r);
		}
	}

	function downedSmartPause(e) {
		r = listKey(e);
		if (r.match(/[^\x20-\x7E]+/) === null) {
			inputSmartPause.value = r;
			self.port.emit("smartPause", r);
		}
	}
});