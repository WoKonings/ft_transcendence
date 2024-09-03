import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class SocketManagerService {
  private userSocketMap = new Map<number, Socket>(); // Map to store userId -> Socket

  // Store socket for a given user ID
  setUserSocket(userId: number, socket: Socket): void {
    this.userSocketMap.set(userId, socket);
    console.log("set sock in socket manager");
  }

  // Get the socket for a given user ID
  getUserSocket(userId: number): Socket | undefined {
    return this.userSocketMap.get(userId);
  }

  // Remove socket when user disconnects
  removeUserSocket(userId: number): void {
    this.userSocketMap.delete(userId);
    console.log("deleted sock in socket manager");
  }
}
