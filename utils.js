// gl utils


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

function setupParticleBufferVAO(gl, buffers, vao, typeSize)
{
    gl.bindVertexArray(vao);
    for (var i = 0; i < buffers.length; i++)
    {
        var buffer = buffers[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer_object);
        var offset = 0;
        for (var attrib_name in buffer.attribs)
        {
            if (buffer.attribs.hasOwnProperty(attrib_name))
            {
                var attrib_desc = buffer.attribs[attrib_name];
                gl.enableVertexAttribArray(attrib_desc.location);
                gl.vertexAttribPointer(
                    attrib_desc.location,
                    attrib_desc.num_components,
                    attrib_desc.type,
                    false,
                    buffer.stride,
                    offset);
                offset += attrib_desc.num_components * typeSize;
                if (attrib_desc.hasOwnProperty("divisor"))
                {
                    gl.vertexAttribDivisor(attrib_desc.location, attrib_desc.divisor);
                }
            }
        }
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function randomRGData(size_x, size_y)
{
    var d = [];
    for (var i = 0; i < size_x * size_y; ++i)
    {
        d.push(Math.random() * 255.0);
        d.push(Math.random() * 255.0);
    }
    return new Uint8Array(d);
}

function initialParticleData(num_parts)
{
    var data = [];
    for (var i = 0; i < num_parts; ++i) {
        data.push(Math.random()*2. - 1.);
        data.push(Math.random()*2. - 1.);
        data.push(0.0);
        data.push(Math.random()*2.*3.14159);
    }
    return data;
}


// other utils

function openFullscreen()
{
    if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
    } else if (document.body.webkitRequestFullscreen) { /* Safari */
        document.body.webkitRequestFullscreen();
    } else if (document.body.msRequestFullscreen) { /* IE11 */
        document.body.msRequestFullscreen();
    }
}

function closeFullscreen()
{
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
}


