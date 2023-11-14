import NextAuth from 'next-auth/next'
import { authOptions } from '@/lib/auth';

// nextauth wasn't supported as of April 23' by api folder so 
// we did it in pages folder
export default NextAuth(authOptions)