import { VercelRequest, VercelResponse } from '@vercel/node'
import { Octokit } from '@octokit/rest'

interface Image {
  id: number
  name: string
  url: string
  uploadedAt: string
  category: string
}

interface GalleryData {
  images: Image[]
  categories: string[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageData, fileName, category = '未分类' } = req.body

  if (!imageData || !fileName) {
    return res.status(400).json({ error: 'Missing image data or file name' })
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
    const base64Data = imageData.split(',')[1]
    
    const imageResponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: `images/${Date.now()}-${fileName}`,
      message: `Upload image: ${fileName}`,
      content: base64Data,
    })

    const imageUrl = imageResponse.data.content?.download_url
    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to get image URL' })
    }

    let galleryData: GalleryData = { images: [], categories: [] }
    let currentSha: string | undefined

    try {
      const existingData = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: 'data/images.json',
      })

      if (Array.isArray(existingData.data)) {
        throw new Error('Unexpected response format')
      }

      const content = Buffer.from(existingData.data.content, 'base64').toString('utf-8')
      galleryData = JSON.parse(content)
      currentSha = existingData.data.sha
    } catch {
    }

    const newImage: Image = {
      id: Date.now(),
      name: fileName,
      url: imageUrl,
      uploadedAt: new Date().toISOString(),
      category,
    }

    galleryData.images.unshift(newImage)
    
    if (!galleryData.categories.includes(category)) {
      galleryData.categories.push(category)
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
      message: `Add image: ${fileName}`,
      content: Buffer.from(JSON.stringify(galleryData, null, 2)).toString('base64'),
      sha: currentSha,
    })

    res.status(200).json({
      success: true,
      url: imageUrl,
      image: newImage,
    })
  } catch (error: any) {
    console.error('GitHub API error:', error)
    res.status(500).json({ 
      error: error.message || 'Failed to upload image to GitHub' 
    })
  }
}