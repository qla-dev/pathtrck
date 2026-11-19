import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildVehicleModel } from './buildVehicleModel';
import { VehicleIllustration } from './VehicleIllustration';
import type { VehicleModelData } from './vehicleModelSpec';

export default function VehicleModel3D({ vehicle, label, angle = 'perspective', simplified=false }: { vehicle: VehicleModelData; label: string; angle?: string; simplified?:boolean }) {
  const host=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false);
  const key=JSON.stringify([vehicle.vehicle_type,vehicle.make,vehicle.model,vehicle.transport_type,vehicle.features,vehicle.length_m,vehicle.width_m,vehicle.height_m,vehicle.linked_trailers,simplified]);
  useEffect(()=>{
    const element=host.current;if(!element)return;let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFailed(true);return;}
    setFailed(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.touchAction='pan-y';element.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,1000);
    const {group}=buildVehicleModel(vehicle,simplified);scene.add(group);
    const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());group.position.x-=center.x;group.position.z-=center.z;
    const target=new THREE.Vector3(0,size.y*.48,0),span=Math.max(size.x,size.z,size.y*1.8);
    const hemi=new THREE.HemisphereLight('#e7f5ff','#647989',2.1);scene.add(hemi);
    const sun=new THREE.DirectionalLight('#fff5e5',4.2);sun.position.set(span*.5,span*.85,span*.65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-span;sun.shadow.camera.right=span;sun.shadow.camera.top=span;sun.shadow.camera.bottom=-span;sun.shadow.camera.far=span*5;sun.shadow.normalBias=.025;scene.add(sun);
    const rim=new THREE.DirectionalLight('#9bdbff',2.8);rim.position.set(-span*.6,span*.5,-span);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(span*5,span*5),new THREE.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.49;controls.rotateSpeed=.6;
    let disposed=false,frame=0;
    const render=()=>{if(disposed)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed)renderer.render(scene,camera);});};
    const resize=()=>{
      if(disposed)return;const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h,false);camera.aspect=w/h;
      const fov=THREE.MathUtils.degToRad(camera.fov),dist=Math.max(size.y*1.3/(2*Math.tan(fov/2)),Math.max(size.x,size.z)*1.18/(2*Math.tan(fov/2)*camera.aspect));
      const vector=angle==='side'?new THREE.Vector3(.06,.2,1):angle==='front'?new THREE.Vector3(1,.25,.08):angle==='rear'?new THREE.Vector3(-1,.3,.8):new THREE.Vector3(.82,.45,1);
      vector.normalize().multiplyScalar(Math.max(dist,span*.85));camera.position.copy(target).add(vector);camera.near=.05;camera.far=Math.max(500,span*15);camera.updateProjectionMatrix();controls.update();render();
    };
    const observer=new ResizeObserver(resize);observer.observe(element);controls.addEventListener('change',render);resize();
    const lost=(e:Event)=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
      scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>{materials.add(m);const map=(m as THREE.MeshStandardMaterial).map;if(map)textures.add(map);});}});
      geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[key,angle]);
  return <div className="relative h-full w-full" role="img" aria-label={label}><div ref={host} className={`absolute inset-0 ${failed?'invisible':''}`}/>{failed&&<div className="flex h-full flex-col items-center justify-center p-5"><VehicleIllustration vehicle={vehicle} label={label}/><span className="text-[10px] text-slate-500">WebGL · 2D</span></div>}</div>;
}
