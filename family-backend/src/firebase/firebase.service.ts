import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;

  onModuleInit() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require('../config/firebase-service-account.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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