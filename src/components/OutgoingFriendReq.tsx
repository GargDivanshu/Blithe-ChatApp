"use client"
import {FC, useState} from 'react'
import { Check, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface FriendRequestProps{
    outgoingFriendRequests: OutgoingFriendReq[]
    sessionId: string
}


const OutgoingFriendReq: FC<FriendRequestProps> = ({
    outgoingFriendRequests,
    sessionId,
}) => {

    const router = useRouter()

    const [friendRequests, setFriendRequests] = useState<OutgoingFriendReq[]>(
        outgoingFriendRequests
    )
    console.log("freidn " + friendRequests)
    // debugger;


    return (
        <>
          {friendRequests.length === 0 ? (
            <p className='text-sm text-zinc-500'>Nothing to show here...</p>
          ) : (
            friendRequests.map((request) => (
              <div key={request.senderId} className='flex gap-4 items-center'>
                <p className='font-medium text-lg'>{request.senderEmail}</p>
              </div>
            ))
          )}
        </>
      )
}

export default OutgoingFriendReq