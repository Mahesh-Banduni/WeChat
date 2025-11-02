import { NotFoundError, BadRequestError, ConflictError } from "../../errors/errors.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sendInvite = async(senderId, email) => {
    const receiver = await prisma.user.findFirst({
        where: { email },
    });

    if (!receiver) {
        throw new NotFoundError("User with this email does not exist");
    }

    const selfInvite = await prisma.user.findFirst({
        where: { userId: senderId, email },
    });
    
    if (selfInvite) {
        throw new NotFoundError("Cannot send invite to oneself");
    }

    const receiverId = receiver.userId; 
    const existingInviteSent = await prisma.invite.findFirst({
    where: { senderId, receiverId, status: "PENDING" },
    });
    if (existingInviteSent) {
        throw new ConflictError("An invitation has already been sent to this user.");
    }

    const existingInviteReceived = await prisma.invite.findFirst({
        where: { senderId: receiverId, receiverId: senderId, status: "PENDING" },
    });
    if (existingInviteReceived) {
        throw new ConflictError("You have already received an invitation from this user.");
    }

    const existingInviteAccepted = await prisma.invite.findFirst({
        where: { OR: [ {senderId, receiverId, status: "ACCEPTED" }, {senderId: receiverId, receiverId: senderId, status: "ACCEPTED"}]},
    });
    if (existingInviteAccepted) {
        throw new ConflictError("User is already connected.");
    }

    const invite = await prisma.invite.create({
        data: { senderId, receiverId },
        select:{
            inviteId: true,
            senderId: true,
            receiverId: true,
            status: true,
            receiver: {
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            },
            sender:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            }
        }
    }); 

    const notification = await prisma.notification.create({
        data:{
            userId: receiverId,
            message: `${invite.sender.name} has sent you connection request`,
            type: 'INVITE',
            inviteId: invite.inviteId,
        }
    })
    if(!invite) {
        throw new BadRequestError("Cannot send invite. Please try again later.");
    }
    return {invite, notification};
}

const handleInvite = async (inviteId, userId, status) => {
    const user = await prisma.user.findUnique({
        where: { userId },
    });

    if (!user) {
        throw new NotFoundError("User not found");
    }
    const invite = await prisma.invite.findUnique({
        where: { inviteId },
    });

    if (!invite) {
        throw new NotFoundError("Invite not found");
    }

    const updatedInvite = await prisma.invite.update({
        where: { inviteId, receiverId: userId },
        data: { status: status ? status : invite.status },
        select:{
            senderId: true,
            receiverId: true,
            status: true,
            receiver: {
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            },
            sender:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    if (!updatedInvite) {
        throw new BadRequestError("Cannot accept invite. Please try again later.");
    }

    if (status === "ACCEPTED") {
    await prisma.connection.create({
      data: { userAId: updatedInvite.senderId, userBId: updatedInvite.receiverId },
    });

    const notification = await prisma.notification.create({
      data:{
          userId: updatedInvite.senderId,
          message: `Congratulation!! ${updatedInvite.receiver.name} has accepted your connection request`,
          type: 'CONNECTION'
      }
    })
    return {invite: updatedInvite, notification};
    }
      return {invite:updatedInvite};
};

const allInvites = async(userId) => {
    const invites = await prisma.invite.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { receiverId: userId },
            { senderId: userId }
          ]
        },
        select:{
            inviteId: true,
            status: true,
            sender:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            },
            receiver:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            }
        }
    }); 
    if(!invites) {
        throw new BadRequestError("No invitations pending.");
    }
    return invites;
}

const allConnections = async (userId) =>{
        const connections = await prisma.connection.findMany({
        where: {
          OR: [
            { userAId: userId },
            { userBId: userId }
          ]
        },
        select:{
            connectionId: true,
            userA:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            },
            userB:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            }
        }
    }); 
    if(!connections) {
        throw new BadRequestError("No connections found.");
    }
    return connections;
}

const getInviteById = async (inviteId, userId) => {
    const user = await prisma.user.findUnique({
        where: { userId },
    });
    if (!user) {
        throw new NotFoundError("User not found");
    }
    const invite = await prisma.invite.findUnique({
        where: { inviteId, receiverId: userId },
        select:{
            inviteId: true,
            status: true,
            sender:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            },
            receiver:{
                select: {
                    userId: true,
                    name: true,
                    email: true
                }
            }
        }
    });
    if (!invite) {
        throw new NotFoundError("Invite not found");
    }
    return invite;
}

export default {
  sendInvite,
  handleInvite,
  allInvites,
  allConnections,
  getInviteById
};
