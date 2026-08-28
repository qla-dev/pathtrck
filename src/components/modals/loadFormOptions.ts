export const INCOTERM_OPTIONS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'] as const;
export const VEHICLE_OPTIONS = ['Cargo Van', 'Box Truck', 'Curtainsider', 'Reefer', 'Trailer', 'Rigid Truck', 'Container truck'] as const;
export const BODY_TYPE_OPTIONS = ['Curtain', 'Box', 'Reefer', 'Mega', 'Tautliner', 'Flatbed'] as const;
// ADR, CMR, Lift and Express used to live here too, but each one is stated by a requirement
// toggle in the same group (requiresAdr, cmrRequired, requiresTailLift, urgent) - and those are
// real columns the exchange filters on, so the duplicate free-text entries were the ones to go.
export const ROAD_CHARACTERISTIC_OPTIONS = ['GDP', 'TIR'] as const;
// No temperature-controlled-goods entry here - the dedicated "Temperature controlled" yes/no
// toggle right below this list already covers that.
// Non-DG / DG / DGR are all restatements of the "DGR / certified" requirement toggle, which is
// what air actually files against, so only the cargo attributes stay here.
export const AIR_CHARACTERISTIC_OPTIONS = ['MED (medicine)', 'VAL (money and other valuables)', 'Fragile Cargo', 'Oversized / Heavy Cargo', 'Lithium Batteries', 'Dry Ice'] as const;
// Selecting DG / IMO, REEFER, or OOG opens its own detail fields (UN number/IMO class/packing
// group; temperature range; in-gauge vs out-of-gauge dimensions) instead of being a plain toggle -
// mirrors how ocean carriers (and SeaRates) surface attributes based on the commodity/equipment
// chosen rather than a flat ADR/CMR/GDP checklist.
// No NON-STACKABLE / TOP LOAD ONLY entries here - the "Additional information" picker (Stackable /
// Top load only / Non-stackable) right above this section on the Cargo step already covers that,
// and it's shared across all transport types rather than being sea-specific.
// REEFER dropped: it only ever flipped the Temperature controlled toggle sitting under this list.
export const SEA_CHARACTERISTIC_OPTIONS = ['DG / IMO', 'OOG', 'LIQUID', 'BULK', 'FRAGILE', 'HEAVY', 'VALUABLE', 'PHARMA', 'FOOD GRADE'] as const;
export const SEA_BL_TYPE_OPTIONS = ['Original B/L', 'SeaWaybill', 'Telex Release'] as const;
// Rail's equivalent of the Bill of Lading: which consignment note regime the shipment moves under.
// CIM covers western Europe, SMGS the CIS and China corridors, and the common CIM/SMGS note is what
// runs through both without being reissued at the border.
export const RAIL_DOCUMENT_TYPE_OPTIONS = ['CIM', 'SMGS', 'CIM/SMGS', 'Other'] as const;
export const SEA_PAYMENT_TERMS_OPTIONS = ['Prepaid', 'Collect', 'Other'] as const;
export const LOADING_EQUIPMENT_OPTIONS = ['Vehicle with ramp', 'Vehicle without ramp', 'Forklift: Yes', 'Forklift: No', 'Other loading/unloading equipment', 'Not specified'] as const;
export const AIR_LOADING_EQUIPMENT_OPTIONS = ['Forklift Required', 'Tail Lift Required', 'Cargo Lift / High Loader Required', 'Pallet Jack Required', 'Roller Bed Required', 'Conveyor Required', 'No Special Equipment', 'Other Special Handling Equipment'] as const;
export const SEA_LOADING_EQUIPMENT_OPTIONS = ['Forklift Required', 'Crane / Heavy Lift', 'Port Handling', 'Stuffing Required', 'Unstuffing Required', 'Special Handling', 'No Special Equipment'] as const;
// Rail mirrors the sea list - the goods are handled the same way - except that the handling happens
// at an intermodal terminal rather than in a port.
export const RAIL_LOADING_EQUIPMENT_OPTIONS = ['Forklift Required', 'Crane / Heavy Lift', 'Terminal Handling', 'Stuffing Required', 'Unstuffing Required', 'Special Handling', 'No Special Equipment'] as const;
// 'Tail Lift Required' is not listed here - it's only relevant when the shipment has a road leg
// (an "Address" pickup or "Address + Last Mile Delivery" delivery), so PostLoadModal appends it
// conditionally instead of always showing it.
export const AIR_SPECIAL_REQUIREMENT_OPTIONS = ['ULD Required', 'Security Screening', 'Priority / Time Critical', 'AWB Required', 'Airport Handling', 'Customs Clearance', 'Insurance Required', 'Special Handling', 'Track & Trace Required'] as const;
export const AIR_TAIL_LIFT_REQUIREMENT = 'Tail Lift Required';
export const AIR_TRANSPORT_MODE_OPTIONS = ['Airport to airport', 'Air freight + last-mile delivery'] as const;
export const DELIVERY_PROOF_OPTIONS = ['POD', 'AOD'] as const;
export const CONTACT_OPTIONS = ['Current user', 'Operations desk', 'Dispatch team'] as const;
export const CLOSED_EXCHANGE_OPTIONS = ['', 'TIMOCOM', 'Private board'] as const;
export const LOAD_REQUIREMENT_OPTIONS = ['ADR', 'Tail lift', 'Priority load', 'Toll roads', 'Ferry', 'CMR', 'Pallet exchange', 'Customs', 'Insurance', 'Certification', 'Inspection services', 'Must be trackable'] as const;
export const WAREHOUSE_STORAGE_TYPE_OPTIONS = ['Ambient', 'Chilled', 'Frozen', 'Hazmat', 'Bulk', 'Bonded', 'Outdoor', 'Unsure'] as const;
// The handling a customer asks for on top of plain storage. Storage / Loading / Unloading lead the
// list because they are what every storage request is priced on first, and the warehousing bid form
// resolves these same labels into the services it marks REQUESTED.
export const WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS = ['Storage', 'Loading', 'Unloading', 'Cross-docking', 'Pick & Pack', 'Labeling', 'Kitting', 'Palletizing', 'Repackaging', 'Goods inspection', 'Customs handling', 'Distribution'] as const;
export const WAREHOUSE_RATE_UNIT_OPTIONS = ['per_pallet_month', 'per_m3_month', 'per_month'] as const;
