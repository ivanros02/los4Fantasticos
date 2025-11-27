import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { AppGateway } from './app.gateway';

@Module({
  imports: [FirebaseModule],
  controllers: [],
  providers: [AppGateway],
})
export class AppModule {}