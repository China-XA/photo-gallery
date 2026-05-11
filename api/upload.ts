import { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, fileName, repoOwner, repoName, branch = 'main' } = req.body;

    // 校验必填参数
    if (!imageBase64 || !fileName || !repoOwner || !repoName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 校验 GitHub Token
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    // 初始化 Octokit
    const octokit = new Octokit({
      auth: githubToken,
      baseUrl: 'https://api.github.com',
    });

    // 定义文件路径（统一前缀为 public/images）
    const imagePath = `public/images/${fileName}`;
    let sha: string | undefined;

    // 检查文件是否已存在（获取 SHA 值）
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagePath,
        ref: branch,
      });

      // 如果返回数组（是文件夹），直接返回冲突
      if (Array.isArray(existingFile.data)) {
        return res.status(409).json({ error: 'File path is a directory' });
      }

      // 提取已存在文件的 SHA
      sha = (existingFile.data as { sha: string }).sha;
    } catch (err: any) {
      // 404 表示文件不存在，继续创建；其他错误抛出
      if (err.status !== 404) {
        throw err;
      }
    }

    // 创建/更新图片文件
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: imagePath,
      message: `Add/Update image: ${fileName}`,
      content: imageBase64,
      sha: sha, // 存在则更新，不存在则创建
      branch: branch,
    });

    // 处理 images.json 配置文件
    const imagesJsonPath = 'src/data/images.json';
    let images = [];

    // 读取现有 JSON 文件
    try {
      const existingJson = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagesJsonPath,
        ref: branch,
      });

      if (!Array.isArray(existingJson.data)) {
        // 解码 Base64 并解析 JSON
        const jsonContent = Buffer.from(
          (existingJson.data as { content: string }).content,
          'base64'
        ).toString('utf-8');
        images = JSON.parse(jsonContent).images || [];
      }
    } catch (err: any) {
      // 404 表示 JSON 文件不存在，初始化空数组；其他错误抛出
      if (err.status !== 404) {
        throw err;
      }
    }

    // 新增图片元数据
    const newImage = {
      id: Date.now(),
      name: fileName,
      url: `/images/${fileName}`, // 前端访问路径
      uploadedAt: new Date().toISOString(),
      category: '未分类', // 新增分类字段，统一默认值
    };

    // 去重：避免重复添加相同文件名的图片
    const isDuplicate = images.some(img => img.name === fileName);
    if (!isDuplicate) {
      images.push(newImage);
    }

    // 生成 JSON 并转 Base64
    const jsonContent = JSON.stringify({ images }, null, 2);
    const jsonBase64 = Buffer.from(jsonContent).toString('base64');

    // 读取 JSON 文件 SHA（用于更新）
    let jsonSha: string | undefined;
    try {
      const existingJson = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: imagesJsonPath,
        ref: branch,
      });

      if (!Array.isArray(existingJson.data)) {
        jsonSha = (existingJson.data as { sha: string }).sha;
      }
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
    }

    // 创建/更新 JSON 文件
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: imagesJsonPath,
      message: `Update images.json: ${fileName}`,
      content: jsonBase64,
      sha: jsonSha,
      branch: branch,
    });

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: isDuplicate ? 'Image already exists (skipped)' : 'Image uploaded successfully',
      image: newImage,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to upload image',
      status: error.status || 500,
    });
  }
}