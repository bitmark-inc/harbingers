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

void main() {
    vec4 c = texture(uDrawTex, vTexCoord);
    outColor = c;
}`;

const blurFrag =
`#version 300 es
precision highp float;

uniform vec2 uTextureSize;
uniform vec2 mouse;
uniform vec2 prevMouse;
uniform sampler2D uUpdateTex;
uniform sampler2D uVideoTexture;
uniform float decay;
uniform int blur;

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

void main() {
    vec2 onePixel = 1.0 / uTextureSize;

    vec4 average = vec4(0.);

    float dec_x = vTexCoord.x - onePixel.x;
    float inc_x = vTexCoord.x + onePixel.x;
    float dec_y = vTexCoord.y - onePixel.y;
    float inc_y = vTexCoord.y + onePixel.y;

    float p_dec_x = (dec_x < 0.0) ? dec_x + 1.0 : dec_x;
    float p_inc_x = (inc_x > 1.0) ? inc_x - 1.0 : inc_x;
    float p_dec_y = (dec_y < 0.0) ? dec_y + 1.0 : dec_y;
    float p_inc_y = (inc_y > 1.0) ? inc_y - 1.0 : inc_y;

    average += texture(uUpdateTex, vTexCoord);

    if (blur == 1)
    {
        average += texture(uUpdateTex, vec2(p_dec_x, p_dec_y));
        average += texture(uUpdateTex, vec2(p_dec_x, vTexCoord.y));
        average += texture(uUpdateTex, vec2(p_dec_x, p_inc_y));
        average += texture(uUpdateTex, vec2(vTexCoord.x, p_dec_y));
        average += texture(uUpdateTex, vec2(vTexCoord.x, p_inc_y));
        average += texture(uUpdateTex, vec2(p_inc_x, p_dec_y));
        average += texture(uUpdateTex, vec2(p_inc_x, vTexCoord.y));
        average += texture(uUpdateTex, vec2(p_inc_x, p_inc_y));
        average /= 9.;
    }

/*
    float mouseSize = 1.;
    vec2 posInPixels = vec2(vTexCoord.x, 1.-vTexCoord.y) * uTextureSize;
    if (minimum_distance(mouse, prevMouse, posInPixels) < mouseSize)
    {
        average = vec4(1.);
    }
*/

    vec4 videoColor = texture(uVideoTexture, vec2(vTexCoord.x, 1.-vTexCoord.y));

    float newAmount = .01;//1.-pow(max(max(videoColor.x, videoColor.y), videoColor.z), 2.f);
    outState =  average * (1. - newAmount) + videoColor * newAmount;

}`;
