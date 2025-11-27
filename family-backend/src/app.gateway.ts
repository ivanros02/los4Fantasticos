import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FirebaseService } from './firebase/firebase.service';

interface Location {
  lat: number;
  lng: number;
  timestamp: number;
}

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { socketId: string; uid: string; location?: Location }>();
  private lastSavedLocations = new Map<string, Location>();

  constructor(private firebaseService: FirebaseService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const user = await this.firebaseService.verifyToken(token);

    if (!user) {
      client.disconnect();
      return;
    }

    this.connectedUsers.set(client.id, { socketId: client.id, uid: user.uid });
    client.join('family');
    console.log(`Usuario conectado: ${user.uid}`);
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user?.location) {
      this.saveLocationToFirestore(user.uid, user.location);
    }
    this.connectedUsers.delete(client.id);
    this.server.to('family').emit('userDisconnected', { uid: user?.uid });
    console.log(`Usuario desconectado: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() location: Location,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    console.log(`Ubicación recibida de ${user.uid}:`, location);

    user.location = location;

    this.server.to('family').emit('locationUpdate', {
      uid: user.uid,
      location,
    });
  }

  @SubscribeMessage('requestAllLocations')
  handleRequestLocations(@ConnectedSocket() client: Socket) {
    const locations = Array.from(this.connectedUsers.values())
      .filter((u) => u.location)
      .map((u) => ({ uid: u.uid, location: u.location }));

    client.emit('allLocations', locations);
  }

  private async saveLocationToFirestore(uid: string, location: Location) {
    const lastSaved = this.lastSavedLocations.get(uid);
    
    if (lastSaved && this.getDistance(lastSaved, location) < 50) {
      return;
    }

    await this.firebaseService.getFirestore().collection('locations').doc(uid).set({
      ...location,
      updatedAt: new Date(),
    });

    this.lastSavedLocations.set(uid, location);
  }

  private getDistance(loc1: Location, loc2: Location): number {
    const R = 6371e3;
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}