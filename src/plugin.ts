import streamDeck from "@elgato/streamdeck";
import { BatteryStatusAction } from "./actions/battery-status";

streamDeck.actions.registerAction(new BatteryStatusAction());
streamDeck.connect();
