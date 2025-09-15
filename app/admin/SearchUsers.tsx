'use client'

import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from 'next/navigation'

export const SearchUsers = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className='flex items-center justify-center gap-4'>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const formData = new FormData(form)
          const queryTerm = formData.get('search') as string
          router.push(pathname + '?search=' + queryTerm)
        }}

        className='flex items-center justify-between gap-10'
      >
        <label htmlFor="search">Search for users</label>
        <input id="search" name="search" type="text" className='border border-accent-foreground' />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  )
}