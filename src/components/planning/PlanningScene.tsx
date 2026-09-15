import React, { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cargo, Equipment } from './model';

export type SceneView = 'exterior' | 'loading' | 'top' | 'side';
type Props = { equipment: Equipment; cargo: Cargo[]; view: SceneView; warehouse?: boolean; walls?: boolean; dimensions?: boolean; selected?: string; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number, z: number) => void; reset?: number; zoom?: number; unavailable: string; mini?: boolean };

function label(text: string, scale = 1) {
  const font = 'bold 44px sans-serif', canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
  ctx.font = font; canvas.width = Math.ceil(ctx.measureText(text).width) + 48; canvas.height = 76;
  ctx.fillStyle = '#132638'; ctx.beginPath(); ctx.roundRect(0,0,canvas.width,76,18); ctx.fill();
  ctx.font = font; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,canvas.width/2,40);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 10; // drawn after the container, so no edge ever cuts through a label
  sprite.scale.set(.45*scale*canvas.width/76,.45*scale,1); return sprite;
}
// Cargo names are printed on every face, as on marked cartons, so they stay readable from any view.
function faceTexture(text: string, color: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle = 'rgba(16,38,58,.35)'; ctx.lineWidth = 10; ctx.strokeRect(5,5,246,246);
  ctx.fillStyle = '#10263a'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,128,130,224);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}
export function PlanningScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const [failed, setFailed] = useState(false);
  const runtime = useRef<{ redraw: () => void; changeView: () => void; zoom: (n: number) => void } | null>(null);
  useEffect(() => {
    const element = host.current!;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    // Transparent, so the card's own light or dark background shows behind the scene.
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = !latest.current.mini;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    // Percentage size keeps the canvas from holding its container wide after a resize.
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38,1,.05,180);
    const ortho = new T.OrthographicCamera(-8,8,4,-4,.05,180);
    let activeCamera: T.Camera = latest.current.mini ? ortho : camera;
    const controls = new OrbitControls(camera,renderer.domElement);
    // Orbit (drag) and pan (right-drag or Shift+drag) share one hand cursor, closed while the view moves.
    controls.addEventListener('start', () => element.classList.add('is-grabbing'));
    controls.addEventListener('end', () => element.classList.remove('is-grabbing'));
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2 - .02; controls.minDistance = 2; controls.maxDistance = 60; controls.enabled = !latest.current.mini;
    scene.add(new T.HemisphereLight(0xffffff,0x697984,2.6));
    const sun = new T.DirectionalLight(0xffffff,3.5); sun.position.set(-3,16,10); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18; scene.add(sun);
    let model = new T.Group(); scene.add(model);
    let roof = new T.Group(), side = new T.Group(), doors: T.Group[] = [], cargoMeshes: T.Object3D[] = [];
    let roofTarget=0, sideTarget=1, doorTarget=0;
    let racks=new T.Group(), shell=new T.Group(), rackShow=latest.current.warehouse?1:0, shellShow=latest.current.walls===false?0:1;
    // Toggles animate instead of popping: warehouse racks drop in from above, walls lift away and settle back.
    const applyToggles=()=>{
      const ease=(p:number)=>1-Math.pow(1-p,3);
      racks.visible=rackShow>.01;racks.position.y=(1-ease(rackShow))*9;
      // Walls fly well clear of the frame, growing slightly as they rise, before they are hidden.
      const lift=1-ease(shellShow);shell.visible=shellShow>.01;shell.position.y=lift*18;shell.scale.setScalar(1+lift*.2);
    };
    const dispose = (root: T.Object3D) => root.traverse(obj => {
      const mesh = obj as T.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { (material as T.MeshBasicMaterial).map?.dispose(); material.dispose(); }
    });
    const box = (parent: T.Object3D, x:number,y:number,z:number,l:number,h:number,w:number,color:string, opacity=1) => {
      const mesh=new T.Mesh(new T.BoxGeometry(l,h,w),new T.MeshStandardMaterial({color,roughness:.75,metalness:.15,transparent:opacity<1,opacity}));
      mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    };
    const redraw=() => {
      const {equipment:e,cargo,selected,mini}=latest.current;
      const oldRoof=roof.position.y; dispose(model);scene.remove(model);model=new T.Group();scene.add(model);
      roof=new T.Group();side=new T.Group();doors=[];cargoMeshes=[];racks=new T.Group();shell=new T.Group();
      const L=e.length,W=e.width,H=e.height;
      // Local coordinates: x along length, y up, z across width; doors at x=L.
      model.position.set(-L/2,0,-W/2);
      if (!mini) {
        const dark=document.documentElement.classList.contains('dark');
        box(model,L/2,-.32,W/2,Math.max(36,L+24),.16,36,dark?'#1e293b':'#d9e3e8');
        const grid=new T.GridHelper(40,80,dark?0x3b4a5e:0xbdcdd7,dark?0x2a3648:0xd0dce3);grid.position.set(L/2,-.23,W/2);model.add(grid);
        {const model=racks;
          // Mirrored rack rows centred on the unit, far enough out that the default cameras stand inside the aisle.
          const span=Math.ceil((L/2+6)/3)*3;
          for (const dz of [-15,-11.5,11.5,15]) for (let x=L/2-span;x<=L/2+span+.01;x+=3) {const z=W/2+dz;
            for(const y of [1,2.5,4]){box(model,x,y,z,2.6,.08,1.2,'#517386');for(let i=0;i<3;i++)box(model,x-.8+i*.8,y+.42,z,.65,.8,.9,['#bd9367','#c4a079','#ac8053'][i]);}
            for(const dx of [-1.3,1.3])box(model,x+dx,2.4,z,.09,4.8,1.25,'#607e90');
          }
        }
        model.add(racks);
      }
      box(model,L/2,-.1,W/2,L+.2,.2,W+.2,'#314f65');
      for(let z=.06;z<W;z+=.18)box(model,L/2,.01,z,L,.03,.165,'#9d8060');
      // Walls, posts, roof and doors live in one group, so switching walls off leaves only the loading floor.
      {const model=shell;
      box(model,-.055,H/2,W/2,.11,H,W,'#698da3');
      box(model,L/2,H/2,-.055,L,H,.11,'#7698ab');
      for(let x=.15;x<L;x+=.19){box(model,x,H/2,-.13,.06,H,.07,'#5d8197');box(side,x,H/2,W+.13,.065,H,.075,'#5d8197');}
      box(side,L/2,H/2,W+.055,L,H,.09,'#7698ab'); model.add(side);
      for(const x of [0,L])for(const z of [0,W])box(model,x,H/2,z,.13,H+.15,.13,'#304f65');
      for(const z of [0,W])for(const y of [0,H])box(model,L/2,y,z,L+.18,.12,.12,'#304f65');
      box(roof,L/2,H+.04,W/2,L,.1,W,'#91adbd');
      for(let x=.14;x<L;x+=.2)box(roof,x,H+.12,W/2,.06,.06,W,'#7393a8');
      roof.visible=!e.openTop;roof.position.y=oldRoof;model.add(roof);
      for(const edge of [0,1]) {
        const door=new T.Group();door.position.set(L+.07,0,edge*W);
        const center=(edge===0?1:-1)*W/4;
        box(door,0,H/2,center,.09,H,W/2,'#6b8da4');
        for(const dz of [-.2,.2])box(door,.07,H/2,center+dz,.04,H-.22,.04,'#c2d0d8');
        model.add(door);doors.push(door);
      }
      }
      model.add(shell);applyToggles();
      if(e.truck) {
        box(model,-1.15,.75,W/2,2.1,1.8,W+.05,'#008fca');box(model,-1.5,1.2,W/2,1,.8,W+.09,'#253f50');
        box(model,L/2,-.35,W/2,L+2,.25,W*.8,'#263746');
        for(const x of [-1.3,L-1,L-2])for(const z of [-.05,W+.05]) {
          const wheel=new T.Mesh(new T.CylinderGeometry(.42,.42,.25,24),new T.MeshStandardMaterial({color:'#202d35'}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,-.25,z);model.add(wheel);
          const hub=new T.Mesh(new T.CylinderGeometry(.21,.21,.27,16),new T.MeshStandardMaterial({color:'#9cabb5',metalness:.7,roughness:.3}));hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);model.add(hub);
        }
      }
      cargo.filter(c=>c.placed).forEach(c=>{
        const group=new T.Group();group.position.set(c.x,c.y+.04,c.z);group.userData.cargoId=c.id;model.add(group);
        let geometry:T.BufferGeometry;
        if(c.shape==='drum')geometry=new T.CylinderGeometry(Math.min(c.length,c.width)/2,Math.min(c.length,c.width)/2,c.height,24);
        else if(c.shape==='pipe'){geometry=new T.CylinderGeometry(Math.min(c.width,c.height)/2,Math.min(c.width,c.height)/2,c.length,24);geometry.rotateZ(Math.PI/2);}
        else geometry=new T.BoxGeometry(c.length,c.height,c.width);
        const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({map:faceTexture(c.name,c.color),roughness:.7,metalness:c.shape==='pipe'?.4:.05}));mesh.position.set(c.length/2,c.height/2,c.width/2);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
        const edges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(c.length,c.height,c.width)),new T.LineBasicMaterial({color:c.id===selected?'#ffffff':'#263746'}));edges.position.copy(mesh.position);group.add(edges);
        if(c.shape==='pallet')for(const z of [.08,c.width/2,c.width-.08])box(group,c.length/2,.06,z,c.length,.12,.09,'#987548');        cargoMeshes.push(group);
      });
      // Size labels follow their own toggle, so they stay readable from every perspective.
      if(latest.current.dimensions!==false&&!mini) {
        for(const [text,pos] of [[`${L.toFixed(3)} m`,[L/2,.15,W+.65]],[`${W.toFixed(3)} m`,[L+.65,.15,W/2]],[`${H.toFixed(3)} m`,[-.3,H+.5,W/2]]] as [string,number[]][]){const tag=label(text);tag.position.set(pos[0],pos[1],pos[2]);model.add(tag);}
      }
    };
    const target=new T.Vector3(); let transition=0;
    const changeView=()=>{
      const {view,equipment:e,mini}=latest.current;const L=e.length;
      roofTarget=view==='top'?e.height+2:0;
      sideTarget=(view==='top'||view==='side')?.12:1;
      // Open doors fold back against the side walls, as in the door-opening reference.
      doorTarget=view==='exterior'?0:Math.PI*.9;
      // Frame the whole unit for the viewport's aspect; the small offset keeps screen-up along -z so length reads left to right.
      const aspect=Math.max(element.clientWidth,1)/Math.max(element.clientHeight,1),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2)),reach=L/2+(e.truck?2.6:1.6);
      if(view==='top'){const d=Math.max(reach/(tan*aspect),(e.width/2+.8)/tan);target.set(0,e.height+d,d*.02);}
      else if(view==='side') target.set(0,e.height/2,Math.max(reach/(tan*aspect),(e.height/2+.6)/tan)+e.width/2);
      else if(view==='loading')target.set(L/2+6,e.height*.8,.15);
      else target.set(L*.72,Math.max(5,L*.55),L*.85);
      // Flat projections use the orthographic camera; other previews keep the perspective view, just without controls.
      if(mini&&view!=='top'&&view!=='side'){activeCamera=camera;camera.position.copy(target);controls.target.set(0,e.height/2,0);camera.lookAt(controls.target);}
      else if(mini){
        activeCamera=ortho;
        if(view==='top'){ortho.up.set(0,0,-1);ortho.position.set(0,e.height+8,0);ortho.lookAt(0,0,0);}
        else{ortho.up.set(0,1,0);ortho.position.set(0,e.height/2,e.width/2+20);ortho.lookAt(0,e.height/2,0);}
      }
      // Bird's-eye stays square to the container: pan and zoom only, no orbiting into a diagonal. Leftover orbit
      // momentum is settled first (one undamped update), otherwise it keeps turning the camera after the switch.
      else{controls.enableDamping=false;controls.update();controls.enableDamping=true;transition=1;controls.enableRotate=view!=='top';controls.mouseButtons.LEFT=view==='top'?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.target.set(0,view==='top'?0:e.height/2,0);}
      redraw();resize();
    };
    const resize=()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const {equipment:e,view}=latest.current;const span=Math.max(e.length/2+(e.truck?2.6:.4),((view==='top'?e.width:e.height)/2+.35)*w/h);ortho.left=-span;ortho.right=span;ortho.top=span*h/w;ortho.bottom=-span*h/w;ortho.updateProjectionMatrix();};
    const raycaster=new T.Raycaster(),pointer=new T.Vector2();
    let drag: {id:string; offset:T.Vector3; plane:T.Plane; original:T.Vector3; group:T.Object3D; y:number} | null=null;
    const hit=(event:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,activeCamera);};
    const down=(event:PointerEvent)=>{
      // Closed walls hide the cargo from outside, so the exterior view only picks cargo once walls are off.
      if(latest.current.mini||event.button!==0||(latest.current.view==='exterior'&&latest.current.walls!==false))return;
      hit(event);const hits=raycaster.intersectObjects(cargoMeshes,true);let group=hits[0]?.object;
      while(group&&!group.userData.cargoId)group=group.parent!;
      if(!group)return;
      const id=group.userData.cargoId as string;latest.current.onSelect?.(id);
      const world=group.getWorldPosition(new T.Vector3());const plane=new T.Plane(new T.Vector3(0,1,0),-world.y);const point=raycaster.ray.intersectPlane(plane,new T.Vector3());if(!point)return;
      drag={id,plane,offset:point.sub(world),original:group.position.clone(),group,y:latest.current.cargo.find(c=>c.id===id)!.y};
      element.classList.add('is-grabbing');controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);event.stopImmediatePropagation();
    };
    const move=(event:PointerEvent)=>{if(!drag)return;hit(event);const point=raycaster.ray.intersectPlane(drag.plane,new T.Vector3());if(point){point.sub(drag.offset);model.worldToLocal(point);drag.group.position.x=Math.round(point.x*20)/20;drag.group.position.z=Math.round(point.z*20)/20;}};
    const up=(event:PointerEvent)=>{if(!drag)return;const d=drag;drag=null;element.classList.remove('is-grabbing');controls.enabled=true;if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);const {x,z}=d.group.position;d.group.position.copy(d.original);latest.current.onMove?.(d.id,x,d.y,z);};
    const cancel=()=>{element.classList.remove('is-grabbing');if(drag){drag.group.position.copy(drag.original);drag=null;}controls.enabled=!latest.current.mini;};
    renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
    controls.addEventListener('start',()=>{transition=0;});
    const observer=new ResizeObserver(resize);observer.observe(element);
    const theme=new MutationObserver(()=>redraw());theme.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    runtime.current={redraw,changeView,zoom:n=>{camera.position.sub(controls.target).multiplyScalar(n).add(controls.target);controls.update();}};
    changeView();camera.position.copy(target);controls.update();
    let frame=0,last=performance.now(); const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate=(now=performance.now())=>{
      frame=requestAnimationFrame(animate);
      // Time-based easing, so a slow device still settles squarely on the chosen view.
      const dt=Math.min(Math.max(now-last,0)/1000,.25);last=now;const speed=reduced?1:1-Math.pow(.002,dt);
      if(transition){camera.position.lerp(target,speed);if(camera.position.distanceTo(target)<.01){camera.position.copy(target);transition=0;}}
      rackShow=T.MathUtils.lerp(rackShow,latest.current.warehouse?1:0,speed*.6);shellShow=T.MathUtils.lerp(shellShow,latest.current.walls===false?0:1,speed*.6);applyToggles();
      roof.position.y=T.MathUtils.lerp(roof.position.y,roofTarget,speed);roof.visible=!latest.current.equipment.openTop&&roof.position.y<latest.current.equipment.height+1.6;
      side.traverse(obj=>{const m=(obj as T.Mesh).material as T.MeshStandardMaterial;if(m){m.transparent=true;m.opacity=sideTarget; m.depthWrite=sideTarget>.5;}});
      doors.forEach((d,i)=>{d.rotation.y=T.MathUtils.lerp(d.rotation.y,(i===0?1:-1)*doorTarget,speed);});
      controls.update();renderer.render(scene,activeCamera);
    };animate();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();theme.disconnect();controls.dispose();dispose(model);renderer.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.remove();runtime.current=null;};
  }, []);
  useEffect(()=>{runtime.current?.redraw();},[props.cargo,props.selected,props.dimensions]);
  useEffect(()=>{runtime.current?.changeView();},[props.view,props.equipment,props.reset]);
  const previousZoom=useRef(props.zoom??0);
  useEffect(()=>{const next=props.zoom??0;if(next!==previousZoom.current)runtime.current?.zoom(next>previousZoom.current?.8:1.25);previousZoom.current=next;},[props.zoom]);
  return <div ref={host} className={`h-full w-full overflow-hidden ${props.mini ? '' : '[&_canvas]:!cursor-grab [&.is-grabbing_canvas]:!cursor-grabbing'}`} role="img" aria-label={`3D ${props.equipment.code} ${props.view}`}>{failed&&<p className="p-6 text-slate-600">{props.unavailable}</p>}</div>;
}
