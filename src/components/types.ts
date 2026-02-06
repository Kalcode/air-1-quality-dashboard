export interface SensorData {
	co2: string;
	pm25: string;
	pm10: string;
	pm_1um: string;
	pm_4um: string;
	humidity: string;
	temperature: string;
	voc: string;
	vocQuality: string;
	nox: string;
	pressure: string;
	rssi: string;
	uptime: string;
}

export interface ThresholdTier {
	max: number;
	label: string;
	color: string;
	advice?: string;
}

export interface ThresholdResult extends ThresholdTier {
	value: number;
}

export interface Reading {
	id: string;
	data: SensorData;
	room: string;
	timestamp: number;
	time: string;
	date: string;
}
