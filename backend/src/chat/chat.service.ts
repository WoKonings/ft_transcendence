import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  private userSockets: Map<number, string> = new Map(); // Maps userId to socketId

  addUserSocket(userId: number, socketId: string) {
    this.userSockets.set(userId, socketId);
  }

  getUserSocket(userId: number): string | undefined {
    return this.userSockets.get(userId);
  }

  removeUserSocket(socketId: string) {
    for (const [userId, id] of this.userSockets.entries()) {
      if (id === socketId) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }
}