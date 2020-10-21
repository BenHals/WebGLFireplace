// Adapted from webgl2fundamentals.org
let wind = -0.0;
let falloff = 0.1;
let time_scale = 0.005;
let x_scale = 0.5;
let fps = 50;
let pixel_size = 50;
let last_frame = undefined;

let canvas = undefined;
let gl = undefined;

let controlSize = "mid";

let program_copy = undefined;
let locations_copy = new Map();
let vao_copy= undefined;
let program_create = undefined;
let locations_create = new Map();
let vao_create = undefined;
let tex_height = undefined;
let tex_width = undefined;
let texture_a = undefined;
let texture_b = undefined;
let fbo_a = undefined;
let fbo_b = undefined;
let count = 0;
let vertexShaderSourceCreate = `#version 300 es
    
in vec4 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {

gl_Position = a_position;
v_texCoord = a_texCoord;
}
`;
let fragmentShaderSourceCreate = `#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;

uniform sampler2D u_image;

uniform float t;

uniform float falloff;

uniform float wind;
uniform float time_scale;
uniform float x_scale;

out vec4 outColor;

float rand(float n){return fract(sin(n) * 43758.5453123);}
// Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }
float noise(vec3 P) {
    vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.0));
    vec3 f0 = fract(P), f1 = f0 - vec3(1.0), f = fade(f0);
    vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x), iy = vec4(i0.yy, i1.yy);
    vec4 iz0 = i0.zzzz, iz1 = i1.zzzz;
    vec4 ixy = permute(permute(ix) + iy), ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0), gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    vec4 gx1 = ixy1 * (1.0 / 7.0), gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0); gx1 = fract(gx1);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0), sz0 = step(gz0, vec4(0.0));
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1), sz1 = step(gz1, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g0 = vec3(gx0.x,gy0.x,gz0.x), g1 = vec3(gx0.y,gy0.y,gz0.y),
        g2 = vec3(gx0.z,gy0.z,gz0.z), g3 = vec3(gx0.w,gy0.w,gz0.w),
        g4 = vec3(gx1.x,gy1.x,gz1.x), g5 = vec3(gx1.y,gy1.y,gz1.y),
        g6 = vec3(gx1.z,gy1.z,gz1.z), g7 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g0,g0), dot(g2,g2), dot(g1,g1), dot(g3,g3)));
    vec4 norm1 = taylorInvSqrt(vec4(dot(g4,g4), dot(g6,g6), dot(g5,g5), dot(g7,g7)));
    g0 *= norm0.x; g2 *= norm0.y; g1 *= norm0.z; g3 *= norm0.w;
    g4 *= norm1.x; g6 *= norm1.y; g5 *= norm1.z; g7 *= norm1.w;
    vec4 nz = mix(vec4(dot(g0, vec3(f0.x, f0.y, f0.z)), dot(g1, vec3(f1.x, f0.y, f0.z)),
        dot(g2, vec3(f0.x, f1.y, f0.z)), dot(g3, vec3(f1.x, f1.y, f0.z))),
        vec4(dot(g4, vec3(f0.x, f0.y, f1.z)), dot(g5, vec3(f1.x, f0.y, f1.z)),
            dot(g6, vec3(f0.x, f1.y, f1.z)), dot(g7, vec3(f1.x, f1.y, f1.z))), f.z);
    return 2.2 * mix(mix(nz.x,nz.z,f.y), mix(nz.y,nz.w,f.y), f.x);
}
float noise(vec2 P) { return noise(vec3(P, 0.0)); }
// float noise(vec2 P) {return rand(P.x*P.y);}
void main() {
    vec4 texCol = texture(u_image, v_texCoord);
    vec4 oC;
    float x_cell = floor(v_texCoord.x * u_resolution.x);
    // float time_scale = 0.01;
    // float x_scale = 0.07;
    if(floor(v_texCoord.y * u_resolution.y) == 0.0){
        // oC = vec4(0.5 + 0.5*rand(t+floor(v_texCoord.x * u_resolution.x)), 0, 0, 1);
        oC = vec4(mix(1.0, noise(vec2(t*time_scale, x_cell*x_scale)), 0.3), 0, 0, 1);
    } else {
        // float flux = rand(t+floor(v_texCoord.x * u_resolution.x));
        float flux = fract(noise(vec2(t*time_scale, x_cell*x_scale)));
        float flux_mag = noise(vec2(t*time_scale, x_cell*x_scale))*3.0;
        // float flux_mag = rand(t+floor(v_texCoord.x * u_resolution.x + 1.0)) * 3.0;
        // float flux = 1.0;
        vec4 below_l_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind-(1.0 * flux_mag))*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
        vec4 below_m_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind)*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
        vec4 below_r_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind+(1.0 * flux_mag))*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
        // vec4 below_tex_less = texture(u_image, vec2(fract(v_texCoord.x - ((wind-1.0)*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
        vec4 last_col = below_m_tex;
        if(flux < 0.2){
            last_col = mix(last_col, below_l_tex, (0.2-flux)/0.2);
        }else if (flux > 0.8){
            last_col = mix(last_col, below_r_tex, (flux-0.8)/0.2);
        }
        // vec4 last_col = mix(below_tex, below_tex_less, 0.7);
        // vec4 last_col = mix(below_l_tex, below_r_tex, 0.5);
        // last_col = mix(last_col, below_m_tex, 0.3);

        oC = mix(last_col, vec4(0, 0, 0, 1), mix(falloff, flux*-1.0, 0.0));
    }
    outColor = oC;
}
`;
let vertexShaderSourceCopy = `#version 300 es

in vec4 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {

gl_Position = a_position;
v_texCoord = a_texCoord;
}
`;

let fragmentShaderSourceCopy = `#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;

uniform sampler2D u_image;

out vec4 outColor;

vec3 FIRE_COLORS[15] = vec3[](vec3(0.0, 0.0, 0.0),
vec3(0.160, 0.054, 0.003),
vec3(0.278, 0.070, 0.015),
vec3(0.403, 0.070, 0.023),
vec3(0.529, 0.066, 0.023),
vec3(0.662, 0.050, 0.019),
vec3(0.8, 0.023, 0.011),
vec3(0.929, 0.003, 0.003),
vec3(1, 0.239, 0.003),
vec3(1, 0.435, 0.098),
vec3(1, 0.572, 0.215),
vec3(1, 0.694, 0.356),
vec3(1, 0.8, 0.513),
vec3(1, 0.901, 0.690),
vec3(1.0, 1.0, 0.878));

void main() {
vec4 texCol = texture(u_image, v_texCoord);
// outColor = vec4(texCol.xyzw);
float col_prop = texture(u_image, v_texCoord).x * 30.0;
if (col_prop > 30.0){
    outColor = vec4(1, 1, 1, 1);
}else{
    int col_index = int(floor(col_prop));
    int col_index_up = int(ceil(col_prop));
    float mix_prop = col_prop - floor(col_prop);
    outColor = mix(vec4(FIRE_COLORS[col_index], 1.0), vec4(FIRE_COLORS[col_index_up], 1.0), mix_prop);
}
// outColor = vec4(texCol.xyzw);
}
`;

function setupInput(){
    var falloffSlider = document.getElementById("falloffSlider");
    falloffSlider.oninput = function(){
        falloff = falloffSlider.value;
    }
    var windSlider = document.getElementById("windSlider");
    windSlider.oninput = function(){
        wind = windSlider.value;
    }
    var flareScaleSlider = document.getElementById("flareScaleSlider");
    flareScaleSlider.oninput = function(){
        x_scale = flareScaleSlider.value;
    }
    var timeScaleSlider = document.getElementById("timeScaleSlider");
    timeScaleSlider.oninput = function(){
        time_scale = timeScaleSlider.value;
    }
    var fpsSlider = document.getElementById("fpsSlider");
    fpsSlider.oninput = function(){
        fps = fpsSlider.value;
    }
    var pixel_sizeSlider = document.getElementById("pixelSizeSlider");
    pixel_sizeSlider.oninput = function(){
        pixel_size = pixel_sizeSlider.value;
        setupPrograms(pixel_size);
    }

    var maxButton = document.getElementById("maximizer");
    maxButton.onclick = function(){
        let controls = document.getElementById("controls");
        if(controlSize == "mid"){
            controlSize = "large";
            controls.classList.remove("smallsize");
            controls.classList.remove("midsize");
            controls.classList.add("largesize");
        }else if(controlSize == "large"){
            controlSize = "small";
            controls.classList.add("smallsize");
            controls.classList.remove("midsize");
            controls.classList.remove("largesize");
            
        }else{
            controlSize = "mid";
            controls.classList.remove("smallsize");
            controls.classList.add("midsize");
            controls.classList.remove("largesize");

        }
    }
    document.onkeypress = function(e){
        e = e || window.event;
		let key_pressed = e.keyCode;
        console.log(key_pressed);
        console.log(wind);
        console.log(falloff);
        console.log(x_scale);
        console.log(time_scale);
        console.log(fps);
		if(key_pressed == 100){
            wind += 1;
            windSlider.value = wind;
		}
		if(key_pressed == 97){
            wind -= 1;
            windSlider.value = wind;
		}
		if(key_pressed == 115){
            falloff += 0.01;
            falloffSlider.value = falloff;
		}
		if(key_pressed == 119){
            falloff -= 0.01;
            falloff = Math.max(0, falloff);
            falloffSlider.value = falloff;
		}
		if(key_pressed == 114){
            x_scale -= 0.01;
            x_scale = Math.max(0, x_scale);
            flareScaleSlider.value = x_scale;
		}
		if(key_pressed == 102){
            x_scale += 0.01;
            flareScaleSlider.value = x_scale;
		}
		if(key_pressed == 116){
            time_scale -= 0.001;
            time_scale = Math.max(0, time_scale);
            timeScaleSlider.value = time_scale;
		}
		if(key_pressed == 103){
            time_scale += 0.001;
            timeScaleSlider.value = time_scale;
		}
		if(key_pressed == 122){
            fps -= 1;
            fps = Math.max(0, fps);
            fpsSlider.value = fps;
		}
		if(key_pressed == 120){
            fps += 1;
            fpsSlider.value = fps;
		}
		if(key_pressed == 99){
            pixel_size -= 1;
            pixel_size = Math.max(0, pixel_size);
            pixel_sizeSlider.value = pixel_size;
            setupPrograms(pixel_size);
		}
		if(key_pressed == 118){
            pixel_size += 1;
            pixel_sizeSlider.value = pixel_size;
            setupPrograms(pixel_size);
		}
    } 
}

function setupPrograms(pixel_size){
    // Compile shaders for creating temperature
    let vertex_create_shader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceCreate);
    let fragment_create_shader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceCreate);

    // Compile shaders for copying temperature to canvas
    let vertex_copy_shader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceCopy);
    let fragment_copy_shader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceCopy);

    // Create programs and get references to locations
    program_create = createProgram(gl, vertex_create_shader, fragment_create_shader);
    program_copy = createProgram(gl, vertex_copy_shader, fragment_copy_shader);
    locations_create.set("a_position", gl.getAttribLocation(program_create, "a_position"));
    locations_create.set("a_texCoord", gl.getAttribLocation(program_create, "a_texCoord"));
    locations_create.set("u_resolution", gl.getUniformLocation(program_create, "u_resolution"));
    locations_create.set("u_image", gl.getUniformLocation(program_create, "u_image"));
    locations_create.set("t", gl.getUniformLocation(program_create, "t"));
    locations_create.set("falloff", gl.getUniformLocation(program_create, "falloff"));
    locations_create.set("time_scale", gl.getUniformLocation(program_create, "time_scale"));
    locations_create.set("x_scale", gl.getUniformLocation(program_create, "x_scale"));
    locations_create.set("wind", gl.getUniformLocation(program_create, "wind"));
    locations_copy.set("a_position", gl.getAttribLocation(program_copy, "a_position"));
    locations_copy.set("a_texCoord", gl.getAttribLocation(program_copy, "a_texCoord"));
    locations_copy.set("u_resolution", gl.getUniformLocation(program_copy, "u_resolution"));
    locations_copy.set("u_image", gl.getUniformLocation(program_copy, "u_image"));

    // Create VAO for create program.
    vao_create = gl.createVertexArray();
    gl.bindVertexArray(vao_create);

    // Create buffer for vertices, just a rectangle to cover screen.
    let position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
    let positions = [
        -1, -1,
        1, -1,
        -1, 1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations_create.get("a_position"));
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            locations_create.get("a_position"), size, type, normalize, stride, buffer_offset);
    }

    // Create buffer for texture coordinates.
    let texCoord_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoord_buffer);
    let texCoords = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations_create.get("a_texCoord"));
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next texCoord
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            locations_create.get("a_texCoord"), size, type, normalize, stride, buffer_offset);
    }
    gl.bindVertexArray(null);

    // Create VAO for copy program. Can reuse buffer data.
    // We could share a VAO between programs because locations
    // are the same, but that seems hacky.
    vao_copy = gl.createVertexArray();
    gl.bindVertexArray(vao_copy);
    position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations_copy.get("a_position"));
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            locations_copy.get("a_position"), size, type, normalize, stride, buffer_offset);
    }
    texCoord_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoord_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations_copy.get("a_texCoord"));
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next texCoord
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            locations_copy.get("a_texCoord"), size, type, normalize, stride, buffer_offset);
    }
    gl.bindVertexArray(null);

    // Set canvas so num pixels = display size.
    resize(canvas);

    // We will use the first texture slot.
    gl.activeTexture(gl.TEXTURE0 + 0);

    // Create a texture.
    // We will use two textures, swapping 
    // between them each frame so one holds
    // The last output and one is written to.
    tex_width = pixel_size;
    tex_height = pixel_size;
    texture_a = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture_a);
    {
        // Bind it to texture unit 0' 2D bind point
        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
        // make the texture the same size as the image
        let mipLevel = 0;               // the largest mip
        let internalFormat = gl.RGBA;   // format we want in the texture
        let border = 0;                 // must be 0
        let srcFormat = gl.RGBA;        // format of data we are supplying
        let srcType = gl.UNSIGNED_BYTE  // type of data we are supplying
        let data = null;                // no data = create a blank texture
        gl.texImage2D(
            gl.TEXTURE_2D, mipLevel, internalFormat, tex_width, tex_height, border,
            srcFormat, srcType, data);
    }
    // Create a texture.
    texture_b = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture_b);
    {
        // Bind it to texture unit 0' 2D bind point
        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        
        // make the texture the same size as the image
        let mipLevel = 0;               // the largest mip
        let internalFormat = gl.RGBA;   // format we want in the texture
        let border = 0;                 // must be 0
        let srcFormat = gl.RGBA;        // format of data we are supplying
        let srcType = gl.UNSIGNED_BYTE  // type of data we are supplying
        let data = null;                // no data = create a blank texture
    gl.texImage2D(
        gl.TEXTURE_2D, mipLevel, internalFormat, tex_width, tex_height, border,
        srcFormat, srcType, data);
    }
         
    // Create Framebuffers to write to 
    // each texture.
    fbo_b = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_b);
    let attachmentPoint = gl.COLOR_ATTACHMENT0;
    let mipLevel = 0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture_b, mipLevel);

    fbo_a = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_a);
    attachmentPoint = gl.COLOR_ATTACHMENT0;
    mipLevel = 0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture_a, mipLevel);
}

function draw_data(t){

    // Draw at specified FPS.
    let do_frame = false;
    if(!last_frame) {
        do_frame = true;
    }else if(t - last_frame >= 1000 / fps){
        do_frame = true;
    }
    if(!do_frame){
        requestAnimationFrame(draw_data);
        return;
    }


    gl.viewport(0, 0, tex_width, tex_height);
    gl.clearColor(1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Figure out which texture and framebuffer
    // this frame needs.
    let new_tex = count % 2 == 0 ? texture_b : texture_a;
    let old_tex = count % 2 == 0 ? texture_a : texture_b;
    let new_fbo = count % 2 == 0 ? fbo_b : fbo_a;
    
    // Setup first program to create temp texture
    gl.bindVertexArray(vao_create);
    gl.useProgram(program_create);
    gl.uniform1i(locations_create.get('u_image'), 0);
    gl.uniform2f(locations_create.get('u_resolution'), tex_width, tex_height);
    gl.uniform1f(locations_create.get('t'), t);
    gl.uniform1f(locations_create.get('falloff'), falloff);
    gl.uniform1f(locations_create.get('time_scale'), time_scale);
    gl.uniform1f(locations_create.get('x_scale'), x_scale);
    gl.uniform1f(locations_create.get('wind'), wind);
    // The FBO we picked draws to new_tex
    gl.bindFramebuffer(gl.FRAMEBUFFER, new_fbo);
    // We will base on old_tex
    gl.bindTexture(gl.TEXTURE_2D, old_tex)
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let num_vertex = 6;
    gl.drawArrays(primitiveType, offset, num_vertex);
    
    // Use copy program to copy new_tex to canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program_copy);
    gl.bindVertexArray(vao_copy);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, new_tex);
    gl.uniform1i(locations_copy.get('u_image'), 0);
    gl.uniform2f(locations_copy.get('u_resolution'), gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(primitiveType, offset, num_vertex);

    // Update count so we swap textures next frame.
    count+= 1
    last_frame = t;
    requestAnimationFrame(draw_data)
 }
window.onload = function() {
    canvas = document.querySelector('#canvas');
    gl = canvas.getContext('webgl2');
    if (!gl){alert("WebGL2 not available");}

    setupInput();
    setupPrograms(pixel_size);
    draw_data();
}


    // Compile shaders from string.
    function createShader(gl, type, source) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
        return shader;
        }
    
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    //Create program with vertex and fragment shaders.
    function createProgram(gl, vertexShader, fragmentShader) {
        let program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        let success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
        return program;
        }
    
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }
    function resize(canvas) {
        // Lookup the size the browser is displaying the canvas.
        let displayWidth  = canvas.clientWidth;
        let displayHeight = canvas.clientHeight;
       
        // Check if the canvas is not the same size.
        if (canvas.width  !== displayWidth ||
            canvas.height !== displayHeight) {
       
          // Make the canvas the same size
          canvas.width  = displayWidth;
          canvas.height = displayHeight;
        }
      }