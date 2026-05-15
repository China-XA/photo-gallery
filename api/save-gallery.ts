import { VercelRequest, VercelResponse } from '@vercel/node'
import { Octokit } from '@octokit/rest'

interface Image {
  id: number
  name: string
  url: string
  rawUrl?: string
  uploadedAt: string
  category: string
}

interface GalleryData {
  images: Image[]
  categories: string[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== Save Gallery API called ===')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { images, categories } = req.body as { images: Image[], categories: string[] }

  if (!images || !categories) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing images or categories' 
    })
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
    console.log('Step 1: Loading current images.json')
    let currentSha: string | undefined

    try {
      const existingData = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: 'data/images.json',
      })

      if (!Array.isArray(existingData.data)) {
        currentSha = (existingData.data as any).sha
      }
    } catch (err: any) {
      console.log('images.json not found, will create new:', err.message)
    }

    const galleryData: GalleryData = {
      images,
      categories,
    }

    console.log('Step 2: Saving to GitHub,', images.length, 'images,', categories.length, 'categories')

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
      message: 'Update gallery data',
      content: Buffer.from(JSON.stringify(galleryData, null, 2)).toString('base64'),
      sha: currentSha,
    })

    console.log('=== Save complete! ===')

    res.status(200).json({
      success: true,
      galleryData
    })
  } catch (error: any) {
    console.error('=== ERROR in save-gallery API ===')
    console.error('Error message:', error.message)
    console.error('Error status:', error.status)
    console.error('Error response:', error.response?.data)
    
    res.status(500).json({ 
      success: false,
      error: `Failed to save: ${error.message}`,
      details: error.response?.data || null,
      status: error.status || null
    })
  }
}
