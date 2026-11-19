import { Component, lazy, Suspense, type ReactNode } from 'react';
import { VehicleIllustration } from './VehicleIllustration';
import type { VehicleModelData } from './vehicleModelSpec';

const Scene=lazy(()=>import('./VehicleModel3D'));
type Props={vehicle:VehicleModelData;label:string;angle?:string;simplified?:boolean};

/** A failed lazy chunk, model build or React effect must not unmount the fleet workspace. */
export class VehiclePreviewBoundary extends Component<{fallback:ReactNode;children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export default function VehiclePreview(props:Props){
 const fallback=<div className="flex h-full items-center justify-center p-5"><VehicleIllustration vehicle={props.vehicle} label={props.label} simplified={props.simplified}/></div>;
 const key=JSON.stringify([props.vehicle.make,props.vehicle.model,props.vehicle.vehicle_type,props.vehicle.features,props.vehicle.linked_trailers,props.simplified]);
 return <VehiclePreviewBoundary key={key} fallback={fallback}><Suspense fallback={fallback}><Scene {...props}/></Suspense></VehiclePreviewBoundary>;
}
