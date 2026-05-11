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
    return res.status(400).json({ 
      success: false, 
      error: 'Missing image data or file name' 
    })
  }

  const githubToken = process.env.GITHUB_TOKEN
  const githubOwner = process.env.REACT_APP_GITHUB_OWNER
  const githubRepo = process.env.REACT_APP_GITHUB_REPO

  if (!githubToken || !githubOwner || !githubRepo) {
    console.error('GitHub credentials not configured')
    return res.status(500).json({ 
      success: false, 
      error: 'GitHub integration not configured properly. Please check your environment variables.' 
    })
  }

  const octokit = new Octokit({
    auth: githubToken,
  })

  try {
    console.log('Uploading to GitHub:', fileName)
    
    const base64Data = imageData.split(',')[1]
    
    // Step 1: Upload image file
    const imageResponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: `images/${Date.now()}-${fileName}`,
      message: `Upload image: ${fileName}`,
      content: base64Data,
    })

    console.log('Image uploaded to GitHub, status:', imageResponse.status);

    const githubUrl = imageResponse.data.content?.download_url;
    if (!githubUrl) {
      throw new Error('Failed to get image URL from GitHub response');
    }

    // 使用 jsDelivr CDN 加速国内访问
    const imageUrl = githubUrl.replace(
      'https://raw.githubusercontent.com/',
      'https://cdn.jsdelivr.net/gh/'
    );

    // Step 2: Load existing images.json
    let galleryData: GalleryData = { images: [], categories: [] }
    let currentSha: string | undefined

    try {
      const existingData = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: 'data/images.json',
      })

      if (Array.isArray(existingData.data)) {
        throw new Error('Unexpected response format for images.json')
      }

      const content = Buffer.from(existingData.data.content, 'base64').toString('utf-8')
      galleryData = JSON.parse(content)
      currentSha = existingData.data.sha
      console.log('Successfully loaded images.json from GitHub')
    } catch (err: any) {
      console.log('images.json does not exist yet, will create it:', err.message)
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

    // Step 4: Update images.json
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
      message: `Add image: ${fileName}`,
      content: Buffer.from(JSON.stringify(galleryData, null, 2)).toString('base64'),
      sha: currentSha,
    })

    console.log('Successfully updated images.json')

    res.status(200).json({
      success: true,
      url: imageUrl,
      image: newImage,
      galleryData: galleryData
    })
  } catch (error: any) {
    console.error('GitHub API error details:', {
      message: error.message,
      status: error.status,
      response: error.response?.data
    })
    
    res.status(500).json({ 
      success: false,
      error: `Failed to upload to GitHub: ${error.message}`,
      details: error.response?.data || null
    })
  }
}