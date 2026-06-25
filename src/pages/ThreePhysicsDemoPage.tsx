import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

type PhysicsMesh = {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
};

type TargetState = PhysicsMesh & {
  startPosition: THREE.Vector3;
  startRotation: THREE.Quaternion;
};

type MechanismState = {
  charge: number;
  sled: THREE.Group;
  previewBall: THREE.Mesh;
  leftBand: THREE.Mesh;
  rightBand: THREE.Mesh;
};

type SceneActions = {
  setCharge: (charge: number) => void;
  launch: () => void;
  reset: () => void;
};

const INITIAL_CHARGE = 0.65;
const REST_SLED_Z = -1.55;
const MAX_DRAW_DISTANCE = 2.25;
const LEFT_FORK_ANCHOR = new THREE.Vector3(-0.86, 1.94, -3.18);
const RIGHT_FORK_ANCHOR = new THREE.Vector3(0.86, 1.94, -3.18);

const createMaterial = (
  color: number,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.2,
    ...options,
  });

const disposeMesh = (mesh: THREE.Mesh) => {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((material) => material.dispose());
    return;
  }

  mesh.material.dispose();
};

const addBox = (
  scene: THREE.Scene,
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
  scene.add(mesh);
  meshes.push(mesh);
  return mesh;
};

const addCylinder = (
  scene: THREE.Scene,
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
  scene.add(mesh);
  meshes.push(mesh);
  return mesh;
};

const addLocalBox = (
  group: THREE.Group,
  meshes: THREE.Mesh[],
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
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

const getSledZ = (charge: number) => REST_SLED_Z + charge * MAX_DRAW_DISTANCE;

const getSledAnchor = (side: "left" | "right", charge: number) =>
  new THREE.Vector3(side === "left" ? -0.22 : 0.22, 1.61, getSledZ(charge));

const syncMechanism = (mechanism: MechanismState) => {
  const sledZ = getSledZ(mechanism.charge);
  mechanism.sled.position.z = sledZ;
  mechanism.previewBall.position.set(0, 1.62, sledZ - 0.17);
  setCylinderBetween(
    mechanism.leftBand,
    LEFT_FORK_ANCHOR,
    getSledAnchor("left", mechanism.charge),
  );
  setCylinderBetween(
    mechanism.rightBand,
    RIGHT_FORK_ANCHOR,
    getSledAnchor("right", mechanism.charge),
  );
};

const addShadowBoreSlingshot = (
  scene: THREE.Scene,
  meshes: THREE.Mesh[],
): MechanismState => {
  const blackTitanium = createMaterial(0x111827, {
    metalness: 0.72,
    roughness: 0.28,
  });
  const brushedSteel = createMaterial(0xcbd5e1, {
    metalness: 0.88,
    roughness: 0.18,
  });
  const darkRail = createMaterial(0x020617, {
    metalness: 0.62,
    roughness: 0.34,
  });
  const greenElastic = createMaterial(0x93ff22, {
    emissive: 0x3ea205,
    emissiveIntensity: 0.95,
    metalness: 0.02,
    roughness: 0.32,
  });
  const redGlass = createMaterial(0xef4444, {
    emissive: 0x6d0505,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.78,
    metalness: 0.08,
  });
  const gripMaterial = createMaterial(0x4a2b24, {
    metalness: 0.04,
    roughness: 0.78,
  });

  addBox(scene, meshes, [0.58, 0.12, 5.55], [0, 1.12, -0.62], darkRail);
  addBox(scene, meshes, [0.12, 0.36, 5.35], [-0.38, 1.32, -0.62], brushedSteel);
  addBox(scene, meshes, [0.12, 0.36, 5.35], [0.38, 1.32, -0.62], brushedSteel);
  addBox(
    scene,
    meshes,
    [0.18, 0.16, 5.05],
    [-0.78, 1.58, -0.47],
    blackTitanium,
  );
  addBox(scene, meshes, [0.18, 0.16, 5.05], [0.78, 1.58, -0.47], blackTitanium);

  addCylinder(scene, meshes, 0.08, 5.25, [-0.62, 1.8, -0.5], brushedSteel, [
    Math.PI / 2,
    0,
    0,
  ]);
  addCylinder(scene, meshes, 0.08, 5.25, [0.62, 1.8, -0.5], brushedSteel, [
    Math.PI / 2,
    0,
    0,
  ]);
  addBox(scene, meshes, [1.78, 0.16, 0.28], [0, 1.72, -3.28], brushedSteel);
  addCylinder(scene, meshes, 0.13, 1.95, [0, 1.96, -3.22], brushedSteel, [
    0,
    0,
    Math.PI / 2,
  ]);
  addCylinder(
    scene,
    meshes,
    0.11,
    1.1,
    [-0.95, 1.58, -2.78],
    brushedSteel,
    [0.62, 0, -0.22],
  );
  addCylinder(
    scene,
    meshes,
    0.11,
    1.1,
    [0.95, 1.58, -2.78],
    brushedSteel,
    [0.62, 0, 0.22],
  );

  addBox(scene, meshes, [0.82, 0.22, 0.48], [0, 1.84, -0.92], blackTitanium);
  addBox(scene, meshes, [0.58, 0.14, 0.28], [0, 2.04, -0.92], brushedSteel);
  addCylinder(scene, meshes, 0.19, 0.72, [0, 2.23, -0.92], blackTitanium, [
    Math.PI / 2,
    0,
    0,
  ]);
  addCylinder(scene, meshes, 0.125, 0.78, [0, 2.23, -0.96], redGlass, [
    Math.PI / 2,
    0,
    0,
  ]);

  addBox(
    scene,
    meshes,
    [0.58, 1.18, 0.28],
    [-0.18, 0.54, 1.38],
    gripMaterial,
    [0.45, 0, -0.12],
  );
  addBox(scene, meshes, [0.86, 0.18, 0.36], [0, 1.0, 1.18], blackTitanium);
  addBox(scene, meshes, [0.26, 0.22, 1.68], [0, 1.14, 2.66], brushedSteel);
  addBox(scene, meshes, [1.12, 0.62, 0.24], [0, 1.16, 3.52], brushedSteel);
  addBox(scene, meshes, [0.86, 0.42, 0.16], [0, 1.18, 3.66], blackTitanium);

  const sled = new THREE.Group();
  scene.add(sled);
  addLocalBox(sled, meshes, [0.7, 0.22, 0.34], [0, 1.56, 0], blackTitanium);
  addLocalBox(sled, meshes, [0.42, 0.08, 0.46], [0, 1.76, -0.05], brushedSteel);
  addLocalBox(
    sled,
    meshes,
    [0.1, 0.42, 0.18],
    [-0.28, 1.55, 0.04],
    brushedSteel,
  );
  addLocalBox(
    sled,
    meshes,
    [0.1, 0.42, 0.18],
    [0.28, 1.55, 0.04],
    brushedSteel,
  );

  const previewBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 28, 18),
    createMaterial(0x93ff22, {
      emissive: 0x4fbd08,
      emissiveIntensity: 1.15,
      metalness: 0.18,
    }),
  );
  previewBall.castShadow = true;
  scene.add(previewBall);
  meshes.push(previewBall);

  const leftBand = addCylinder(
    scene,
    meshes,
    0.045,
    1,
    [0, 0, 0],
    greenElastic,
  );
  const rightBand = addCylinder(
    scene,
    meshes,
    0.045,
    1,
    [0, 0, 0],
    greenElastic,
  );
  const mechanism = { charge: 0, sled, previewBall, leftBand, rightBand };
  syncMechanism(mechanism);
  return mechanism;
};

const ThreePhysicsDemoPage: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<SceneActions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [charge, setCharge] = useState(INITIAL_CHARGE);
  const [shotCount, setShotCount] = useState(0);

  useEffect(() => {
    const container = viewportRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let frameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    const createdMeshes: THREE.Mesh[] = [];

    const runDemo = async () => {
      try {
        await RAPIER.init();
      } catch (initError) {
        if (!disposed) {
          setError(
            initError instanceof Error
              ? initError.message
              : "Failed to initialize Rapier physics engine",
          );
        }
        return;
      }

      if (disposed) {
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05070c);
      scene.fog = new THREE.Fog(0x05070c, 15, 38);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(5.9, 4.1, 6.7);
      camera.lookAt(0, 1.45, -0.65);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.35);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.3);
      keyLight.position.set(3.6, 7.5, 5.1);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      scene.add(keyLight);

      const greenRim = new THREE.PointLight(0x93ff22, 4.8, 12);
      greenRim.position.set(-3.1, 2.8, -3.4);
      scene.add(greenRim);

      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      world.timestep = 1 / 60;

      addBox(
        scene,
        createdMeshes,
        [12, 0.28, 14],
        [0, -0.14, -2.4],
        createMaterial(0x0f172a, { roughness: 0.86, metalness: 0.05 }),
      );
      const groundBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.14, -2.4),
      );
      world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.14, 7), groundBody);

      const grid = new THREE.GridHelper(12, 12, 0x93ff22, 0x1e293b);
      grid.position.y = 0.01;
      grid.position.z = -2.4;
      scene.add(grid);

      const mechanism = addShadowBoreSlingshot(scene, createdMeshes);
      mechanism.charge = INITIAL_CHARGE;
      syncMechanism(mechanism);

      const targets: TargetState[] = [];
      const targetMaterial = createMaterial(0x38bdf8, {
        emissive: 0x082f49,
        emissiveIntensity: 0.35,
        metalness: 0.15,
      });
      const targetPositions = [
        new THREE.Vector3(-1.05, 0.55, -7.1),
        new THREE.Vector3(0, 0.55, -7.35),
        new THREE.Vector3(1.05, 0.55, -7.1),
        new THREE.Vector3(-0.52, 1.45, -7.25),
        new THREE.Vector3(0.52, 1.45, -7.25),
      ];

      targetPositions.forEach((position, index) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.92, 0.32),
          targetMaterial.clone(),
        );
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        createdMeshes.push(mesh);

        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: 0, y: 0.04 * index, z: 0, w: 1 })
            .setCanSleep(false),
        );
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.31, 0.46, 0.16)
            .setRestitution(0.2)
            .setFriction(0.9),
          body,
        );
        targets.push({
          mesh,
          body,
          startPosition: position.clone(),
          startRotation: mesh.quaternion.clone(),
        });
      });

      const projectiles: PhysicsMesh[] = [];
      const projectileMaterial = createMaterial(0x93ff22, {
        emissive: 0x4fbd08,
        emissiveIntensity: 1.2,
        metalness: 0.18,
      });

      const removeProjectile = (projectile: PhysicsMesh) => {
        scene.remove(projectile.mesh);
        disposeMesh(projectile.mesh);
        world.removeRigidBody(projectile.body);
      };

      actionsRef.current = {
        setCharge: (nextCharge) => {
          mechanism.charge = Math.min(Math.max(nextCharge, 0), 1);
          syncMechanism(mechanism);
        },
        launch: () => {
          const launchCharge = Math.max(mechanism.charge, 0.08);
          const sledZ = getSledZ(launchCharge);
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 28, 18),
            projectileMaterial.clone(),
          );
          mesh.position.set(0, 1.62, sledZ - 0.2);
          mesh.castShadow = true;
          scene.add(mesh);

          const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
              .setTranslation(0, 1.62, sledZ - 0.2)
              .setLinvel(0, 0.72 + launchCharge * 1.3, -17 - launchCharge * 19)
              .setCanSleep(false),
          );
          world.createCollider(
            RAPIER.ColliderDesc.ball(0.16)
              .setRestitution(0.34)
              .setFriction(0.45)
              .setDensity(3.2),
            body,
          );

          mechanism.charge = 0;
          syncMechanism(mechanism);
          setCharge(0);
          setShotCount((count) => count + 1);
          projectiles.push({ mesh, body });

          if (projectiles.length > 8) {
            const staleProjectile = projectiles.shift();
            if (staleProjectile) {
              removeProjectile(staleProjectile);
            }
          }
        },
        reset: () => {
          while (projectiles.length > 0) {
            const projectile = projectiles.pop();
            if (projectile) {
              removeProjectile(projectile);
            }
          }

          targets.forEach(({ body, mesh, startPosition, startRotation }) => {
            body.setTranslation(startPosition, true);
            body.setRotation(startRotation, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            mesh.position.copy(startPosition);
            mesh.quaternion.copy(startRotation);
          });
          mechanism.charge = INITIAL_CHARGE;
          syncMechanism(mechanism);
          setCharge(INITIAL_CHARGE);
          setShotCount(0);
        },
      };
      setIsReady(true);

      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!renderer || width === 0 || height === 0) {
          return;
        }

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      resize();
      window.addEventListener("resize", resize);

      const syncPhysicsMesh = ({ mesh, body }: PhysicsMesh) => {
        const position = body.translation();
        const rotation = body.rotation();
        mesh.position.set(position.x, position.y, position.z);
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      };

      const animate = () => {
        if (disposed || !renderer) {
          return;
        }

        world.step();
        targets.forEach(syncPhysicsMesh);
        projectiles.forEach(syncPhysicsMesh);

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      animate();

      return () => {
        actionsRef.current = null;
        setIsReady(false);
        window.removeEventListener("resize", resize);
        scene.remove(grid);
        projectiles.forEach(removeProjectile);
        world.free();
        createdMeshes.forEach(disposeMesh);
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    };

    let cleanupScene: (() => void) | undefined;
    void runDemo().then((cleanup) => {
      cleanupScene = cleanup;

      if (disposed) {
        cleanupScene?.();
      }
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      cleanupScene?.();
    };
  }, []);

  const handleChargeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextCharge = Number(event.target.value) / 100;
    setCharge(nextCharge);
    actionsRef.current?.setCharge(nextCharge);
  };

  const handleLaunch = () => {
    actionsRef.current?.launch();
  };

  const handleReset = () => {
    actionsRef.current?.reset();
  };

  return (
    <div className="h-full overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-lime-300/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-lime-300">
            Three.js + Rapier
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                暗影滑膛弹弓 Mk-II
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                架空道具级机械设计：中心 U
                型滑膛负责导向，双侧承力梁承担拉力，前置叉架固定荧光弹力带，滑块携带弹托沿导轨蓄力并释放弹丸。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-lime-300/30 px-3 py-2 text-sm text-lime-100">
                Shots: {shotCount}
              </span>
              <button
                type="button"
                className="rounded-full bg-lime-300 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/20 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                disabled={!isReady || Boolean(error)}
                onClick={handleLaunch}
              >
                释放滑块
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-lime-200 hover:text-lime-100 disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={!isReady || Boolean(error)}
                onClick={handleReset}
              >
                重置机构
              </button>
            </div>
          </div>
          <label className="mt-5 block max-w-xl text-sm text-slate-200">
            蓄力行程：{Math.round(charge * 100)}%
            <input
              className="mt-3 w-full accent-lime-300"
              disabled={!isReady || Boolean(error)}
              max="100"
              min="0"
              onChange={handleChargeChange}
              type="range"
              value={Math.round(charge * 100)}
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-950/60 p-6 text-red-100">
            Failed to start physics demo: {error}
          </div>
        ) : (
          <div className="min-h-[560px] flex-1 overflow-hidden rounded-2xl border border-lime-300/20 bg-slate-900 shadow-2xl shadow-lime-950/40">
            <div ref={viewportRef} className="h-full min-h-[560px] w-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreePhysicsDemoPage;
