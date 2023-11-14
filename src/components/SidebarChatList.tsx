"use client"
import {FC, useState, useEffect} from 'react'
import { useRouter, usePathname } from 'next/navigation';
import {chatHrefConstructor} from '@/lib/utils';
import { pusherClient } from '@/lib/pusher';
import {toPusherKey} from '@/lib/utils'
import { toast } from 'react-hot-toast';
import UnseenChatToast from '@/components/UnseenChatToast'
// import UnseenChatToast from './UnseenChatToast';


interface SidebarChatListProps {
    friends: User[]
    sessionId: string
}

interface ExtendedMessage extends Message {
    senderImg: string
    senderName: string
}


const SidebarChatList: FC<SidebarChatListProps> = ({friends, sessionId}) => {

    const router = useRouter()
    const pathname = usePathname()
    const [unseenMessages, setUnseenMessages] = useState<Message[]>([])

    useEffect(() => {
        if(pathname?.includes('chat')) {
            setUnseenMessages((prev) => {
                return prev.filter((msg) => !pathname.includes(msg.senderId))
            })
        }
    }, [pathname])

    useEffect(() => {
        pusherClient.subscribe(toPusherKey(`user:${sessionId}:chats`))
        pusherClient.subscribe(toPusherKey(`user:${sessionId}:friends`))

        const chatHandler = (message : ExtendedMessage) => {
            // router.refresh()
            const shouldNotify = pathname !== `dashboard/chat/${chatHrefConstructor(sessionId, message.senderId)}`

            if(!shouldNotify) return

            toast.custom((t) => (
                // custom component
                <UnseenChatToast 
                t={t}
                sessionId={sessionId}
                senderId={message.senderId}
                senderImg={message.senderImg}
                senderMessage={message.text}
                senderName={message.senderName}
                />
            ))

            setUnseenMessages((prev)=> [...prev, message])
            // console.log("new chat message " + message)
        }

        const friendHandler = () => {
            router.refresh()
            // console.log("new chat message " + message)
        }

        pusherClient.bind('new-message', chatHandler)
        pusherClient.bind('new-friend', friendHandler)

        return () => {
        pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:chats`))
        pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:friends`))

        pusherClient.unbind('new-message', chatHandler)
        pusherClient.unbind('new-friend', friendHandler)
        }
    }, [pathname, sessionId, router])


    return (
        <ul role='list' className="max-h-[25rem] overflow-y-auto -mx-2 space-y-1">
            {friends.sort().map((friend) => {

                const unseenMsgsCount = unseenMessages.filter((unseenMsg) => {
                    return unseenMsg.senderId === friend.id
                }).length
                return (
                    <li key={friend.id}>
                        <a 
                        className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                        href={`/dashboard/chat/${chatHrefConstructor(
                            sessionId, 
                            friend.id
                        )}`}>
                            {friend.name}
                            {unseenMsgsCount > 0 ? (
                                <div className="bg-indigo-600 font-medium text-xs text-white w-4 h-4 rounded-full flex justify-center items-center">
                                    {unseenMsgsCount}
                                </div>
                            ) : null}
                        </a>
                    </li>
                )
            })}
        </ul>
    )
}

export default SidebarChatList