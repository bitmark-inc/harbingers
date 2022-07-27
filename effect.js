const passthroughFrag =
`#version 300 es
precision highp float;
in float v_Age;
void main() { discard; }`;

const vsSource =
`#version 300 es
in vec4 aVertexPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
    gl_Position = aVertexPosition;
    vTexCoord = aTexCoord;
}`;

const drawFrag =
`#version 300 es
precision highp float;

in vec2 vTexCoord;
uniform vec2 uTextureSize;
out vec4 outColor;

uniform sampler2D uDrawTex;
uniform sampler2D uVideoTex;

uniform float distortionAmount;
uniform float style;
uniform int frameNum;

float maxComponent(vec3 c)
{
    return max(max(c.x, c.y), c.z);
}
float avgComponent(vec4 c)
{
    return maxComponent(c.xyz);
}

// Black Box From https://github.com/armory3d/armory/blob/master/Shaders/std/tonemap.glsl
vec4 acesFilm(const vec4 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return vec4(clamp((x.xyz * (a * x.xyz + b)) / (x.xyz * (c * x.xyz + d ) + e), 0.0, 1.0), 1.);
}

// Noise From http://www.science-and-fiction.org/rendering/noise.html
float rand2D(in vec2 co)
{
    return fract(sin(dot(co.xy, vec2((0.5 * (12.9898 + float(frameNum))), 78.233))) * 43758.5453);
}

void main()
{
    vec4 blurCol = texture(uDrawTex, vTexCoord);
    vec2 flippedCoords = vec2(vTexCoord.x, 1.-vTexCoord.y);
    vec4 videoCol = texture(uVideoTex, flippedCoords);

    vec2 onePixel = mix(3., 100.*rand2D(vTexCoord), pow(style, 8.)) / uTextureSize;

    vec2 gradient = vec2(
        avgComponent(texture(uDrawTex, vTexCoord + vec2(onePixel.x, 0.))) - avgComponent(texture(uDrawTex, vTexCoord - vec2(onePixel.x, 0.))),
        avgComponent(texture(uDrawTex, vTexCoord + vec2(0., onePixel.y)))- avgComponent(texture(uDrawTex, vTexCoord - vec2(0., onePixel.y))));

    blurCol.xyz *= clamp(pow(mix(1., clamp(1. - pow(length(gradient), .4), 0., 1.), mix(pow(distortionAmount*1.4, 4.2), distortionAmount, style)), .5), .1, 1.);
    outColor = vec4(blurCol.xyz, 1.);


}`;

const blurFrag =
`#version 300 es
precision highp float;

uniform vec2 uTextureSize;
uniform vec2 mouse;
uniform vec2 prevMouse;
uniform sampler2D uUpdateTex;
uniform sampler2D uVideoTex;
uniform float decay;
uniform int blur;
uniform int frameNum;

uniform float distortionAmount;
uniform float style;

in vec2 vTexCoord;
out vec4 outState;

float minimum_distance(vec2 v, vec2 w, vec2 p) {
  // Return minimum distance between line segment vw and point p
  float l2 = pow(distance(v, w), 2.);  // i.e. |w-v|^2 -  avoid a sqrt
  if (l2 == 0.0) return distance(p, v);   // v == w case
  float t = max(0., min(1., dot(p - v, w - v) / l2));
  vec2 projection = v + t * (w - v);
  return distance(p, projection);
}

float maxComponent(vec3 c)
{
    return max(max(c.x, c.y), c.z);
}

float avgComponent(vec3 c)
{
    return (c.x + c.y + c.z) / 3.;
}

float avgComponent(vec4 c)
{
    return maxComponent(c.xyz);
}

// Noise From http://www.science-and-fiction.org/rendering/noise.html
float rand2D(in vec2 co)
{
    return fract(sin(dot(co.xy, vec2((0.5 * (12.9898 + float(frameNum))), 78.233))) * 43758.5453);
}


void main() {
    vec2 onePixel = 1.0 / uTextureSize;

    vec4 selfCol = texture(uUpdateTex, vTexCoord);
    outState = selfCol;

    float selfBrightness = avgComponent(selfCol.xyz);

    float r = rand2D(vTexCoord);

    if (blur == 1)
    {
        vec4 average = selfCol;

        //onePixel *= pow(selfBrightness, 2.2) * distortionAmount;

        float dec_x = vTexCoord.x - onePixel.x;
        float inc_x = vTexCoord.x + onePixel.x;
        float dec_y = vTexCoord.y - onePixel.y;
        float inc_y = vTexCoord.y + onePixel.y;

        float p_dec_x = (dec_x < 0.0) ? dec_x + 1.0 : dec_x;
        float p_inc_x = (inc_x > 1.0) ? inc_x - 1.0 : inc_x;
        float p_dec_y = (dec_y < 0.0) ? dec_y + 1.0 : dec_y;
        float p_inc_y = (inc_y > 1.0) ? inc_y - 1.0 : inc_y;

        average += texture(uUpdateTex, vec2(p_dec_x, p_dec_y));
        average += texture(uUpdateTex, vec2(p_dec_x, vTexCoord.y));
        average += texture(uUpdateTex, vec2(p_dec_x, p_inc_y));
        average += texture(uUpdateTex, vec2(vTexCoord.x, p_dec_y));
        average += texture(uUpdateTex, vec2(vTexCoord.x, p_inc_y));
        average += texture(uUpdateTex, vec2(p_inc_x, p_dec_y));
        average += texture(uUpdateTex, vec2(p_inc_x, vTexCoord.y));
        average += texture(uUpdateTex, vec2(p_inc_x, p_inc_y));
        average /= 9.;

        float mouseSize = 1.;
        vec2 posInPixels = vec2(vTexCoord.x, 1.-vTexCoord.y) * uTextureSize;
        if (minimum_distance(mouse, prevMouse, posInPixels) < mouseSize)
        {
            average = vec4(1.);
        }

        vec4 videoColor = texture(uVideoTex, vec2(vTexCoord.x, 1.-vTexCoord.y));

        float newAmount = mix(1.0, 0.001, clamp(distortionAmount, 0., 1.));
        vec4 blurColor =  average * (1. - newAmount) + videoColor * newAmount;
        outState = vec4(blurColor.xyz, average.w);
        //outState = max(blurColor, videoColor);
        outState.w = average.w;
        //outState = vec4(selfCol.xyz, average.w);
        //outState = vec4(average.xyz, selfCol.w);
        //outState = average;
    }
    else
    {
        onePixel *= r * mix(0.05, 200.*r, pow(style, 10.0)) * distortionAmount;
        vec2 gradient = vec2(
            avgComponent(texture(uUpdateTex, vTexCoord + vec2(onePixel.x, 0.))) - avgComponent(texture(uUpdateTex, vTexCoord - vec2(onePixel.x, 0.))),
            avgComponent(texture(uUpdateTex, vTexCoord + vec2(0., onePixel.y)))- avgComponent(texture(uUpdateTex, vTexCoord - vec2(0., onePixel.y))));

        selfCol = texture(uUpdateTex, vTexCoord + gradient);
        vec4 outCol = selfCol;
        outCol.xyz = pow(outCol.xyz, vec3(1.0001));
        outCol.w -= selfCol.w - avgComponent(selfCol.xyz) * 0.1;
        outState = clamp(outCol, vec4(0.), vec4(1.));
    }

}`;
function createShader(gl, type, source)
{
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert('failed to compile a shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createGLProgram(gl, shader_list, transform_feedback_varyings)
{
    var program = gl.createProgram();
    for (var i = 0; i < shader_list.length; i++)
    {
        var shader_info = shader_list[i];
        var shader = createShader(gl, shader_info.type, shader_info.source);
        gl.attachShader(program, shader);
    }

    if (transform_feedback_varyings != null)
    {
        gl.transformFeedbackVaryings(program,
            transform_feedback_varyings,
            gl.INTERLEAVED_ATTRIBS);
    }
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        alert('failed to initialize a shader program: ' + gl.getProgramInfoLog(program));
        this.gl.deleteProgram(program);
        return null;
    }
    return program;
}
class Blur
{
    constructor(gl, params)
    {
        this.gl = gl;
        this.params = params;

        this.gl.getExtension('EXT_color_buffer_float');
        this.gl.getExtension('OES_texture_float_linear');
        this.gl.getExtension('EXT_float_blend');

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
                'uVideoTex': this.gl.getUniformLocation(this.drawBlur, "uVideoTex"),
                'uTextureSize': this.gl.getUniformLocation(this.drawBlur, "uTextureSize"),
                'distortionAmount': this.gl.getUniformLocation(this.drawBlur, "distortionAmount"),
                'style': this.gl.getUniformLocation(this.drawBlur, "style"),
                'frameNum': this.gl.getUniformLocation(this.drawBlur, "frameNum"),
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
                'frameNum': this.gl.getUniformLocation(this.updateBlur, "frameNum"),
                'prevMouse': this.gl.getUniformLocation(this.updateBlur, "prevMouse"),
                'uUpdateTex': this.gl.getUniformLocation(this.updateBlur, "uUpdateTex"),
                'uVideoTex': this.gl.getUniformLocation(this.updateBlur, "uVideoTex"),
                'distortionAmount': this.gl.getUniformLocation(this.updateBlur, "distortionAmount"),
                'style': this.gl.getUniformLocation(this.updateBlur, "style"),
            }
        };

        this.vao = this._initVertexArray();
        this.textures = new Array(2);
        const randArray = this._randomData(params.simSizeX * params.simSizeY * 4);
        for (let i = 0; i < this.textures.length; i++) {
            this.textures[i] = this._loadTexture(randArray);
        }
        this.framebuffer = this.gl.createFramebuffer();

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.clearColor(0., 0., 0., .1);

        this.frameNum = 0;
    }

    gu(program, name)
    {
        return this.gl.getUniformLocation(program, name);
    }

    blurHelper(videoTexture)
    {

        for (let i = 0; i < 2; ++i)
        {

        this.gl.disable(this.gl.BLEND);

        this.gl.bindVertexArray(this.vao);
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
        this.gl.uniform1i(this.updateProgramLocations.uniform.uVideoTex, 2);

        this.gl.uniform1i(this.updateProgramLocations.frameNum, this.frameNum);
        this.gl.uniform2f(this.gu(this.updateBlur, "mouse"),
            this.params.mouseX, this.params.mouseY);
        this.gl.uniform2f(this.gu(this.updateBlur, "prevMouse"),
            this.params.prevMouseX, this.params.prevMouseY);
        this.gl.uniform2f(this.gu(this.updateBlur, "uTextureSize"),
            this.params.simSizeX, this.params.simSizeY);
        this.gl.uniform1f(this.gu(this.updateBlur, "decay"),
            this.params.decay);
        this.gl.uniform1i(this.gu(this.updateBlur, "blur"),
            i);
        this.gl.uniform1f(this.gu(this.updateBlur, "distortionAmount"),
            this.params.distortionAmount);
        this.gl.uniform1f(this.gu(this.updateBlur, "style"),
            this.params.style);

        this.gl.viewport(0, 0, this.params.simSizeX, this.params.simSizeY);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // swap read and write textures
        this.textures = [this.textures[1], this.textures[0]];
        this.frameNum++;
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
        this.gl.uniform1f(this.drawProgramLocations.uniform.distortionAmount, this.params.distortionAmount);
        this.gl.uniform1f(this.drawProgramLocations.uniform.style, this.params.style);
        this.gl.uniform1i(this.drawProgramLocations.uniform.frameNum, this.frameNum);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, videoTexture);
        this.gl.uniform1i(this.drawProgramLocations.uniform.uVideoTex, 1);

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

    _randomData(arrayLength)
    {
        var d = [];
        for (var i = 0; i < arrayLength; ++i)
        {
            d.push(Math.random());
        }
        return new Float32Array(d);
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
