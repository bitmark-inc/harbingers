var copyVideo = false;

function setupVideo(url) {
    const video = document.createElement("video");

    var playing = false;
    var timeupdate = false;

    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    // Waiting for these 2 events ensures
    // there is data in the video

    video.addEventListener(
        "playing",
        function () {
            playing = true;
            checkReady();
        },
        true
    );

    video.addEventListener(
        "timeupdate",
        function () {
            timeupdate = true;
            checkReady();
        },
        true
    );

    video.src = url;
    video.play();

    function checkReady() {
        if (playing && timeupdate) {
            copyVideo = true;
        }
    }

    return video;
}

function initTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel
    );

    // Turn off mips and set  wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

//
// copy the video texture
//
function updateTexture(gl, texture, video) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        video
    );
}

function main()
{
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('No art for u!');
        return;
    }

    // setup stats
    var showStats = false;
    var stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    stats.dom.style.display = "none";

    var fullscreen = false;
    function toggleFullscreen()
    {
        if (fullscreen)
        {
            closeFullscreen();
        }
        else
        {
            openFullscreen();
        }
        fullscreen = !fullscreen;
    }

    function displayFPS()
    {
        showStats = !showStats;
        if (showStats)
        {
            stats.dom.style.display = "block";
        }
        else
        {
            stats.dom.style.display = "none";
        }
    };

    function saveToDisk(exportObj)
    {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", params.name + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    const params = {
        'simSizeX': 500,
        'simSizeY': 500,
        'mouseX': 450.,
        'mouseY': 450.,
        'prevMouseX': 450.,
        'prevMouseY': 450.,
        'steps' : 1,
        'displaySize': 1,
        'blurFlag': true,
        displayFPS,
        toggleFullscreen,
        'name': "params"
    };

    function setSimSize()
    {
        canvas.width = params.simSizeX;
        canvas.height = params.simSizeY;
    }
    setSimSize();


    function updateDisplaySize()
    {
        let strW = parseInt(params.simSizeX * params.displaySize);
        canvas.style.width = strW + "px";
        let strH = parseInt(params.simSizeY * params.displaySize);
        canvas.style.height = strH + "px";
    }
    updateDisplaySize();

    document.onkeypress = function(event)
    {
        event = event || window.event;
        var charCode = event.keyCode || event.which;
        var charStr = String.fromCharCode(charCode);
        if (charStr == "f")
        {
            toggleFullscreen();
        }
    }

    const blur = new Blur(gl, params);

    const createInitTexture = function() {
        let uvTexture = [];
        for (let i = 0; i < params.simSizeX; i++) {
            for (let j = 0; j < params.simSizeY; j++) {
                u = 0.;
                v = 0.;
                uvTexture.push(u, v);
            }
        }
        return new Float32Array(uvTexture);
    }

    blur.setTexture(createInitTexture())

    var mouse = [];
    let canvasPosition = document.getElementById('canvas').getBoundingClientRect();
    document.addEventListener("mousemove", () => {
        params.prevMouseX = params.mouseX;
        params.prevMouseY = params.mouseY;
        params.mouseX = (event.clientX - canvasPosition.x)/params.displaySize;
        params.mouseY = (event.clientY - canvasPosition.y)/params.displaySize;
    });

    const texture = initTexture(gl);
    const video = setupVideo("test.mp4");
    const render = function() {

        stats.begin();
        if (copyVideo)
        {
            updateTexture(gl, texture, video);
        }
        blur.draw(texture);
        stats.end();
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
