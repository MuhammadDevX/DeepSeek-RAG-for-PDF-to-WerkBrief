import { redirect } from 'next/navigation'
import { SearchUsers } from './SearchUsers'
import { clerkClient, auth } from '@clerk/nextjs/server'
import { removeRole, setRole } from './_actions'

export default async function AdminDashboard(params: {
  searchParams: Promise<{ search?: string }>
}) {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== 'admin') {
    redirect('/')
  }

  const query = (await params.searchParams).search

  const client = await clerkClient()

  const users = query ? (await client.users.getUserList({ query })).data : []

  const setAdmin = async (formData: FormData) => {
    'use server'
    await setRole(formData)
  }

  const setModerator = async (formData: FormData) => {
    'use server'
    await setRole(formData)
  }

  const clearRole = async (formData: FormData) => {
    'use server'
    await removeRole(formData)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Restricted to users with the `admin` role.</p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6">
          <SearchUsers />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => {
            const email = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
            return (
              <div key={user.id} className="bg-white dark:bg-zinc-800 rounded-xl shadow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.firstName} {user.lastName}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {(user.publicMetadata.role as string) || 'none'}
                  </span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{email}</div>

                <div className="flex gap-2 pt-2">
                  <form action={setAdmin}>
                    <input type="hidden" value={user.id} name="id" />
                    <input type="hidden" value="admin" name="role" />
                    <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Make Admin</button>
                  </form>
                  <form action={setModerator}>
                    <input type="hidden" value={user.id} name="id" />
                    <input type="hidden" value="moderator" name="role" />
                    <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700">Make Moderator</button>
                  </form>
                  <form action={clearRole}>
                    <input type="hidden" value={user.id} name="id" />
                    <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600">Remove Role</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}