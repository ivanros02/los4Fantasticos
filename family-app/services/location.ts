import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getSocket } from './socket';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

export async function requestPermissions(): Promise<boolean> {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    return background === 'granted';
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
        console.log('Obteniendo ubicación actual...');
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        console.log('Ubicación actual:', location.coords);
        return location;
    } catch (error) {
        console.error('Error getCurrentLocation:', error);
        return null;
    }
}

export async function startForegroundTracking(onLocation: (location: Location.LocationObject) => void) {
    console.log('startForegroundTracking iniciado');

    const initial = await getCurrentLocation();
    console.log('Ubicación inicial:', initial ? 'OK' : 'NULL');

    if (initial) {
        onLocation(initial);
    }

    const watch = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 10,
        },
        onLocation
    );

    console.log('Watch position creado');
    return watch;
}

export async function startBackgroundTracking() {
    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
        console.log('Background task not defined');
        return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) return;

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 120000,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'Family App',
            notificationBody: 'Compartiendo ubicación con tu familia',
        },
    });
}

export async function stopBackgroundTracking() {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error(error);
        return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (location) {
        const socket = getSocket();
        socket?.emit('updateLocation', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: location.timestamp,
        });
    }
});