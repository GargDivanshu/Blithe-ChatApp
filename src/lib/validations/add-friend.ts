import { z } from 'zod'
// it helps in defining schemas that help in validating data


export const addFriendValidator = z.object({
  email: z.string().email(),
})

