import { BadRequestException, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User, Channel } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { GetFriendsDto } from './dto/get-friends.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  //todo: LOG IN PROPER
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Unique constraint violation, a user with this email or username already exists');
        }
      }
      throw error;
    }
  }

  //todo: accept user if they added you and you add them?
  async addUserAsFriend(targetId: number, userId: number) {
	  console.log('targetId:', targetId, 'userId:', userId); // Log IDs to verify they are correct
	// Fetch the target user
    if (!targetId || !userId || targetId == userId) {
      throw new Error('Invalid user IDs provided');
    }
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    // Check if target user already added user, if so, accept on both sides.
    const user = await this.prisma.user.findUnique({
      where: { id: userId}
    })
    if (user && user.pending.includes(targetId)) {
      //update user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          pending: {
            set: user.pending.filter(id => id !== targetId)
          },
          friends: {
            push: targetId
          }
        }
      })
      await this.prisma.user.update({
        where: { id: targetId },
        data: {
          pending: {
            set: user.pending.filter(id => id !== userId)
            // remove userId
          },
          friends: {
            push: userId
          }
        }
      })
      return;
    }

    // Check if userId is already in the pending list
    if (targetUser.pending.includes(userId)) {
      // throw new BadRequestException('Friend request already sent');
      return { message: 'Friend request already sent'};
    }

    // Update the target user's pending list
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        pending: {
          push: userId,
        },
      },
    });

    return { message: 'Friend request sent' };
  }

  async removeFriend(targetId: number, userId: number) {
    const target = await this.getUserById(targetId);
    const user = await this.getUserById(userId);
    if (!target || !user) {
      console.log("couldnt fetch users to delete");
      return;
    }
    if (!user.friends.includes(targetId)) {
      console.log("user is not friends with target to remove");
      return { message: `You are not friends with ${target.username}` };
    }
    if (!target.friends.includes(userId)) {
      console.log("target is not friends with user to remove");
      return { message: `THIS GOT TRIGGERED, MEANING VERY BAD FRIEND HANDLING!!` };
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
         friends: {
          set: user.friends.filter(friendId => friendId !== targetId)
        }
       }
    })
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        friends: {
          set: target.friends.filter(friendId => friendId !== userId)
        }
      }
    });
    return { message: `Removed ${target.username} succesfully` };
	}

  async getUserForAuth(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
  }

  //todo: delete the email part?
  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
      },
	});
  
	return users;
  }

  async getFriends(userId: number) {
	// Fetch the user with their friends' IDs
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
		select: { friends: true },
	});

	if (!user) {
		throw new BadRequestException('User not found');
	}
  console.log (`fetching friends for user: ${userId}`);
	// Retrieve each friend's information
	const friendsList = await Promise.all(
		user.friends.map(async (friendId) => {
			const friend = await this.prisma.user.findUnique({
				where: { id: friendId },
				select: {
					id: true,
					username: true,
					isOnline: true,
					isInGame: true,
					isInQueue: true,
					// avatar: true,
				},
			});
			return friend;
		}),
	);

	return friendsList;
}

async getIncomingPendingFriends(userId: number) {
	// Fetch the user with their friends' IDs
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
		select: { pending: true },
	});

	if (!user) {
		throw new BadRequestException('User not found');
	}

	// Retrieve each friend's information
	const pendingList = await Promise.all(
		user.pending.map(async (pendingId) => {
			const pending = await this.prisma.user.findUnique({
				where: { id: pendingId },
				select: {
					id: true,
					username: true,
					isOnline: true,
					isInGame: true,
					isInQueue: true,
					// avatar: true,
				},
			});
			return pending;
		}),
	);
	return pendingList;
}

  //todo: error catching if no user?
  async getUserById(userId: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      console.log(`could not find user by id: ${userId}`);
      return (null);
    }
    return (user);
  }

  async getIsInGame(userId: number): Promise<Boolean> {
    const user = await this.getUserById(userId); // Use await to get the actual user object
    if (!user) {
      throw new Error('User not found');
    }
    return user.isInGame;
  }
  
  async setIsInGame(userId: number, bool: boolean): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isInGame: bool },
    });
  
    console.log(`${user.username} is ingame?: ${user.isInGame}`);
  }

  async deleteUser(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
