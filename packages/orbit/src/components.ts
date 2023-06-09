import { struct } from "thyseus";

/**
 * Marks an entity as having orbit controls.
 * Entity must also have a PerspectiveCamera, which will be used as the target.
 */
@struct
export class OrbitControls {}
