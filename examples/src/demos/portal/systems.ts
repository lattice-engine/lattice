import { CoreStore, Warehouse } from "lattice-engine/core";
import { PortalMaterial } from "lattice-engine/portal";
import {
  BasicMaterial,
  GlobalTransform,
  Mesh,
  Parent,
  SceneStruct,
  StandardMaterial,
  Transform,
} from "lattice-engine/scene";
import { Commands, dropStruct, Mut, Res } from "thyseus";

import { createBox } from "../../utils/createBox";
import { createLights } from "../../utils/createLights";
import { createPlayer } from "../../utils/createPlayer";
import { createScene } from "../../utils/createScene";
import { createBoxGeometry, createPlaneGeometry } from "../../utils/geometry";

export function initScene(
  warehouse: Res<Warehouse>,
  commands: Commands,
  coreStore: Res<Mut<CoreStore>>,
  sceneStruct: Res<Mut<SceneStruct>>
) {
  const { rootId, sceneId } = createScene(commands, coreStore, sceneStruct);
  createLights(commands, sceneId);
  createPlayer([0, 2, 0], rootId, commands, sceneStruct);

  createBox(commands, warehouse, {
    parentId: rootId,
    size: [10, 1, 10],
    translation: [0, -1, 0],
  });

  const geometry = createPlaneGeometry(warehouse, 3, 3);
  const transform = new Transform([-2, 0, -4]);
  const parent = new Parent(rootId);

  const portalA = commands
    .spawn()
    .add(transform)
    .addType(GlobalTransform)
    .add(parent)
    .addType(Mesh)
    .addType(BasicMaterial)
    .add(geometry);

  const portalB = commands
    .spawn()
    .add(transform.set([2, 0, -4]))
    .addType(GlobalTransform)
    .add(parent)
    .addType(Mesh)
    .addType(BasicMaterial)
    .add(geometry);

  dropStruct(geometry);

  const portal = new PortalMaterial();

  portal.targetId = portalB.id;
  portalA.add(portal);

  portal.targetId = portalA.id;
  portalB.add(portal);

  dropStruct(portal);

  const boxGeometry = createBoxGeometry(warehouse);
  const boxMaterial = new StandardMaterial([1, 0.3, 0.3, 1]);

  commands
    .spawn(true)
    .add(transform.set([-1, 0, 2]))
    .addType(GlobalTransform)
    .add(parent)
    .addType(Mesh)
    .add(boxGeometry)
    .add(boxMaterial);

  boxMaterial.baseColor.set(0.6, 1, 0.4, 1);

  commands
    .spawn(true)
    .add(transform.set([1, 0, 2]))
    .addType(GlobalTransform)
    .add(parent)
    .addType(Mesh)
    .add(boxGeometry)
    .add(boxMaterial);

  dropStruct(boxGeometry);
  dropStruct(boxMaterial);
  dropStruct(parent);
}
