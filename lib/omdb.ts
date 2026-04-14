export interface OmdbMovie {
  imdbID: string
  Title: string
  Year: string
  Type: string
  Poster: string
  Plot?: string
  Genre?: string
  imdbRating?: string
  Director?: string
  Actors?: string
  Runtime?: string
}

export interface OmdbSearchResult {
  Search: OmdbMovie[]
  totalResults: string
  Response: string
}

const BASE_URL = 'https://www.omdbapi.com'

export async function searchMovies(query: string, page = 1): Promise<OmdbSearchResult> {
  const apiKey = process.env.OMDB_API_KEY
  const url = `${BASE_URL}/?apikey=${apiKey}&s=${encodeURIComponent(query)}&type=movie&page=${page}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('OMDb fetch failed')
  return res.json()
}

export async function getMovieById(imdbId: string): Promise<OmdbMovie> {
  const apiKey = process.env.OMDB_API_KEY
  const url = `${BASE_URL}/?apikey=${apiKey}&i=${imdbId}&plot=short`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('OMDb fetch failed')
  return res.json()
}
