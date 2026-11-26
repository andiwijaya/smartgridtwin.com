import { partsFor } from "./simulation.mjs";

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const mix = (a, b, t) => a.map((value, i) => value * (1 - t) + b[i] * t);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const vertex = (x, y, z) => [x, y, z];
const length = (x, y, z) => Math.hypot(x, y, z) || 1;
const hex = (value) => rgb("#" + value);
const stone = hex("9ca7a0");
const dark = hex("455b5c");
const steel = hex("537d82");
const concrete = hex("b2bbb0");
const asphalt = hex("718078");
const light = hex("e0e2c8");
const aqua = hex("7ddac5");
const amber = hex("ddad59");
const glass = hex("668c9a");
const terrainPalettes = {
  arunika: [hex("668b5b"), hex("8da26d"), hex("68796e")],
  bayu: [hex("698f71"), hex("a1ab76"), hex("73888a")],
  bara: [hex("8a945d"), hex("b5ab72"), hex("867967")],
};

export class Mesh {
  data = [];

  tri(a, b, c, color) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const size = length(nx, ny, nz);
    for (const point of [a, b, c]) {
      this.data.push(...point, nx / size, ny / size, nz / size, ...color);
    }
  }

  quad(a, b, c, d, color) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }

  box(x, y, z, w, h, d, color, angle = 0) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ].map(([dx, dy, dz]) => [
      x + cosine * dx * w / 2 - sine * dz * d / 2,
      y + dy * h / 2, z + sine * dx * w / 2 + cosine * dz * d / 2,
    ]);
    for (const face of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]) {
      this.quad(...face.map((index) => vertices[index]), color);
    }
  }

  cylinder(x, y, z, bottom, top, height, color, sides = 10, axis = "y", cap = true) {
    const orient = (radialX, along, radialZ) => {
      if (axis === "x") return [x + along, y - radialX, z + radialZ];
      if (axis === "z") return [x + radialX, y - radialZ, z + along];
      return [x + radialX, y + along, z + radialZ];
    };
    const ring = (radius, along, i) => {
      const theta = i / sides * Math.PI * 2;
      return orient(Math.cos(theta) * radius, along, Math.sin(theta) * radius);
    };
    for (let i = 0; i < sides; i += 1) {
      const h = height / 2;
      const a = ring(bottom, -h, i), b = ring(bottom, -h, i + 1);
      const c = ring(top, h, i + 1), d = ring(top, h, i);
      this.quad(a, d, c, b, color);
      if (cap) this.tri(orient(0, h, 0), c, d, color);
    }
  }

  wire(a, b, thickness, color) {
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const side = Math.hypot(dx, dz) || 1;
    const offset = [dz / side * thickness, 0, -dx / side * thickness];
    const move = (p, t) => p.map((part, i) => part + offset[i] * t);
    this.quad(move(a, -1), move(b, -1), move(b, 1), move(a, 1), color);
  }
}

export function riverX(z, region) {
  const bend = region === "bayu" ? 3 : region === "bara" ? -2 : 0;
  return -31 + bend + Math.sin((z + 15) * 0.058) * 4.6 - Math.max(-z - 15, 0) * 0.14;
}

function riverY(z) {
  return z <= -2 ? 4.15 : z >= 5 ? 0.8 : 0.8 + (5 - z) * 3.35 / 7;
}

function riverWidth(z, region) {
  return 4.2 + (z >= 2 ? 1.2 : 0) + (region === "bayu" ? Math.max(0, z - 20) * 0.28 : 0);
}

const gaussian = (x, z, cx, cz, sx, sz, h) => h * Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
const coastline = (x) => 49 + Math.sin(x * 0.061) * 5;

export function terrainY(x, z, region) {
  const hillScale = region === "bayu" ? 0.72 : region === "bara" ? 0.92 : 1;
  let height = 2.65 + 0.48 * Math.sin(x * 0.09 + z * 0.07) + 0.26 * Math.cos(z * 0.17 - x * 0.09);
  height += hillScale * (
    gaussian(x, z, -56, -63, 22, 24, 31) + gaussian(x, z, -8, -88, 25, 29, 36) +
    gaussian(x, z, 38, -70, 32, 24, 29) + gaussian(x, z, 75, -41, 24, 30, 21) +
    gaussian(x, z, -82, 8, 21, 30, 25) + gaussian(x, z, 65, 70, 26, 26, 15)
  );
  height += gaussian(x, z, -37, 98, 29, 29, region === "bara" ? 38 : 21) +
    gaussian(x, z, 95, -94, 30, 22, 27) + gaussian(x, z, -131, -64, 26, 49, 35);
  const width = riverWidth(z, region);
  const distance = Math.abs(x - riverX(z, region));
  if (distance < width + 6) {
    const t = clamp((distance - width * 0.7) / (width * 0.3 + 5), 0, 1);
    const bank = Math.max(height, riverY(z) + 1.15);
    height = riverY(z) - 0.9 + (bank - riverY(z) + 0.9) * (t * t * (3 - 2 * t));
  }
  const shore = region === "bayu" ? clamp((z - coastline(x) + 6) / 12, 0, 1) : 0;
  return height * (1 - shore) - 1.7 * shore;
}

function noise(x, z) {
  return ((Math.sin(x * 127.1 + z * 311.7) * 43758.5453) % 1 + 1) % 1;
}

function terrainColor(x, y, z, region) {
  const [green, grass, rock] = terrainPalettes[region];
  const variation = 0.27 + 0.14 * Math.sin(x * 0.17 + z * 0.13) + 0.23 * noise(x, z);
  const shore = clamp((riverWidth(z, region) + 2.2 - Math.abs(x - riverX(z, region))) / 2.8, 0, 1);
  const plain = mix(green, grass, variation);
  const sand = region === "bayu" ? clamp((z - coastline(x) + 12) / 12, 0, 1) : 0;
  const earth = mix(plain, hex("aeac87"), Math.max(shore * 0.72, sand));
  return mix(earth, rock, clamp((y - 11) / 32, 0, 0.83));
}

function tree(mesh, x, y, z, h, variant, low) {
  mesh.cylinder(x, y + h * 0.2, z, h * 0.09, h * 0.055, h * 0.45, hex("665b45"), 4, "y", false);
  const c = mix(hex("3e694d"), hex("719153"), variant);
  const sides = low ? 5 : 7;
  mesh.cylinder(x, y + h * 0.59, z, h * 0.28, h * 0.035, h * 0.72, c, sides, "y", false);
  if (!low) mesh.cylinder(x, y + h * 0.84, z, h * 0.19, 0, h * 0.48, mix(c, hex("789d62"), 0.27), sides, "y", false);
}

function road(mesh, points, region, width = 1) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const segments = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < segments; k += 1) {
      const point = (t) => {
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        return [x, terrainY(x, z, region) + 0.18, z];
      };
      mesh.wire(point(k / segments), point((k + 1) / segments), width, asphalt);
    }
  }
}

export function landscape(meta, low) {
  const mesh = new Mesh();
  const water = new Mesh();
  const region = meta.id;
  const spacing = low ? 4 : 3;
  const radius = 108;
  const point = (x, z) => [x, terrainY(x, z, region), z];
  const tile = (x, z, size) => {
    const a = point(x, z), b = point(x, z + size);
    const c = point(x + size, z + size), d = point(x + size, z);
    const color = terrainColor(x, (a[1] + c[1]) / 2, z, region);
    mesh.tri(a, b, c, color);
    mesh.tri(a, c, d, mix(color, terrainColor(x + 1, d[1], z, region), 0.55));
  };
  for (let x = -171; x < 171; x += 9) {
    for (let z = -171; z < 171; z += 9) {
      if (x >= -radius && x < radius && z >= -radius && z < radius) continue;
      tile(x, z, 9);
    }
  }
  for (let x = -radius; x < radius; x += spacing) {
    for (let z = -radius; z < radius; z += spacing) {
      tile(x, z, spacing);
    }
  }
  if (region === "bayu") {
    for (let x = -171; x < 171; x += 6) {
      const sea = mix(hex("478d9b"), hex("5eabb0"), noise(x, 19) * 0.48);
      mesh.quad([x, 0.8, coastline(x) - 1.5], [x, 0.8, 171], [x + 6, 0.8, 171], [x + 6, 0.8, coastline(x + 6) - 1.5], sea);
    }
  }
  const waterPoint = (at, side) => [riverX(at, region) + side * riverWidth(at, region) * 0.92, riverY(at), at];
  const riverSections = [];
  for (let z = -108; z < 108; z += 1.5) {
    const rapid = z > -3.5 && z < 6.5;
    const color = rapid ? mix(hex("62bfc8"), hex("b7dfda"), noise(4, z) * 0.42) : mix(hex("36929d"), hex("62b6b5"), noise(3, z) * 0.31);
    water.quad(waterPoint(z, -1), waterPoint(z + 1.5, -1), waterPoint(z + 1.5, 1), waterPoint(z, 1), color);
    if (z % 12 === 0) {
      riverSections.push([-1, 1].flatMap((side) => [z, z + 3, z + 6, z + 9, z + 12].map((at) => waterPoint(at, side))));
    }
    if (z % 3 === 0) {
      const a = waterPoint(z, noise(5, z) * 1.5 - 0.75);
      const b = [a[0] + 0.48, riverY(z + 2.3) + 0.045, z + 2.3];
      a[1] += 0.047;
      water.wire(a, b, rapid ? 0.16 : 0.075, rapid ? hex("d9ece7") : hex("79c6c4"));
    }
  }
  const rx = riverX(1, region);
  for (let index = 0; index < 13; index += 1) {
    const z = -2.75 + index * 0.7;
    const side = index % 2 ? 1 : -1;
    mesh.box(rx + side * (4.2 + noise(1, z) * 1.8), riverY(z) + 0.1, z, 1.9, 1.15, 1.56, stone, index);
  }
  for (let i = 0; i < (low ? 320 : 630); i += 1) {
    const x = (noise(i, 0) - 0.5) * 178, z = (noise(i, 1) - 0.5) * 171;
    const inBusinessDistrict = meta.zones.some((zone) => Math.abs(x - zone.x) < 9 && Math.abs(z - zone.z) < 8);
    const nearSite = meta.sites.some((site) => Math.abs(x - site.x) < 8.7 && Math.abs(z - site.z) < 7.2);
    if (inBusinessDistrict || nearSite || Math.abs(x - riverX(z, region)) < riverWidth(z, region) + 2.8 || (region === "bayu" && z > coastline(x) - 6)) continue;
    const h = 1.6 + noise(i, 2) * 3.4;
    tree(mesh, x, terrainY(x, z, region) - 0.15, z, h, noise(i, 3), low);
  }
  road(mesh, [[-18, 10], [-12, 10], [-4, 5], [13, 4], [23, 8], [35, 12], [55, 17]], region, 0.86);
  road(mesh, [[14, 4], [14, -10], [19, -17], [24, -26], [36, -38]], region, 0.67);
  road(mesh, [[-3, 5], [2, 14], [5, 26], [11, 43]], region, 0.67);
  const bridgeZ = 17, bridgeX = riverX(bridgeZ, region);
  mesh.box(bridgeX, 2.92, bridgeZ, 13.2, 0.43, 2, asphalt);
  for (const side of [-1, 1]) {
    mesh.box(bridgeX, 3.34, bridgeZ + side * 0.89, 13.3, 0.13, 0.12, light);
    for (let i = -5; i <= 5; i += 2) mesh.box(bridgeX + i, 3.15, bridgeZ + side * 0.89, 0.12, 0.56, 0.12, concrete);
  }
  road(mesh, [[bridgeX + 6.6, bridgeZ], [-16, 14], [-13, 10]], region, 0.75);
  road(mesh, [[bridgeX - 6.6, bridgeZ], [bridgeX - 14, 15], [bridgeX - 21, 9], [bridgeX - 26, 2]], region, 0.67);
  return { terrain: mesh, water, riverSections };
}

function smallBuilding(mesh, x, y, z, w, h, d, color, active, detail = true, night = false) {
  mesh.box(x, y + h / 2, z, w, h, d, color);
  mesh.box(x, y + h + 0.12, z, w + 0.15, 0.24, d + 0.15, mix(color, dark, 0.52));
  if (!detail) return;
  const window = active ? hex(night ? "fff0a4" : "c4dfcf") : hex("506264");
  for (let floor = 0; floor < Math.min(6, Math.floor(h / 0.8)); floor += 1) {
    const row = y + 0.46 + floor * 0.8;
    for (let column = -1; column < 2; column += 1) {
      mesh.box(x + column * w * 0.26, row, z + d / 2 + 0.013, w * 0.14, 0.23, 0.026, window);
    }
    mesh.box(x + w / 2 + 0.015, row, z, 0.03, 0.23, d * 0.7, mix(window, glass, 0.37));
  }
}

function town(mesh, x, y, z, id, active, low, night) {
  mesh.box(x, y + 0.02, z, 16, 0.26, 13, asphalt);
  mesh.box(x, y + 0.17, z, 15.1, 0.05, 0.1, light);
  mesh.box(x, y + 0.17, z, 0.12, 0.05, 12.6, light);
  const count = id === "city" ? 14 : 8;
  for (let i = 0; i < count; i += 1) {
    const col = i % 5, row = Math.floor(i / 5);
    const dx = (col - 2) * 2.98 + (col > 2 ? 0.65 : -0.4);
    const dz = (row - 1) * 3.7 + 0.35;
    const h = 1.6 + noise(i, 10) * (i % 4 === 0 ? 6.6 : 3.62);
    const colors = [hex("95a395"), hex("c0b6a3"), hex("728d91"), hex("b1b5a7"), hex("ad9076")];
    smallBuilding(mesh, x + dx, y + 0.19, z + dz, 1.78 + noise(i, 12) * 0.65, h, 2.05, colors[i % colors.length], active, !low || i % 2 === 0, night);
  }
  for (let i = 0; i < 5; i += 1) tree(mesh, x - 7.4 + i * 3.65, y + 0.19, z + 5.6, 1.35, 0.62, low);
}

function industry(mesh, x, y, z, type, active, night) {
  mesh.box(x, y + 0.05, z, 11.6, 0.35, 8.1, asphalt);
  if (type === "factory") {
    smallBuilding(mesh, x - 0.5, y + 0.18, z, 7.8, 2.7, 5.1, hex("ad9176"), active, false);
    for (let i = 0; i < 4; i += 1) mesh.box(x - 3.25 + i * 1.74, y + 3.04, z, 0.65, 0.28, 5.1, hex("bdc1a8"));
    for (let i = 0; i < 2; i += 1) {
      mesh.cylinder(x + 4.4 - i * 1.2, y + 2.22, z - 1.9, 0.32, 0.27, 4.1, stone, 8);
      mesh.cylinder(x + 4.4 - i * 1.2, y + 3.78, z - 1.9, 0.28, 0.28, 0.39, hex("a7654f"), 8);
    }
  } else {
    for (let i = 0; i < 2; i += 1) {
      smallBuilding(mesh, x - 2.68 + i * 5.1, y + 0.19, z, 4.8, 2.7 + i * 0.5, 5.8, hex("809b9d"), active, true, night);
      for (let j = 0; j < 3; j += 1) mesh.box(x - 4 + i * 5.1 + j * 1.25, y + 3.03 + i * 0.5, z, 0.8, 0.29, 2.8, dark);
    }
  }
}

function roof(mesh, x, y, z, w, d, color) {
  const a = vertex(x - w / 2, y, z - d / 2), b = vertex(x - w / 2, y + 1.3, z);
  const c = vertex(x + w / 2, y + 1.3, z), e = vertex(x + w / 2, y, z - d / 2);
  const f = vertex(x - w / 2, y, z + d / 2), g = vertex(x + w / 2, y, z + d / 2);
  mesh.quad(a, b, c, e, color);
  mesh.quad(b, f, g, c, color);
  mesh.tri(f, b, a, concrete);
  mesh.tri(e, c, g, concrete);
}

function panel(mesh, x, y, z, scale = 1) {
  const h = y + 0.7 * scale;
  mesh.box(x, y + 0.32 * scale, z, 0.18, 0.7 * scale, 0.18, dark);
  for (let col = 0; col < 4; col += 1) {
    const left = x + (col - 2) * 0.56 * scale;
    const right = left + 0.523 * scale;
    mesh.quad(
      [left, h + 0.55 * scale, z - 0.8 * scale], [left, h, z + 0.66 * scale],
      [right, h, z + 0.66 * scale], [right, h + 0.55 * scale, z - 0.8 * scale],
      col % 2 ? hex("385875") : hex("486b8c"),
    );
  }
}

function windmill(mesh, x, y, z, scale = 1) {
  const h = 8.4 * scale;
  mesh.cylinder(x, y + h * 0.5, z, 0.31 * scale, 0.15 * scale, h, light, 9);
  mesh.box(x, y + h, z, 0.65 * scale, 0.45 * scale, 1.1 * scale, concrete);
  mesh.cylinder(x, y + h, z + 0.66 * scale, 0.25 * scale, 0.20 * scale, 0.3 * scale, light, 8, "z");
  for (let i = 0; i < 3; i += 1) {
    const angle = i * Math.PI * 2 / 3 + 0.22;
    const at = (r, side) => [x + (Math.sin(angle) * r + Math.cos(angle) * side) * scale, y + h + (Math.cos(angle) * r - Math.sin(angle) * side) * scale, z + 0.87 * scale];
    mesh.quad(at(0.14, 0.08), at(1.2, 0.20), at(3.39, 0.02), at(0.86, -0.19), light);
  }
}

function coolingTower(mesh, x, y, z, scale = 1) {
  const rings = [[0, 1.66], [1.2, 1.28], [3.25, 0.99], [4.9, 1.19]];
  for (let i = 0; i < rings.length - 1; i += 1) {
    const [a, bottom] = rings[i], [b, top] = rings[i + 1];
    mesh.cylinder(x, y + (a + b) / 2 * scale, z, bottom * scale, top * scale, (b - a) * scale, concrete, 14, "y", false);
  }
  mesh.cylinder(x, y + 4.85 * scale, z, 1.22 * scale, 1.22 * scale, 0.18 * scale, stone, 14, "y", false);
  mesh.cylinder(x, y + 4.5 * scale, z, 0.98 * scale, 1.04 * scale, 0.12 * scale, dark, 14);
}

function partModel(mesh, shape, x, y, z, selected) {
  const body = selected ? amber : steel;
  mesh.box(x, y + 0.08, z, 2.5, 0.19, 1.72, stone);
  if (shape === "turbine" || shape === "generator") {
    mesh.cylinder(x, y + 0.77, z, 0.63, 0.63, 1.63, body, 12, "x");
    for (const offset of [-0.56, 0.02, 0.56]) mesh.cylinder(x + offset, y + 0.77, z, 0.7, 0.7, 0.11, concrete, 10, "x");
    mesh.cylinder(x + 0.88, y + 0.77, z, 0.27, 0.23, 0.42, amber, 9, "x");
    mesh.cylinder(x - 0.94, y + 0.77, z, 0.23, 0.23, 0.3, dark, 9, "x");
    if (shape === "generator") mesh.box(x, y + 1.33, z, 0.78, 0.26, 0.67, dark);
  }
  if (shape === "pump") {
    mesh.cylinder(x - 0.45, y + 0.57, z, 0.46, 0.46, 0.7, body, 12, "x");
    mesh.cylinder(x + 0.32, y + 0.59, z, 0.5, 0.5, 0.43, amber, 12, "z");
    mesh.box(x + 0.32, y + 1.08, z, 0.25, 0.36, 0.25, amber);
    mesh.box(x + 0.72, y + 1.21, z, 0.72, 0.18, 0.22, amber);
  }
  if (shape === "panel") panel(mesh, x, y, z, 0.85);
  if (shape === "inverter") {
    for (const offset of [-0.43, 0.43]) {
      mesh.box(x + offset, y + 0.75, z, 0.73, 1.27, 0.59, body);
      mesh.box(x + offset, y + 1.02, z + 0.3, 0.37, 0.16, 0.04, aqua);
    }
  }
  if (shape === "rotor") windmill(mesh, x, y, z, 0.28);
  if (shape === "cooling") coolingTower(mesh, x, y, z, 0.46);
}

function marker(markers, id, x, y, z) {
  markers.set(id, [x, y, z]);
}

function plantModel(mesh, plant, site, region, inspect, selectedKey, markers, picks) {
  const x = site.x, z = site.z, y = terrainY(x, z, region) + 0.34;
  mesh.box(x, y - 0.22, z, 10.65, 0.65, 8.6, asphalt);
  if (plant.status === "building") {
    mesh.box(x, y + 0.22, z, 8.7, 0.42, 6.1, concrete);
    for (const dx of [-4.8, 4.8]) {
      for (const dz of [-3.6, 3.6]) mesh.box(x + dx, y + 1.25, z + dz, 0.29, 2.5, 0.29, amber);
      mesh.box(x + dx, y + 1.14, z, 0.2, 0.17, 7.3, amber);
    }
    mesh.box(x - 2.6, y + 2.16, z - 2.8, 0.34, 4.1, 0.34, amber);
    mesh.box(x - 0.8, y + 4.25, z - 2.8, 4.4, 0.19, 0.3, amber);
  } else if (plant.status === "destroyed") {
    for (let i = 0; i < 19; i += 1) {
      mesh.box(x + (noise(i, 40) - 0.5) * 8.8, y + 0.33, z + (noise(i, 41) - 0.5) * 6.8, 0.68 + noise(i, 42), 0.42 + noise(i, 44), 0.8, i % 2 ? dark : hex("786252"), i);
    }
    mesh.box(x - 3.8, y + 1.25, z - 1.7, 0.53, 2.55, 2.6, dark);
  } else if (inspect) {
    mesh.box(x, y + 0.05, z, 9.65, 0.2, 7.25, concrete);
    mesh.box(x, y + 0.34, z - 3.52, 9.65, 0.67, 0.2, steel);
    mesh.box(x - 4.72, y + 0.34, z, 0.2, 0.67, 7.25, steel);
    for (let i = 0; i < 10; i += 1) mesh.box(x - 4.45 + i * 0.87, y + 0.155, z + 3.36, 0.38, 0.026, 0.15, amber);
    const positions = [[-2.9, 0.65], [0, 0.65], [2.9, 0.65], [-1.45, -1.85], [1.45, -1.85]];
    partsFor(plant).forEach((part, index) => {
      const [dx, dz] = positions[index];
      partModel(mesh, part.shape, x + dx, y + 0.15, z + dz, part.key === selectedKey);
      marker(markers, "part-" + part.key, x + dx, y + 2.1, z + dz);
      picks.set("part-" + part.key, [[x + dx, y + 0.88, z + dz], [1.24, 0.76, 0.88]]);
    });
  } else if (plant.type === "hydro") {
    mesh.box(x, y + 1.41, z, 8.65, 2.78, 5.9, concrete);
    mesh.box(x, y + 0.45, z, 8.78, 0.77, 6.02, steel);
    roof(mesh, x, y + 2.82, z, 8.95, 6.23, hex("437683"));
    for (let i = 0; i < 5; i += 1) {
      mesh.box(x - 3.24 + i * 1.62, y + 1.83, z + 2.976, 1.01, 0.76, 0.06, glass);
      mesh.box(x - 3.24 + i * 1.62, y + 1.42, z + 3.02, 1.08, 0.07, 0.16, light);
    }
    mesh.box(x + 4.41, y + 1.05, z + 0.65, 0.17, 1.85, 1.45, dark);
    mesh.cylinder(x - 4.5, y - 0.07, z + 1.75, 0.7, 0.7, 4.3, steel, 12, "x");
    mesh.box(x - 5, y - 0.47, z + 1.75, 4.35, 0.45, 2.05, stone);
    if (plant.level > 1) mesh.box(x + 3.0, y + 3.05, z, 1.05, 0.73, 2.28, dark);
  } else if (plant.type === "solar") {
    for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) panel(mesh, x - 3.3 + i * 3.15, y, z - 2.53 + j * 2.39, 0.95);
    mesh.box(x + 4.23, y + 0.62, z + 3.13, 0.86, 1.2, 0.78, concrete);
  } else if (plant.type === "wind") {
    windmill(mesh, x - 2.7, y, z + 0.73);
    windmill(mesh, x + 3.15, y, z - 1.33, 0.82);
    if (plant.level >= 2) windmill(mesh, x + 2.7, y, z + 3.1, 0.7);
  } else {
    coolingTower(mesh, x - 2.55, y, z - 1.05);
    coolingTower(mesh, x + 2.64, y, z - 0.84, 0.93);
    mesh.box(x, y + 0.92, z + 2.3, 6.35, 1.84, 2.3, steel);
    mesh.box(x, y + 1.9, z + 2.3, 6.55, 0.22, 2.5, concrete);
  }
  if (!inspect) {
    const height = plant.status !== "online" ? 3.6 : { hydro: 4.3, solar: 1.6, wind: 11.5, nuclear: 5 }[plant.type];
    marker(markers, "site-" + site.id, x, y + Math.max(5.3, height), z);
    picks.set("site-" + site.id, [[x, y + height / 2, z], [5.25, height / 2, 4.25]]);
  }
}

function powerLine(mesh, a, b, region, energized) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  if (dist < 1) return;
  const color = energized ? hex("d1e57e") : hex("7a8a7b");
  const count = Math.max(2, Math.ceil(dist / 11));
  for (let k = 0; k < count; k += 1) {
    const point = (at) => {
      const t = at / count, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      return [x, terrainY(x, z, region) + 1.97, z];
    };
    const start = point(k), end = point(k + 1);
    const mid = start.map((value, index) => (value + end[index]) / 2 - (index === 1 ? 0.35 : 0));
    mesh.wire(start, mid, 0.115, color);
    mesh.wire(mid, end, 0.115, color);
    if (k > 0) {
      mesh.box(start[0], start[1] - 0.94, start[2], 0.17, 1.93, 0.17, dark);
      mesh.box(start[0], start[1] - 0.1, start[2], 0.62, 0.14, 0.12, steel);
    }
  }
}

export function infrastructure(grid, inspection, low, night = false) {
  const mesh = new Mesh(), markers = new Map(), picks = new Map();
  const { meta, plants, customers } = grid;
  const hub = { x: -6, z: 8 };
  const hubY = terrainY(hub.x, hub.z, meta.id);
  mesh.box(hub.x, hubY + 0.08, hub.z, 3, 0.24, 2.6, stone);
  for (const offset of [-0.95, 0, 0.95]) mesh.box(hub.x + offset, hubY + 0.66, hub.z, 0.47, 1.21, 0.76, steel);
  for (const [index, customer] of customers.entries()) {
    const zone = meta.zones[index];
    const y = terrainY(zone.x, zone.z, meta.id) + 0.25;
    const active = customer.delivered > customer.demand * 0.2;
    if (["city", "commerce"].includes(customer.type)) town(mesh, zone.x, y, zone.z, customer.type, active, low, night);
    else industry(mesh, zone.x, y, zone.z, customer.type, active, night);
    powerLine(mesh, hub, zone, meta.id, active);
    marker(markers, "customer-" + customer.id, zone.x, y + (customer.type === "city" ? 8.6 : 5.5), zone.z);
    const townZone = ["city", "commerce"].includes(customer.type);
    const halfHeight = townZone ? 3.3 : 2.05;
    picks.set("customer-" + customer.id, [[zone.x, y + halfHeight, zone.z], [townZone ? 7.5 : 5.6, halfHeight, townZone ? 6 : 4]]);
  }
  for (const site of meta.sites) {
    const plant = plants.find((item) => item.site === site.id);
    if (plant) {
      const inspect = site.id === inspection?.site && plant.status === "online";
      plantModel(mesh, plant, site, meta.id, inspect, inspection?.part, markers, picks);
      powerLine(mesh, site, hub, meta.id, plant.output > 0.5 && grid.delivered > 0);
    } else {
      const y = terrainY(site.x, site.z, meta.id);
      mesh.box(site.x, y + 0.06, site.z, 5.4, 0.13, 4.4, mix(stone, hex("82976d"), 0.7));
      for (const edge of [-1, 1]) {
        mesh.box(site.x, y + 0.18, site.z + edge * 2.14, 5.42, 0.12, 0.1, light);
        mesh.box(site.x + edge * 2.64, y + 0.18, site.z, 0.1, 0.12, 4.4, light);
      }
      marker(markers, "site-" + site.id, site.x, y + 1.16, site.z);
      picks.set("site-" + site.id, [[site.x, y + 0.32, site.z], [2.72, 0.47, 2.24]]);
    }
  }
  return { mesh, markers, picks };
}
