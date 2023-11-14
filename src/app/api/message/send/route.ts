import { getServerSession, User } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchRedis } from '@/helpers/redis';
import { db } from '@/lib/db';
import { Message, messageArrayValidator, messageValidator } from '@/lib/validations/message';
import { nanoid } from 'nanoid';
// import { messageValidator } from './../../../../lib/validations/message';
import { pusherServer } from './../../../../lib/pusher';
import { toPusherKey } from '@/lib/utils';




export async function POST(req: Request) {

    try{
        const {text, chatId}: {text: string, chatId: string} = await req.json()

        const session = await getServerSession(authOptions)

        if(!session) return new Response('Unauthorized', {status: 401})

        const [userId1, userId2] = chatId.split('--')


        
        if (session.user.id !== userId1 && session.user.id !== userId2) {


            return new Response('Unauthorized', { status: 401 })
          }
      

        const friendId = session.user.id === userId1 ? userId2 : userId1

        const friendList = await fetchRedis('smembers', 
            `user:${session.user.id}:friends`
        ) as string[]


        const isFriend = friendList.includes(friendId)


        if(!isFriend) {
            return new Response('Unauthorized', {status: 401})
        }

        const sender = (await fetchRedis('get', `user:${session.user.id}`)) as string
        const parsedSender = JSON.parse(sender) as User

        // all valid now send msg logic 
        const timestamp = Date.now()

        const messageData: Message = {
            id: nanoid(),
            senderId: session.user.id,
            text,
            timestamp,
        }

        console.log(messageData + "messageData")
        const message = messageValidator.parse(messageData)
        console.log(message + "message")

        await pusherServer.trigger(toPusherKey(`chat:${chatId}`), 'incoming-message', message)

        await pusherServer.trigger(toPusherKey(`user:${friendId}:chats`), 'new-message', {
            ...message,
            senderImg: parsedSender.image,
            senderName: parsedSender.name
        })

        // zadd -> add to a sorted list 
        await db.zadd(`chat:${chatId}:message`, {
            score: timestamp,
            member: JSON.stringify(message),
        })

        return new Response('OK')

    } catch(err) {
        if(err instanceof Error) {
            console.log("error server " + err.message)
            return new Response(err.message, {status: 500})
        }

        console.log("some error " + err)
        return new Response('Internal Server Error ', {status: 500}) 
    }
}