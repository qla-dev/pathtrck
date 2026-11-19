import * as THREE from 'three';
import { vehicleModelSpec, type VehicleModelData } from './vehicleModelSpec';

function liveryTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 640;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#edf5fa'; c.fillRect(0, 0, 1536, 640);
  c.fillStyle = '#00b5e5'; c.fillRect(0, 514, 1536, 48);
  c.fillStyle = '#103047'; c.fillRect(0, 562, 1536, 78);
  c.save(); c.translate(120, 220); c.scale(6.1, 6.1);
  const gradient = c.createLinearGradient(3, 20, 21, 4);
  [[0,'#FACC15'],[.28,'#22C55E'],[.56,'#3B82F6'],[.82,'#EF4444'],[1,'#F97316']].forEach(([n, color]) => gradient.addColorStop(n as number, color as string));
  c.fillStyle = gradient;
  c.fill(new Path2D('M12 1.75C13.35 6.65 17.35 10.65 22.25 12C17.35 13.35 13.35 17.35 12 22.25C10.65 17.35 6.65 13.35 1.75 12C6.65 10.65 10.65 6.65 12 1.75Z')); c.restore();
  c.font = 'bold 130px Arial, sans-serif'; c.fillStyle = '#143047'; c.fillText('Freightbook', 304, 328);
  c.fillStyle = '#00ace0'; c.fillText('.ai', 304 + c.measureText('Freightbook').width, 328);
  c.font = '25px Arial, sans-serif'; c.fillStyle = '#476778'; c.fillText('DIGITAL LOGISTICS STANDARD', 312, 388);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8; return texture;
}

/** Procedural geometry: no manufacturer badges, remote models or downloaded textures. */
export function buildVehicleModel(vehicle: VehicleModelData) {
  const s = vehicleModelSpec(vehicle), group = new THREE.Group();
  // Keep physically meaningful ratios while protecting the renderer from malformed imports.
  const L = THREE.MathUtils.clamp(s.length, 2.5, 80), W = THREE.MathUtils.clamp(s.width, 1.3, 25), H = THREE.MathUtils.clamp(s.height, 1.2, 25);
  const paint = new THREE.MeshStandardMaterial({ color: '#e6f2fa', roughness: .26, metalness: .35 });
  const white = new THREE.MeshStandardMaterial({ color: '#f6fafc', roughness: .38, metalness: .15 });
  const dark = new THREE.MeshStandardMaterial({ color: '#132a3b', roughness: .6, metalness: .4 });
  const steel = new THREE.MeshStandardMaterial({ color: '#aab9c5', roughness: .28, metalness: .8 });
  const blue = new THREE.MeshStandardMaterial({ color: '#00b7e6', roughness: .32, metalness: .35 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#121b25', roughness: .92 });
  const glass = new THREE.MeshStandardMaterial({ color: '#143d54', roughness: .13, metalness: .6 });
  const light = new THREE.MeshStandardMaterial({ color: '#e1f8ff', emissive: '#b1deec', emissiveIntensity: .8 });
  const box = (x:number,y:number,z:number,a:number,b:number,c:number,material:THREE.Material=paint):THREE.Mesh<THREE.BufferGeometry,THREE.Material> => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(a,b,c),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  const cylinder = (x:number,y:number,z:number,r:number,length:number,material:THREE.Material,axis:'x'|'z'|'y'='z') => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,32),material);
    if(axis==='z')m.rotation.x=Math.PI/2; if(axis==='x')m.rotation.z=Math.PI/2;
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  const decal = liveryTexture();
  const brandMaterial = new THREE.MeshStandardMaterial({map:decal,roughness:.6,metalness:.04});
  const brand = (x:number,y:number,z:number,len:number,height:number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len,height),brandMaterial);m.position.set(x,y,z);if(z<0)m.rotation.y=Math.PI;group.add(m);
  };
  if(s.body==='aircraft') {
    const hull=cylinder(0,H*.4,0,W*.075,L,white,'x'); hull.rotation.x=Math.PI/2;
    const wing=box(0,H*.35,0,L*.19,.12,W,white);wing.rotation.y=.15;
    box(-L*.38,H*.6,0,L*.16,H*.55,.12,blue);box(-L*.35,H*.4,0,L*.13,.1,W*.4,white);
    brand(0,H*.45,W*.076,L*.4,W*.12);
    return {group,spec:s};
  }
  if(s.body==='ship') {
    const hull=box(0,H*.16,0,L,H*.26,W,dark);hull.geometry.dispose();
    const shape=new THREE.Shape();shape.moveTo(-L/2,-W/2);shape.lineTo(L*.35,-W/2);shape.lineTo(L/2,0);shape.lineTo(L*.35,W/2);shape.lineTo(-L/2,W/2);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:H*.25,bevelEnabled:false});geo.rotateX(-Math.PI/2);hull.geometry=geo;
    box(-L*.3,H*.5,0,L*.16,H*.4,W*.6,white);
    for(let x=-1;x<3;x++)for(let z=-1;z<=1;z++)box(x*L*.16,H*.34,z*W*.25,L*.14,H*.18,W*.22,x%2?blue:paint);
    brand(-L*.1,H*.12,W*.501,L*.4,H*.15);return {group,spec:s};
  }
  const r=s.light||s.van? .34:.48;
  const wheelR=s.body==='car'?.3:r;
  const frameY=wheelR*1.5, bodyBase=frameY+.19;
  const cabL=Math.min(s.cabLength,L*.37), front=L/2, rear=-L/2;
  const bodyL=Math.max(1,L-cabL-.15), bodyX=rear+bodyL/2;
  box(0,frameY,0,L*.93,.22,W*.7,dark);
  const wheel=(x:number,z:number) => {
    cylinder(x,wheelR,z,wheelR,.25,rubber);
    cylinder(x,wheelR,z+(z>0?.14:-.14),wheelR*.62,.035,steel);
    cylinder(x,wheelR,z+(z>0?.17:-.17),wheelR*.24,.045,dark);
    for(let a=0;a<8;a++){const angle=a*Math.PI/4;cylinder(x+Math.cos(angle)*wheelR*.4,wheelR+Math.sin(angle)*wheelR*.4,z+(z>0?.17:-.17),.026,.04,dark);}
    const arch=new THREE.Mesh(new THREE.TorusGeometry(wheelR*1.13,.05,8,28,Math.PI),dark);arch.position.set(x,wheelR,z);arch.rotation.z=0;group.add(arch);
  };
  const axleX=[front-cabL*.53,...Array.from({length:s.axles-1},(_,i)=>rear+L*.18+i*wheelR*2.45)];
  axleX.forEach(x=>{cylinder(x,wheelR,0,.09,W*.85,dark);wheel(x,W*.46);wheel(x,-W*.46);});
  // Rounded cab with a sloping windscreen rather than an icon-like rectangle.
  const cabTop=s.van?H:Math.min(H,bodyBase+(s.light?1.65:2.3));
  const cabShape=new THREE.Shape();cabShape.moveTo(front-cabL,bodyBase);cabShape.lineTo(front,bodyBase);cabShape.lineTo(front,cabTop*.63);cabShape.lineTo(front-cabL*.27,cabTop-.06);cabShape.lineTo(front-cabL,cabTop-.06);cabShape.closePath();
  const cabGeo=new THREE.ExtrudeGeometry(cabShape,{depth:W*.9,bevelEnabled:true,bevelSize:.055,bevelThickness:.045,bevelSegments:3,steps:1});cabGeo.translate(0,0,-W*.45);
  const cab=new THREE.Mesh(cabGeo,paint);cab.castShadow=true;group.add(cab);
  const windshield=box(front-cabL*.11,cabTop*.76,0,.06,cabTop*.24,W*.78,glass);windshield.rotation.z=.25;
  for(const side of [-1,1]) {
    box(front-cabL*.58,cabTop*.78,side*W*.46,cabL*.48,cabTop*.23,.02,glass);
    box(front-cabL*.62,cabTop*.57,side*W*.465,.18,.035,.025,steel);
    box(front-cabL*.25,cabTop*.68,side*W*.55,.15,.33,.12,dark);
    box(front-cabL*.4,bodyBase+.06,side*W*.46,cabL*.55,.13,.08,blue);
    box(front-.015,bodyBase+.16,side*W*.31,.04,.12,W*.18,light);
  }
  box(front+.04,bodyBase+.04,0,.15,.21,W*.9,dark);
  for(let i=0;i<4;i++)box(front+.065,bodyBase+.36+i*.1,0,.025,.033,W*.54,dark);
  if(s.van) {
    const v=box(rear+bodyL/2,bodyBase+(H-bodyBase)/2,0,bodyL,H-bodyBase,W*.9,paint);
    if(s.body==='car'){v.scale.y=.6;v.position.y=bodyBase+(H-bodyBase)*.3;}
    for(const side of [-1,1]){
      brand(bodyX,bodyBase+(H-bodyBase)*.55,side*W*.455,bodyL*.88,(H-bodyBase)*.68);
      if(s.body==='bus')for(let i=0;i<6;i++)box(rear+.5+i*bodyL/6,H*.73,side*W*.46,bodyL/7,.55,.02,glass);
      box(rear+bodyL*.6,H*.48,side*W*.46,.2,.035,.02,dark);
    }
  } else {
    const cargoH=Math.max(.5,H-bodyBase), top=bodyBase+cargoH;
    if(s.body==='tanker') {
      const tankR=Math.min(W*.46,cargoH*.48);cylinder(bodyX,bodyBase+tankR,0,tankR,bodyL-.12,steel,'x');
      for(const x of [rear+bodyL*.2,rear+bodyL*.75]){const band=new THREE.Mesh(new THREE.TorusGeometry(tankR+.02,.045,8,40),blue);band.rotation.y=Math.PI/2;band.position.set(x,bodyBase+tankR,0);group.add(band);}
      box(bodyX,bodyBase+tankR*2+.04,0,bodyL*.65,.07,.3,dark);
      for(const side of [-1,1])brand(bodyX,bodyBase+tankR,side*(tankR+.015),bodyL*.65,tankR*.9);
    } else if(s.body==='flatbed'||s.body==='carrier') {
      box(bodyX,bodyBase,0,bodyL,.18,W,steel);
      for(const side of [-1,1]) {
        box(bodyX,bodyBase-.04,side*W*.5,bodyL,.12,.08,blue);
        for(let i=0;i<5;i++)box(rear+.2+i*bodyL/5,bodyBase+.22,side*W*.47,.06,.4,.06,steel);
      }
      if(s.body==='carrier') {
        box(bodyX,top-.7,0,bodyL,.12,W*.9,steel);
        for(const x of [rear+.25,rear+bodyL*.5,rear+bodyL-.25])for(const side of [-1,1])box(x,bodyBase+cargoH*.4,side*W*.46,.08,cargoH*.8,.08,blue);
        for(const tier of [bodyBase+.3,top-.45])for(let i=0;i<2;i++){
          const x=rear+bodyL*(.27+i*.48);box(x,tier,0,bodyL*.38,.4,W*.7,i?blue:white);box(x-.05,tier+.3,0,bodyL*.19,.35,W*.58,glass);
        }
      }
    } else if(s.body==='dump') {
      const bed=box(bodyX,bodyBase+.13,0,bodyL,.2,W,steel);bed.rotation.z=-.035;
      for(const side of [-1,1]){box(bodyX,bodyBase+cargoH*.36,side*W*.48,bodyL,cargoH*.65,.12,blue);for(let i=0;i<6;i++)box(rear+.15+i*bodyL/6,bodyBase+cargoH*.36,side*W*.5,.09,cargoH*.68,.05,steel);}
      box(rear,bodyBase+cargoH*.35,0,.12,cargoH*.65,W,blue);box(rear+bodyL,bodyBase+cargoH*.35,0,.12,cargoH*.65,W,blue);
    } else {
      const material=s.body==='curtain'?new THREE.MeshStandardMaterial({color:'#d7e7f0',roughness:.95}):white;
      box(bodyX,bodyBase+cargoH/2,0,bodyL,cargoH,W,material);
      for(const side of [-1,1]) {
        brand(bodyX,bodyBase+cargoH/2,side*(W/2+.012),bodyL*.985,cargoH*.985);
        box(bodyX,bodyBase-.015,side*(W/2+.025),bodyL,.09,.06,steel);
        if(s.body==='curtain')for(let i=0;i<=Math.round(bodyL/.35);i++) {
          const x=rear+i*.35;box(x,bodyBase+cargoH/2,side*(W/2+.025),.018,cargoH*.98,.018,paint);
          box(x,bodyBase+.1,side*(W/2+.04),.055,.19,.045,dark);
        }
        if(s.body==='container')for(let i=0;i<Math.floor(bodyL/.16);i++)box(rear+.08+i*.16,bodyBase+cargoH/2,side*(W/2+.03),.038,cargoH*.95,.025,paint);
      }
      for(const side of [-1,1])box(rear-.02,bodyBase+cargoH/2,side*W*.22,.04,cargoH*.9,.035,steel);
      if(s.body==='reefer') {box(rear+bodyL+.12,top-.5,0,.3,.85,W*.65,white);for(let i=0;i<8;i++)box(rear+bodyL+.28,top-.78+i*.085,0,.025,.035,W*.5,dark);}
    }
    if(s.tailLift)box(rear-.12,bodyBase+.6,0,.12,1.2,W*.88,steel);
    // Trailer geometry is conditional on a registered trailer, never implied by a heavy category.
    for(let i=0;i<s.trailers;i++) {
      const len=L*.8,x=rear-.7-len/2-i*(len+.7);
      box(x,frameY,0,len,.18,W*.7,dark);
      const flat=/flat|platform/.test(s.trailerBody.toLowerCase());
      if(!flat){box(x,bodyBase+(H-bodyBase)/2,0,len,H-bodyBase,W,white);for(const side of [-1,1])brand(x,bodyBase+(H-bodyBase)/2,side*(W/2+.012),len*.98,(H-bodyBase)*.98);}
      else box(x,bodyBase,0,len,.18,W,steel);
      for(const ax of [x-len*.25,x+len*.25]){wheel(ax,W*.46);wheel(ax,-W*.46);}
      box(x+len/2+.3,frameY,0,.7,.12,.12,dark);
    }
  }
  return {group,spec:s};
}
