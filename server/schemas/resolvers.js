import { GraphQLError } from 'graphql';
import { User, ChatRoom, Message } from '../models/index.js';
import { signToken } from '../utils/auth.js';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.req.user) {
        const userData = await User.findOne({ _id: context.req.user._id })
          .select('-__v -password')
          .populate('chat_rooms')
          .populate('last_open_room');

        return userData;
      }
      throw new GraphQLError('Not logged in');
    },
    getAllUsers: async () => {
      return User.find()
        .select('-__v -password')
        .populate('chat_rooms')
        .populate('last_open_room');
    },
    getUser: async (parent, { username }) => {
      return User.find({ username })
        .select('-__v -password')
        .populate('chat_rooms')
        .populate('last_open_room');
    },
    getAllChatRooms: async () => {
      return await ChatRoom.find({}).populate('users')
    },
    getChatRoom: async (parent, { chatRoomId }) => {
      const newData = await ChatRoom.findOne({ _id: chatRoomId })
        .populate('messages')
        .populate({ path: 'users', select: '_id username'})
        .populate({ path: 'messages', populate: { path: 'user', model: 'User', select: '_id username' } })      
      return  { name: newData.name, users: newData.users, messages: newData.messages }
    },
  },
  Mutation: {
    createUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return { token, user };
    },
    login: async (parent, { username, password }) => {
      const user = await User.findOne({ username });

      if (!user) {
        throw new GraphQLError('Incorrect credentials');
      }
      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new GraphQLError('Incorrect credentials');
      }
      const token = signToken(user);
      return { token, user };
    },
    changePassword: async (parent, args, context) => {
      if (context.req.user) {
        // Find the user document by ID and password
        const user = await User.findOne({
          _id: context.req.user._id
        });
        const correctPw = await user.isCorrectPassword(args.oldPassword);

        if (!correctPw) {
          throw new GraphQLError('Invalid old password');
        }

        // Update the password field with the new password
        user.password = args.newPassword;
        const updatedUser = await user.save();

        return updatedUser ;
      }

      throw new GraphQLError('Not logged in');
    },
    addUserToRoom: async (parent, args, context) => {
      if (context.req.user) {
        const user = await User.findByIdAndUpdate(
          { _id: context.req.user._id },
          { $push: { chat_rooms: {room_name: args.roomName, chat_room: args.chatRoomId } } },
          { new: true }
        );
        return { _id: user._id };
      }
      throw new GraphQLError('Not logged in');
    },
    addChatRoom: async (parent, args, context) => {
      if (context.req.user) {
        const chatRoom = await ChatRoom.create({ users: [context.req.user._id] });
        const updatedUser = await User.findByIdAndUpdate(
          { _id: context.req.user._id },
          { $push: { chat_rooms: {room_name: args.name, chat_room: chatRoom._id }} },
          { new: true }
        );

        return { _id: chatRoom._id };
      }
      else{
        throw new GraphQLError('Not logged in')
      }
    },
    renameChatRoom: async (parent, args, context) => {
      if (context.req.user) {

        const updatedUser = await User.findOneAndUpdate(
          {
            _id: context.req.user._id,
            'chat_rooms.chat_room': args.chatRoomId,
          },
          { $set: { 'chat_rooms.$.room_name': args.name } },
          { new: true },
        );

        return updatedUser;
      }

      throw new GraphQLError('Not logged in');
    },
    deleteChatRoom: async (parent, args, context) => {
      if (context.req.user) {
        const updatedUser = await User.findByIdAndUpdate(
          context.req.user._id,
          { $pull: { chat_rooms: { chat_room: args.chatRoomId } } },
          { new: true },
        );

        return updatedUser;
      }

      throw new GraphQLError('Not logged in');
    },
    postMessage: async (parent, args, context) => {
      // check if user has valid token (logged in)
      if (context.req.user) {
        // create new message
        const newMessage = await Message.create({ 
          message: args.message_text, 
          user: context.req.user._id, 
          chat_room: args.chat_room 
        })
        
        const updatedRoom = await ChatRoom.findByIdAndUpdate(
          { _id: args.chat_room },
          { $push: { messages: newMessage.id } },
          { new: true }
        )

        //broadcast new message to all subscribers
        pubsub.publish(args.chat_room, { 
          subscribeToRoom: { 
            _id: newMessage.id, 
            message: args.message_text, 
            user: context.req.user, 
            created_at: newMessage.created_at 
          }})
        return { _id: newMessage.id, message: args.message_text, user: context.req.user, created_at: newMessage.created_at}
      }
      // if user is not logged in, throw error
      throw new GraphQLError('Not logged in');
    },
  },
  Subscription: {
    subscribeToRoom: {
      subscribe: (_, __, context) => {
        return pubsub.asyncIterator(context.args.variableValues.chatRoom)
      }
    },
  },
}

export default resolvers;
