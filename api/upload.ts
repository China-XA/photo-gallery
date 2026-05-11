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
  console.log('=== Upload API called ===')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageData, fileName, category = '未分类' } = req.body

  if (!imageData || !fileName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing image data or file name' 
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
    console.log('Step 1: Uploading image to GitHub:', fileName)
    
    const base64Data = imageData.split(',')[1]
    
    const imagePath = `images/${Date.now()}-${fileName}`
    console.log('Image path:', imagePath)
    
    // Step 1: Upload image file
    const imageResponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: imagePath,
      message: `Upload image: ${fileName}`,
      content: base64Data,
    })

    console.log('Step 1 complete - Image uploaded, status:', imageResponse.status)

    const githubUrl = (imageResponse.data.content as any)?.download_url
    if (!githubUrl) {
      console.error('Step 1 failed - No download URL in response')
      throw new Error('Failed to get image URL from GitHub response')
    }

    console.log('GitHub URL:', githubUrl)

    // 使用 jsDelivr CDN 加速国内访问
    const imageUrl = githubUrl.replace(
      'https://raw.githubusercontent.com/',
      'https://cdn.jsdelivr.net/gh/'
    )

    console.log('CDN URL:', imageUrl)

    // Step 2: Load existing images.json
    let galleryData: GalleryData = { images: [], categories: [] }
    let currentSha: string | undefined

    try {
      console.log('Step 2: Loading images.json from GitHub')
      const existingData = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: 'data/images.json',
      })

      if (Array.isArray(existingData.data)) {
        console.error('Step 2 failed - Got array instead of file')
        throw new Error('Unexpected response format for images.json')
      }

      const content = Buffer.from((existingData.data as any).content, 'base64').toString('utf-8')
      galleryData = JSON.parse(content)
      currentSha = (existingData.data as any).sha
      console.log('Step 2 complete - Loaded images.json with', galleryData.images.length, 'images')
    } catch (err: any) {
      console.log('Step 2 - images.json not found, will create new one:', err.message)
    }

    // Step 3: Create new image entry
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

    console.log('Step 3 complete - New image entry created')

    // Step 4: Update images.json
    console.log('Step 4: Updating images.json')
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
      message: `Add image: ${fileName}`,
      content: Buffer.from(JSON.stringify(galleryData, null, 2)).toString('base64'),
      sha: currentSha,
    })

    console.log('=== All steps complete! ===')

    res.status(200).json({
      success: true,
      url: imageUrl,
      image: newImage,
      galleryData: galleryData
    })
  } catch (error: any) {
    console.error('=== ERROR in upload API ===')
    console.error('Error message:', error.message)
    console.error('Error status:', error.status)
    console.error('Error response:', error.response?.data)
    console.error('Stack:', error.stack)
    
    res.status(500).json({ 
      success: false,
      error: `Failed to upload: ${error.message}`,
      details: error.response?.data || null,
      status: error.status || null
    })
  }
}
