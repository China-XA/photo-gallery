import { VercelRequest, VercelResponse } from '@vercel/node'
import { Octokit } from '@octokit/rest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== Delete Image API called ===')
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageId, fileName } = req.body

  if (!imageId || !fileName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing imageId or fileName' 
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
    console.log('Loading images.json from GitHub...')
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

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
    const galleryData = JSON.parse(content)

    console.log('Deleting image:', { imageId, fileName })
    
    const imageIndex = galleryData.images.findIndex((img: any) => img.id === imageId)
    if (imageIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Image not found' 
      })
    }

    const imageToDelete = galleryData.images[imageIndex]
    
    console.log('Deleting file from GitHub:', imageToDelete.url)
    
    const imagePath = `images/${encodeURIComponent(fileName)}`
    
    try {
      await octokit.rest.repos.deleteFile({
        owner: githubOwner,
        repo: githubRepo,
        path: imagePath,
        message: `Delete image: ${fileName}`,
        sha: '',
      })
    } catch (fileError: any) {
      console.warn('Could not delete image file:', fileError.message)
    }

    galleryData.images.splice(imageIndex, 1)

    console.log('Updating images.json...')
    const updatedContent = JSON.stringify(galleryData, null, 2)
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'data/images.json',
      message: `Remove image: ${fileName}`,
      content: Buffer.from(updatedContent).toString('base64'),
      sha: response.data.sha,
    })

    console.log('Image deleted successfully!')
    return res.json({ 
      success: true,
      message: '图片删除成功！',
      images: galleryData.images,
      categories: galleryData.categories
    })

  } catch (error: any) {
    console.error('Error deleting image:', error)
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete image'
    })
  }
}
