const playerBar = function(video) {
	if (video) {
		var videoControls = document.getElementById('video-controls');

		video.controls = false;
		videoControls.setAttribute('data-state', 'visible');

		var playpause = document.getElementById('playpause');
		var mute = document.getElementById('mute');
		var progress = document.getElementById('progress');
		var progressBar = document.getElementById('progress-bar');
		var fullscreen = document.getElementById('fs');

		var supportsProgress = (document.createElement('progress').max !== undefined);
		if (!supportsProgress) progress.setAttribute('data-state', 'fake');

		// Check if the browser supports the Fullscreen API
		var fullScreenEnabled = !!(document.fullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled || document.webkitSupportsFullscreen || document.webkitFullscreenEnabled || video.webkitRequestFullScreen);
		if (!fullScreenEnabled) {
			fullscreen.style.display = 'none';
		}

		if (document.addEventListener) {
			// Wait for the video's meta data to be loaded, then set the progress bar's max value to the duration of the video
			video.addEventListener('loadedmetadata', function() {
				progress.setAttribute('max', video.duration);
			});

			video.addEventListener('play', function() {
				changeButtonState(video, 'playpause');
			}, false);
			video.addEventListener('pause', function() {
				changeButtonState(video, 'playpause');
			}, false);
			video.addEventListener('volumechange', function() {
				checkVolume(video);
			}, false);

			playpause.addEventListener('click', function(e) {
				if (video.paused || video.ended) video.play();
				else video.pause();
			});
			mute.addEventListener('click', function(e) {
				video.muted = !video.muted;
				changeButtonState(video, 'mute');
			});
			fs.addEventListener('click', function(e) {
				handleFullscreen();
			});

			// As the video is playing, update the progress bar
			video.addEventListener('timeupdate', function() {
				if (!progress.getAttribute('max')) progress.setAttribute('max', video.duration);
				progress.value = video.currentTime;
				progressBar.style.width = Math.floor((video.currentTime / video.duration) * 100) + '%';
        currentTime(video)
			});

			// React to the user clicking within the progress bar
			progress.addEventListener('click', function(e) {
				var pos = (e.pageX  - (this.offsetLeft + this.offsetParent.offsetLeft)) / this.offsetWidth;
				video.currentTime = pos * video.duration;
			});

			document.addEventListener('fullscreenchange', function(e) {
				setFullscreenData(!!(document.fullScreen || document.fullscreenElement));
			});
			document.addEventListener('webkitfullscreenchange', function() {
				setFullscreenData(!!document.webkitIsFullScreen);
			});
			document.addEventListener('mozfullscreenchange', function() {
				setFullscreenData(!!document.mozFullScreen);
			});
			document.addEventListener('msfullscreenchange', function() {
				setFullscreenData(!!document.msFullscreenElement);
			});
		}

		// init player bar show at the beginning
		var videoContainer = document.getElementById('container');
		videoContainer.classList.toggle("control-visible");
		setTimeout(() => {
			videoContainer.classList.toggle("control-visible");
		}, 10 * 1000);
	}
}

const currentTime = (video) => {
	let currentMinutes = Math.floor(video.currentTime / 60)
	let currentSeconds = Math.floor(video.currentTime - currentMinutes * 60)
	let durationMinutes = Math.floor(video.duration / 60)
	let durationSeconds = Math.floor(video.duration - durationMinutes * 60)

  const currentTimeElement = document.querySelector('.current')
	const durationTimeElement = document.querySelector('.duration')
	currentTimeElement.innerHTML = `${currentMinutes}:${currentSeconds < 10 ? '0'+currentSeconds : currentSeconds}`
	durationTimeElement.innerHTML = `${durationMinutes}:${durationSeconds}`
}

function changeButtonState(video, type) {
	if (type == 'playpause') {
		if (video.paused || video.ended) {
			playpause.setAttribute('data-state', 'play');
		}
		else {
			playpause.setAttribute('data-state', 'pause');
		}
	}
	else if (type == 'mute') {
		mute.setAttribute('data-state', video.muted ? 'unmute' : 'mute');
	}
}

// Check the volume
function checkVolume(video, dir) {
	if (dir) {
		var currentVolume = Math.floor(video.volume * 10) / 10;
		if (dir === '+') {
			if (currentVolume < 1) video.volume += 0.1;
		}
		else if (dir === '-') {
			if (currentVolume > 0) video.volume -= 0.1;
		}
		// If the volume has been turned off, also set it as muted
		// Note: can only do this with the custom control set as when the 'volumechange' event is raised, there is no way to know if it was via a volume or a mute change
		if (currentVolume <= 0) video.muted = true;
		else video.muted = false;
	}
	changeButtonState(video, 'mute');
}

function setFullscreenData(state) {
	var videoContainer = document.getElementById('container');
	var fullscreen = document.getElementById('fs');
	videoContainer.setAttribute('data-fullscreen', !!state);
	fullscreen.setAttribute('data-state', !!state ? 'cancel-fullscreen' : 'go-fullscreen');
}

// Checks if the document is currently in fullscreen mode
function isFullScreen() {
	return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
}

// Fullscreen
function handleFullscreen() {
	// If fullscreen mode is active...	
	if (isFullScreen()) {
		// ...exit fullscreen mode
		if (document.exitFullscreen) document.exitFullscreen();
		else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
		else if (document.msExitFullscreen) document.msExitFullscreen();
		setFullscreenData(false);
	} else {
		var videoContainer = document.getElementById('container');
		fullScreenRequest(videoContainer)
		setFullscreenData(true);
	}
}

function fullScreenRequest(el) {
	if (el.requestFullscreen) {
		el.requestFullscreen();
	} else if (el.webkitRequestFullscreen) {
		el.webkitRequestFullscreen();
	} else if (el.mozRequestFullscreen) {
		el.mozRequestFullscreen();
	} else if (el.msRequestFullscreen) {
		el.msRequestFullscreen();
	}
}
