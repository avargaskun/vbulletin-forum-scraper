export interface FlareSolverrResponse {
  solution: {
    url: string
    status: number
    headers: Record<string, string>
    response: string
    cookies: {
      name: string
      value: string
      domain: string
      path: string
      expires: number
      size: number
      httpOnly: boolean
      secure: boolean
      session: boolean
      sameSite: 'None' | 'Lax' | 'Strict'
    }[]
    userAgent: string
  }
  status: string
  message: string
  startTimestamp: number
  endTimestamp: number
  version: string
}

export interface FlareSolverrSession {
  session: string
  userAgent: string
  cookies: {
    name: string
    value: string
    domain: string
    path: string
    expires: number
    size: number
    httpOnly: boolean
    secure: boolean
    session: boolean
    sameSite: 'None' | 'Lax' | 'Strict'
  }[]
}

export interface FlareSolverrSessionCreateResponse {
  status: string
  message?: string
  session?: string
}
