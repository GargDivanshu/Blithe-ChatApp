const upstashRedisRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const authToken = process.env.UPSTASH_REDIS_REST_TOKEN;


// we are typing out the commands we want to be allowed to be passed
type Command = 'zrange' | 'sismember' | 'get' | 'smembers'

export async function fetchRedis(
  command: Command,
  ...args: (string | number)[]
) {
  const commandUrl = `${upstashRedisRestUrl}/${command}/${args.join('/')}`

  const response = await fetch(commandUrl, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
        // bypassing the caching behavior of nextjs
        // meaning the data will never be stale as it will always be fetched from the server
        //  means that the data will always be fresh
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Error executing Redis command: ${response.statusText}`)
      }
    
      const data = await response.json()
      return data.result
    }
