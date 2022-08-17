var copyVideo = false;

function setupVideo(url) {
    const video = document.createElement("video");

    var playing = false;
    var timeupdate = false;

    video.autoplay = true;
    video.muted = true;
    video.loop = true;

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

    playerBar(video)

    return video;
}

// calcDistortion returns a distortion value by max distortion and provenance length
function calcDistortion(maxDistortion, provenanceLength) {
    const MAX_PROVENANCE_LENGTH = 10
    let distortion = 0.0
    if (provenanceLength) {
        distortion = 0.1 +
            (maxDistortion - 0.1) * Math.min(provenanceLength - 1, MAX_PROVENANCE_LENGTH - 1) / (MAX_PROVENANCE_LENGTH - 1)

    }

    return distortion
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
    const pixel = new Uint8Array([0, 0, 0, 0]);
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

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

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


function main(provenanceLength) {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('No art for u!');
        return;
    }

    function setSimSize() {
        canvas.width = params.simSizeX;
        canvas.height = params.simSizeY;
    }
    setSimSize();

    params.distortionAmount = calcDistortion(params.distortionAmount, provenanceLength)

    function updateDisplaySize() {
        let strW = parseInt(params.simSizeX * params.displaySize);
        canvas.style.width = strW + "px";
        canvas.style.maxWidth = strW + "px";
        let strH = parseInt(params.simSizeY * params.displaySize);
        canvas.style.height = strH + "px";
        canvas.style.maxHeight = strH + "px";
    }
    updateDisplaySize();

    const blur = new Blur(gl, params);

    const createInitTexture = function () {
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

    const texture = initTexture(gl);
    const video = setupVideo(params.videoName);

    document.getElementById("name").innerHTML = "Name: " + params.videoName;

    const render = function () {

        if (copyVideo) {
            updateTexture(gl, texture, video);
            blur.draw(texture);
        }
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}


window.addEventListener("provenance-request-error", function (event) {
    console.log("fail to get provenance:", event.detail.error)
    main(0);
})

window.addEventListener("provenance-ready", function (event) {
    let provenanceLengthAfterSale = 0
    if (event.detail.provenances) {
        provenanceLengthAfterSale = Math.max(event.detail.provenances.length - 2, provenanceLengthAfterSale)
    }
    main(provenanceLengthAfterSale);
})
