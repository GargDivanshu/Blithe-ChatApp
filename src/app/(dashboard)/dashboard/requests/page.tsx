import FriendRequests from '@/components/FriendRequests'
import OutgoingFriendReq from '@/components/OutgoingFriendReq'
import { fetchRedis } from '@/helpers/redis'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { FC } from 'react'

const page = async () => {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  // ids of people who sent current logged in user a friend requests
  const incomingSenderIds = (await fetchRedis(
    'smembers',
    `user:${session.user.id}:incoming_friend_requests`
  )) as string[]

  const incomingFriendRequests = await Promise.all(
    incomingSenderIds.map(async (senderId) => {
      const sender = (await fetchRedis('get', `user:${senderId}`)) as string
      const senderParsed = JSON.parse(sender) as User
      
      return {
        senderId,
        senderEmail: senderParsed.email,
      }
    })
  )

  const outgoingSenderIds = (await fetchRedis(
    'smembers',
    `user:${session.user.id}:outgoing_friend_requests`,
  )) as string[]

  const outgoingFriendRequests = await Promise.all(
    outgoingSenderIds.map(async (senderId) => {
      const sender = (await fetchRedis('get', `user:${senderId}`)) as string
      const senderParsed = JSON.parse(sender) as User
      
      return {
        senderId,
        senderEmail: senderParsed.email,
      }
    })
  )
  

  return (
    <main className='pt-8'>
      <h1 className='font-bold text-5xl mb-8'>Add a friend</h1>
      <div className='flex flex-col gap-4'>
        <FriendRequests
          incomingFriendRequests={incomingFriendRequests}
          sessionId={session.user.id}
        />
      </div>

      <h1 className='font-bold text-5xl mb-8'>Sent requests</h1>
      <OutgoingFriendReq 
      outgoingFriendRequests={outgoingFriendRequests}
      sessionId = {session.user.id}
      />
      {/* {outgoingFriendRequests.map((request) => {
        <div key={request.senderId} className='flex gap-4 items-center'>
        
        <p className='font-medium text-lg'>{request.senderEmail}</p>
      </div>
      })} */}
      <div>

      </div>
    </main>
  )
}

export default page