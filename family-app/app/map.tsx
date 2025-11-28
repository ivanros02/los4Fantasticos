import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { signOut, getCurrentUser  } from '../services/auth';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { requestPermissions, startForegroundTracking, startBackgroundTracking, stopBackgroundTracking } from '../services/location';

interface UserLocation {
    uid: string;
    name: string;
    location: {
        lat: number;
        lng: number;
        timestamp: number;
    };
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];

export default function Map() {
    const [locations, setLocations] = useState<UserLocation[]>([]);
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [connected, setConnected] = useState(false);
    const [sharing, setSharing] = useState(false);
    const watchRef = useRef<any>(null);
    const webviewRef = useRef<WebView>(null);

    useEffect(() => {
        initSocket();
        return () => {
            disconnectSocket();
            stopBackgroundTracking();
            watchRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        updateMapMarkers();
    }, [locations, myLocation]);

    const updateMapMarkers = () => {
        const allMarkers = locations.map((loc, i) => ({
            lat: loc.location.lat,
            lng: loc.location.lng,
            color: COLORS[i % COLORS.length],
            label:  loc.name || loc.uid.slice(0, 6),
        }));

        if (myLocation) {
            allMarkers.push({
                lat: myLocation.lat,
                lng: myLocation.lng,
                color: '#000',
                label: 'Yo',
            });
        }

        webviewRef.current?.injectJavaScript(`
      updateMarkers(${JSON.stringify(allMarkers)});
      true;
    `);
    };

    const initSocket = async () => {
        const socket = await connectSocket();
        if (!socket) return;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('requestAllLocations');
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('allLocations', (locs: UserLocation[]) => {
            setLocations(locs);
        });

        socket.on('locationUpdate', (data: UserLocation) => {
            setLocations((prev) => {
                const filtered = prev.filter((l) => l.uid !== data.uid);
                return [...filtered, data];
            });
        });

        socket.on('userDisconnected', ({ uid }: { uid: string }) => {
            setLocations((prev) => prev.filter((l) => l.uid !== uid));
        });
    };

    const toggleSharing = async () => {
        if (sharing) {
            await stopBackgroundTracking();
            watchRef.current?.remove();
            setSharing(false);
        } else {
            try {
                const granted = await requestPermissions();
                console.log('Permisos:', granted);
                if (!granted) return;

                console.log('Iniciando tracking...');
                const currentUser = getCurrentUser();
                watchRef.current = await startForegroundTracking((location) => {
                    console.log('Ubicación obtenida:', location.coords);

                    const loc = {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                    };
                    setMyLocation(loc);

                    const socket = getSocket();
                    console.log('Socket existe:', !!socket);
                    socket?.emit('updateLocation', {
                        ...loc,
                        name: currentUser?.name || 'Sin nombre',
                        timestamp: location.timestamp,
                    });
                });

                console.log('Watch creado:', !!watchRef.current);

                await startBackgroundTracking();
                console.log('Background iniciado');

                setSharing(true);
                console.log('Sharing activado');
            } catch (error) {
                console.error('Error en toggleSharing:', error);
            }
        }
    };

    const handleLogout = async () => {
        await stopBackgroundTracking();
        watchRef.current?.remove();
        disconnectSocket();
        await signOut();
        router.replace('/');
    };

    const centerOnFamily = () => {
        webviewRef.current?.injectJavaScript(`
      fitAllMarkers();
      true;
    `);
    };

    const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([-34.6037, -58.3816], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        let markers = [];

        function updateMarkers(data) {
          markers.forEach(m => map.removeLayer(m));
          markers = [];

          data.forEach(item => {
            const marker = L.circleMarker([item.lat, item.lng], {
              radius: 12,
              fillColor: item.color,
              color: '#fff',
              weight: 2,
              fillOpacity: 1
            }).addTo(map);
            marker.bindTooltip(item.label, { permanent: true, direction: 'top', offset: [0, -10] });
            markers.push(marker);
          });
        }

        function fitAllMarkers() {
          if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.2));
          }
        }
      </script>
    </body>
    </html>
  `;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.status}>
                    {connected ? '🟢 Conectado' : '🔴 Desconectado'}
                </Text>
                <Pressable onPress={handleLogout}>
                    <Text style={styles.logout}>Salir</Text>
                </Pressable>
            </View>

            <WebView
                ref={webviewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                javaScriptEnabled
            />

            <View style={styles.controls}>
                <Pressable style={styles.centerButton} onPress={centerOnFamily}>
                    <Text style={styles.centerButtonText}>📍</Text>
                </Pressable>

                <Pressable
                    style={[styles.shareButton, sharing && styles.shareButtonActive]}
                    onPress={toggleSharing}
                >
                    <Text style={styles.shareButtonText}>
                        {sharing ? 'Dejar de compartir' : 'Compartir ubicación'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#fff',
        zIndex: 1,
    },
    status: {
        fontSize: 14,
    },
    logout: {
        color: '#e74c3c',
        fontSize: 14,
    },
    map: {
        flex: 1,
    },
    controls: {
        position: 'absolute',
        bottom: 30,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    centerButton: {
        backgroundColor: '#fff',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    centerButtonText: {
        fontSize: 24,
    },
    shareButton: {
        flex: 1,
        backgroundColor: '#2ecc71',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    shareButtonActive: {
        backgroundColor: '#e74c3c',
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});