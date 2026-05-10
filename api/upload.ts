import { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, fileName, repoOwner, repoName, branch = 'main' } = req.body;

    if (!imageBase64 || !fileName || !repoOwner || !repoName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    const octokit = new Octokit({
      auth: githubToken,
    });

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imagePath = `public/images/${fileName}`;
    
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagePath,
        ref: branch,
      });

      if (Array.isArray(existingFile.data)) {
        return res.status(409).json({ error: 'File already exists' });
      }

      const sha = (existingFile.data as { sha: string }).sha;
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: imagePath,
        message: `Add image: ${fileName}`,
        content: imageBase64,
        sha: sha,
        branch: branch,
      });
    } catch (err: any) {
      if (err.status === 404) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: repoOwner,
          repo: repoName,
          path: imagePath,
          message: `Add image: ${fileName}`,
          content: imageBase64,
          branch: branch,
        });
      } else {
        throw err;
      }
    }

    const imagesJsonPath = 'src/data/images.json';
    let images = [];
    
    try {
      const existingJson = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagesJsonPath,
        ref: branch,
      });

      if (!Array.isArray(existingJson.data)) {
        const jsonContent = Buffer.from((existingJson.data as { content: string }).content, 'base64').toString('utf-8');
        images = JSON.parse(jsonContent).images || [];
      }
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
    }

    const newImage = {
      id: Date.now(),
      name: fileName,
      url: `/images/${fileName}`,
      uploadedAt: new Date().toISOString(),
    };

    images.push(newImage);

    const jsonContent = JSON.stringify({ images }, null, 2);
    const jsonBase64 = Buffer.from(jsonContent).toString('base64');

    try {
      const existingJson = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagesJsonPath,
        ref: branch,
      });

      if (!Array.isArray(existingJson.data)) {
        const sha = (existingJson.data as { sha: string }).sha;
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: repoOwner,
          repo: repoName,
          path: imagesJsonPath,
          message: `Update images.json`,
          content: jsonBase64,
          sha: sha,
          branch: branch,
        });
      }
    } catch (err: any) {
      if (err.status === 404) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: repoOwner,
          repo: repoName,
          path: imagesJsonPath,
          message: `Create images.json`,
          content: jsonBase64,
          branch: branch,
        });
      } else {
        throw err;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: newImage,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload image',
    });
  }
}