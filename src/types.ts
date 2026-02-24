export type JsonValue = boolean | number | string | null | undefined | JsonValue[] | { [key: string]: JsonValue };

export interface SolarmanSettings {
	[key: string]: JsonValue;
	gridId: string;
	authToken: string;
}

export interface SolarmanData {
	batterySoc: number;
	batteryStatus: "CHARGE" | "DISCHARGE" | "STANDBY" | string;
	chargePower: number;
	dischargePower: number;
	usePower: number;
	generationPower: number;
	wirePower: number;
	businessWarningStatus: "NORMAL" | string;
}

export type DisplayMode = "battery" | "details";
