import { VercelRequest, VercelResponse } from '@vercel/node'
import { Octokit } from '@octokit/rest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const githubToken = process.env.GITHUB_TOKEN
  const githubOwner = process.env.REACT_APP_GITHUB_OWNER
  const githubRepo = process.env.REACT_APP_GITHUB_REPO

  if (!githubToken || !githubOwner || !githubRepo) {
    return res.status(500).json({ error: 'GitHub credentials not configured' })
  }

  const octokit = new Octokit({
    auth: githubToken,
  })

  try {
    const response = await octokit.rest.repos.getContent({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
    })

    if (Array.isArray(response.data)) {
      return res.status(500).json({ error: 'Unexpected response format' })
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
    const galleryData = JSON.parse(content)

    res.status(200).json(galleryData)
  } catch (error: any) {
    console.error('GitHub API error:', error)
    res.status(200).json({ images: [], categories: [] })
  }
}