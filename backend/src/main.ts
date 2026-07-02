import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import "dotenv/config"

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ Thêm global prefix /api
  app.setGlobalPrefix('api');
  
  app.enableCors({
    origin: ['http://localhost:3000'],
    credential: true,
  });
  
  const port = 3005;
  await app.listen(port);
  console.log(`🚀 Server is running on: http://localhost:${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/api`);
}
bootstrap();