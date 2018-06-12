import 'luma.gl/debug';
import {
  AnimationLoop, Buffer, Model, Program, TransformFeedback, VertexArray, setParameters
} from 'luma.gl';
import {Matrix4} from 'math.gl';

const INFO_HTML = `
<p>
Gradient calculated on the GPU using <code>Transform Feedback</code>.
</p>
`;

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

const POSITION_LOCATION = 0;
const COLOR_LOCATION = 1;
const VARYINGS = ['gl_Position', 'v_color'];

const VS_TRANSFORM = `\
#version 300 es
layout(location = ${POSITION_LOCATION}) in vec4 position;
uniform mat4 MVP;

out vec4 v_color;

void main() {
  gl_Position = MVP * position;
  v_color = vec4(clamp(5. * vec2(position), 0.0, 1.0), 0.0, 1.0);
}
`;

const FS_TRANSFORM = `\
#version 300 es
precision highp float;
void main() {}
`;

const VS_RENDER = `\
#version 300 es
layout(location = ${POSITION_LOCATION}) in vec4 position;
layout(location = ${COLOR_LOCATION}) in vec4 color;

out vec4 v_color;

void main() {
  gl_Position = position;
  v_color = color;
}
`;

const FS_RENDER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

const VERTEX_COUNT = 6;

const POSITIONS = [
  -1.0, -1.0, 0.0, 1.0,
  1.0, -1.0, 0.0, 1.0,
  1.0, 1.0, 0.0, 1.0,
  1.0, 1.0, 0.0, 1.0,
  -1.0, 1.0, 0.0, 1.0,
  -1.0, -1.0, 0.0, 1.0
];

const animationLoop = new AnimationLoop({
  glOptions: {
    webgl2: true,
    webgl1: false,
    debug: true
  },

  // eslint-disable-next-line
  onInitialize({canvas, gl}) {
    // ---- SETUP BUFFERS ---- //
    const bytes = POSITIONS.length * FLOAT_SIZE;
    const buffers = {
      vertex: new Buffer(gl, {data: new Float32Array(POSITIONS)}),
      position: new Buffer(gl, {bytes, type: gl.FLOAT, usage: gl.STATIC_COPY}),
      color: new Buffer(gl, {bytes, type: gl.FLOAT, usage: gl.STATIC_COPY})
    };

    // first pass, offscreen, no rasterization, vertices processing only
    const transformProgram = new Program(gl, {
      vs: VS_TRANSFORM, fs: FS_TRANSFORM, varyings: VARYINGS
    });

    const transformVertexArray = new VertexArray(gl, {
      program: transformProgram,
      attributes: {
        [POSITION_LOCATION]: buffers.vertex
      }
    });

    const transformFeedback = new TransformFeedback(gl, {
      buffers: {
        [POSITION_LOCATION]: buffers.position,
        [COLOR_LOCATION]: buffers.color
      }
    });

    transformProgram.draw({
      drawMode: gl.TRIANGLES,
      vertexCount: VERTEX_COUNT,
      vertexArray: transformVertexArray,
      transformFeedback,
      uniforms: {
        MVP: new Matrix4().identity()
      },
      parameters: {
        [gl.RASTERIZER_DISCARD]: true
      }
    });

    transformFeedback.delete();
    transformVertexArray.delete();
    transformProgram.delete();

    // const renderProgram = new Program(gl, {vs: VS_RENDER, fs: FS_RENDER});

    // const renderVertexArray = new VertexArray(gl, {
    //   program: renderProgram,
    //   attributes: {
    //     // position: buffers.position,
    //     // color: buffers.color
    //     [POSITION_LOCATION]: buffers.position,
    //     [COLOR_LOCATION]: buffers.color
    //   }
    // });

    const renderModel = new Model(gl, {
      vs: VS_RENDER,
      fs: FS_RENDER,
      drawMode: gl.TRIANGLES,
      vertexCount: 6,
      attributes: {
        [POSITION_LOCATION]: buffers.vertex,
        [COLOR_LOCATION]: buffers.color
      }
    });

    // second pass, render to screen
    setParameters(gl, {
      clearColor: [0.0, 0.0, 1.0, 1.0]
    });
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderModel.draw();

    renderModel.delete();

    return false; // Don't start animation loop
  }
});

animationLoop.getInfo = () => INFO_HTML;

export default animationLoop;

/* global window */
if (!window.website) {
  animationLoop.start();
}
