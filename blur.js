class Blur
{
    constructor(gl, params)
    {
        this.gl = gl;
        this.params = params;

        this.gl.getExtension('EXT_color_buffer_float');
        this.gl.getExtension('OES_texture_float_linear');
        this.gl.getExtension('EXT_float_blend');

        // BLUR THING
        this.drawBlur= createGLProgram(
            this.gl,
            [
                {source: vsSource, type: this.gl.VERTEX_SHADER},
                {source: drawFrag, type: this.gl.FRAGMENT_SHADER},
            ],
            null);

        this.updateBlur= createGLProgram(
            this.gl,
            [
                {source: vsSource, type: this.gl.VERTEX_SHADER},
                {source: blurFrag, type: this.gl.FRAGMENT_SHADER},
            ],
            null);

        this.drawProgramLocations = {
            'attribute': {
                'aVertexPosition': this.gl.getAttribLocation(this.drawBlur, "aVertexPosition"),
                'aTexCoord': this.gl.getAttribLocation(this.drawBlur, "aTexCoord"),
            },
            'uniform': {
                'uDrawTex': this.gl.getUniformLocation(this.drawBlur, "uDrawTex"),
                'uTextureSize': this.gl.getUniformLocation(this.drawBlur, "uTextureSize"),
            }
        }
        this.updateProgramLocations = {
            'attribute': {
                'aVertexPosition': this.gl.getAttribLocation(this.updateBlur, "aVertexPosition"),
                'aTexCoord': this.gl.getAttribLocation(this.updateBlur, "aTexCoord"),
            },
            'uniform': {
                'uTextureSize': this.gl.getUniformLocation(this.updateBlur, "uTextureSize"),
                'mouse': this.gl.getUniformLocation(this.updateBlur, "mouse"),
                'prevMouse': this.gl.getUniformLocation(this.updateBlur, "prevMouse"),
                'uUpdateTex': this.gl.getUniformLocation(this.updateBlur, "uUpdateTex"),
                'uVideoTexture': this.gl.getUniformLocation(this.updateBlur, "uVideoTexture"),
            }
        };

        this.vao = this._initVertexArray();
        this.textures = new Array(2);
        for (let i = 0; i < this.textures.length; i++) {
            this.textures[i] = this._loadTexture(null);
        }
        this.framebuffer = this.gl.createFramebuffer();

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.clearColor(0., 0., 0., .1);
    }

    gu(program, name)
    {
        return this.gl.getUniformLocation(program, name);
    }


    blurHelper(videoTexture)
    {
        this.gl.disable(this.gl.BLEND);

        this.gl.bindVertexArray(this.vao);
        for (let i = 0; i < this.params.steps; i++) {
            this.gl.useProgram(this.updateBlur);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                this.gl.TEXTURE_2D, this.textures[1], 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
            this.gl.uniform1i(this.updateProgramLocations.uniform.uUpdateTex, 1);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, videoTexture);
            this.gl.uniform1i(this.updateProgramLocations.uniform.uVideoTexture, 2);

            this.gl.uniform2f(this.gu(this.updateBlur, "mouse"),
                this.params.mouseX, this.params.mouseY);
            this.gl.uniform2f(this.gu(this.updateBlur, "prevMouse"),
                this.params.prevMouseX, this.params.prevMouseY);
            this.gl.uniform2f(this.gu(this.updateBlur, "uTextureSize"),
                this.params.simSizeX, this.params.simSizeY);
            this.gl.uniform1f(this.gu(this.updateBlur, "decay"),
                this.params.decay);
            this.gl.uniform1i(this.gu(this.updateBlur, "blur"),
                this.params.blurFlag|0);

            this.gl.viewport(0, 0, this.params.simSizeX, this.params.simSizeY);
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

            // swap read and write textures
            this.textures = [this.textures[1], this.textures[0]];
        }
    }

    draw(videoTexture)
    {
        this.blurHelper(videoTexture);

        this.gl.useProgram(this.drawBlur);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
        this.gl.uniform1i(this.drawProgramLocations.uniform.uDrawTex, 0);

        this.gl.uniform2f(this.drawProgramLocations.uniform.uTextureSize,
            this.params.simSizeX, this.params.simSizeY);

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    setTexture(source) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.params.simSizeX, this.params.simSizeY, 0,
            this.gl.RGBA, this.gl.FLOAT, source);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    _initVertexArray() {
        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1.0,  1.0,
            -1.0, -1.0,
            1.0,  1.0,
            1.0, -1.0,
        ]), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.drawProgramLocations.attribute.aVertexPosition);
        this.gl.vertexAttribPointer(
            this.drawProgramLocations.attribute.aVertexPosition,
            2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.updateProgramLocations.attribute.aVertexPosition);
        this.gl.vertexAttribPointer(
            this.updateProgramLocations.attribute.aVertexPosition,
            2, this.gl.FLOAT, false, 0, 0);

        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            0.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0
        ]), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.drawProgramLocations.attribute.aTexCoord);
        this.gl.vertexAttribPointer(
            this.drawProgramLocations.attribute.aTexCoord,
            2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.updateProgramLocations.attribute.aTexCoord);
        this.gl.vertexAttribPointer(
            this.updateProgramLocations.attribute.aTexCoord,
            2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindVertexArray(null);
        return vao;
    }

    _loadTexture(source) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.params.simSizeX, this.params.simSizeY,
            0, this.gl.RGBA, this.gl.FLOAT, source);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        return texture;
    }
}
