import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'bdrms-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
