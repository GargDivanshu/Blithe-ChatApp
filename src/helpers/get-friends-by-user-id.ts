
import { fetchRedis } from '@/helpers/redis';

export const getFriendsByUserid = async (userId: string) => {
    const response = await fetchRedis(`smembers`, 
        `user:${userId}:friends`) as string[]

        const friends = await Promise.all(
            response.map(async (friendId) => {
                const friend = await fetchRedis('get', 
                `user:${friendId}`) as string

                const parsedFriend = JSON.parse(friend) as User

                return parsedFriend
            })
        )

        return friends
}