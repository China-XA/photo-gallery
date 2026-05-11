import { VercelRequest, VercelResponse } from '@vercel/node'
import { Octokit } from '@octokit/rest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== Images API called ===')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const githubToken = process.env.GITHUB_TOKEN
  const githubOwner = process.env.REACT_APP_GITHUB_OWNER
  const githubRepo = process.env.REACT_APP_GITHUB_REPO

  console.log('Environment check:', {
    hasToken: !!githubToken,
    owner: githubOwner,
    repo: githubRepo,
  })

  if (!githubToken || !githubOwner || !githubRepo) {
    const missing = []
    if (!githubToken) missing.push('GITHUB_TOKEN')
    if (!githubOwner) missing.push('REACT_APP_GITHUB_OWNER')
    if (!githubRepo) missing.push('REACT_APP_GITHUB_REPO')
    
    console.error('GitHub credentials missing:', missing)
    return res.status(500).json({ 
      success: false,
      error: 'GitHub integration not configured. Missing: ' + missing.join(', ')
    })
  }

  const octokit = new Octokit({
    auth: githubToken,
  })

  try {
    console.log('Loading images from GitHub...')
    const response = await octokit.rest.repos.getContent({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
    })

    if (Array.isArray(response.data)) {
      console.error('Got array instead of file')
      return res.status(500).json({ 
        success: false,
        error: 'Unexpected response format from GitHub' 
      })
    }

    const content = Buffer.from((response.data as any).content, 'base64').toString('utf-8')
    let galleryData = JSON.parse(content)

    console.log('Loaded gallery data:', {
      imagesCount: galleryData.images?.length || 0,
      categoriesCount: galleryData.categories?.length || 0,
    })

    // 使用 jsDelivr CDN 加速国内访问
    if (galleryData.images && Array.isArray(galleryData.images)) {
      galleryData.images = galleryData.images.map((img: any) => ({
        ...img,
        url: img.url?.replace(
          'https://raw.githubusercontent.com/',
          'https://cdn.jsdelivr.net/gh/'
        ) || img.url
      }))
    }

    console.log('=== Images API complete ===')

    res.status(200).json({
      success: true,
      ...galleryData
    })
  } catch (error: any) {
    console.error('=== ERROR in images API ===')
    console.error('Error message:', error.message)
    console.error('Error status:', error.status)
    console.error('Error response:', error.response?.data)
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to load: ' + error.message,
      details: error.response?.data || null,
      status: error.status || null
    })
  }
}
