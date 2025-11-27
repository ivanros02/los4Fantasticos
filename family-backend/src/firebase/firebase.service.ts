import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../config/firebase-service-account.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;

  onModuleInit() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    this.firestore = admin.firestore();
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch {
      return null;
    }
  }

  getFirestore() {
    return this.firestore;
  }
}