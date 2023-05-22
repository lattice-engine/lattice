import { RenderStore } from "@lattice-engine/render";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Entity, Query, Res, SystemRes } from "thyseus";

import { Vrm } from "./components";

class LocalStore {
  delta = 0;
  last = 0;

  /**
   * Entity ID -> Vrm URI
   */
  readonly loaded = new Map<bigint, string>();

  /**
   * Entity ID -> loadVrm promise
   */
  readonly loading = new Map<bigint, Promise<void>>();

  /**
   * Entity ID -> VRM
   */
  readonly avatars = new Map<bigint, VRM>();
}

export function createAvatars(
  renderStore: Res<RenderStore>,
  localStore: SystemRes<LocalStore>,
  avatars: Query<[Entity, Vrm]>
) {
  // Update delta
  const now = performance.now();
  localStore.delta = (now - localStore.last) / 1000;
  localStore.last = now;

  const ids: bigint[] = [];

  for (const [entity, vrm] of avatars) {
    ids.push(entity.id);

    const avatar = localStore.avatars.get(entity.id);

    if (avatar) {
      avatar.update(localStore.delta);

      // Add to scene
      const node = renderStore.nodes.get(entity.id);
      if (node) node.add(avatar.scene);
    }

    // If the VRM uri hasn't changed, skip
    if (localStore.loaded.get(entity.id) === vrm.uri) continue;

    // If the VRM is loading, wait for it to finish
    if (localStore.loading.has(entity.id)) continue;

    // Remove the old VRM
    removeVrm(entity.id, localStore);

    // Set the new VRM uri
    localStore.loaded.set(entity.id, vrm.uri);

    // Load the new VRM
    const promise = loadVrm(entity.id, vrm.uri, localStore);

    // Add the loading promise to the store, and remove it when it's done
    localStore.loading.set(entity.id, promise);
    promise.then(() => localStore.loading.delete(entity.id));
  }

  // Remove old avatars
  for (const id of localStore.loaded.keys()) {
    if (!ids.includes(id)) {
      removeVrm(id, localStore);
    }
  }
}

/**
 * Load a VRM model into the local store.
 */
async function loadVrm(entityId: bigint, uri: string, localStore: LocalStore) {
  const loader = new GLTFLoader();
  loader.setCrossOrigin("anonymous");
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.loadAsync(uri);

  const vrm = gltf.userData.vrm as VRM;
  vrm.scene.rotateY(Math.PI);

  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.removeUnnecessaryJoints(vrm.scene);
  VRMUtils.rotateVRM0(vrm);

  vrm.scene.traverse((object) => {
    if (object instanceof Mesh) object.castShadow = true;
  });

  localStore.avatars.set(entityId, vrm);
}

/**
 * Remove a VRM model from the local store, and the scene.
 */
function removeVrm(entityId: bigint, localStore: LocalStore) {
  // If the VRM is loading, wait for it to finish
  const promise = localStore.loading.get(entityId);
  if (promise) {
    promise.then(() => removeVrm(entityId, localStore));
    return;
  }

  const vrm = localStore.avatars.get(entityId);
  if (vrm) {
    vrm.scene.removeFromParent();
    VRMUtils.deepDispose(vrm.scene);
  }

  localStore.loaded.delete(entityId);
  localStore.loading.delete(entityId);
  localStore.avatars.delete(entityId);
}