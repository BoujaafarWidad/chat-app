const io = require('./index.js').io

const { VERIFY_USER, USER_CONNECTED, LOGOUT,
 COMMUNITY_CHAT, USER_DISCONNECTED, MESSAGE_RECIEVED,
  MESSAGE_SENT, TYPING, PRIVATE_MESSAGE} = require('../Events')

const { createUser, createMessage, createChat } = require('../Factories')
let connectedUsers = { }
let communityChat = createChat()

module.exports = function(socket){
	console.log("Socket Id" + socket.id);

  let sendMessageToChatFromUser;

  let sendTypingFromUser;

  // get community chat
  socket.on(COMMUNITY_CHAT, (callback)=>{
    callback(communityChat)
  })

  //User disconnects
  socket.on('disconnect', ()=>{
    if("user" in socket){
      connectedUsers = removeUser(connectedUsers, socket.user.name)

      io.emit(USER_DISCONNECTED, connectedUsers)
      console.log("Disconnect", connectedUsers);
    }
  })

  //User logsout

  socket.on(LOGOUT, ()=>{
    connectedUsers = removeUser(connectedUsers, socket.user.name)
    io.emit(USER_DISCONNECTED, connectedUsers)
    console.log("Disconnect", connectedUsers);

  })

	//verify Username
	socket.on(VERIFY_USER, (nickname, callback)=>{
		if(isUser(connectedUsers, nickname)){
			callback({ isUser:true, user:null })
		}else{
			callback({ isUser:false, user:createUser({name:nickname, socketId:socket.id})})
		}
	})
  
  socket.on(MESSAGE_SENT, ({chatId, message})=>{
    sendMessageToChatFromUser(chatId, message)
  })

	//User Connects with username
    socket.on(USER_CONNECTED, (user)=>{
      user.socketId = socket.id
    	connectedUsers = addUser(connectedUsers, user)
    	socket.user = user

      sendMessageToChatFromUser = sendMessageToChat(user.name)
      sendTypingFromUser = sendTypingToChat(user.name)
      
    	io.emit(USER_CONNECTED, connectedUsers)
    	console.log(connectedUsers);
    })

    socket.on(TYPING, ({chatId, isTyping})=>{
    sendTypingFromUser(chatId, isTyping)
  })

    socket.on(PRIVATE_MESSAGE, ({reciever, sender})=>{
    if(reciever in connectedUsers){
      const newChat = createChat({ name:`${reciever}&${sender}`, users:[reciever, sender] })
      const recieverSocket = connectedUsers[reciever].socketId
      socket.to(recieverSocket).emit(PRIVATE_MESSAGE, newChat)
      socket.emit(PRIVATE_MESSAGE, newChat)
    }
  })

}

function sendTypingToChat(user){
  return (chatId, isTyping)=>{
    io.emit(`${TYPING}-${chatId}`, {user, isTyping})
  }
}

function sendMessageToChat(sender){
  return (chatId, message)=>{
    io.emit(`${MESSAGE_RECIEVED}-${chatId}`, createMessage({message, sender}))
  }
}

function addUser(userList, user){
  let newList = Object.assign({}, userList)
  newList[user.name] = user
  return newList
}

function removeUser(userList, username){
  let newList = Object.assign({}, userList)
  delete newList[username]
  return newList
}

function isUser(userList, username){
  return username in userList
}

