import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type MechanismPhase = "idle" | "drawing" | "locked" | "releasing" | "returned";

type TeachingModel = {
  bands: THREE.Mesh[];
  foamBall: THREE.Mesh;
  pouch: THREE.Mesh;
  releaseLever: THREE.Group;
  safetyStop: THREE.Mesh;
  sear: THREE.Group;
  sled: THREE.Group;
  triggerLink: THREE.Mesh;
};

type SceneActions = {
  syncPose: (
    draw: number,
    searEngaged: boolean,
    triggerProgress: number,
  ) => void;
};

const INITIAL_DRAW = 0.42;
const LOCK_DRAW = 0.88;
const LOCK_THRESHOLD = 0.82;
const RELEASE_DURATION_MS = 900;
const REST_SLED_Z = -0.95;
const MAX_DRAW_DISTANCE = 1.55;
const SEAR_DOWN_Y = 0.46;
const SEAR_LOCK_TRAVEL = 0.32;
const LEFT_FORK_ANCHOR = new THREE.Vector3(-1.05, 1.55, -2.45);
const RIGHT_FORK_ANCHOR = new THREE.Vector3(1.05, 1.55, -2.45);

const createMaterial = (
  color: number,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.62,
    ...options,
  });

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const disposeMesh = (mesh: THREE.Mesh) => {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((material) => material.dispose());
    return;
  }

  mesh.material.dispose();
};

const addBox = (
  parent: THREE.Object3D,
  meshes: THREE.Mesh[],
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  meshes.push(mesh);
  return mesh;
};

const addCylinder = (
  parent: THREE.Object3D,
  meshes: THREE.Mesh[],
  radius: number,
  depth: number,
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, 32),
    material,
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  meshes.push(mesh);
  return mesh;
};

const addSphere = (
  parent: THREE.Object3D,
  meshes: THREE.Mesh[],
  radius: number,
  position: [number, number, number],
  material: THREE.Material,
) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 20),
    material,
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  meshes.push(mesh);
  return mesh;
};

const setCylinderBetween = (
  mesh: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
) => {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);

  mesh.position.copy(midpoint);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
};

const getSledZ = (draw: number) => REST_SLED_Z + draw * MAX_DRAW_DISTANCE;

const getPouchAnchor = (side: "left" | "right", draw: number) =>
  new THREE.Vector3(side === "left" ? -0.24 : 0.24, 1.28, getSledZ(draw));

const syncTeachingModel = (
  model: TeachingModel,
  draw: number,
  searEngaged: boolean,
  triggerProgress: number,
) => {
  const sledZ = getSledZ(draw);
  const searY = SEAR_DOWN_Y + (searEngaged ? SEAR_LOCK_TRAVEL : 0);
  const lockedZ = getSledZ(LOCK_DRAW);
  const triggerAngle = -0.12 - triggerProgress * 0.72;

  model.sled.position.z = sledZ;
  model.pouch.position.set(0, 1.27, sledZ - 0.1);
  model.foamBall.position.set(0, 1.36, sledZ - 0.16);
  model.safetyStop.position.z = -2.02 + draw * 0.24;
  model.releaseLever.rotation.x = triggerAngle;
  model.sear.position.set(0, searY, lockedZ);

  setCylinderBetween(
    model.bands[0],
    LEFT_FORK_ANCHOR,
    getPouchAnchor("left", draw),
  );
  setCylinderBetween(
    model.bands[1],
    RIGHT_FORK_ANCHOR,
    getPouchAnchor("right", draw),
  );
  setCylinderBetween(
    model.triggerLink,
    new THREE.Vector3(-0.83, 0.52 - triggerProgress * 0.2, 0.66),
    new THREE.Vector3(-0.18, searY + 0.04, lockedZ),
  );
};

const addLabel = (
  scene: THREE.Scene,
  text: string,
  position: [number, number, number],
) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.fillStyle = "rgba(15, 23, 42, 0.82)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(125, 211, 252, 0.9)";
  context.lineWidth = 4;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = "#e0f2fe";
  context.font = "bold 44px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(...position);
  sprite.scale.set(1.28, 0.32, 1);
  scene.add(sprite);
};

const addTeachingSlingshot = (
  scene: THREE.Scene,
  meshes: THREE.Mesh[],
): TeachingModel => {
  const baseMaterial = createMaterial(0x22304a, { roughness: 0.72 });
  const railMaterial = createMaterial(0xcbd5e1, {
    metalness: 0.38,
    roughness: 0.28,
  });
  const bluePlastic = createMaterial(0x2563eb, { roughness: 0.48 });
  const redPlastic = createMaterial(0xef4444, { roughness: 0.5 });
  const yellowFoam = createMaterial(0xfacc15, {
    metalness: 0,
    roughness: 0.88,
  });
  const softBand = createMaterial(0x22c55e, {
    metalness: 0,
    roughness: 0.74,
  });
  const transparentGuard = createMaterial(0x93c5fd, {
    transparent: true,
    opacity: 0.26,
    roughness: 0.08,
  });
  const pouchMaterial = createMaterial(0x0f172a, { roughness: 0.78 });
  const notchMaterial = createMaterial(0x111827, { roughness: 0.8 });

  addBox(scene, meshes, [4.6, 0.16, 5.6], [0, 0, -0.25], baseMaterial);
  addBox(scene, meshes, [2.6, 0.12, 0.18], [0, 0.22, -2.65], bluePlastic);
  addBox(scene, meshes, [0.16, 1.9, 0.22], [-1.18, 1.05, -2.55], bluePlastic);
  addBox(scene, meshes, [0.16, 1.9, 0.22], [1.18, 1.05, -2.55], bluePlastic);
  addBox(scene, meshes, [2.58, 0.18, 0.2], [0, 1.98, -2.55], bluePlastic);

  addCylinder(scene, meshes, 0.045, 3.4, [-0.52, 0.88, -0.65], railMaterial, [
    Math.PI / 2,
    0,
    0,
  ]);
  addCylinder(scene, meshes, 0.045, 3.4, [0.52, 0.88, -0.65], railMaterial, [
    Math.PI / 2,
    0,
    0,
  ]);
  addBox(scene, meshes, [1.38, 0.34, 0.18], [0, 0.88, -2.38], railMaterial);
  addBox(scene, meshes, [1.38, 0.34, 0.18], [0, 0.88, 1.04], railMaterial);

  const sled = new THREE.Group();
  scene.add(sled);
  addBox(sled, meshes, [1.34, 0.22, 0.34], [0, 0.88, 0], bluePlastic);
  addBox(sled, meshes, [0.22, 0.34, 0.2], [-0.52, 0.88, 0], railMaterial);
  addBox(sled, meshes, [0.22, 0.34, 0.2], [0.52, 0.88, 0], railMaterial);
  addBox(sled, meshes, [0.48, 0.08, 0.2], [0, 0.69, 0], notchMaterial);
  addBox(sled, meshes, [0.42, 0.16, 0.32], [0, 1.12, -0.08], pouchMaterial);

  const pouch = addBox(
    scene,
    meshes,
    [0.6, 0.08, 0.26],
    [0, 1.27, 0],
    pouchMaterial,
  );
  const foamBall = addSphere(scene, meshes, 0.18, [0, 1.36, 0], yellowFoam);
  const leftBand = addCylinder(scene, meshes, 0.034, 1, [0, 0, 0], softBand);
  const rightBand = addCylinder(scene, meshes, 0.034, 1, [0, 0, 0], softBand);

  const releaseLever = new THREE.Group();
  releaseLever.position.set(-0.92, 0.64, 0.66);
  scene.add(releaseLever);
  addBox(releaseLever, meshes, [0.16, 0.78, 0.12], [0, -0.3, 0], redPlastic);
  addCylinder(releaseLever, meshes, 0.09, 0.32, [0, 0.1, 0], railMaterial, [
    0,
    0,
    Math.PI / 2,
  ]);

  const sear = new THREE.Group();
  scene.add(sear);
  addBox(sear, meshes, [0.28, 0.34, 0.18], [0, 0, 0], redPlastic);
  addBox(sear, meshes, [0.46, 0.06, 0.28], [0, -0.2, 0], railMaterial);
  addCylinder(sear, meshes, 0.055, 0.7, [0, -0.05, 0], railMaterial, [
    0,
    0,
    Math.PI / 2,
  ]);
  const triggerLink = addCylinder(
    scene,
    meshes,
    0.024,
    1,
    [0, 0, 0],
    railMaterial,
  );

  const safetyStop = addBox(
    scene,
    meshes,
    [1.54, 0.12, 0.12],
    [0, 1.18, -2.02],
    redPlastic,
  );
  addBox(scene, meshes, [2.2, 1.5, 0.08], [0, 1.05, -3.02], transparentGuard);
  addBox(scene, meshes, [1.72, 0.08, 0.12], [0, 1.56, -3.08], redPlastic);

  addLabel(scene, "光轴导向", [-1.45, 1.34, -0.5]);
  addLabel(scene, "弓门", [1.76, 2.1, -2.45]);
  addLabel(scene, "滑块 + 锁止槽", [1.62, 1.45, 0.25]);
  addLabel(scene, "锁舌 + 撒放", [-1.62, 0.82, 0.65]);
  addLabel(scene, "透明挡罩", [0, 2.05, -3.12]);

  const model = {
    bands: [leftBand, rightBand],
    foamBall,
    pouch,
    releaseLever,
    safetyStop,
    sear,
    sled,
    triggerLink,
  };
  syncTeachingModel(model, INITIAL_DRAW, false, 0);
  return model;
};

const getPhaseLabel = (phase: MechanismPhase) => {
  if (phase === "locked") {
    return "已锁止：锁舌顶入滑块底部锁止槽";
  }

  if (phase === "releasing") {
    return "撒放中：扳机压下，连杆带动锁舌下沉";
  }

  if (phase === "returned") {
    return "已回位：滑块回到前限位，泡棉球仍在教具防护区";
  }

  if (phase === "drawing") {
    return "后拉中：继续拉到锁止区，锁舌会顶入锁止槽";
  }

  return "待机：滑块在前限位，锁舌未接触滑块";
};

const ThreeTeachingSlingshotPage: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<SceneActions | null>(null);
  const drawRef = useRef(INITIAL_DRAW);
  const phaseRef = useRef<MechanismPhase>("drawing");
  const releaseFrameRef = useRef(0);
  const [draw, setDraw] = useState(INITIAL_DRAW);
  const [phase, setPhase] = useState<MechanismPhase>("drawing");

  useEffect(() => {
    const container = viewportRef.current;

    if (!container) {
      return;
    }

    let frameId = 0;
    let disposed = false;
    const createdMeshes: THREE.Mesh[] = [];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 10, 22);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(4.6, 3.5, 5.4);
    camera.lookAt(0, 1, -0.75);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x172554, 1.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x38bdf8, 2.1, 8);
    fillLight.position.set(-3.2, 2.5, -1.4);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(7, 7, 0x38bdf8, 0x334155);
    grid.position.y = 0.09;
    scene.add(grid);

    const model = addTeachingSlingshot(scene, createdMeshes);
    actionsRef.current = {
      syncPose: (nextDraw, searEngaged, triggerProgress) => {
        syncTeachingModel(model, nextDraw, searEngaged, triggerProgress);
      },
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) {
        return;
      }

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      if (disposed) {
        return;
      }

      scene.rotation.y = Math.sin(Date.now() * 0.00025) * 0.08;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      actionsRef.current = null;
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(releaseFrameRef.current);
      window.removeEventListener("resize", resize);
      createdMeshes.forEach(disposeMesh);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const setMechanismPhase = (nextPhase: MechanismPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const syncPoseFromPhase = (nextDraw: number, nextPhase: MechanismPhase) => {
    actionsRef.current?.syncPose(nextDraw, nextPhase === "locked", 0);
  };

  const handleDrawChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (phaseRef.current === "releasing") {
      return;
    }

    const rawDraw = Number(event.target.value) / 100;
    const nextDraw = rawDraw >= LOCK_THRESHOLD ? LOCK_DRAW : rawDraw;
    const nextPhase =
      nextDraw >= LOCK_THRESHOLD
        ? "locked"
        : nextDraw > 0.02
          ? "drawing"
          : "idle";

    drawRef.current = nextDraw;
    setDraw(nextDraw);
    setMechanismPhase(nextPhase);
    syncPoseFromPhase(nextDraw, nextPhase);
  };

  const handleRelease = () => {
    if (phaseRef.current !== "locked") {
      return;
    }

    const startDraw = drawRef.current;
    const startedAt = performance.now();
    setMechanismPhase("releasing");
    window.cancelAnimationFrame(releaseFrameRef.current);

    const animateRelease = (now: number) => {
      const progress = clamp01((now - startedAt) / RELEASE_DURATION_MS);
      const unlockProgress = clamp01(progress / 0.28);
      const returnProgress = clamp01((progress - 0.22) / 0.78);
      const nextDraw = startDraw * (1 - easeOutCubic(returnProgress));
      const searEngaged = progress < 0.18;

      drawRef.current = nextDraw;
      setDraw(nextDraw);
      actionsRef.current?.syncPose(nextDraw, searEngaged, unlockProgress);

      if (progress < 1) {
        releaseFrameRef.current = window.requestAnimationFrame(animateRelease);
        return;
      }

      drawRef.current = 0;
      setDraw(0);
      setMechanismPhase("returned");
      actionsRef.current?.syncPose(0, false, 1);
    };

    releaseFrameRef.current = window.requestAnimationFrame(animateRelease);
  };

  const handleReset = () => {
    window.cancelAnimationFrame(releaseFrameRef.current);
    drawRef.current = 0;
    setDraw(0);
    setMechanismPhase("idle");
    actionsRef.current?.syncPose(0, false, 0);
  };

  return (
    <div className="h-full overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-sky-300/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
            Three.js Teaching Model
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                低能量滑膛弹弓结构教具
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                用 Three.js
                展示光轴、弓门、撒放、滑块、皮筋、皮兜和泡棉弹丸的结构关系。撒放机构现在以锁舌卡入滑块锁止槽为核心，展示锁止、解锁、回位的因果链。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-sky-300 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                disabled={phase !== "locked"}
                onClick={handleRelease}
              >
                撒放：锁舌脱开
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-sky-200 hover:text-sky-100 disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={phase === "releasing"}
                onClick={handleReset}
              >
                复位
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <label className="block text-sm text-slate-200">
              后拉滑块至锁止区：{Math.round(draw * 100)}%
              <input
                className="mt-3 w-full accent-sky-300 disabled:opacity-50"
                disabled={phase === "releasing"}
                max="100"
                min="0"
                onChange={handleDrawChange}
                type="range"
                value={Math.round(draw * 100)}
              />
            </label>
            <div className="rounded-xl border border-sky-300/20 bg-slate-950/60 px-4 py-3 text-sm text-sky-100">
              {getPhaseLabel(phase)}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-[560px] overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-900 shadow-2xl shadow-sky-950/40">
            <div ref={viewportRef} className="h-full min-h-[560px] w-full" />
          </div>
          <aside className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
            <h2 className="text-lg font-semibold text-white">机构动作顺序</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>后拉滑块，滑块沿两根光轴移动。</li>
              <li>进入锁止区后，锁舌从下方顶入滑块底部锁止槽。</li>
              <li>点击撒放，扳机压下并通过连杆拉低锁舌。</li>
              <li>锁舌脱离锁止槽后，滑块回到前限位。</li>
            </ol>
            <h2 className="mt-5 text-lg font-semibold text-white">
              安全教学约束
            </h2>
            <ul className="mt-3 space-y-2">
              <li>弹丸限定为轻质泡棉球。</li>
              <li>前端使用透明挡罩表达防护边界。</li>
              <li>滑块只展示短行程导向，不做高能发射。</li>
              <li>皮筋为软弹性件的视觉表达。</li>
            </ul>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default ThreeTeachingSlingshotPage;
