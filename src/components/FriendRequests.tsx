"use client"
import {FC, useState, useEffect} from 'react'
import { Check, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { pusherServer, pusherClient } from '@/lib/pusher';
import { toPusherKey } from '@/lib/utils';

interface FriendRequestProps{
    incomingFriendRequests: IncomingFriendRequest[]
    sessionId: string
}


const FriendRequests: FC<FriendRequestProps> = ({
    incomingFriendRequests,
    sessionId,
}) => {

    const router = useRouter()

    const [friendRequests, setFriendRequests] = useState<IncomingFriendRequest[]>(
        incomingFriendRequests
    )

    useEffect(() => {
      pusherClient.subscribe(
        toPusherKey(`user:${sessionId}:incoming_friend_requests`)
      )
      console.log("listening to ", `user:${sessionId}:incoming_friend_requests`)
  
      const friendRequestHandler = ({
        senderId,
        senderEmail,
      }: IncomingFriendRequest) => {
        console.log("function got called")
        setFriendRequests((prev) => [...prev, { senderId, senderEmail }])
      }
  
      pusherClient.bind('incoming_friend_requests', friendRequestHandler)
  
      return () => {
        pusherClient.unsubscribe(
          toPusherKey(`user:${sessionId}:incoming_friend_requests`)
        )
        pusherClient.unbind('incoming_friend_requests', friendRequestHandler)
      }
    }, [sessionId])

    const acceptFriend = async (senderId: string) => {
        await axios.post('/api/friends/accept', {
            id: senderId
        })
 
        // by doing this we are if eample we have 3 friend request
        // we are only taking one outof them, acceptinhg and 
        // leaving the other two to be there
        setFriendRequests((prev) => 
        prev.filter((request) => request.senderId !== senderId)
        )

        router.refresh()


    }

    const denyFriend = async (senderId: string) => {
        await axios.post('/api/friends/deny', {
            id: senderId
        })
 
        setFriendRequests((prev) => 
        prev.filter((request) => request.senderId !== senderId)
        )

        router.refresh()


    }


    return (
        <>
          {friendRequests.length === 0 ? (
            <p className='text-sm text-zinc-500'>Nothing to show here...</p>
          ) : (
            friendRequests.map((request) => (
              <div key={request.senderId} className='flex gap-4 items-center'>
                <UserPlus className='text-black' />
                <p className='font-medium text-lg'>{request.senderEmail}</p>
                <button
                  onClick={() => acceptFriend(request.senderId)}
                  aria-label='accept friend'
                  className='w-8 h-8 bg-indigo-600 hover:bg-indigo-700 grid place-items-center rounded-full transition hover:shadow-md'>
                  <Check className='font-semibold text-white w-3/4 h-3/4' />
                </button>
    
                <button
                  onClick={() => denyFriend(request.senderId)}
                  aria-label='deny friend'
                  className='w-8 h-8 bg-red-600 hover:bg-red-700 grid place-items-center rounded-full transition hover:shadow-md'>
                  <X className='font-semibold text-white w-3/4 h-3/4' />
                </button>
              </div>
            ))
          )}
        </>
      )
}

export default FriendRequests