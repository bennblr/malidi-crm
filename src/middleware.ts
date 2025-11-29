import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === 'ADMIN'
    const isEditor = token?.role === 'EDITOR'

    // Защита админских маршрутов
    if (req.nextUrl.pathname.startsWith('/users') && !isAdmin) {
      return NextResponse.redirect(new URL('/board', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/board/:path*', '/settings/:path*', '/users/:path*'],
}

