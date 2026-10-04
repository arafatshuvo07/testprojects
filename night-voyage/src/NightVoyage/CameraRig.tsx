import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

type Props = {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
  readonly roll: number;
  readonly fov: number;
};

// Positions the default camera from frame-derived values only.
export const CameraRig: React.FC<Props> = ({ position, target, roll, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useLayoutEffect(() => {
    camera.position.copy(position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(target);
    camera.fov = fov;
    camera.near = 1;
    camera.far = 9000;
    camera.updateProjectionMatrix();
  }, [camera, position, target, roll, fov]);

  return null;
};
