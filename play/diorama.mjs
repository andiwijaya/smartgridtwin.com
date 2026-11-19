import * as THREE from 'three';

function makeScene() {
  const scene = new THREE.Scene();
  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: .72}));
    return materials.get(color);
  }
  function mesh(parent, geometry, color, x, y, z) {
    const part = new THREE.Mesh(geometry, material(color));
    part.position.set(x, y, z);
    part.castShadow = part.receiveShadow = true;
    parent.add(part);
    return part;
  }
  function box(parent, width, height, depth, color, x, y, z) {
    return mesh(parent, new THREE.BoxGeometry(width, height, depth), color, x, y, z);
  }
  function group(x, y, z) {
    const object = new THREE.Group();
    object.position.set(x, y, z);
    scene.add(object);
    return object;
  }

  box(scene, 13.8, .52, 10.4, 0x737f66, 0, -.29, 0).castShadow = false;
  box(scene, 13.82, .1, 10.42, 0x9fbd84, 0, .02, 0).castShadow = false;
  box(scene, 4.4, .05, 7.7, 0xa7aca7, 3.68, .095, 1.34).castShadow = false;
  box(scene, 4.48, .045, .62, 0x8e9a94, 3.68, .1, 4.85).castShadow = false;
  box(scene, 4.3, .04, .82, 0xd0cbbb, -.65, .095, 1.22).castShadow = false;
  box(scene, 1.52, .045, 2.04, 0xcdcabc, 0, .096, -2.85).castShadow = false;
  for (const x of [2.12, 5.12]) box(scene, .05, .025, 3.72, 0xe2e6d9, x, .135, 1.12);

  const house = group(-3.44, .1, -1.52);
  box(house, 4.35, .18, 3.68, 0xcbbca6, 0, .09, 0);
  box(house, 4.2, 1.94, 3.5, 0xe5d9bd, 0, 1.14, 0);
  box(house, 1.12, 1.26, .12, 0x4f6c65, -.93, .8, 1.77);
  box(house, 1.43, .74, .10, 0x416470, .88, 1.2, 1.78);
  box(house, .045, .74, .12, 0xdbe5dd, .88, 1.2, 1.83);
  box(house, .10, .9, 1.41, 0x52757b, 2.11, 1.26, .15);
  box(house, .14, .045, 1.45, 0xd0d9ce, 2.15, 1.27, .15);
  const roof = new THREE.Group();
  roof.position.set(0, 2.74, 0);
  house.add(roof);
  const gable = new THREE.Shape();
  gable.moveTo(-1.75, 0);
  gable.lineTo(1.75, 0);
  gable.lineTo(0, .69);
  gable.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(gable, {depth: 4.2, bevelEnabled: false});
  mesh(house, gableGeometry, 0xd2c6ab, -2.1, 2.10, 0).rotation.y = Math.PI / 2;
  for (const direction of [-1, 1]) {
    const slope = new THREE.Group();
    slope.position.set(0, -.345, direction * .88);
    slope.rotation.x = direction * .372;
    roof.add(slope);
    box(slope, 4.55, .13, 2.09, 0x394d52, 0, 0, 0);
    if (direction === 1) {
      for (const x of [-1.4, -.46, .48, 1.42]) {
        box(slope, .86, .082, 1.53, 0x9eafb1, x, .105, 0);
        box(slope, .8, .025, 1.46, 0x223f55, x, .158, 0);
        box(slope, .015, .012, 1.4, 0x769caa, x, .176, 0);
        box(slope, .78, .012, .018, 0x769caa, x, .176, 0);
      }
    }
  }

  const battery = group(0, .12, -2.8);
  box(battery, 1.08, 1.45, .88, 0xc3cebf, 0, .74, 0);
  box(battery, .83, 1.16, .08, 0xe5e6dc, 0, .82, .46);
  box(battery, .48, .22, .045, 0x3e625e, 0, 1.12, .522);
  box(battery, .29, .065, .04, 0x72b57f, 0, 1.12, .551);

  const utility = group(5.47, .1, -3.62);
  box(utility, 1.0, .17, 1.0, 0xbfc5b7, 0, .085, 0);
  box(utility, .9, .85, .72, 0x647c73, 0, .56, 0);
  box(utility, .32, 2.32, .28, 0x727c69, .28, 1.23, -.76);
  box(utility, 1.53, .16, .19, 0x677672, .28, 2.38, -.76);
  for (const x of [-.31, .27, .84]) box(utility, .14, .25, .14, 0x414f51, x, 2.53, -.76);

  const car = group(3.51, .15, .95);
  box(car, 1.7, .42, 3.36, 0x537e76, 0, .35, 0);
  box(car, 1.49, .34, 1.77, 0x304d57, 0, .7, .16);
  box(car, 1.32, .11, 1.45, 0x6e9990, 0, .92, .19);
  box(car, 1.31, .09, .08, 0xd9e9dd, 0, .41, 1.7);
  box(car, 1.32, .08, .07, 0xbe765f, 0, .4, -1.7);
  for (const x of [-.815, .815]) {
    for (const z of [-1.04, 1.04]) {
      mesh(car, new THREE.CylinderGeometry(.26, .26, .21, 16), 0x344142, x, .23, z).rotation.z = Math.PI / 2;
      mesh(car, new THREE.CylinderGeometry(.13, .13, .222, 12), 0x9ca8a4, x, .23, z).rotation.z = Math.PI / 2;
    }
  }

  const charger = group(5.25, .14, 1.6);
  box(charger, .73, .14, .72, 0x677e79, 0, .07, 0);
  box(charger, .50, 1.38, .45, 0xe4ebdf, 0, .8, 0);
  box(charger, .34, .55, .065, 0x314b52, 0, 1.04, .242);
  box(charger, .19, .23, .034, 0xa5e3a2, 0, 1.11, .281);
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.25, 1.01, .03),
    new THREE.Vector3(-.55, .33, .1),
    new THREE.Vector3(-.94, .06, .24),
    new THREE.Vector3(-.93, .64, .47),
  ]);
  mesh(scene, new THREE.TubeGeometry(cable, 24, .037, 6, false), 0x364548, 5.25, .14, 1.6);

  for (const [x, z, size] of [[-5.56, -3.8, .83], [-5.53, 2.55, .94], [-2.51, 3.89, .60], [1.22, -4.02, .68]]) {
    mesh(scene, new THREE.CylinderGeometry(.12 * size, .18 * size, 1.4 * size, 7), 0x78674c, x, .7 * size, z);
    mesh(scene, new THREE.IcosahedronGeometry(size, 1), 0x658b65, x, 1.64 * size, z);
    mesh(scene, new THREE.IcosahedronGeometry(size * .7, 1), 0x7d9d6c, x + .3 * size, 1.98 * size, z - .1);
  }

  const ambient = new THREE.HemisphereLight(0xeef8ff, 0x8b9b7d, 2.05);
  const sun = new THREE.DirectionalLight(0xfff0d7, 2.0);
  sun.position.set(-5, 12, 7);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 25});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .028;
  scene.add(ambient, sun);
  const devices = [
    {id: 'charger-ev', model: charger, anchor: new THREE.Vector3(0, 1.06, 0)},
    {id: 'battery', model: battery, anchor: new THREE.Vector3(0, 1.10, .47)},
  ];
  return {scene, devices, sun};
}

export function mountDiorama({stage, canvas, markers, view, selectDevice, unavailable}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0xe8eee4);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const {scene, devices, sun} = makeScene();
  const idByModel = new Map(devices.map(device => [device.model, device.id]));
  const pins = devices.map(device => ({...device, marker: markers.get(device.id)}));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 60);
  const direction = new THREE.Vector3(10, 9, 13);
  const target = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const events = new AbortController();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let {pose, objectId} = view;
  let aspect = 1;
  let frame = 0;
  let press = null;
  let picked = null;
  let disposed = false;

  function paint() {
    const halfHeight = Math.max(pose.height, pose.minWidth / aspect) / 2;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    target.fromArray(pose.target);
    camera.position.copy(target).add(direction);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    for (const {model, anchor, marker} of pins) {
      model.localToWorld(projected.copy(anchor)).project(camera);
      marker.style.left = (projected.x + 1) * 50 + '%';
      marker.style.top = (1 - projected.y) * 50 + '%';
    }
  }

  function settle(next) {
    pose = next;
    paint();
    stage.dataset.cameraPose = JSON.stringify(pose);
    stage.dataset.cameraState = 'settled';
  }

  function resize() {
    if (disposed) return;
    const {width, height} = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    aspect = width / height;
    renderer.setSize(width, height, false);
    paint();
  }

  function present(nextView) {
    cancelAnimationFrame(frame);
    objectId = nextView.objectId;
    for (const {marker} of pins) marker.hidden = objectId !== null;
    canvas.style.cursor = '';
    const next = nextView.pose;
    if (reduceMotion.matches) { settle(next); return; }
    const from = pose;
    const start = performance.now();
    stage.dataset.cameraState = 'moving';

    function move(now) {
      const ratio = Math.min(Math.max((now - start) / 340, 0), 1);
      if (ratio === 1) { settle(next); return; }
      const ease = 1 - (1 - ratio) ** 3;
      pose = {
        target: from.target.map((value, i) => THREE.MathUtils.lerp(value, next.target[i], ease)),
        height: THREE.MathUtils.lerp(from.height, next.height, ease),
        minWidth: THREE.MathUtils.lerp(from.minWidth, next.minWidth, ease),
      };
      paint();
      frame = requestAnimationFrame(move);
    }
    frame = requestAnimationFrame(move);
  }

  function pickDevice(event) {
    if (objectId !== null) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(scene.children)[0];
    for (let part = hit?.object; part; part = part.parent) {
      const id = idByModel.get(part);
      if (id) return id;
    }
    return null;
  }

  const options = {signal: events.signal};
  canvas.addEventListener('pointerdown', event => {
    picked = null;
    press = event.isPrimary && event.button === 0 ? {id: event.pointerId, x: event.clientX, y: event.clientY} : null;
  }, options);
  canvas.addEventListener('pointermove', event => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press = null;
    if (event.pointerType === 'mouse') canvas.style.cursor = pickDevice(event) ? 'pointer' : '';
  }, options);
  canvas.addEventListener('pointerup', event => {
    const previous = press;
    press = null;
    if (previous?.id !== event.pointerId || Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 7) return;
    picked = pickDevice(event);
  }, options);
  canvas.addEventListener('click', event => {
    if (!picked) return;
    const id = picked;
    picked = null;
    event.preventDefault();
    selectDevice(id);
  }, options);
  canvas.addEventListener('pointercancel', () => { press = null; picked = null; }, options);
  canvas.addEventListener('pointerleave', () => { press = null; canvas.style.cursor = ''; }, options);
  canvas.addEventListener('webglcontextlost', () => { dispose(); unavailable(); }, options);

  const observer = new ResizeObserver(resize);
  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    const materials = new Set();
    scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      materials.add(object.material);
    });
    for (const material of materials) material.dispose();
    sun.shadow.dispose();
    renderer.dispose();
  }

  observer.observe(canvas);
  resize();
  settle(pose);
  stage.dataset.renderer = 'ready';
  for (const {marker} of pins) marker.hidden = objectId !== null;
  return {present, dispose};
}
