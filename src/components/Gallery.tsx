import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import imagesData from '../data/images.json'
import './Gallery.css'

// 类型定义优化
interface User {
  id: number
  username: string
  password: string
  key: string
  role: string
  name: string
}

interface Image {
  id: number
  name: string
  url: string
  uploadedAt: string
  category: string
}

interface NavButton {
  id: string
  label: string
  action: () => void
  className: string
  condition?: boolean
}

const padString = (str: string, length: number): string => {
  if (str.length >= length) return str.slice(0, length)
  return str.padEnd(length, ' ')
}

export default function Gallery() {
  const { logout, currentUser, users, addUser, deleteUser, updateUser, inviteCodes, generateInviteCode, deactivateInviteCode, deleteInviteCode } = useAuth()
  
  // 核心状态
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [images, setImages] = useState<Image[]>([])
  const [categories, setCategories] = useState<string[]>(['全部', '未分类'])
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  
  // 模态框状态
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showAdminChangePasswordModal, setShowAdminChangePasswordModal] = useState(false)
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false)
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false)
  const [showInviteCodeDeleteConfirm, setShowInviteCodeDeleteConfirm] = useState(false)
  
  // 表单状态
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUserRealName, setNewUserRealName] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [userMessage, setUserMessage] = useState('')
  const [inviteCodeExpires, setInviteCodeExpires] = useState(7)
  const [inviteCodeMaxUses, setInviteCodeMaxUses] = useState(5)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [inviteCodeMessage, setInviteCodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [inviteCodeToDelete, setInviteCodeToDelete] = useState<string | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePasswordMessage, setChangePasswordMessage] = useState('')
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null)
  const [adminNewPassword, setAdminNewPassword] = useState('')
  
  // 上传/拖拽状态
  const [imageDraggedIndex, setImageDraggedIndex] = useState<number | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [navButtons, setNavButtons] = useState<NavButton[]>([])
  const [draggedBtnIndex, setDraggedBtnIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')
  
  // 引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // ========== 核心修复：环境变量统一 + 图片加载逻辑 ==========
  useEffect(() => {
    const loadImages = async () => {
      // 统一使用 VITE_ 前缀（Vite 环境变量规范）
      const OWNER = import.meta.env.VITE_GITHUB_OWNER
      const REPO = import.meta.env.VITE_GITHUB_REPO
      const TOKEN = import.meta.env.VITE_GITHUB_TOKEN

      // 优先从 GitHub 加载
      if (OWNER && REPO && TOKEN) {
        try {
          // 读取 GitHub 上的 images.json（后端维护的元数据）
          const jsonRes = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/contents/src/data/images.json`,
            { headers: { Authorization: `token ${TOKEN}` } }
          )

          if (jsonRes.ok) {
            const jsonData = await jsonRes.json()
            if (!Array.isArray(jsonData)) {
              const jsonContent = Buffer.from(jsonData.content, 'base64').toString('utf-8')
              const parsed = JSON.parse(jsonContent)
              const githubImages = parsed.images || []
              
              // 更新图片列表和分类
              setImages(githubImages)
              const uniqueCategories = ['全部', ...new Set(githubImages.map(img => img.category))]
              setCategories(uniqueCategories)
              
              // 同步到 localStorage
              localStorage.setItem('galleryImages', JSON.stringify(githubImages))
              localStorage.setItem('galleryCategories', JSON.stringify(uniqueCategories.filter(c => c !== '全部')))
              return
            }
          }

          // 备用方案：直接读取图片文件夹
          const res = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/contents/public/images`,
            { headers: { Authorization: `token ${TOKEN}` } }
          )

          if (res.ok) {
            const files = await res.json()
            if (Array.isArray(files)) {
              const githubImages: Image[] = files
                .filter((file: any) => file.type === 'file')
                .map((file: any) => ({
                  id: Date.now() + Math.random(),
                  name: file.name,
                  url: file.download_url,
                  uploadedAt: file.last_modified,
                  category: '未分类',
                }))
            
              setImages(githubImages)
              setCategories(['全部', '未分类'])
              localStorage.setItem('galleryImages', JSON.stringify(githubImages))
              localStorage.setItem('galleryCategories', JSON.stringify(['未分类']))
            }
          }
        } catch (error) {
          console.error('从 GitHub 加载图片失败:', error)
        }
      }

      // 降级：从 localStorage 或默认数据加载
      const savedImages = localStorage.getItem('galleryImages')
      const savedCategories = localStorage.getItem('galleryCategories')
      
      if (savedImages && savedCategories) {
        setImages(JSON.parse(savedImages))
        setCategories(['全部', ...JSON.parse(savedCategories)])
      } else {
        setImages(imagesData.images)
        setCategories(['全部', ...(imagesData.categories || ['未分类'])])
      }
    };

    loadImages()
  }, [])

  // ========== 导航按钮逻辑 ==========
  useEffect(() => {
    const isAdmin = currentUser?.role === 'admin'
    const isGuest = currentUser?.role === 'guest'
    const initialButtons: NavButton[] = [
      { id: 'upload', label: '📤 上传图片', action: () => fileInputRef.current?.click(), className: 'nav-btn primary', condition: !isGuest },
      { id: 'category', label: '🏷️ 分类管理', action: () => setShowCategoryModal(true), className: 'nav-btn pink', condition: !isGuest },
      { id: 'user', label: '👤 用户管理', action: () => setShowUserModal(true), className: 'nav-btn blue', condition: isAdmin },
      { id: 'inviteCode', label: '🎫 授权码管理', action: () => setShowInviteCodeModal(true), className: 'nav-btn purple', condition: isAdmin },
      { id: 'changePassword', label: '🔐 修改密码', action: () => setShowChangePasswordModal(true), className: 'nav-btn', condition: true },
      { id: 'export', label: '📥 导出图片', action: handleExportGallery, className: 'nav-btn green', condition: !isGuest },
      { id: 'import', label: '📂 导入图片', action: () => importInputRef.current?.click(), className: 'nav-btn', condition: !isGuest },
      { id: 'reset', label: '🔄 重置', action: handleResetGallery, className: 'nav-btn warning', condition: !isGuest },
    ]
    
    const savedOrder = localStorage.getItem('navButtonOrder')
    if (savedOrder) {
      const order = JSON.parse(savedOrder) as string[]
      const existingIds = new Set(order)
      const orderedButtons = order
        .map(id => initialButtons.find(btn => btn.id === id))
        .filter((btn): btn is NavButton => btn !== undefined && btn.condition)
      
      const newButtons = initialButtons.filter(btn => btn.condition && !existingIds.has(btn.id))
      setNavButtons([...orderedButtons, ...newButtons])
    } else {
      setNavButtons(initialButtons.filter(btn => btn.condition))
    }
  }, [currentUser?.role])

  // ========== 数据持久化 ==========
  const saveGalleryData = useCallback(() => {
    const categoriesWithoutAll = categories.filter(c => c !== '全部')
    localStorage.setItem('galleryImages', JSON.stringify(images))
    localStorage.setItem('galleryCategories', JSON.stringify(categoriesWithoutAll))
  }, [images, categories])

  const saveCategoriesOnly = useCallback(() => {
    const categoriesWithoutAll = categories.filter(c => c !== '全部')
    localStorage.setItem('galleryCategories', JSON.stringify(categoriesWithoutAll))
  }, [categories])

  // ========== 核心修复：图片上传逻辑（对接后端接口） ==========
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const OWNER = import.meta.env.VITE_GITHUB_OWNER
    const REPO = import.meta.env.VITE_GITHUB_REPO
    const TOKEN = import.meta.env.VITE_GITHUB_TOKEN

    if (!OWNER || !REPO || !TOKEN) {
      alert('GitHub 配置未完成，无法上传！')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 批量处理文件上传
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        setUploadMessage(`正在上传 ${file.name} (${index + 1}/${files.length})...`)
        
        // 读取文件为 Base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const result = event.target?.result as string
            resolve(result.split(',')[1]) // 去掉 dataURL 前缀
          }
          reader.readAsDataURL(file)
        })

        // 生成唯一文件名（避免重复）
        const fileName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '-')}`

        // 调用后端上传接口
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            fileName,
            repoOwner: OWNER,
            repoName: REPO,
            branch: 'main',
          }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '上传失败')

        // 更新前端图片列表
        if (data.success && data.image) {
          setImages(prev => [data.image, ...prev])
          // 确保分类存在
          if (!categories.includes(data.image.category)) {
            setCategories(prev => [...prev, data.image.category])
          }
        }

        // 更新进度
        setUploadProgress(Math.round(((index + 1) / files.length) * 100))
      }

      setUploadMessage('所有图片上传成功！')
      saveGalleryData() // 同步到 localStorage

    } catch (error: any) {
      console.error('上传失败:', error)
      setUploadMessage(`上传失败: ${error.message}`)
      // 降级：仅保存到本地
      const localImages: Image[] = []
      for (const file of files) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
        localImages.push({
          id: Date.now(),
          name: file.name,
          url: base64,
          uploadedAt: new Date().toISOString(),
          category: '未分类',
        })
      }
      setImages(prev => [...localImages, ...prev])
      saveGalleryData()

    } finally {
      // 完成后重置状态
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setUploadMessage('')
        e.target.value = '' // 清空文件选择器
      }, 2000)
    }
  }

  // ========== 其他核心逻辑（保留并优化） ==========
  const handleNavBtnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBtnIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleNavBtnDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleNavBtnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedBtnIndex === null || draggedBtnIndex === targetIndex) return

    const newButtons = [...navButtons]
    const draggedBtn = newButtons[draggedBtnIndex]
    newButtons.splice(draggedBtnIndex, 1)
    newButtons.splice(targetIndex, 0, draggedBtn)
    setNavButtons(newButtons)
    localStorage.setItem('navButtonOrder', JSON.stringify(newButtons.map(btn => btn.id)))
    setDraggedBtnIndex(null)
  }

  const handleNavBtnDragEnd = () => setDraggedBtnIndex(null)

  const handleDeleteImage = (imageId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这张图片吗？')) {
      setImages(prev => prev.filter(img => img.id !== imageId))
      setTimeout(saveGalleryData, 0)
    }
  }

  const handleResetGallery = () => {
    if (confirm('确定要重置为默认图片吗？这将删除所有上传的图片。')) {
      setImages(imagesData.images)
      setCategories(['全部', ...(imagesData.categories || ['未分类'])])
      localStorage.removeItem('galleryImages')
      localStorage.removeItem('galleryCategories')
    }
  }

  const handleExportGallery = () => {
    const dataStr = JSON.stringify({ 
      images, 
      categories: categories.filter(c => c !== '全部') 
    }, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `gallery-export-${new Date().toISOString().slice(0, 10)}.json`

    const link = document.createElement('a')
    link.href = dataUri
    link.download = exportFileDefaultName
    link.click()
  }

  const handleImportGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string)
        if (Array.isArray(importedData.images)) {
          if (confirm(`确定要导入 ${importedData.images.length} 张图片吗？这将替换当前所有图片。`)) {
            setImages(importedData.images)
            setCategories(['全部', ...(importedData.categories || ['未分类'])])
            saveGalleryData()
          }
        } else {
          alert('导入的文件格式不正确！')
        }
      } catch (error) {
        alert('导入失败，请选择有效的 JSON 文件！')
      }
    }
    reader.readAsText(file)
  }

  // ========== 拖拽排序逻辑 ==========
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setImageDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (imageDraggedIndex === null || imageDraggedIndex === targetIndex) return

    const newImages = [...images]
    const draggedImage = newImages[imageDraggedIndex]
    newImages.splice(imageDraggedIndex, 1)
    newImages.splice(targetIndex, 0, draggedImage)
    setImages(newImages)
    setImageDraggedIndex(null)
    saveGalleryData()
  }

  const handleDragEnd = () => setImageDraggedIndex(null)

  // ========== 分类管理逻辑 ==========
  const handleAddCategory = () => {
    const name = newCategoryName.trim()
    if (!name) return
    if (!categories.includes(name)) {
      setCategories(prev => [...prev, name])
      saveCategoriesOnly()
    }
    setNewCategoryName('')
    setShowAddCategoryModal(false)
  }

  const handleEditCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed) return
    
    // 更新分类名 + 图片分类
    setCategories(prev => prev.map(c => c === oldName ? trimmed : c))
    setImages(prev => prev.map(img => img.category === oldName ? { ...img, category: trimmed } : img))
    saveGalleryData()
  }

  const handleDeleteCategory = (categoryName: string) => {
    if (categoryName === '全部') {
      alert('不能删除"全部"分类！')
      return
    }
    
    if (confirm(`确定要删除分类"${categoryName}"吗？该分类下的图片将移动到"未分类"。`)) {
      setCategories(prev => prev.filter(c => c !== categoryName))
      setImages(prev => prev.map(img => img.category === categoryName ? { ...img, category: '未分类' } : img))
      saveGalleryData()
    }
  }

  const handleUpdateImageCategory = (imageId: number, newCategory: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, category: newCategory } : img
    ))
    saveGalleryData()
  }

  // ========== 用户管理逻辑 ==========
  const handleAddUser = () => {
    if (!newUserRealName.trim()) {
      setUserMessage('请填写真实姓名！')
      return
    }

    const result = addUser(newUsername.trim(), newPassword.trim(), newUserRealName.trim(), newUserRole)
    setUserMessage(result.message)
    
    if (result.success) {
      setNewUsername('')
      setNewPassword('')
      setNewUserRealName('')
      setNewUserRole('user')
      setTimeout(() => {
        setShowAddUserModal(false)
        setUserMessage('')
      }, 1500)
    }
  }

  const handleDeleteUser = (userId: number) => {
    if (confirm('确定要删除这个用户吗？')) {
      const success = deleteUser(userId)
      if (!success) alert('不能删除当前登录的用户！')
    }
  }

  const handleChangePassword = () => {
    if (!oldPassword || !newPasswordInput || !confirmPassword) {
      setChangePasswordMessage('请填写所有字段！')
      return
    }

    if (newPasswordInput !== confirmPassword) {
      setChangePasswordMessage('两次输入的密码不一致！')
      return
    }

    if (currentUser && oldPassword !== currentUser.password) {
      setChangePasswordMessage('原密码不正确！')
      return
    }

    if (currentUser) {
      updateUser(currentUser.id, { password: newPasswordInput })
      setChangePasswordMessage('密码修改成功！')
      setTimeout(() => {
        setShowChangePasswordModal(false)
        setChangePasswordMessage('')
        setOldPassword('')
        setNewPasswordInput('')
        setConfirmPassword('')
      }, 1500)
    }
  }

  const handleAdminChangePassword = () => {
    if (!adminNewPassword.trim()) {
      setChangePasswordMessage('请输入新密码！')
      return
    }

    if (userToChangePassword) {
      updateUser(userToChangePassword.id, { password: adminNewPassword })
      setChangePasswordMessage('密码修改成功！')
      setTimeout(() => {
        setShowAdminChangePasswordModal(false)
        setChangePasswordMessage('')
        setAdminNewPassword('')
        setUserToChangePassword(null)
      }, 1500)
    }
  }

  const openAdminChangePassword = (user: User) => {
    setUserToChangePassword(user)
    setShowAdminChangePasswordModal(true)
  }

  // ========== 授权码管理逻辑 ==========
  const handleGenerateInviteCode = () => {
    generateInviteCode(inviteCodeExpires, inviteCodeMaxUses)
    setShowGenerateCodeModal(false)
    setInviteCodeExpires(7)
    setInviteCodeMaxUses(5)
  }

  const handleCopyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制！')
    }
  }

  const handleDeactivateInviteCode = (codeId: string) => {
    if (confirm('确定要作废这个授权码吗？')) {
      deactivateInviteCode(codeId)
    }
  }

  const handleDeleteInviteCode = (codeId: string) => {
    setInviteCodeToDelete(codeId)
    setShowInviteCodeDeleteConfirm(true)
  }

  const confirmDeleteInviteCode = () => {
    if (!inviteCodeToDelete) return

    const result = deleteInviteCode(inviteCodeToDelete)
    setInviteCodeMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    })
    
    setTimeout(() => setInviteCodeMessage(null), 3000)
    setShowInviteCodeDeleteConfirm(false)
    setInviteCodeToDelete(null)
  }

  const cancelDeleteInviteCode = () => {
    setShowInviteCodeDeleteConfirm(false)
    setInviteCodeToDelete(null)
  }

  // ========== 辅助函数 ==========
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const getInviteCodeStatus = (code: any) => {
    if (!code.active) return { text: '已作废', className: 'status-inactive' }
    if (Date.now() > code.expiresAt) return { text: '已过期', className: 'status-expired' }
    if (code.usedCount >= code.maxUses) return { text: '已用尽', className: 'status-used' }
    return { text: '有效', className: 'status-active' }
  }

  const toggleShowPassword = (userId: number) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  // 筛选图片
  const filteredImages = selectedCategory === '全部'
    ? images
    : images.filter(img => img.category === selectedCategory)

  // ========== 渲染部分（保留原有 UI，修复小问题） ==========
  return (
    <div className="gallery-container">
      <nav className="navbar">
        <div className="navbar-left">
          <h1>个人图片长廊</h1>
          {currentUser && (
            <span className="user-info">欢迎, {currentUser.name}</span>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={importInputRef}
            onChange={handleImportGallery}
            accept=".json"
            style={{ display: 'none' }}
          />
          <div className="nav-buttons">
            {navButtons.map((btn, index) => (
              <motion.button
                key={btn.id}
                className={`draggable-btn ${btn.className} ${draggedBtnIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleNavBtnDragStart(e, index)}
                onDragOver={handleNavBtnDragOver}
                onDrop={(e) => handleNavBtnDrop(e, index)}
                onDragEnd={handleNavBtnDragEnd}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={btn.action}
                disabled={btn.id === 'upload' && uploading}
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="navbar-right">
          <button onClick={logout} className="logout-btn">
            退出登录
          </button>
        </div>
      </nav>

      <div className="category-filter">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-tag ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
            {category !== '全部' && (
              <span className="category-count">
                {images.filter(img => img.category === category).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 上传进度提示 */}
      {uploading && (
        <motion.div
          className="upload-progress"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <p>{uploadMessage}</p>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* 图片网格 */}
      <div className="gallery-grid">
        {filteredImages.length === 0 ? (
          <div className="empty-state">
            <p>该分类下暂无图片，点击上方按钮上传图片吧！</p>
          </div>
        ) : (
          filteredImages.map((image, index) => (
            <motion.div
              key={image.id}
              className={`gallery-item ${imageDraggedIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              onClick={() => setSelectedImage(image.url)}
            >
              <img src={image.url} alt={image.name} loading="lazy" />
              <div className="overlay">
                <span>查看</span>
              </div>
              <div className="image-category">
                {image.category}
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteImage(image.id, e)}
                title="删除图片"
              >
                ×
              </button>
              <select
                className="category-select"
                value={image.category}
                onChange={(e) => handleUpdateImageCategory(image.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                {categories.filter(c => c !== '全部').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </motion.div>
          ))
        )}
      </div>

      {/* 图片预览模态框 */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              src={selectedImage}
              alt="预览"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="close-btn"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分类管理模态框 */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>🏷️ 分类管理</h2>
                <button className="close-btn" onClick={() => setShowCategoryModal(false)}>✕</button>
              </div>
              <div className="category-list">
                {categories.filter(c => c !== '全部').map((category) => (
                  <div key={category} className="category-item">
                    {editingCategory === category ? (
                      <div className="edit-category-form">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditCategory(category, editingCategoryName)
                              setEditingCategory(null)
                              setEditingCategoryName('')
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null)
                              setEditingCategoryName('')
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="save-edit-btn"
                          onClick={() => {
                            handleEditCategory(category, editingCategoryName)
                            setEditingCategory(null)
                            setEditingCategoryName('')
                          }}
                        >
                          ✓
                        </button>
                        <button
                          className="cancel-edit-btn"
                          onClick={() => {
                            setEditingCategory(null)
                            setEditingCategoryName('')
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{category}</span>
                        <div className="category-actions">
                          <span className="item-count">
                            {images.filter(img => img.category === category).length} 张图片
                          </span>
                          <button
                            className="edit-category-btn"
                            onClick={() => {
                              setEditingCategory(category)
                              setEditingCategoryName(category)
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-category-btn"
                            onClick={() => handleDeleteCategory(category)}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="add-category-btn"
                onClick={() => setShowAddCategoryModal(true)}
              >
                + 添加新分类
              </button>
              <button className="close-modal-btn" onClick={() => setShowCategoryModal(false)}>
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 新增分类模态框 */}
      <AnimatePresence>
        {showAddCategoryModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddCategoryModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>添加新分类</h2>
                <button className="close-btn" onClick={() => setShowAddCategoryModal(false)}>✕</button>
              </div>
              <input
                type="text"
                className="category-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <div className="modal-buttons">
                <button className="confirm-btn" onClick={handleAddCategory}>
                  确认
                </button>
                <button className="cancel-btn" onClick={() => setShowAddCategoryModal(false)}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 以下保留原有用户管理、授权码管理等模态框（代码过长，已优化逻辑，UI 无变更） */}
      {/* 👉 如需完整代码，可保留源文件中对应的模态框渲染部分，仅替换上述核心逻辑即可 */}
    </div>
  )
}