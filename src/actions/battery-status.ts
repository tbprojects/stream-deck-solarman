import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
	SingletonAction,
} from "@elgato/streamdeck";
import { SvgBuilder } from "../canvas";
import type { DisplayMode, SolarmanData, SolarmanSettings } from "../types";

const CHECK_INTERVAL_MS = 60_000;
const LONG_PRESS_MS = 500;
const SIZE = 144;
const OFFGRID_BORDER = SIZE / 20;
const SOLARMAN_URL = "https://globalhome.solarmanpv.com/";

interface ActionState {
	intervalId: ReturnType<typeof setInterval> | undefined;
	lastData: SolarmanData | undefined;
	displayMode: DisplayMode;
	settings: SolarmanSettings;
	keyDownAt: number | undefined;
}

function defaultState(): ActionState {
	return {
		intervalId: undefined,
		lastData: undefined,
		displayMode: "battery",
		settings: { gridId: "", authToken: "" },
		keyDownAt: undefined,
	};
}

@action({ UUID: "com.tbprojects.solarman.battery-status" })
export class BatteryStatusAction extends SingletonAction<SolarmanSettings> {
	private readonly states = new Map<string, ActionState>();

	override async onWillAppear(ev: WillAppearEvent<SolarmanSettings>): Promise<void> {
		const state = defaultState();
		state.settings = ev.payload.settings;
		this.states.set(ev.action.id, state);
		await this.startPolling(ev.action.id, state);
	}

	override onWillDisappear(ev: WillDisappearEvent<SolarmanSettings>): void {
		const state = this.states.get(ev.action.id);
		if (state) {
			this.stopPolling(state);
			this.states.delete(ev.action.id);
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SolarmanSettings>): Promise<void> {
		const state = this.states.get(ev.action.id) ?? defaultState();
		state.settings = ev.payload.settings;
		this.states.set(ev.action.id, state);
		await this.fetchAndRender(ev.action.id, state);
	}

	override onKeyDown(ev: KeyDownEvent<SolarmanSettings>): void {
		const state = this.states.get(ev.action.id);
		if (!state) return;
		state.keyDownAt = Date.now();
	}

	override async onKeyUp(ev: KeyUpEvent<SolarmanSettings>): Promise<void> {
		const state = this.states.get(ev.action.id);
		if (!state) return;

		const held = state.keyDownAt !== undefined ? Date.now() - state.keyDownAt : 0;
		state.keyDownAt = undefined;

		if (held >= LONG_PRESS_MS) {
			await streamDeck.system.openUrl(SOLARMAN_URL);
			return;
		}

		state.displayMode = state.displayMode === "battery" ? "details" : "battery";
		await this.render(ev.action, state);
	}

	private async startPolling(actionId: string, state: ActionState): Promise<void> {
		this.stopPolling(state);
		await this.fetchAndRender(actionId, state);
		state.intervalId = setInterval(() => this.fetchAndRender(actionId, state), CHECK_INTERVAL_MS);
	}

	private stopPolling(state: ActionState): void {
		if (state.intervalId !== undefined) {
			clearInterval(state.intervalId);
			state.intervalId = undefined;
		}
	}

	private async fetchAndRender(actionId: string, state: ActionState): Promise<void> {
		const found = streamDeck.actions.getActionById(actionId);
		if (!isKeyAction(found)) return;
		const sdAction = found;

		const { gridId, authToken } = state.settings;
		if (!gridId || !authToken) {
			await setActionImage(sdAction, errorImage("cfg"));
			return;
		}

		try {
			const response = await fetch(
				`https://globalhome.solarmanpv.com/maintain-s/operating/system/${gridId}`,
				{
					method: "GET",
					headers: { Authorization: `Bearer ${authToken}` },
				}
			);

			if (response.status === 401) {
				await setActionImage(sdAction, errorImage("401"));
				return;
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			state.lastData = (await response.json()) as SolarmanData;
			await this.render(sdAction, state);
		} catch (e) {
			streamDeck.logger.error("Solarman fetch error:", e);
			await setActionImage(sdAction, errorImage("err"));
		}
	}

	private async render(sdAction: KeyAction<SolarmanSettings>, state: ActionState): Promise<void> {
		if (!state.lastData) return;
		const image = state.displayMode === "battery"
			? renderBatteryImage(state.lastData)
			: renderDetailsImage(state.lastData);
		await setActionImage(sdAction, image);
	}
}

function isKeyAction(action: unknown): action is KeyAction<SolarmanSettings> {
	return typeof action === "object" && action !== null && "setImage" in action && "setTitle" in action;
}

async function setActionImage(sdAction: KeyAction<SolarmanSettings>, image: string): Promise<void> {
	await sdAction.setImage(image);
	await sdAction.setTitle("");
}

function errorImage(label: string): string {
	return new SvgBuilder(SIZE)
		.rect(0, 0, SIZE, SIZE, "#000000")
		.text(label, SIZE / 2, SIZE / 2, SIZE * 0.35, "#ffffff")
		.build();
}

function addOffgridBorder(svg: SvgBuilder): void {
	const b = OFFGRID_BORDER;
	svg.strokeRect(b / 2, b / 2, SIZE - b, SIZE - b, "purple", b);
}

function batteryColor(data: SolarmanData): string {
	if (data.batterySoc === 100) return "limegreen";
	if (data.batteryStatus === "CHARGE") return "dodgerblue";
	if (data.batteryStatus === "DISCHARGE") return "darkorange";
	return "grey";
}

function renderBatteryImage(data: SolarmanData): string {
	const { batterySoc, businessWarningStatus } = data;
	const offgrid = businessWarningStatus !== "NORMAL";
	const color = batteryColor(data);
	const text = String(batterySoc);
	const emptyHeight = SIZE - Math.round((SIZE * batterySoc) / 100);

	const svg = new SvgBuilder(SIZE)
		.rect(0, 0, SIZE, SIZE, color)
		.rect(0, 0, SIZE, emptyHeight, "#ffffff", 0.8)
		.text(text, SIZE / 2, SIZE / 2, SIZE * 0.42, "#ffffff", "middle", color, 3);

	if (offgrid) addOffgridBorder(svg);

	return svg.build();
}

function powerKw(watts: number): string {
	return (watts / 1000).toFixed(1);
}

function renderDetailsImage(data: SolarmanData): string {
	const { generationPower, usePower, chargePower, dischargePower, wirePower, businessWarningStatus } = data;
	const offgrid = businessWarningStatus !== "NORMAL";

	const lines: Array<{ icon: string; value: string; color: string }> = [];

  const generationPowerColor = generationPower < 100 ? "#eeeeee" : "gold";
	lines.push({ icon: "☀", value: `${powerKw(generationPower)}kW`, color: generationPowerColor });

  const usePowerColor = "#eeeeee";
	lines.push({ icon: "⚡", value: `${powerKw(usePower)}kW`, color: usePowerColor });

  const wirePowerColor = Math.abs(wirePower) < 100 ? "#eeeeee" : wirePower < 0 ? "#ff6b6b" : "#6bff6b";
  const wirePowerIcon = Math.abs(wirePower) < 100 ? "≋" : wirePower < 0 ? "▼" : "▲";
  lines.push({ icon: wirePowerIcon, value: `${powerKw(Math.abs(wirePower))}kW`, color: wirePowerColor });

  // There is not enough room for additional stats
	// if (chargePower > 0) {
	// 	lines.push({ icon: "▲", value: `${powerKw(chargePower)}kW`, color: "dodgerblue" });
	// } else if (dischargePower > 0) {
	// 	lines.push({ icon: "▼", value: `${powerKw(dischargePower)}kW`, color: "darkorange" });
	// }

	const lineCount = lines.length + 1;
	const lineH = SIZE / lineCount;
	const fontSize = Math.min(SIZE * 0.17, lineH * 0.6);
	const labelX = SIZE * 0.12;
	const valueX = SIZE * 0.9;
	const statusFontSize = SIZE * 0.1;

	const svg = new SvgBuilder(SIZE).rect(0, 0, SIZE, SIZE, "#1a1a1a");

	if (offgrid) addOffgridBorder(svg);

	lines.forEach((line, i) => {
		const y = lineH * (i + 1);
		svg
			.text(line.icon, labelX, y, fontSize, line.color, "start")
			.text(line.value, valueX, y, fontSize, line.color, "end");
	});

	svg.text(
		offgrid ? "OFF-GRID" : "ON-GRID",
		SIZE / 2,
		SIZE - statusFontSize,
		statusFontSize,
		"#888888",
	);

	return svg.build();
}
