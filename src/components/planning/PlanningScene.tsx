import React, { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAmbientCrew } from './ambientCrew';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { Cargo, COLORS, Equipment, fits, rackBays, rackSpan, type RackItem, type RackPage } from './model';

export type SceneView = 'overview' | 'exterior' | 'loading' | 'top' | 'side';
export type CameraSnapshot = { view: SceneView; position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number };
type MoveDirection = 'forward' | 'backward' | 'left' | 'right';
type LoadDirection = 'up' | 'down' | 'left' | 'right' | 'rotate-left' | 'rotate-right';
type Props = { equipment: Equipment; cargo: Cargo[]; view: SceneView; warehouse?: boolean; tracking?: boolean; racks?: { warehouse?: RackPage; tracking?: RackPage }; pickedRack?: string; loadMoreLabel?: string; walls?: boolean; dimensions?: boolean; seeThrough?: boolean; ambient?: boolean; overview?: number; selected?: string; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number, z: number) => void; onRotate?: () => void; onFreeRoam?: () => void; onCarry?: (carrying: boolean) => void; onUnplace?: (id: string) => void; onRackMore?: (side: 'warehouse' | 'tracking') => void; onRackPick?: (item: RackItem) => void; reset?: number; zoom?: number; cameraSnapshot?: number; onCameraSnapshot?: (snapshot: CameraSnapshot) => void; unavailable: string; mini?: boolean };

// Tetris-style floor grid: 20 cm cells, so pallet and carton sizes land on whole cells.
const CELL = .2, EPS = 1e-4;
/** A truck stands on its wheels, so its ground sits lower than a container's, which rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);
/** Snaps a unit's near edge to the grid, lets it magnet flush to a wall or neighbour edge within half a cell, and keeps it on the floor. */
function snapAxis(value: number, size: number, limit: number, edges: number[]) {
  let best = Math.round(value / CELL) * CELL;
  for (const edge of [0, limit - size, ...edges]) if (Math.abs(edge - value) < CELL / 2 && Math.abs(edge - value) < Math.abs(best - value)) best = edge;
  return Math.min(Math.max(best, 0), Math.max(0, limit - size));
}

// There is no logo PNG in the project, so the full logo (star mark + "Freightbook.ai") is composed from the
// same parts as BrandWordmark: its star path and gradient, the brand font and the primary colour.
const BRAND_FONT = '"FacebookSansBold", "Space Grotesk", sans-serif';
const MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="3" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FACC15"/><stop offset=".28" stop-color="#22C55E"/><stop offset=".56" stop-color="#3B82F6"/><stop offset=".82" stop-color="#EF4444"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs><path d="M12 1.75C13.35 6.65 17.35 10.65 22.25 12C17.35 13.35 13.35 17.35 12 22.25C10.65 17.35 6.65 13.35 1.75 12C6.65 10.65 10.65 6.65 12 1.75Z" fill="url(#g)"/></svg>';
const logoMark = typeof Image === 'undefined' ? null : Object.assign(new Image(), { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MARK_SVG)}` });
const logoCache: Partial<Record<'dark' | 'light' | 'white', HTMLCanvasElement>> = {};
const resetBrandLogo = () => { delete logoCache.dark; delete logoCache.light; delete logoCache.white; };
/** The composed logo on a transparent canvas: dark or white wordmark, or 'white' for an all-white logo (star included). Null until the star has loaded. */
function brandLogo(tone: 'dark' | 'light' | 'white') {
  if (!logoMark?.complete || !logoMark.naturalWidth) return null;
  const cached = logoCache[tone]; if (cached) return cached;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!, size = 128, font = `bold ${Math.round(size * .6)}px ${BRAND_FONT}`;
  ctx.font = font;
  const main = ctx.measureText('Freightbook').width, ai = ctx.measureText('.ai').width;
  canvas.width = Math.ceil(size * 1.15 + main + ai + 8); canvas.height = size; // resizing resets the context
  ctx.drawImage(logoMark, 4, 4, size - 8, size - 8);
  ctx.font = font; ctx.textBaseline = 'middle';
  ctx.fillStyle = tone === 'dark' ? '#0f172a' : '#ffffff'; ctx.fillText('Freightbook', size * 1.1, size * .54);
  ctx.fillStyle = '#00AEEF'; ctx.fillText('.ai', size * 1.1 + main, size * .54);
  // All-white: keep the drawn shapes' coverage but paint every pixel white.
  if (tone === 'white') { ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  return (logoCache[tone] = canvas);
}

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
  const logo = brandLogo('white');
  if (logo) { const w = 196, h = w * logo.height / logo.width; ctx.drawImage(logo, (256 - w) / 2, 34, w, h); }
  // White like the logo; a soft shadow keeps it readable on light boxes such as yellow.
  ctx.shadowColor = 'rgba(15,23,42,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,128,logo?156:130,224);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}
export function PlanningScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const [failed, setFailed] = useState(false);
  const [flashedMove, setFlashedMove] = useState<MoveDirection | null>(null);
  const [flashedLoad, setFlashedLoad] = useState<LoadDirection | null>(null);
  const flashTimer = useRef<number | null>(null);
  const runtime = useRef<{ redraw: () => void; changeView: () => void; zoom: (n: number) => void; overview: () => void; focusRack: () => void; move: (direction: MoveDirection) => void; moveLoad: (direction: LoadDirection) => void; snapshot: () => CameraSnapshot } | null>(null);
  const flashMove = (direction: MoveDirection) => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    setFlashedMove(direction);
    flashTimer.current = window.setTimeout(() => { setFlashedMove(null); flashTimer.current = null; }, 180);
  };
  const flashLoad = (direction: LoadDirection) => {
    setFlashedLoad(direction);
    window.setTimeout(() => setFlashedLoad(current => current === direction ? null : current), 180);
  };
  useEffect(() => () => { if (flashTimer.current !== null) window.clearTimeout(flashTimer.current); }, []);
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
    controls.addEventListener('start', () => { element.classList.add('is-grabbing'); latest.current.onFreeRoam?.(); });
    controls.addEventListener('end', () => element.classList.remove('is-grabbing'));
    controls.touches.ONE = T.TOUCH.ROTATE; controls.touches.TWO = T.TOUCH.DOLLY_PAN;
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2 - .02; controls.minDistance = 2; controls.maxDistance = 60; controls.enabled = !latest.current.mini;
    scene.add(new T.HemisphereLight(0xffffff,0x697984,2.6));
    const sun = new T.DirectionalLight(0xffffff,3.5); sun.position.set(-3,16,10); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18; scene.add(sun);
    let model = new T.Group(); scene.add(model);
    const crew = createAmbientCrew(scene);
    let roof = new T.Group(), side = new T.Group(), doors: T.Group[] = [], cargoMeshes: T.Object3D[] = [];
    let roofTarget=0, sideTarget=1, doorTarget=0;
    let floorGrid: T.LineSegments | null = null, groundGrid: T.GridHelper | null = null;
    // Fat outlines (WebGL ignores lineWidth) size their pixels against the canvas, kept current on resize.
    const resolution = new T.Vector2(1, 1);
    // Units glide between spots instead of jumping: from the warehouse's far end onto the floor beside the unit,
    // and from the floor into it. Positions are model-local group positions.
    const lastPos=new Map<string,T.Vector3>(),flights=new Map<string,{from:T.Vector3;to:T.Vector3;start:number;arc:number}>();
    const mountedAt=performance.now();
    // racks: the warehouse side (+z); racksBack: the tracking side (-z). Each drops in with its own toggle.
    // Rack props can already be on at mount; begin at zero so the opening overview always drops both
    // warehouse and tracking racks into place instead of rendering them fully formed.
    let racks=new T.Group(), racksBack=new T.Group(), shell=new T.Group(), rackShow=0, trackShow=0, shellShow=latest.current.walls===false?0:1;
    // Real rack units and "load more" bays, the page each side last drew (to animate a swap), and every unit's shelf spot.
    let rackMeshes:T.Object3D[]=[],hoveredRack='',paintedPick:string|undefined;
    const rackDrawn:{warehouse?:number;tracking?:number}={},rackHome=new Map<string,T.Vector3>();
    // Toggles animate instead of popping: warehouse racks drop in from above, walls lift away and settle back.
    const applyToggles=()=>{
      const ease=(p:number)=>1-Math.pow(1-p,3);
      racks.visible=rackShow>.01;racks.position.y=(1-ease(rackShow))*9;
      racksBack.visible=trackShow>.01;racksBack.position.y=(1-ease(trackShow))*9;
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
      roof=new T.Group();side=new T.Group();doors=[];cargoMeshes=[];racks=new T.Group();racksBack=new T.Group();rackMeshes=[];rackHome.clear();shell=new T.Group();
      const L=e.length,W=e.width,H=e.height;
      // The container contrasts with the page: near-black steel on the light theme, near-white on the dark one.
      const isDark=document.documentElement.classList.contains('dark');
      const steel=isDark
        ?{wall:'#e5e9ef',end:'#dde3ea',rib:'#cbd3dd',frame:'#aab4c0',roof:'#f1f4f8',roofRib:'#d5dce5',door:'#e0e6ed',bar:'#7b8794',base:'#cfd6df'}
        :{wall:'#1f2937',end:'#243040',rib:'#161e2a',frame:'#0b1119',roof:'#2b3544',roofRib:'#1a2330',door:'#232d3b',bar:'#8a97a8',base:'#111827'};
      // Local coordinates: x along length, y up, z across width; doors at x=L.
      model.position.set(-L/2,0,-W/2);
      const ground=groundOf(e);groundGrid=null;
      if (!mini) {
        const dark=document.documentElement.classList.contains('dark');
        box(model,L/2,ground-.08,W/2,Math.max(36,L+24),.16,36,dark?'#1e293b':'#d9e3e8');
        // The warehouse floor uses the same 20 cm cells as the unit's floor, lined up with them, so a carried unit snaps anywhere.
        const grid=new T.GridHelper(40,200,dark?0x3b4a5e:0xbdcdd7,dark?0x2a3648:0xd0dce3);grid.position.set(Math.round(L/2/CELL)*CELL,ground+.01,Math.round(W/2/CELL)*CELL);
        (grid.material as T.LineBasicMaterial).transparent=true;(grid.material as T.LineBasicMaterial).opacity=.55;model.add(grid);groundGrid=grid;
        {
          // Mirrored rack rows centred on the unit, far enough out that the default cameras stand inside the aisle.
          // Two rows per side: the inner row carries real cargo (warehouse stock on +z, tracking loads on -z) and
          // filler fills every other slot. Rows behind the unit (-z) also hide in the side view, whose camera stands there.
          const span=rackSpan(L),bays=rackBays(L),filler=['#bd9367','#c4a079','#ac8053'],pages=latest.current.racks,now=performance.now();
          const taken=new Set(cargo.map(c=>c.rackKey).filter(Boolean)),still=matchMedia('(prefers-reduced-motion: reduce)').matches;
          const groupColor=(group:string)=>COLORS[[...group].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,7)%COLORS.length];
          for (const dz of [-15,-11.5,11.5,15]) {
            const side:'warehouse'|'tracking'=dz<0?'tracking':'warehouse',row=dz<0?racksBack:racks,z=W/2+dz;
            const page=Math.abs(dz)<12?pages?.[side]:undefined,fresh=Boolean(page&&rackDrawn[side]!==page.page);
            if(page)rackDrawn[side]=page.page;
            let lastGroup='';
            for (let bay=0;bay<bays;bay++) {
              const x=L/2-span+bay*3;
              if(page&&bay===bays-1&&page.page<page.lastPage){
                // "Load more": a see-through rack one bay past the last; pressing it swaps in the next page.
                const ghost=new T.Group();ghost.userData.rackMore=side;
                for(const y of [1,2.5,4].map(v=>v+ground))box(ghost,x,y,z,2.6,.08,1.2,'#38bdf8',.3);
                for(const dx of [-1.3,1.3])box(ghost,x+dx,2.4+ground,z,.09,4.8,1.25,'#38bdf8',.4);
                box(ghost,x,2.4+ground,z,2.7,4.8,1.3,'#38bdf8',.1);
                const tag=label(latest.current.loadMoreLabel??'Load more',.8);tag.position.set(x,5.4+ground,z);ghost.add(tag);
                row.add(ghost);rackMeshes.push(ghost);
                continue;
              }
              for(const dx of [-1.3,1.3])box(row,x+dx,2.4+ground,z,.09,4.8,1.25,'#607e90');
              // Shelf heights sit on the warehouse floor, which is the unit's ground, not y=0.
              [1,2.5,4].map(v=>v+ground).forEach((y,level)=>{
                box(row,x,y,z,2.6,.08,1.2,'#517386');
                for(let i=0;i<3;i++){
                  const slot=bay*9+level*3+i,item=page&&bay<bays-1?page.items[slot]:undefined,sx=x-.8+i*.8,home=new T.Vector3(sx,y+.42,z);
                  if(!item){box(row,sx,y+.42,z,.65,.8,.9,filler[i]);continue;}
                  rackHome.set(item.key,home.clone());
                  // Already put in front of the unit: its slot stays empty.
                  if(taken.has(item.key))continue;
                  const unit=new T.Group();unit.userData.rackItem=item;unit.userData.home=home.clone();unit.userData.rackId=`${side}:${z}`;unit.userData.toward=dz<0?1:-1;
                  const mesh=new T.Mesh(new T.BoxGeometry(.65,.8,.9),new T.MeshStandardMaterial({map:faceTexture((item.reference||item.title).slice(0,10),groupColor(item.group)),roughness:.7,emissive:0xffffff,emissiveIntensity:0}));
                  mesh.castShadow=true;unit.add(mesh);unit.position.copy(home);
                  // A new page slides in slot by slot from the "load more" bay.
                  if(fresh&&!still){unit.userData.slideFrom=new T.Vector3(L/2-span+(bays-1)*3,y+.42,z);unit.userData.slideStart=now+slot*22;unit.position.copy(unit.userData.slideFrom);}
                  row.add(unit);rackMeshes.push(unit);
                  // Like the size labels: each warehouse (or the tracking run) is named above the slot where it starts.
                  if(item.group!==lastGroup){lastGroup=item.group;if(latest.current.dimensions!==false){const tag=label(item.groupLabel,.75);tag.position.set(sx,5.35+ground,z);row.add(tag);}}
                }
              });
            }
          }
        }
        model.add(racks);model.add(racksBack);
      }
      box(model,L/2,-.1,W/2,L+.2,.2,W+.2,steel.base);
      // One plain floor plate: no plank seams, so the snap grid is the only pattern on it.
      box(model,L/2,.01,W/2,L,.03,W,'#a88660');
      floorGrid=null;
      if(!mini){
        const points:number[]=[];
        for(let i=0;i<=Math.floor(L/CELL+EPS);i++)points.push(i*CELL,.035,0,i*CELL,.035,W);
        for(let i=0;i<=Math.floor(W/CELL+EPS);i++)points.push(0,.035,i*CELL,L,.035,i*CELL);
        points.push(L,.035,0,L,.035,W,0,.035,W,L,.035,W);
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
        floorGrid=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#3b2a1a',transparent:true,opacity:.25,depthWrite:false}));model.add(floorGrid);
      }
      // Walls, posts, roof and doors live in one group, so switching walls off leaves only the loading floor.
      {const model=shell;
      box(model,-.055,H/2,W/2,.11,H,W,steel.end);
      box(model,L/2,H/2,-.055,L,H,.11,steel.wall);
      for(let x=.15;x<L;x+=.19){box(model,x,H/2,-.13,.06,H,.07,steel.rib);box(side,x,H/2,W+.13,.065,H,.075,steel.rib);}
      box(side,L/2,H/2,W+.055,L,H,.09,steel.wall); model.add(side);
      // White wordmark on the near-black light-theme container, black on the near-white dark-theme one.
      const wallLogo=brandLogo(isDark?'dark':'light');
      if(wallLogo){
        // Logo decal on both long walls, just outside the corrugation; the front one lives in the side group so it fades with that wall.
        const texture=new T.CanvasTexture(wallLogo);texture.colorSpace=T.SRGBColorSpace;
        const width=Math.min(L*.68,6.2),height=width*wallLogo.height/wallLogo.width,logoY=Math.max(H*.52,height/2+.25);
        // Nudged toward the viewer's left on each wall (the back wall is seen mirrored), so the star-plus-wordmark reads centred.
        for(const [parent,z,turn,toward] of [[side,W+.19,0,-1],[model,-.19,Math.PI,1]] as [T.Object3D,number,number,number][]){
          const decal=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
          // Drawn after the ribs and never writing depth: its clear pixels must not hide the corrugation behind it.
          decal.renderOrder=5;decal.material.userData.decal=true;
          decal.position.set(L/2+toward*L*.02,logoY,z);decal.rotation.y=turn;parent.add(decal);
        }
      }
      for(const x of [0,L])for(const z of [0,W])box(model,x,H/2,z,.13,H+.15,.13,steel.frame);
      for(const z of [0,W])for(const y of [0,H])box(model,L/2,y,z,L+.18,.12,.12,steel.frame);
      box(roof,L/2,H+.04,W/2,L,.1,W,steel.roof);
      for(let x=.14;x<L;x+=.2)box(roof,x,H+.12,W/2,.06,.06,W,steel.roofRib);
      roof.visible=!e.openTop;roof.position.y=oldRoof;model.add(roof);
      for(const edge of [0,1]) {
        const door=new T.Group();door.position.set(L+.07,0,edge*W);
        const center=(edge===0?1:-1)*W/4;
        box(door,0,H/2,center,.09,H,W/2,steel.door);
        for(const dz of [-.2,.2])box(door,.07,H/2,center+dz,.04,H-.22,.04,steel.bar);
        model.add(door);doors.push(door);
      }
      }
      model.add(shell);applyToggles();
      if(e.truck) {
        box(model,-1.15,.75,W/2,2.1,1.8,W+.05,'#008fca');box(model,-1.5,1.2,W/2,1,.8,W+.09,'#253f50');
        // Windscreen on the cab's front face; the block above only reaches the sides.
        box(model,-2.22,1.15,W/2,.04,.8,W*.86,'#253f50');
        box(model,L/2,-.35,W/2,L+2,.25,W*.8,'#263746');
        for(const x of [-1.3,L-1,L-2])for(const z of [-.05,W+.05]) {
          const wheel=new T.Mesh(new T.CylinderGeometry(.42,.42,.25,24),new T.MeshStandardMaterial({color:'#202d35'}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,-.3,z);model.add(wheel);
          const hub=new T.Mesh(new T.CylinderGeometry(.21,.21,.27,16),new T.MeshStandardMaterial({color:'#9cabb5',metalness:.7,roughness:.3}));hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);model.add(hub);
        }
      }
      // Unplaced units wait on the floor beside the long wall, grouped by name (A-1, A-2 → A) in tidy two-deep blocks.
      const staged=new Map<string,T.Vector3>();
      {
        const groups=new Map<string,Cargo[]>();
        cargo.filter(c=>!c.placed).forEach(c=>{const k=c.name.split(/ · |-/)[0]||c.color;groups.set(k,[...(groups.get(k)??[]),c]);});
        let gx=0,bandZ=W+1.4,bandDepth=0;
        for(const units of groups.values()){
          const len=Math.max(...units.map(u=>u.length)),wid=Math.max(...units.map(u=>u.width)),rows=Math.ceil(units.length/2),span=rows*(len+.25),depth=Math.min(2,units.length)*(wid+.25);
          if(gx>0&&gx+span>L+4){gx=0;bandZ+=bandDepth+.8;bandDepth=0;}
          units.forEach((u,i)=>staged.set(u.id,new T.Vector3(gx+Math.floor(i/2)*(len+.25),ground,bandZ+(i%2)*(wid+.25))));
          if(!mini){const pad=new T.Mesh(new T.PlaneGeometry(span+.2,depth+.2),new T.MeshBasicMaterial({color:units[0].color,transparent:true,opacity:.2,depthWrite:false}));pad.rotation.x=-Math.PI/2;pad.position.set(gx+span/2-.125,ground+.02,bandZ+depth/2-.125);model.add(pad);}
          gx+=span+.9;bandDepth=Math.max(bandDepth,depth);
        }
      }
      const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;let batch=0;
      cargo.forEach(c=>{
        const group=new T.Group();group.userData.cargoId=c.id;model.add(group);
        const target=c.placed?new T.Vector3(c.x,c.y+.04,c.z):staged.get(c.id)!;
        const prev=lastPos.get(c.id),flight=flights.get(c.id);
        if(flight&&flight.to.distanceTo(target)<.01)group.position.copy(prev??flight.from);
        else{
          // Moved since last draw: fly from where it was. New on the floor (after first load): taken off the shelf of the
          // near rack row, lined up with its floor spot, then set down beside the unit.
          const rackSpan=Math.ceil((L/2+6)/3)*3,fromShelf=!prev&&!c.placed&&performance.now()-mountedAt>1500;
          const from=calm?null:prev&&prev.distanceTo(target)>.01?prev.clone():fromShelf?((c.rackKey?rackHome.get(c.rackKey)?.clone():undefined)??new T.Vector3(Math.min(Math.max(target.x,L/2-rackSpan),L/2+rackSpan-c.length),2.54+ground,W/2+11.5-c.width/2)):null;
          if(from){const lifts=(from.y<=ground+.05)!==(target.y<=ground+.05);flights.set(c.id,{from,to:target.clone(),start:performance.now()+batch++*90,arc:fromShelf?.8:lifts?Math.max(1.6,H*.5):prev?.3:0});group.position.copy(from);}
          else{flights.delete(c.id);lastPos.set(c.id,target.clone());group.position.copy(target);}
        }
        // A pallet's boards form a real base under the goods, so no board face shares a plane with the box and flickers through it.
        const deck=c.shape==='pallet'?Math.min(.14,c.height/2):0;
        let geometry:T.BufferGeometry;
        if(c.shape==='drum')geometry=new T.CylinderGeometry(Math.min(c.length,c.width)/2,Math.min(c.length,c.width)/2,c.height,24);
        else if(c.shape==='pipe'){geometry=new T.CylinderGeometry(Math.min(c.width,c.height)/2,Math.min(c.width,c.height)/2,c.length,24);geometry.rotateZ(Math.PI/2);}
        else geometry=new T.BoxGeometry(c.length,c.height-deck,c.width);
        const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({map:faceTexture(c.name,c.color),roughness:.7,metalness:c.shape==='pipe'?.4:.05,
          // Faces sit a hair behind their outline, so edge lines never z-fight with them while the camera moves.
          polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));mesh.position.set(c.length/2,deck+(c.height-deck)/2,c.width/2);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
        const lit=c.id===selected||c.id===hovered;
        const edges=new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new T.EdgesGeometry(new T.BoxGeometry(c.length,c.height,c.width))),new LineMaterial({color:lit?0xffffff:0x263746,linewidth:lit?3.5:1,
          // Outlines are pulled toward the camera, lit ones furthest, so a highlight never breaks up where it meets a neighbour's edge.
          polygonOffset:true,polygonOffsetFactor:lit?-4:-1,polygonOffsetUnits:lit?-4:-1}));edges.renderOrder=lit?2:1;
        edges.material.resolution.copy(resolution);edges.raycast=()=>{};edges.position.set(c.length/2,c.height/2,c.width/2);group.add(edges);group.userData.edges=edges;
        if(c.shape==='pallet')for(const z of [.08,c.width/2,c.width-.08])box(group,c.length/2,deck/2,z,c.length-.03,deck,.1,'#987548');        cargoMeshes.push(group);
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
      doorTarget=(view==='overview'||view==='exterior')?0:Math.PI*.9;
      // Frame the whole unit for the viewport's aspect; the small offset keeps screen-up along -z so length reads left to right.
      const aspect=Math.max(element.clientWidth,1)/Math.max(element.clientHeight,1),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2)),reach=L/2+(e.truck?2.6:1.6);
      if(view==='top'){const d=Math.max(reach/(tan*aspect),(e.width/2+.8)/tan);target.set(0,e.height+d,d*.02);}
      // Side view looks from the back long side (-z): waiting cargo stands on the front side and would block it.
      else if(view==='side') target.set(0,e.height/2,-(Math.max(reach/(tan*aspect),(e.height/2+.6)/tan)+e.width/2));
      else if(view==='loading')target.set(L/2+6,e.height*.8,.15);
      // The virtual workspace opens as a wide, high three-quarter overview: both rack aisles and the
      // generic container stay in frame, matching the initial planning view rather than a close exterior shot.
      // Captured wide free-roam starting POV for the generic 40HC workspace.
      else if(view==='overview')target.set(-35.1141,14.67,30.5209);
      else target.set(L*.72,Math.max(5,L*.55),L*.85);
      // Flat projections use the orthographic camera; other previews keep the perspective view, just without controls.
      if(mini&&view!=='top'&&view!=='side'){activeCamera=camera;camera.position.copy(target);controls.target.set(0,e.height/2,0);camera.lookAt(controls.target);}
      else if(mini){
        activeCamera=ortho;
        if(view==='top'){ortho.up.set(0,0,-1);ortho.position.set(0,e.height+8,0);ortho.lookAt(0,0,0);}
        else{ortho.up.set(0,1,0);ortho.position.set(0,e.height/2,-(e.width/2+20));ortho.lookAt(0,e.height/2,0);}
      }
      // Bird's-eye stays square to the container: pan and zoom only, no orbiting into a diagonal. Leftover orbit
      // momentum is settled first (one undamped update), otherwise it keeps turning the camera after the switch.
      else{controls.enableDamping=false;controls.update();controls.enableDamping=true;transition=1;controls.enableRotate=view!=='top';controls.mouseButtons.LEFT=view==='top'?T.MOUSE.PAN:T.MOUSE.ROTATE;if(view==='overview')controls.target.set(-.9773,-2.3667,.9352);else controls.target.set(0,view==='top'?0:e.height/2,0);}
      redraw();resize();
    };
    const resize=()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);resolution.set(w,h);ghostLine.resolution.set(w,h);cargoMeshes.forEach(group=>(group.userData.edges as LineSegments2|undefined)?.material.resolution.set(w,h));camera.aspect=w/h;camera.updateProjectionMatrix();const {equipment:e,view}=latest.current;const span=Math.max(e.length/2+(e.truck?2.6:.4),((view==='top'?e.width:e.height)/2+.35)*w/h);ortho.left=-span;ortho.right=span;ortho.top=span*h/w;ortho.bottom=-span*h/w;ortho.updateProjectionMatrix();};
    const raycaster=new T.Raycaster(),pointer=new T.Vector2();
    // Only solid faces count: outline line segments have a wide pick threshold and would steal hits from neighbours.
    const pickedCargo=()=>{let object:T.Object3D|null=raycaster.intersectObjects(cargoMeshes,true).find(h=>(h.object as T.Mesh).isMesh)?.object??null;while(object&&!object.userData.cargoId)object=object.parent;return object;};
    // Hovering a unit gives it the same white outline as selection, so it is clear what a press will pick up.
    let hovered='';
    const canPick=()=>!latest.current.mini&&!(latest.current.view==='exterior'&&latest.current.walls!==false);
    const paintEdges=()=>cargoMeshes.forEach(group=>{
      const edges=group.userData.edges as LineSegments2|undefined;if(!edges)return;
      const lit=group.userData.cargoId===latest.current.selected||group.userData.cargoId===hovered;
      edges.material.color.setHex(lit?0xffffff:0x263746);edges.material.linewidth=lit?3.5:1;
      edges.material.polygonOffsetFactor=edges.material.polygonOffsetUnits=lit?-4:-1;edges.renderOrder=lit?2:1;
    });
    const hover=(event:PointerEvent)=>{
      // Browsers fire a zero-movement pointermove when the scene appears under a resting cursor; that must not
      // start a hover, or a unit looks selected on first mount before the user has touched anything.
      if(!hovered&&event.movementX===0&&event.movementY===0)return;
      let id='';
      if(!latest.current.mini&&event.buttons===0){hit(event);const c=latest.current.cargo.find(c=>c.id===pickedCargo()?.userData.cargoId);id=c&&(!c.placed||canPick())?c.id:'';}
      if(id!==hovered){hovered=id;paintEdges();}
      // Rack units and "load more" bays light up too, when no unit of the plan is under the pointer.
      let rackKey='';
      if(!id&&!latest.current.mini&&event.buttons===0){hit(event);const rack=pickedRack();rackKey=rack?.userData.rackItem?.key??(rack?.userData.rackMore?`more:${rack.userData.rackMore}`:'');}
      if(rackKey!==hoveredRack){hoveredRack=rackKey;paintRack();}
    };
    const leave=()=>{if(!drag&&hovered){hovered='';paintEdges();}if(hoveredRack){hoveredRack='';paintRack();}};
    // Raycasts ignore visibility, so units on a rack side that is switched off are left out explicitly.
    const pickedRack=()=>{
      let object:T.Object3D|null=raycaster.intersectObjects(rackMeshes.filter(m=>m.parent?.visible!==false),true).find(h=>(h.object as T.Mesh).isMesh)?.object??null;
      while(object&&!object.userData.rackItem&&!object.userData.rackMore)object=object.parent;
      return object;
    };
    const paintRack=()=>rackMeshes.forEach(m=>{
      const key=m.userData.rackItem?.key??`more:${m.userData.rackMore}`,lit=key===hoveredRack||key===latest.current.pickedRack;
      if(m.userData.rackMore){m.scale.setScalar(lit?1.04:1);return;}
      m.traverse(o=>{const material=(o as T.Mesh).material as T.MeshStandardMaterial|undefined;if(material?.emissive)material.emissiveIntensity=lit?.35:0;});
    });
    // While a unit is held it hovers over its snapped landing spot; a see-through outline marks that spot,
    // green when the unit fits there and red when it does not.
    let drag: {id:string; cargo:Cargo; origin:T.Vector3; plane:T.Plane; grab:T.Vector2; x:number; y:number; z:number; ok:boolean; outside:boolean} | null=null;
    // Drawn over everything: the held unit hovers right above its landing spot and would otherwise hide the outline.
    const ghostFill=new T.MeshBasicMaterial({color:0x22c55e,transparent:true,opacity:.35,depthWrite:false,depthTest:false});
    const ghostLine=new LineMaterial({color:0x15803d,linewidth:3,transparent:true,depthTest:false});
    const ghostEdges=new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new T.EdgesGeometry(new T.BoxGeometry(1,1,1))),ghostLine);ghostEdges.raycast=()=>{};
    const ghost=new T.Group();ghost.add(new T.Mesh(new T.BoxGeometry(1,1,1),ghostFill),ghostEdges);
    ghost.visible=false;ghost.renderOrder=20;ghost.children.forEach(child=>{child.renderOrder=20;});scene.add(ghost);
    // The model is rebuilt whenever cargo or selection changes, so the held unit is looked up afresh rather than kept.
    const placeCargo=(id:string,x:number,y:number,z:number)=>cargoMeshes.find(group=>group.userData.cargoId===id)?.position.set(x,y,z);
    const showGhost=()=>{
      if(!drag)return;const c=drag.cargo;
      ghost.visible=true;ghost.scale.set(c.length,c.height,c.width);
      ghost.position.set(model.position.x+drag.x+c.length/2,drag.y+c.height/2+.04,model.position.z+drag.z+c.width/2);
      // Blue off the unit (released there, it returns to its group), green where it fits inside, red where it does not.
      const [fill,line]=drag.outside?[0x38bdf8,0x0369a1]:drag.ok?[0x22c55e,0x15803d]:[0xef4444,0xb91c1c];
      ghostFill.color.setHex(fill);ghostLine.color.setHex(line);
    };
    const hit=(event:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,activeCamera);};
    // A precision touchpad does not emit two touch pointers. Its two-finger drag is a pixel-mode wheel event,
    // while its pinch is a Ctrl+wheel event. OrbitControls handles the latter as a dolly; pan the former here.
    const trackpadPan=(event:WheelEvent)=>{
      if (!controls.enabled || event.ctrlKey || event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return;
      if (Math.abs(event.deltaX)+Math.abs(event.deltaY)<.01) return;
      latest.current.onFreeRoam?.();
      event.preventDefault();event.stopImmediatePropagation();
      const visibleHeight=2*camera.position.distanceTo(controls.target)*Math.tan(T.MathUtils.degToRad(camera.fov/2));
      const unitPerPixel=visibleHeight/Math.max(element.clientHeight,1)*controls.panSpeed;
      const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0);
      const up=new T.Vector3().setFromMatrixColumn(camera.matrix,1);
      const shift=right.multiplyScalar(-event.deltaX*unitPerPixel).addScaledVector(up,event.deltaY*unitPerPixel);
      camera.position.add(shift);controls.target.add(shift);controls.update();
    };
    const down=(event:PointerEvent)=>{
      // This listener runs in the capture phase so mouse presses on cargo can claim the gesture before
      // OrbitControls. A touch must pass through instead: OrbitControls needs both pointerdown events in
      // order to enter its DOLLY_PAN state, and claiming the first one makes a two-finger gesture look like
      // a one-finger drag.
      if (event.pointerType === 'touch') return;
      // OrbitControls pans on any of Ctrl, Cmd or Shift. Only Ctrl/Cmd should, so the left-button mapping is
      // chosen per press: its modifier branch then yields pan for Ctrl and plain orbit for Shift alone.
      const panKey=event.ctrlKey||event.metaKey;
      if(latest.current.view==='top')controls.mouseButtons.LEFT=panKey||event.shiftKey?T.MOUSE.ROTATE:T.MOUSE.PAN;
      else controls.mouseButtons.LEFT=event.shiftKey&&!panKey?T.MOUSE.PAN:T.MOUSE.ROTATE;
      // Closed walls hide the cargo from outside, so the exterior view only picks cargo once walls are off.
      // While a unit is carried, presses belong to the camera (orbit, pan); a press that ends without moving releases it.
      if(drag&&event.button===0)pressAt={x:event.clientX,y:event.clientY};
      if(event.button!==0||drag)return;
      hit(event);let group=latest.current.mini?null:pickedCargo();
      const picked=group&&latest.current.cargo.find(c=>c.id===group!.userData.cargoId);
      // Units waiting outside stay pickable even when closed walls hide the ones inside.
      if(!picked||(picked.placed&&!canPick()))group=null;
      if(!group||!picked){
        // A rack unit or "load more" bay acts on release, so dragging across the racks still orbits the camera.
        const rack=latest.current.mini?null:pickedRack();
        if(rack){rackPress={x:event.clientX,y:event.clientY,target:rack};return;}
        emptyPress={x:event.clientX,y:event.clientY};return;
      }
      const id=picked.id,c=picked;
      // Picked from wherever it is now (inside, on the floor outside, or mid-flight), which also ends any flight.
      const origin=group.position.clone();flights.delete(id);lastPos.set(id,origin.clone());
      const plane=new T.Plane(new T.Vector3(0,1,0),-origin.y);const point=raycaster.ray.intersectPlane(plane,new T.Vector3());if(!point)return;
      latest.current.onSelect?.(id);
      const local=model.worldToLocal(point);
      drag={id,cargo:c,origin,plane,grab:new T.Vector2(local.x-origin.x,local.z-origin.z),x:origin.x,y:origin.y-.04,z:origin.z,ok:false,outside:!c.placed};showGhost();
      element.classList.add('is-grabbing');lifting=true;renderer.domElement.setPointerCapture(event.pointerId);latest.current.onCarry?.(true);event.stopImmediatePropagation();
    };
    const move=(event:PointerEvent)=>{
      if(!drag){hover(event);return;}if(event.buttons!==0&&!lifting)return;hit(event);const point=raycaster.ray.intersectPlane(drag.plane,new T.Vector3());if(!point)return;
      const local=model.worldToLocal(point),c=drag.cargo,{cargo,equipment:e}=latest.current,others=cargo.filter(o=>o.placed&&o.id!==c.id);
      // Off the unit's floor (by the unit's centre) it follows the ground grid freely instead of being pulled inside.
      const rawX=local.x-drag.grab.x,rawZ=local.z-drag.grab.y;
      drag.outside=rawX+c.length/2<0||rawX+c.length/2>e.length||rawZ+c.width/2<0||rawZ+c.width/2>e.width;
      if(drag.outside){drag.x=Math.round(rawX/CELL)*CELL;drag.z=Math.round(rawZ/CELL)*CELL;drag.y=groundOf(e)-.04;drag.ok=false;showGhost();return;}
      const x=snapAxis(local.x-drag.grab.x,c.length,e.length,others.flatMap(o=>[o.x,o.x+o.length,o.x-c.length]));
      const z=snapAxis(local.z-drag.grab.y,c.width,e.width,others.flatMap(o=>[o.z,o.z+o.width,o.z-c.width]));
      // Like a falling block, the unit lands on the highest unit under its footprint; fits() then judges the stack.
      const under=others.filter(o=>x<o.x+o.length-EPS&&x+c.length>o.x+EPS&&z<o.z+o.width-EPS&&z+c.width>o.z+EPS);
      const y=Math.max(0,...under.map(o=>o.y+o.height));
      drag.x=x;drag.y=y;drag.z=z;drag.ok=fits({...c,x,y,z,placed:true},cargo,e);showGhost();
    };
    // A clicked unit stays lifted until Enter places it (green) or returns it (red); Esc always returns it.
    // A red release shows no notice, so nothing around the scene resizes or re-frames the camera.
    const release=(place:boolean)=>{
      if(!drag)return;const d=drag;drag=null;lifting=false;pressAt=null;ghost.visible=false;element.classList.remove('is-grabbing');latest.current.onCarry?.(false);
      const held=new T.Vector3(d.x,d.y+.16,d.z);
      if(place&&!d.outside&&d.ok&&(!d.cargo.placed||d.x!==d.cargo.x||d.y!==d.cargo.y||d.z!==d.cargo.z)){
        // Settles from its hover height into the new spot.
        lastPos.set(d.id,held);latest.current.onMove?.(d.id,d.x,d.y,d.z);
      }else if(place&&d.outside&&d.cargo.placed){
        // Put down outside: it leaves the plan and flies back to its group on the floor.
        lastPos.set(d.id,held);latest.current.onUnplace?.(d.id);
      }else{
        // Red spot, Esc, or already waiting outside: glide back to where it was picked up.
        lastPos.set(d.id,held);flights.set(d.id,{from:held,to:d.origin.clone(),start:performance.now(),arc:.3});
      }
    };
    const moveCamera=(direction:MoveDirection)=>{
      if(drag||!controls.enabled)return;
      latest.current.onFreeRoam?.();
      const step=Math.max(latest.current.equipment.length*.025,.2);
      const forward=camera.getWorldDirection(new T.Vector3()).setY(0);
      if(forward.lengthSq()<1e-6)forward.set(1,0,0);
      forward.normalize();
      const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0)).normalize();
      const shift={forward,backward:forward.clone().multiplyScalar(-1),left:right.clone().multiplyScalar(-1),right}[direction].multiplyScalar(step);
      camera.position.add(shift);controls.target.add(shift);controls.update();
    };
    const moveLoad=(direction:LoadDirection)=>{
      const selected=latest.current.cargo.find(c=>c.id===latest.current.selected);
      if(!selected||!selected.placed)return;
      if(direction==='rotate-left'||direction==='rotate-right'){latest.current.onRotate?.();return;}
      const step=.2;
      const delta={up:{x:0,z:-step},down:{x:0,z:step},left:{x:-step,z:0},right:{x:step,z:0}}[direction];
      latest.current.onMove?.(selected.id,selected.x+delta.x,selected.y,selected.z+delta.z);
    };
    const key=(event:KeyboardEvent)=>{
      if((event.target as HTMLElement|null)?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
      // Game-style movement follows the current point of view: W/S travel straight forward/backward and
      // A/D strafe. Project onto the floor so a tilted camera never flies upward or downward.
      if(!drag&&controls.enabled){
        const direction:Record<string,MoveDirection>={KeyW:'forward',KeyS:'backward',KeyA:'left',KeyD:'right'};
        if(direction[event.code]){event.preventDefault();flashMove(direction[event.code]);moveCamera(direction[event.code]);return;}
        const loadDirection:Record<string,LoadDirection>={Numpad8:'up',Numpad2:'down',Numpad4:'left',Numpad6:'right',Numpad7:'rotate-left',Numpad9:'rotate-right'};
        if(latest.current.selected&&loadDirection[event.code]){event.preventDefault();flashLoad(loadDirection[event.code]);moveLoad(loadDirection[event.code]);return;}
      }
      if(!drag||(event.key!=='Enter'&&event.key!=='Escape'))return;
      event.preventDefault();release(event.key==='Enter');
    };
    // Clicking again releases like Enter. The click that lifted the unit never set pressAt, so it cannot drop it at once.
    let pressAt:{x:number;y:number}|null=null,lifting=false,emptyPress:{x:number;y:number}|null=null,rackPress:{x:number;y:number;target:T.Object3D}|null=null;
    const up=(event:PointerEvent)=>{
      if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
      // The press that lifted the unit (a click or a drag) only ends that gesture: the unit stays lifted.
      if(lifting){lifting=false;return;}
      const rack=rackPress;rackPress=null;
      if(!drag&&rack&&event.button===0&&Math.hypot(event.clientX-rack.x,event.clientY-rack.y)<5){
        if(rack.target.userData.rackMore)latest.current.onRackMore?.(rack.target.userData.rackMore);
        else latest.current.onRackPick?.(rack.target.userData.rackItem);
        return;
      }
      // A click on empty space (not a camera drag) clears the selection.
      const empty=emptyPress;emptyPress=null;
      if(!drag&&empty&&event.button===0&&latest.current.selected&&Math.hypot(event.clientX-empty.x,event.clientY-empty.y)<5)latest.current.onSelect?.('');
      const start=pressAt;pressAt=null;
      if(drag&&start&&event.button===0&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<5)release(true);
    };
    const cancel=()=>release(false);
    renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('wheel',trackpadPan,{capture:true,passive:false});window.addEventListener('keydown',key);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('pointerleave',leave);
    controls.addEventListener('start',()=>{transition=0;});
    const observer=new ResizeObserver(resize);observer.observe(element);
    const theme=new MutationObserver(()=>redraw());theme.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    // The composed logo needs the star image and the brand font; redraw once each is ready.
    let alive=true;
    // Ambient crew, in its own layer beside the unit. Skipped in previews and under reduced motion.
    if(!latest.current.mini&&!matchMedia('(prefers-reduced-motion: reduce)').matches)crew.load(latest.current.equipment);
    const refreshLogo=()=>{if(!alive)return;resetBrandLogo();redraw();};
    logoMark?.addEventListener('load',refreshLogo);
    void document.fonts?.load(`bold 64px ${BRAND_FONT}`).then(refreshLogo,()=>{});
    runtime.current={redraw,changeView,move:moveCamera,moveLoad,snapshot:()=>({view:latest.current.view,position:{x:+camera.position.x.toFixed(4),y:+camera.position.y.toFixed(4),z:+camera.position.z.toFixed(4)},target:{x:+controls.target.x.toFixed(4),y:+controls.target.y.toFixed(4),z:+controls.target.z.toFixed(4)},fov:camera.fov}),zoom:n=>{camera.position.sub(controls.target).multiplyScalar(n).add(controls.target);controls.update();},
      // The recorded camera is anchored to the topmost, leftmost box on the inner first rack.
      // Other packages inherit that exact composition by translating both camera points by delta.
      focusRack:()=>{
        if(latest.current.mini)return;
        const key=latest.current.pickedRack,unit=rackMeshes.find(mesh=>mesh.userData.rackItem?.key===key);
        if(!unit)return;
        const rackId=unit.userData.rackId;
        const homeWorld=(mesh:T.Object3D)=>model.localToWorld((mesh.userData.home as T.Vector3).clone());
        const rowItems=rackMeshes.filter(mesh=>mesh.userData.rackItem&&mesh.userData.rackId===rackId).sort((a,b)=>{
          const ah=a.userData.home as T.Vector3,bh=b.userData.home as T.Vector3;
          return (bh.y-ah.y)||(ah.x-bh.x)||(Math.abs(ah.z)-Math.abs(bh.z));
        });
        const allItems=rackMeshes.filter(mesh=>mesh.userData.rackItem).sort((a,b)=>{
          const ah=a.userData.home as T.Vector3,bh=b.userData.home as T.Vector3;
          return (bh.y-ah.y)||(ah.x-bh.x)||(Math.abs(ah.z)-Math.abs(bh.z));
        });
        const rackAnchor=rowItems[0],firstRackAnchor=allItems[0];
        if(!rackAnchor||!firstRackAnchor)return;
        // Translate by rack-row position only. Packages on the same rack therefore share one camera.
        const delta=homeWorld(rackAnchor).sub(homeWorld(firstRackAnchor));
        target.set(-24.4245+delta.x,6.4092+delta.y,-3.2267+delta.z);
        controls.target.set(-17.7375+delta.x,3.0814+delta.y,-12.1113+delta.z);
        camera.fov=38;camera.updateProjectionMatrix();transition=1;
      },
      // Captured POV for the moment cargo is brought out of the racks, used before it lands beside the unit.
      overview:()=>{if(latest.current.mini)return;target.set(-28.0975,8.146,-10.9204);controls.target.set(-15.6351,3.6848,-7.1515);transition=1;}};
    changeView();camera.position.copy(target);controls.update();
    let frame=0,last=performance.now(); const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate=(now=performance.now())=>{
      frame=requestAnimationFrame(animate);
      // Time-based easing, so a slow device still settles squarely on the chosen view.
      const dt=Math.min(Math.max(now-last,0)/1000,.25);last=now;const speed=reduced?1:1-Math.pow(.002,dt);
      if(transition){camera.position.lerp(target,speed);if(camera.position.distanceTo(target)<.01){camera.position.copy(target);transition=0;}}
      const clock=performance.now();
      flights.forEach((f,id)=>{
        if(drag?.id===id)return;
        const p=Math.min(Math.max((clock-f.start)/900,0),1),k=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
        const pos=f.from.clone().lerp(f.to,k);pos.y+=Math.sin(Math.PI*k)*f.arc;placeCargo(id,pos.x,pos.y,pos.z);lastPos.set(id,pos);
        if(p>=1){lastPos.set(id,f.to.clone());flights.delete(id);}
      });
      // Rack units: a new page slides in from the "load more" bay; the unit whose card is open is pulled out toward the aisle.
      if(latest.current.pickedRack!==paintedPick){paintedPick=latest.current.pickedRack;paintRack();}
      rackMeshes.forEach(m=>{
        const item=m.userData.rackItem as RackItem|undefined,home=m.userData.home as T.Vector3|undefined;if(!item||!home)return;
        const from=m.userData.slideFrom as T.Vector3|undefined;
        if(from){const p=Math.min(Math.max((clock-m.userData.slideStart)/600,0),1);m.position.lerpVectors(from,home,1-Math.pow(1-p,3));if(p>=1)delete m.userData.slideFrom;return;}
        m.position.z=T.MathUtils.lerp(m.position.z,home.z+m.userData.toward*(item.key===latest.current.pickedRack?.6:0),speed);
      });
      if(drag)placeCargo(drag.id,drag.x,drag.y+.16,drag.z);
      if(floorGrid)(floorGrid.material as T.LineBasicMaterial).opacity=drag?.6:.25;
      if(groundGrid)(groundGrid.material as T.LineBasicMaterial).opacity=drag?.95:.55;
      rackShow=T.MathUtils.lerp(rackShow,latest.current.warehouse?1:0,speed*.6);trackShow=T.MathUtils.lerp(trackShow,latest.current.tracking?1:0,speed*.6);shellShow=T.MathUtils.lerp(shellShow,latest.current.walls===false?0:1,speed*.6);applyToggles();racksBack.visible=racksBack.visible&&latest.current.view!=='side';
      roof.position.y=T.MathUtils.lerp(roof.position.y,roofTarget,speed);roof.visible=!latest.current.equipment.openTop&&roof.position.y<latest.current.equipment.height+1.6;
      // See-through fades the whole shell - both long walls, the ends, roof, frames and doors - in any
      // view. Decals keep their own transparency, and the near side takes the lower of shell and view.
      const shellOpacity=latest.current.seeThrough ? .12 : 1;
      // Three.js recompiles a material's shader when transparency flips, so the flag has to be raised
      // on the change - without it these walls compile opaque on the first frame and never clear.
      shell.traverse(obj=>{const m=(obj as T.Mesh).material as T.MeshStandardMaterial;if(!m)return;m.opacity=shellOpacity;if(m.userData.decal)return;const clear=shellOpacity<1;if(m.transparent!==clear){m.transparent=clear;m.needsUpdate=true;}m.depthWrite=!clear;});
      const sideOpacity=Math.min(sideTarget,shellOpacity);
      // The near side is a child of the shell, so the pass above may have just turned it opaque; it
      // stays transparent for its own per-view fade, and needs the same flag when that is reversed.
      side.traverse(obj=>{const m=(obj as T.Mesh).material as T.MeshStandardMaterial;if(!m)return;if(!m.transparent){m.transparent=true;m.needsUpdate=true;}m.opacity=sideOpacity;m.depthWrite=sideOpacity>.5&&!m.userData.decal;});
      doors.forEach((d,i)=>{d.rotation.y=T.MathUtils.lerp(d.rotation.y,(i===0?1:-1)*doorTarget,speed);});
      crew.update(dt,latest.current.equipment,latest.current.ambient!==false);
      controls.update();renderer.render(scene,activeCamera);
    };animate();
    return()=>{alive=false;logoMark?.removeEventListener('load',refreshLogo);cancelAnimationFrame(frame);observer.disconnect();theme.disconnect();dispose(ghost);controls.dispose();dispose(model);crew.dispose();renderer.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('wheel',trackpadPan,true);window.removeEventListener('keydown',key);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.remove();runtime.current=null;};
  }, []);
  useEffect(()=>{runtime.current?.redraw();},[props.cargo,props.selected,props.dimensions,props.racks,props.loadMoreLabel]);
  useEffect(()=>{runtime.current?.changeView();},[props.view,props.equipment,props.reset]);
  useEffect(()=>{if(props.pickedRack)runtime.current?.focusRack();},[props.pickedRack]);
  const previousSnapshot=useRef(props.cameraSnapshot??0);
  useEffect(()=>{const next=props.cameraSnapshot??0;if(next!==previousSnapshot.current)props.onCameraSnapshot?.(runtime.current?.snapshot());previousSnapshot.current=next;},[props.cameraSnapshot,props.onCameraSnapshot]);
  const previousZoom=useRef(props.zoom??0);
  useEffect(()=>{const next=props.zoom??0;if(next!==previousZoom.current)runtime.current?.zoom(next>previousZoom.current?.8:1.25);previousZoom.current=next;},[props.zoom]);
  // Declared after the view effect, so a view switch in the same update does not override the overview camera.
  const previousOverview=useRef(props.overview??0);
  useEffect(()=>{const next=props.overview??0;if(next!==previousOverview.current)runtime.current?.overview();previousOverview.current=next;},[props.overview]);
  const moveButton=(direction:MoveDirection,label:string)=><button type="button" aria-label={`Move ${label}`} onPointerDown={()=>flashMove(direction)} onClick={()=>{flashMove(direction);runtime.current?.move(direction);}} className={`flex size-9 cursor-pointer items-center justify-center rounded-full border text-xs font-black shadow-lg outline-none backdrop-blur transition hover:border-primary hover:bg-primary hover:text-white focus:outline-none active:scale-95 active:border-primary active:bg-primary active:text-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 ${flashedMove===direction?'border-primary bg-primary text-white':'border-slate-200 bg-white/95 text-slate-700'}`}>{label}</button>;
  const loadButton=(direction:LoadDirection,label:string)=><button type="button" aria-label={`Move selected load ${label}`} onPointerDown={()=>flashLoad(direction)} onClick={()=>{flashLoad(direction);runtime.current?.moveLoad(direction);}} className={`flex size-9 cursor-pointer items-center justify-center rounded-full border text-xs font-black shadow-lg outline-none backdrop-blur transition hover:border-primary hover:bg-primary hover:text-white focus:outline-none active:scale-95 active:border-primary active:bg-primary active:text-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 ${flashedLoad===direction?'border-primary bg-primary text-white':'border-slate-200 bg-white/95 text-slate-700'}`}>{label}</button>;
  return <div ref={host} className={`relative h-full w-full overflow-hidden ${props.mini ? '' : '[&_canvas]:!cursor-grab [&.is-grabbing_canvas]:!cursor-grabbing'}`} role="group" aria-label={`3D ${props.equipment.code} ${props.view}`}>
    {failed&&<p className="p-6 text-slate-600">{props.unavailable}</p>}
    {!props.mini&&<div className="absolute bottom-14 left-3 z-10 grid grid-cols-3 gap-1" aria-label="Camera movement controls">
      <span />{moveButton('forward','W')}<span />
      {moveButton('left','A')}{moveButton('backward','S')}{moveButton('right','D')}
    </div>}
    {!props.mini&&props.selected&&<div className="absolute bottom-14 right-3 z-10 grid grid-cols-3 gap-1" aria-label="Selected load movement controls">
      {loadButton('rotate-left','7')}{loadButton('up','8')}{loadButton('rotate-right','9')}
      {loadButton('left','4')}<span />{loadButton('right','6')}
      <span /><span>{loadButton('down','2')}</span><span />
    </div>}
  </div>;
}
