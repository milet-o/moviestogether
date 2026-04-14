import { searchMovies, getMovieById } from '@/lib/omdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const id = searchParams.get('id')
  const page = parseInt(searchParams.get('page') ?? '1')

  try {
    if (id) {
      const movie = await getMovieById(id)
      return NextResponse.json(movie)
    }
    if (query) {
      const results = await searchMovies(query, page)
      return NextResponse.json(results)
    }
    return NextResponse.json({ error: 'Missing query params' }, { status: 400 })
  } catch (err) {
    console.error('OMDb API error:', err)
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }
}
