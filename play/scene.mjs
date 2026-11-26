import { landscape, infrastructure, terrainY } from "./world.mjs";
import { timeOf } from "./simulation.mjs";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const size = Math.hypot(...v) || 1;
  return v.map((value) => value / size);
};
const direct = (a, b) => a.map((value, index) => value - b[index]);
const light = norm([-0.57, 0.76, 0.31]);
const labelOffsets = [[0, 0], [0, -36], [0, 36], [-34, 0], [34, 0], [-30, -32], [30, -32], [-27, 32], [27, 32], [0, -62], [0, 63]];
const WATER_CYCLE_MS = 8000;
const TAU = 2 * Math.PI;

function webGL(canvas) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: true, powerPreference: "low-power" });
  if (!gl) return null;
  const shader = (type, source) => {
    const compiled = gl.createShader(type);
    gl.shaderSource(compiled, source);
    gl.compileShader(compiled);
    if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(compiled));
    return compiled;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    uniform vec3 uEye;
    uniform vec3 uRight;
    uniform vec3 uUp;
    uniform vec3 uForward;
    uniform vec2 uScale;
    uniform vec3 uLight;
    uniform mediump float uExposure;
    varying vec3 color;
    varying float depth;
    varying vec2 world;
    void main() {
      vec3 delta = aPosition - uEye;
      float z = dot(delta, uForward);
      gl_Position = vec4(dot(delta, uRight) * uScale.x, dot(delta, uUp) * uScale.y, 1.00477 * z - 2.00477, z);
      float sun = max(0.0, dot(aNormal, uLight));
      color = aColor * (0.77 + 0.37 * sun) * uExposure;
      depth = z;
      world = aPosition.xz;
    }
  `));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec3 uSky;
    uniform mediump float uExposure;
    uniform float uWater;
    uniform float uFlowPhase;
    varying vec3 color;
    varying float depth;
    varying vec2 world;
    void main() {
      vec3 surface = color;
      if (uWater > 0.5) {
        float nearFall = smoothstep(-4.5, -1.5, world.y) * (1.0 - smoothstep(4.8, 8.0, world.y));
        float curl = sin(world.x * 1.35 + world.y * 0.31) * 0.8;
        float current = sin(world.y * 0.93 + curl - uFlowPhase * 5.0);
        float rapids = sin(world.y * 2.42 + curl - uFlowPhase * 9.0);
        float width = smoothstep(-0.62, 0.78, sin(world.x * 2.6 + world.y * 0.23));
        float ripple = smoothstep(0.54, 0.96, current) * (0.30 + 0.70 * width);
        float foam = smoothstep(0.42, 0.88, rapids) * (0.54 + 0.46 * width);
        surface = mix(surface, vec3(0.62, 0.85, 0.83) * uExposure, ripple * 0.40);
        surface = mix(surface, vec3(0.92, 0.99, 0.95) * uExposure, foam * nearFall * 0.65);
      }
      float fog = smoothstep(85.0, 237.0, depth);
      gl_FragColor = vec4(mix(surface, uSky, fog * 0.93), 1.0);
    }
  `));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  const attributes = ["aPosition", "aNormal", "aColor"].map((name) => gl.getAttribLocation(program, name));
  const uniforms = Object.fromEntries(["Eye", "Right", "Up", "Forward", "Scale", "Light", "Sky", "Exposure", "Water", "FlowPhase"].map((key) => [key, gl.getUniformLocation(program, "u" + key)]));
  gl.uniform3fv(uniforms.Light, light);
  return {
    name: "WebGL",
    prepare(mesh, old) {
      const buffer = old?.buffer ?? gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);
      return { buffer, size: mesh.data.length / 9 };
    },
    draw(map, meshes, sky, exposure, phase) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(...sky, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform3fv(uniforms.Sky, sky);
      gl.uniform1f(uniforms.Exposure, exposure);
      gl.uniform3fv(uniforms.Eye, map.eye);
      gl.uniform3fv(uniforms.Right, map.right);
      gl.uniform3fv(uniforms.Up, map.up);
      gl.uniform3fv(uniforms.Forward, map.forward);
      gl.uniform2fv(uniforms.Scale, map.scale);
      gl.uniform1f(uniforms.FlowPhase, phase);
      for (const [index, rendered] of meshes.entries()) {
        gl.bindBuffer(gl.ARRAY_BUFFER, rendered.buffer);
        gl.polygonOffset(0, index === 2 ? -1 : 0);
        gl.uniform1f(uniforms.Water, index === 1 ? 1 : 0);
        attributes.forEach((attribute, offset) => {
          gl.enableVertexAttribArray(attribute);
          gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 36, offset * 12);
        });
        gl.drawArrays(gl.TRIANGLES, 0, rendered.size);
      }
    },
  };
}

function canvas3D(canvas) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;
  const tint = (color) => "rgb(" + color.map((channel) => Math.min(255, Math.round(channel * 255))).join(",") + ")";
  return {
    name: "Canvas 3D",
    prepare(mesh) {
      const triangles = [];
      for (let i = 0; i < mesh.data.length; i += 27) {
        const a = mesh.data.slice(i, i + 3);
        const b = mesh.data.slice(i + 9, i + 12);
        const c = mesh.data.slice(i + 18, i + 21);
        const normal = mesh.data.slice(i + 3, i + 6);
        const shade = 0.77 + Math.max(0, dot(light, normal)) * 0.37;
        const color = mesh.data.slice(i + 6, i + 9).map((part) => part * shade);
        triangles.push({ a, b, c, color });
      }
      return triangles;
    },
    draw(map, meshes, sky, exposure) {
      const width = canvas.width, height = canvas.height;
      const queue = [];
      for (const mesh of meshes) {
        for (const tri of mesh) {
          const a = project(map, tri.a), b = project(map, tri.b), c = project(map, tri.c);
          if (Math.min(a.depth, b.depth, c.depth) < 1) continue;
          if ([a, b, c].every((v) => v.x < 0) || [a, b, c].every((v) => v.x > 1) ||
              [a, b, c].every((v) => v.y < 0) || [a, b, c].every((v) => v.y > 1)) continue;
          queue.push({ a, b, c, color: tri.color, depth: (a.depth + b.depth + c.depth) / 3 });
        }
      }
      queue.sort((a, b) => b.depth - a.depth);
      context.fillStyle = tint(sky);
      context.fillRect(0, 0, width, height);
      for (const { a, b, c, color, depth } of queue) {
        const fog = clamp((depth - 85) / 152, 0, 1) * 0.88;
        context.fillStyle = tint(color.map((value, i) => value * exposure * (1 - fog) + sky[i] * fog));
        context.beginPath();
        context.moveTo(a.x * width, a.y * height);
        context.lineTo(b.x * width, b.y * height);
        context.lineTo(c.x * width, c.y * height);
        context.closePath();
        context.fill();
      }
    },
  };
}

function view(camera, ratio) {
  const offset = [
    Math.sin(camera.yaw) * Math.cos(camera.pitch) * camera.distance,
    Math.sin(camera.pitch) * camera.distance,
    Math.cos(camera.yaw) * Math.cos(camera.pitch) * camera.distance,
  ];
  const eye = camera.target.map((value, index) => value + offset[index]);
  const forward = norm(direct(camera.target, eye));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const vertical = 2.34 * Math.min(1, ratio / 0.96);
  return { eye, forward, right, up, scale: [vertical / ratio, vertical] };
}

function project(map, point) {
  const dx = point[0] - map.eye[0], dy = point[1] - map.eye[1], dz = point[2] - map.eye[2];
  const depth = dx * map.forward[0] + dy * map.forward[1] + dz * map.forward[2];
  const inDepth = 0.5 / Math.max(0.001, depth);
  return {
    x: 0.5 + (dx * map.right[0] + dy * map.right[1] + dz * map.right[2]) * map.scale[0] * inDepth,
    y: 0.5 - (dx * map.up[0] + dy * map.up[1] + dz * map.up[2]) * map.scale[1] * inDepth,
    depth,
  };
}

function riverInView(map, sections) {
  return sections.some((section) => {
    // The section is outside if every sampled bank point is outside the same camera plane.
    let outside = 31;
    for (const point of section) {
      const delta = direct(point, map.eye);
      const depth = dot(delta, map.forward);
      const h = dot(delta, map.right) * map.scale[0];
      const v = dot(delta, map.up) * map.scale[1];
      outside &= (depth < 1 ? 1 : 0) | (h < -depth ? 2 : 0) | (h > depth ? 4 : 0) |
        (v < -depth ? 8 : 0) | (v > depth ? 16 : 0);
      if (!outside) return true;
    }
    return false;
  });
}

function rayDistance(eye, direction, bounds) {
  const [center, halfSize] = bounds;
  let near = 0, far = Infinity;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = center[axis] - eye[axis];
    if (Math.abs(direction[axis]) < 0.00001) {
      if (Math.abs(delta) > halfSize[axis]) return Infinity;
      continue;
    }
    const first = (delta - halfSize[axis]) / direction[axis];
    const second = (delta + halfSize[axis]) / direction[axis];
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return Infinity;
  }
  return near;
}

export class Scene {
  constructor(canvas, layer, onMode, onPick) {
    this.canvas = canvas;
    this.layer = layer;
    this.onMode = onMode;
    this.onPick = onPick;
    this.touchMode = "pan";
    this.camera = { target: [-0.7, 2.5, -2.5], yaw: 0.52, pitch: 0.5, distance: 92 };
    this.pointer = new Map();
    this.frame = 0;
    this.layoutPending = false;
    this.flowPhase = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    this.onScreen = typeof IntersectionObserver !== "function";
    try {
      this.renderer = webGL(canvas);
    } catch (error) {
      console.warn("SmartGridTwin WebGL", error);
      this.canvas = canvas.cloneNode();
      canvas.replaceWith(this.canvas);
    }
    this.renderer ??= canvas3D(this.canvas);
    this.canvas.parentElement.dataset.renderer = this.renderer?.name ?? "unavailable";
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.contextLost = true;
      clearTimeout(this.flowTimer);
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      this.renderer = webGL(this.canvas);
      this.contextLost = false;
      this.terrain = null;
      this.water = null;
      this.structures = null;
      this.sync(this.previousGrid, this.previousInspection, true);
    });
    const resize = new ResizeObserver(() => {
      const low = this.isLowDetail();
      if (typeof this.low === "boolean" && low !== this.low && this.previousGrid) {
        this.sync(this.previousGrid, this.previousInspection, true);
      }
      this.requestDraw();
    });
    resize.observe(this.canvas);
    if (typeof IntersectionObserver === "function") {
      const visibility = new IntersectionObserver(([entry]) => {
        this.onScreen = entry.isIntersecting;
        this.updateFlow();
      });
      visibility.observe(this.canvas);
    }
    document.addEventListener("visibilitychange", () => this.updateFlow());
    this.reducedMotion.addEventListener("change", () => this.updateFlow());
    this.controls();
  }

  isLowDetail() {
    return this.renderer?.name !== "WebGL" || this.canvas.clientWidth < 670;
  }

  sync(grid, inspection, force = false) {
    if (!this.renderer) return;
    this.previousGrid = grid;
    this.previousInspection = inspection;
    const low = this.isLowDetail();
    const clock = timeOf(grid.region.hour);
    const night = clock < 6 || clock >= 19;
    if (this.region !== grid.meta.id || this.low !== low || force) {
      const { terrain, water, riverSections } = landscape(grid.meta, low);
      this.terrain = this.renderer.prepare(terrain, this.terrain);
      this.water = this.renderer.prepare(water, this.water);
      this.riverSections = riverSections;
      this.region = grid.meta.id;
      this.low = low;
    }
    const state = JSON.stringify([
      this.region, inspection ?? null, low, night, grid.delivered > 0,
      grid.plants.map((plant) => [plant.site, plant.type, plant.level, plant.status, plant.output > 0.5]),
      grid.customers.map((customer) => [customer.id, customer.type, customer.delivered > customer.demand * 0.2]),
    ]);
    if (this.state !== state || force) {
      const { mesh, markers, picks } = infrastructure(grid, inspection, low, night);
      this.structures = this.renderer.prepare(mesh, this.structures);
      this.markers = markers;
      this.picks = picks;
      this.state = state;
    }
    const daylight = clamp(Math.sin(Math.PI * (clock - 4.5) / 16) * 1.56, 0, 1);
    const brightSky = grid.meta.id === "bara" ? [0.74, 0.82, 0.79] : [0.69, 0.82, 0.81];
    this.sky = brightSky.map((channel, i) => channel * daylight + [0.43, 0.56, 0.63][i] * (1 - daylight));
    this.exposure = 0.73 + 0.27 * daylight;
    this.requestDraw();
  }

  canAnimateWater() {
    return this.renderer?.name === "WebGL" && !this.contextLost && this.onScreen &&
      this.waterVisible && !document.hidden && !this.reducedMotion.matches;
  }

  updateFlow() {
    clearTimeout(this.flowTimer);
    if (this.canAnimateWater()) {
      // Camera input keeps its normal redraw rate. Only background water updates are capped.
      this.flowTimer = setTimeout(() => {
        if (this.canAnimateWater()) this.requestDraw(false);
      }, 1000 / (this.low ? 18 : 24));
    }
  }

  requestDraw(layout = true) {
    this.layoutPending ||= layout;
    if (!this.frame) this.frame = requestAnimationFrame((now) => this.draw(now));
  }

  draw(now) {
    this.frame = 0;
    const layout = this.layoutPending;
    this.layoutPending = false;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height || !this.terrain || !this.water || !this.structures || this.contextLost) return;
    const pixelRatio = Math.min(this.low ? 1.2 : 1.65, devicePixelRatio || 1);
    const renderWidth = Math.round(width * pixelRatio), renderHeight = Math.round(height * pixelRatio);
    if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
    }
    const map = view(this.camera, width / height);
    if (layout) this.waterVisible = this.renderer.name === "WebGL" && riverInView(map, this.riverSections);
    if (this.canAnimateWater()) this.flowPhase = now % WATER_CYCLE_MS / WATER_CYCLE_MS * TAU;
    this.renderer.draw(map, [this.terrain, this.water, this.structures], this.sky, this.exposure, this.flowPhase);
    if (layout) {
      this.placeLabels(map, width, height);
      this.layer.parentElement.style.setProperty("--heading", (-this.camera.yaw * 180 / Math.PI) + "deg");
    }
    this.updateFlow();
  }

  placeLabels(map, width, height) {
    const occupied = [{ left: width - 48, right: width, top: height - 166, bottom: height }];
    for (const label of this.layer.children) {
      const point = this.markers.get(label.dataset.marker);
      const projection = point && project(map, point);
      const visible = projection && projection.depth >= 1 && projection.x >= 0.035 && projection.x <= 0.965 && projection.y >= 0.12 && projection.y <= 0.94;
      label.hidden = !visible;
      if (!visible) continue;
      const half = label.offsetWidth / 2;
      const itemHeight = label.offsetHeight;
      let position;
      for (const [dx, dy] of labelOffsets) {
        const x = clamp(projection.x * width + dx, half + 3, width - half - 3);
        const y = projection.y * height + dy;
        const next = { left: x - half - 2, right: x + half + 2, top: y - itemHeight * 0.86 - 3, bottom: y + itemHeight * 0.14 + 3 };
        if (next.top < 7 || next.bottom > height - 3) continue;
        if (occupied.some((used) => next.left < used.right && next.right > used.left && next.top < used.bottom && next.bottom > used.top)) continue;
        occupied.push(next);
        position = [x, y];
        break;
      }
      if (!position) {
        label.hidden = true;
        continue;
      }
      label.style.left = position[0] + "px";
      label.style.top = position[1] + "px";
    }
  }

  reset() {
    this.motion({ target: [-0.7, 2.5, -2.5], yaw: 0.52, pitch: 0.5, distance: this.canvas.clientWidth < 660 ? 107 : 92 });
  }

  snapshot() {
    return { ...this.camera, target: this.camera.target.slice() };
  }

  focus(point, meta, close = false) {
    const height = terrainY(point.x, point.z, meta.id);
    this.motion({
      target: [point.x, height + (close ? 0.8 : 1.6), point.z],
      yaw: close ? 0.42 : this.camera.yaw,
      pitch: close ? 0.78 : Math.max(this.camera.pitch, 0.52),
      distance: close ? (this.canvas.clientWidth < 660 ? 24 : 17) : 46,
    });
  }

  motion(to) {
    cancelAnimationFrame(this.motionFrame);
    const from = this.snapshot();
    if (this.reducedMotion.matches || this.renderer?.name === "Canvas 3D") {
      this.camera = { ...to, target: to.target.slice() };
      this.requestDraw();
      return;
    }
    const start = performance.now(), duration = 340;
    const tick = (now) => {
      const part = clamp((now - start) / duration, 0, 1);
      const mix = (a, b) => a + (b - a) * (1 - (1 - part) ** 3);
      this.camera = {
        target: from.target.map((value, index) => mix(value, to.target[index])),
        yaw: mix(from.yaw, to.yaw), pitch: mix(from.pitch, to.pitch), distance: mix(from.distance, to.distance),
      };
      this.requestDraw();
      if (part < 1) this.motionFrame = requestAnimationFrame(tick);
    };
    this.motionFrame = requestAnimationFrame(tick);
  }

  zoom(amount) {
    cancelAnimationFrame(this.motionFrame);
    this.camera.distance = clamp(this.camera.distance * amount, 12, 185);
    this.requestDraw();
  }

  orbit(dx, dy) {
    cancelAnimationFrame(this.motionFrame);
    this.camera.yaw -= dx * 0.008;
    this.camera.pitch = clamp(this.camera.pitch + dy * 0.007, 0.18, 1.47);
    this.requestDraw();
  }

  pan(dx, dy) {
    cancelAnimationFrame(this.motionFrame);
    const scale = this.camera.distance * 0.0019;
    const { yaw, target } = this.camera;
    target[0] = clamp(target[0] + (-dx * Math.cos(yaw) - dy * Math.sin(yaw)) * scale, -76, 76);
    target[2] = clamp(target[2] + (dx * Math.sin(yaw) - dy * Math.cos(yaw)) * scale, -65, 65);
    this.requestDraw();
  }

  setMode(mode) {
    this.touchMode = mode;
    this.canvas.dataset.mode = mode;
    this.onMode(mode);
  }

  pick(x, y) {
    if (!this.picks) return;
    const bounds = this.canvas.getBoundingClientRect();
    const map = view(this.camera, bounds.width / bounds.height);
    const h = (2 * (x - bounds.left) / bounds.width - 1) / map.scale[0];
    const v = (1 - 2 * (y - bounds.top) / bounds.height) / map.scale[1];
    const direction = map.forward.map((channel, index) => channel + h * map.right[index] + v * map.up[index]);
    let distance = Infinity;
    let best;
    for (const label of this.layer.children) {
      const id = label.dataset.marker;
      const volume = this.picks.get(id);
      if (!volume) continue;
      const candidate = rayDistance(map.eye, direction, volume);
      if (candidate < distance) {
        distance = candidate;
        best = id;
      }
    }
    if (best) this.onPick(best);
  }

  controls() {
    const canvas = this.canvas;
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.zoom(Math.exp(clamp(event.deltaY, -200, 200) * 0.002));
    }, { passive: false });
    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (event.pointerType === "mouse") canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      this.tap = this.pointer.size === 0 && event.button === 0;
      this.travel = 0;
      this.pointer.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.dragging = event.button === 2 || (this.touchMode === "orbit" && !event.shiftKey) ? "orbit" : "pan";
    });
    canvas.addEventListener("pointermove", (event) => {
      const old = this.pointer.get(event.pointerId);
      if (!old) return;
      const others = [...this.pointer.entries()].filter(([id]) => id !== event.pointerId);
      const next = { x: event.clientX, y: event.clientY };
      this.pointer.set(event.pointerId, next);
      if (others.length) {
        const [, other] = others[0];
        const distance = (point) => Math.max(8, Math.hypot(point.x - other.x, point.y - other.y));
        this.zoom(distance(old) / distance(next));
        return;
      }
      const dx = next.x - old.x, dy = next.y - old.y;
      this.travel += Math.hypot(dx, dy);
      if (this.tap && this.travel < 5) return;
      this.tap = false;
      if (this.dragging === "orbit") this.orbit(dx, dy);
      else this.pan(dx, dy);
    });
    canvas.addEventListener("pointerup", (event) => {
      const select = this.pointer.has(event.pointerId) && this.pointer.size === 1 && this.tap;
      this.pointer.delete(event.pointerId);
      if (select) this.pick(event.clientX, event.clientY);
    });
    for (const event of ["pointercancel", "lostpointercapture"]) {
      canvas.addEventListener(event, (pointerEvent) => this.pointer.delete(pointerEvent.pointerId));
    }
    canvas.addEventListener("keydown", (event) => {
      const arrows = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
      if (arrows[event.key]) {
        event.preventDefault();
        const [dx, dy] = arrows[event.key];
        if (event.shiftKey || this.touchMode === "orbit") this.orbit(dx, dy);
        else this.pan(dx, dy);
      }
      if (["+", "=", "-"].includes(event.key)) {
        event.preventDefault();
        this.zoom(event.key === "-" ? 1.15 : 0.86);
      }
      if (event.key === "Home") {
        event.preventDefault();
        this.reset();
      }
    });
  }
}
