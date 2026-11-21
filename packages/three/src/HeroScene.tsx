'use client';

import {OrbitControls} from '@react-three/drei';
import {Canvas, useLoader, useThree} from '@react-three/fiber';
import {Suspense, useEffect, useRef, type ComponentRef} from 'react';
import {Mesh, MeshStandardMaterial, Spherical, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

type SceneProps = {
 label: string;
 instructionsId: string;
 onReady: () => void;
 onUnavailable: () => void;
};

const cameraPosition = [0, .356, 5.088] as const;
const minDistance = 3.15;
const maxDistance = 6.5;
const minPolarAngle = .28;
const maxPolarAngle = 2.55;

function Figure({onReady}: Pick<SceneProps, 'onReady'>) {
 const {scene} = useLoader(GLTFLoader, '/brand/hero-figurine-hd.glb');
 useEffect(onReady, [onReady]);
 const mesh = scene.getObjectByProperty('isMesh', true);
 const material = mesh instanceof Mesh ? mesh.material : null;
 if (!(material instanceof MeshStandardMaterial) || !material.map) {
  throw new Error('The figurine texture could not be loaded.');
 }

 return <primitive object={scene}/>;
}

function Controls({label, instructionsId, onUnavailable}: Omit<SceneProps, 'onReady'>) {
 const {camera, gl, invalidate} = useThree();
 const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

 useEffect(() => {
  const canvas = gl.domElement;
  const orbit = controls.current;
  if (!orbit) return;

  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', label);
  canvas.setAttribute('aria-describedby', instructionsId);

  const position = new Vector3();
  const angles = new Spherical();
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  function onKeyDown(event: KeyboardEvent) {
   if (!orbit || event.altKey || event.ctrlKey || event.metaKey) return;
   angles.setFromVector3(position.copy(camera.position).sub(orbit.target));
   switch (event.key) {
    case 'ArrowLeft': angles.theta -= .22; break;
    case 'ArrowRight': angles.theta += .22; break;
    case 'ArrowUp': angles.phi -= .16; break;
    case 'ArrowDown': angles.phi += .16; break;
    case '+':
    case '=': angles.radius *= .9; break;
    case '-': angles.radius *= 1.12; break;
    case 'Home':
     angles.setFromVector3(position.set(...cameraPosition));
     break;
    default: return;
   }
   event.preventDefault();
   angles.radius = clamp(angles.radius, minDistance, maxDistance);
   angles.phi = clamp(angles.phi, minPolarAngle, maxPolarAngle);
   camera.position.copy(position.setFromSpherical(angles)).add(orbit.target);
   orbit.update();
   invalidate();
  }

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('webglcontextlost', onUnavailable);
  return () => {
   canvas.removeEventListener('keydown', onKeyDown);
   canvas.removeEventListener('webglcontextlost', onUnavailable);
  };
 }, [camera, gl, invalidate, label, instructionsId, onUnavailable]);

 return <OrbitControls
  ref={controls}
  domElement={gl.domElement}
  enableDamping={false}
  enablePan={false}
  minDistance={minDistance}
  maxDistance={maxDistance}
  minPolarAngle={minPolarAngle}
  maxPolarAngle={maxPolarAngle}
 />;
}

export default function HeroScene({onReady, ...controls}: SceneProps) {
 return (
  <Canvas
   camera={{position: [...cameraPosition], fov: 29, near: .1, far: 30}}
   dpr={[1.5, 2.25]}
   frameloop="demand"
   gl={{alpha: true, antialias: true, powerPreference: 'low-power'}}
  >
   <hemisphereLight args={['#ffffff', '#a6a4a0', 1.65]}/>
   <directionalLight position={[-3, 4, 5]} intensity={1.15}/>
   <directionalLight position={[3, 2, -3]} intensity={.65}/>
   <Suspense fallback={null}><Figure onReady={onReady}/></Suspense>
   <Controls {...controls}/>
  </Canvas>
 );
}
