import { fetchRedis } from '@/helpers/redis'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pusherServer } from '@/lib/pusher'
// import { toPusherKey } from '@/lib/utils'
import { addFriendValidator } from '@/lib/validations/add-friend'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import {toPusherKey} from '@/lib/utils'


export async function POST(req: Request){

    try{
      const body = await req.json()

    //   revalidate the input data
    const { email: emailToAdd } = addFriendValidator.parse(body.email)

    const idToAdd = (await fetchRedis(
      'get',
      `user:email:${emailToAdd}`
    )) as string
      // (due to weird NEXTJS caching behaviour the following code 
      // doesnt live with us. We need to use fetchRedis to get rid of the problem)
    //   const RESTResponse = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/user:email${emailToAdd}`, {
    //     headers: {
    //         Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    //     },
    //     // bypassing the caching behavior of nextjs
    //     // meaning the data will never be stale as it will always be fetched from the server
    //     //  means that the data will always be fresh
    //     cache: 'no-store',
    //   })

    //   const data = await RESTResponse.json() as {result: string | null}

    // //   idtoAdd is the id of the user we want to add as a friend
    // //  it can be a relevant id or null
    //   const idToAdd = data.result

    if (!idToAdd) {
      return new Response('This person does not exist.', { status: 400 })
    }

    //   we need to check who is making this request
    //  we need to get the session of the user making this request
    // we also don't want this to happen from the client side
    // coz that is unsafe, so we will bring that to server side
    // we will use the getServerSession function to get the session of the user making this request
    
    const session = await getServerSession(authOptions)
 
      if(!session){
        // 'return new Response()' is 
        // the new syntax of NextJS 13
        return new Response('Unauthorized', { status: 401 })
      }

      if (idToAdd === session.user.id) {
        return new Response('You cannot add yourself as a friend', {
          status: 400,
        })
      }

    //   we need to check if the user is already a friend
    const isAlreadyAdded = (await fetchRedis(
      // sismember --> "s is member" --> "set is member" 
      'sismember',
      `user:${idToAdd}:incoming_friend_requests`,
      session.user.id
    )) as 0 | 1

    if (isAlreadyAdded) {
      return new Response('Already added this user', { status: 400 })
    }

    // const outgoing_friend_request = (await (fetchRedis(
    //   'sismember',
    //   `user:${session.user.id}:outgoing_friend_requests`,
    //   idToAdd
    // )))


    const isAlreadyFriends = (await fetchRedis(
      'sismember',
      // we are checking in friends list of current logged in user, if 
      // idtoadd exists already
      `user:${session.user.id}:friends`,
      idToAdd
    )) as 0 | 1

    if (isAlreadyFriends) {
      return new Response('Already friends with this user', { status: 400 })
    }

    pusherServer.trigger(
      toPusherKey(`user:${idToAdd}:incoming_friend_requests`),
      'incoming_friend_requests',
      {
        senderId: session.user.id,
        senderEmail: session.user.email,
      }
    )

    // valid request, send friend request

    // await pusherServer.trigger(
    //   toPusherKey(`user:${idToAdd}:incoming_friend_requests`),
    //   'incoming_friend_requests',
    //   {
    //     senderId: session.user.id,
    //     senderEmail: session.user.email,
    //   }
    // )

    // we are adding to the set of database -> sadd
    await db.sadd(`user:${idToAdd}:incoming_friend_requests`, session.user.id)
    await db.sadd(`user:${session.user.id}:outgoing_friend_requests`, idToAdd)

    return new Response('OK')



    // Valid Request  
      
    } catch (error) {
      console.log(error)
      if (error instanceof z.ZodError) {
        return new Response('Invalid request payload', { status: 422 })
      }
  
      return new Response(`Invalid request`, { status: 400 })
    }
}