import {z} from "zod"
import {getServerSession} from 'next-auth'
import { db } from '@/lib/db';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from './../../../../lib/auth';
import { pusherServer } from './../../../../lib/pusher';
import { toPusherKey } from '@/lib/utils';


export async function POST(req: Request) {
    try {

        const body = await req.json();

        const {id: idToAdd} = z.object({id: z.string()}).parse(body);

        const session = await getServerSession(authOptions)

        if(!session) {
            return new Response('Unauthorised', {status: 401})
        }

        // verify if both users are not already friends 
        const isAlreadyFriends = await fetchRedis('sismember', 
        `user:${session.user.id}:friends`, 
        // to check for who is 
        // member of this
        idToAdd)

        if(isAlreadyFriends) {
            return new Response(`Already Friends`, {status: 400}) 
        }

        // if the person has actually had an incominbg freidn req
        // 
        const hasFriendRequest = await fetchRedis('sismember', 
        `user:${session.user.id}:incoming_friend_requests`,
         idToAdd)

        //  if you h=dont have a friend req of someone named A
        // u cant add them 
        if(!hasFriendRequest) {
            return new Response(`No friend request`, {status: 400}) 
        }


        const [userRaw, friendRaw] = (await Promise.all([
            fetchRedis('get', `user:${session.user.id}`),
            fetchRedis('get', `user:${idToAdd}`)
        ])) as [string, string]

        const user = JSON.parse(userRaw) as User
        const friend = JSON.parse(friendRaw) as User

        await Promise.all([
            pusherServer.trigger(toPusherKey(`user:${idToAdd}:friends`), 'new-friend', user),
            pusherServer.trigger(toPusherKey(`user:${session.user.id}:friends`), 'new-friend', user),
            await db.sadd(`user:${session.user.id}:friends`, idToAdd),
            await db.sadd(`user:${idToAdd}:friends`, session.user.id),
            await db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd),
            await db.srem(`user:${idToAdd}:outgoing_friend_requests`, session.user.id)
        ])


        // notify added user 
        pusherServer.trigger(toPusherKey(`user:${idToAdd}:friends`), 'new-friend', {})

        // if all is well
        // we want to add idToAdd ot a set of friends in the user 
        // with the value session.user.id that is 
        // in the currnrt loged in users set of friends
        await db.sadd(`user:${session.user.id}:friends`, idToAdd)

        await db.sadd(`user:${idToAdd}:friends`, session.user.id)

        await db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd)

        await db.srem(`user:${idToAdd}:outgoing_friend_requests`, session.user.id)

        // the above code from db.sadd -> db.sadd -> db.srem -> db.srem is 
        // NOT the optimal way of DM manipulation


        return new Response("ok")
    } catch(err) {
        
        if(err instanceof z.ZodError) {
            return new Response('Invalid req payload', { status: 422})
        }

        return new Response('Invalid request', {status: 400})
    }
}