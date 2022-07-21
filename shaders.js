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

        onePixel *= pow(selfBrightness, 2.2) * distortionAmount;
        //onePixel *= .1 * distortionAmount;

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
