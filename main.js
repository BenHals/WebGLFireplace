// Adapted from webgl2fundamentals.org
let wind = -1.0;
let falloff = 0.2;
let fps = 50;
let last_frame = undefined;

window.onload = function() {
    var canvas = document.querySelector('#canvas');
    var gl = canvas.getContext('webgl2');
    if (!gl){alert("WebGL2 not available");}

    var vertexShaderSourceCreate = `#version 300 es
    
    in vec4 a_position;
    in vec2 a_texCoord;

    out vec2 v_texCoord;
    
    void main() {
    
    gl_Position = a_position;
    v_texCoord = a_texCoord;
    }
    `;
    var fragmentShaderSourceCreate = `#version 300 es
    
    precision highp float;

    in vec2 v_texCoord;

    uniform vec2 u_resolution;

    uniform sampler2D u_image;

    uniform float t;

    uniform float falloff;

    uniform float wind;
    
    out vec4 outColor;
    
    float rand(float n){return fract(sin(n) * 43758.5453123);}

    void main() {
        vec4 texCol = texture(u_image, v_texCoord);
        vec4 oC;
        if(floor(v_texCoord.y * u_resolution.y) == 0.0){
            oC = vec4(0.5 + 0.5*rand(t+floor(v_texCoord.x * u_resolution.x)), 0, 0, 1);
        } else {
            float flux = rand(t+floor(v_texCoord.x * u_resolution.x));
            float flux_mag = rand(t+floor(v_texCoord.x * u_resolution.x + 1.0)) * 3.0;
            // float flux = 1.0;
            vec4 below_l_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind-(1.0 * flux_mag))*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
            vec4 below_m_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind)*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
            vec4 below_r_tex = texture(u_image, vec2(fract(v_texCoord.x - ((wind+(1.0 * flux_mag))*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
            // vec4 below_tex_less = texture(u_image, vec2(fract(v_texCoord.x - ((wind-1.0)*(1.0/u_resolution.x))), fract(v_texCoord.y-(1.0/u_resolution.y))));
            vec4 last_col = below_m_tex;
            if(flux < 0.3){
                last_col = mix(last_col, below_l_tex, (flux-0.0)/0.5);
            }else if (flux > 0.7){
                last_col = mix(last_col, below_r_tex, (flux-0.5)/0.5);
            }
            // vec4 last_col = mix(below_tex, below_tex_less, 0.7);
            // vec4 last_col = mix(below_l_tex, below_r_tex, 0.5);
            // last_col = mix(last_col, below_m_tex, 0.3);

            oC = mix(last_col, vec4(0, 0, 0, 1), falloff);
        }
        outColor = oC;
    }
    `;
    var vertexShaderSourceCopy = `#version 300 es
    
    in vec4 a_position;
    in vec2 a_texCoord;

    out vec2 v_texCoord;
    
    void main() {
    
    gl_Position = a_position;
    v_texCoord = a_texCoord;
    }
    `;
    
    var fragmentShaderSourceCopy = `#version 300 es
    
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
        var displayWidth  = canvas.clientWidth;
        var displayHeight = canvas.clientHeight;
       
        // Check if the canvas is not the same size.
        if (canvas.width  !== displayWidth ||
            canvas.height !== displayHeight) {
       
          // Make the canvas the same size
          canvas.width  = displayWidth;
          canvas.height = displayHeight;
        }
      }

    let vertexCreateShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceCreate);
    let vertexCopyShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceCopy);
    let fragmentCreateShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceCreate);
    let fragmentCopyShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceCopy);

    var programCreate = createProgram(gl, vertexCreateShader, fragmentCreateShader);
    var programCopy = createProgram(gl, vertexCopyShader, fragmentCopyShader);
    let positionAttributeLocationCreate = gl.getAttribLocation(programCreate, "a_position");
    let resolutionLocationCreate = gl.getUniformLocation(programCreate, "u_resolution");
    let saveTextureLoc = gl.getUniformLocation(programCreate, "u_image");
    let tLoc = gl.getUniformLocation(programCreate, "t");
    let falloffLoc = gl.getUniformLocation(programCreate, "falloff");
    let windLoc = gl.getUniformLocation(programCreate, "wind");
    let positionAttributeLocationCopy = gl.getAttribLocation(programCopy, "a_position");
    let texCoordAttributeLocationCopy = gl.getAttribLocation(programCopy, "a_texCoord");
    let resolutionLocationCopy = gl.getUniformLocation(programCopy, "u_resolution");
    // let saveTextureLoc = gl.getUniformLocation(programCopy, "u_image");
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    let positions = [
        -1, -1,
        1, -1,
        -1, 1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocationCreate);
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            positionAttributeLocationCreate, size, type, normalize, stride, buffer_offset);
    }
    let texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    let texCoords = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordAttributeLocationCopy);
    {
        let size = 2;          // 2 components per iteration
        let type = gl.FLOAT;   // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next texCoord
        let buffer_offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            texCoordAttributeLocationCopy, size, type, normalize, stride, buffer_offset);
    }

    resize(canvas);
    // make unit 0 the active texture uint
    // (ie, the unit all other texture commands will affect
    gl.activeTexture(gl.TEXTURE0 + 0);

    // Create a texture.
    var tex_width = 50;
    var tex_height = 50;
    var texture_a = gl.createTexture();
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
        // let tex_width = gl.canvas.width;
        // let tex_height = gl.canvas.height;
        gl.texImage2D(
            gl.TEXTURE_2D, mipLevel, internalFormat, tex_width, tex_height, border,
            srcFormat, srcType, data);
        }
        // Create a texture.
        var texture_b = gl.createTexture();
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

         
    // Create a framebuffer
    var fbo_b = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_b);
 
    // Attach a texture to it.
    let attachmentPoint = gl.COLOR_ATTACHMENT0;
    let mipLevel = 0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture_b, mipLevel);
    // Create a framebuffer
    var fbo_a = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_a);
 
    // Attach a texture to it.
    attachmentPoint = gl.COLOR_ATTACHMENT0;
    mipLevel = 0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture_a, mipLevel);

    var count = 0;

    draw_data();
    document.onkeypress = function(e){
        e = e || window.event;
		let key_pressed = e.keyCode;
		console.log(key_pressed);
		if(key_pressed == 100){
			wind += 1;
		}
		if(key_pressed == 97){
			wind -= 1;
		}
		if(key_pressed == 115){
			falloff += 0.01;
		}
		if(key_pressed == 119){
			falloff -= 0.01;
		}
		// if(key_pressed == 114){
		// 	falloff -= 2;
		// }
		// if(key_pressed == 102){
		// 	falloff += 2;
		// }
		if(key_pressed == 122){
			fps -= 2;
		}
		if(key_pressed == 120){
			fps += 2;
		}
	} 
    function draw_data(t){
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
        
        let new_tex = count % 2 == 0 ? texture_b : texture_a;
        let old_tex = count % 2 == 0 ? texture_a : texture_b;
        let new_fbo = count % 2 == 0 ? fbo_b : fbo_a;
        
        gl.useProgram(programCreate);
        gl.bindVertexArray(vao);
        gl.uniform1i(saveTextureLoc, 0);
        gl.uniform2f(resolutionLocationCreate, tex_width, tex_height);
        gl.uniform1f(tLoc, t);
        gl.uniform1f(falloffLoc, falloff);
        gl.uniform1f(windLoc, wind);
        gl.bindFramebuffer(gl.FRAMEBUFFER, new_fbo);
        gl.bindTexture(gl.TEXTURE_2D, old_tex)
        let primitiveType = gl.TRIANGLES;
        let offset = 0;
        let num_vertex = 6;
        gl.drawArrays(primitiveType, offset, num_vertex);
        
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(programCopy);
        gl.bindVertexArray(vao);
        // start with the original image on unit 0
        gl.activeTexture(gl.TEXTURE0 + 0);
        gl.bindTexture(gl.TEXTURE_2D, new_tex);
        
        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(saveTextureLoc, 0);
        gl.uniform2f(resolutionLocationCopy, gl.canvas.width, gl.canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(primitiveType, offset, num_vertex);
        count+= 1
        last_frame = t;
        requestAnimationFrame(draw_data)
     }
}
