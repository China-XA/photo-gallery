import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useAuth, User } from '../context/AuthContext'
import imagesData from '../data/images.json'
import './Gallery.css'

const GalleryImage = ({ src, rawSrc, alt, ...props }: { src: string, rawSrc?: string, alt: string, [key: string]: any }) => {
  const [imgSrc, setImgSrc] = useState(src)

  const handleError = () => {
    if (rawSrc && imgSrc !== rawSrc) {
      setImgSrc(rawSrc)
    }
  }

  return <img src={imgSrc} alt={alt} onError={handleError} {...props} />
}

const padString = (str: string, length: number): string => {
  if (str.length >= length) {
    return str.slice(0, length)
  }
  return str.padEnd(length, ' ')
}

interface Image {
  id: number
  name: string
  url: string
  rawUrl?: string
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

export default function Gallery() {
  const { logout, currentUser, users, addUser, deleteUser, updateUser, inviteCodes, generateInviteCode, deactivateInviteCode, deleteInviteCode } = useAuth()
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [images, setImages] = useState<Image[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showAdminChangePasswordModal, setShowAdminChangePasswordModal] = useState(false)
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false)
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUserRealName, setNewUserRealName] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [userMessage, setUserMessage] = useState('')
  const [imageDraggedIndex, setImageDraggedIndex] = useState<number | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [navButtons, setNavButtons] = useState<NavButton[]>([])
  const [draggedBtnIndex, setDraggedBtnIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [inviteCodeExpires, setInviteCodeExpires] = useState(7)
  const [inviteCodeMaxUses, setInviteCodeMaxUses] = useState(5)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [inviteCodeMessage, setInviteCodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [inviteCodeToDelete, setInviteCodeToDelete] = useState<string | null>(null)
  const [showInviteCodeDeleteConfirm, setShowInviteCodeDeleteConfirm] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePasswordMessage, setChangePasswordMessage] = useState('')
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null)
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const loadImagesFromGitHub = async (showError = true) => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const response = await fetch('/api/images')
      const data = await response.json()
      
      if (data.success && data.images && data.categories) {
        setImages(data.images)
        setCategories(['全部', ...data.categories])
        console.log('Images loaded successfully from GitHub')
      } else {
        const errorMsg = data.error || 'Failed to load images'
        if (showError) {
          setErrorMessage(errorMsg)
        }
        console.error('Failed to load images:', data.error)
        setImages(imagesData.images)
        setCategories(['全部', ...imagesData.categories])
      }
    } catch (error) {
      const errorMsg = 'Failed to connect to server'
      if (showError) {
        setErrorMessage(errorMsg)
      }
      console.error('Failed to load images from GitHub:', error)
      setImages(imagesData.images)
      setCategories(['全部', ...imagesData.categories])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImagesFromGitHub()
  }, [])

  useEffect(() => {
    const isAdmin = currentUser?.role === 'admin'
    const isGuest = currentUser?.role === 'guest'
    const initialButtons: NavButton[] = [
      { id: 'upload', label: '📤 上传图片', action: () => fileInputRef.current?.click(), className: 'nav-btn primary', condition: !isGuest },
      { id: 'sync', label: '🔃 同步', action: () => loadImagesFromGitHub(true), className: 'nav-btn cyan', condition: !isGuest },
      { id: 'category', label: '🏷️ 分类管理', action: () => setShowCategoryModal(true), className: 'nav-btn pink', condition: !isGuest },
      { id: 'user', label: '👤 用户管理', action: () => setShowUserModal(true), className: 'nav-btn blue', condition: isAdmin },
      { id: 'inviteCode', label: '🎫 授权码管理', action: () => setShowInviteCodeModal(true), className: 'nav-btn purple', condition: isAdmin },
      { id: 'changePassword', label: '🔐 修改密码', action: () => setShowChangePasswordModal(true), className: 'nav-btn', condition: true },
      { id: 'export', label: '📥 导出图片', action: handleExportGallery, className: 'nav-btn green', condition: !isGuest },
      { id: 'import', label: '📂 导入图片', action: () => importInputRef.current?.click(), className: 'nav-btn', condition: !isGuest },
      { id: 'reset', label: '🔄 重置', action: handleResetGallery, className: 'nav-btn warning', condition: !isGuest },
    ]
    
    setNavButtons(initialButtons.filter(btn => btn.condition))
  }, [currentUser?.role])

  const handleNavBtnDragStart = (e: React.DragEvent | any, index: number) => {
    setDraggedBtnIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleNavBtnDragOver = (e: React.DragEvent | any) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleNavBtnDrop = (e: React.DragEvent | React.MouseEvent | any, targetIndex: number) => {
    e.preventDefault()
    if (draggedBtnIndex === null || draggedBtnIndex === targetIndex) {
      setDraggedBtnIndex(null)
      return
    }

    const newButtons = [...navButtons]
    const draggedBtn = newButtons[draggedBtnIndex]
    newButtons.splice(draggedBtnIndex, 1)
    newButtons.splice(targetIndex, 0, draggedBtn)
    setNavButtons(newButtons)
    setDraggedBtnIndex(null)
  }

  const handleNavBtnDragEnd = () => {
    setDraggedBtnIndex(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const uploadPromises = Array.from(files).map((file, index) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = async (event) => {
          setUploading(true)
          setUploadMessage(`正在上传 ${file.name}...`)
          setUploadProgress(Math.round(((index + 1) / files.length) * 50))

          const imageData = event.target?.result as string

          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData,
                fileName: file.name,
              }),
            })

            const result = await response.json()
            
            if (response.ok && result.success) {
              setUploadProgress(100)
              setUploadMessage(`✅ ${file.name} 上传成功`)
              console.log('Image uploaded successfully:', result)
              
              await loadImagesFromGitHub(false)
            } else {
              const errorMsg = result.error || '上传失败'
              console.error('Upload failed:', errorMsg)
              setUploadMessage(`❌ ${file.name} 上传失败: ${errorMsg}`)
            }
          } catch (error) {
            console.error('Upload error:', error)
            setUploadMessage(`❌ ${file.name} 上传失败，请检查网络连接`)
          }

          resolve()
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(uploadPromises).then(() => {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setUploadMessage('')
      }, 3000)
    })
  }

  const handleDeleteImage = async (imageId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这张图片吗？')) {
      return
    }

    const image = images.find(img => img.id === imageId)
    if (!image) {
      alert('找不到要删除的图片')
      return
    }

    try {
      setUploading(true)
      const response = await fetch('/api/delete-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: image.id,
          fileName: image.name,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setImages(result.images)
        setCategories(['全部', ...result.categories])
        setUploadMessage('图片删除成功！')
      } else {
        setUploadMessage('删除失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      setUploadMessage('删除失败，请重试')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadMessage(''), 3000)
    }
  }

  const handleResetGallery = () => {
    if (confirm('确定要重置为默认图片吗？这会从 GitHub 重新加载数据。')) {
      setImages(imagesData.images)
      setCategories(['全部', ...imagesData.categories])
      setUploadMessage('已重置到默认状态，请手动同步 GitHub')
      setTimeout(() => setUploadMessage(''), 3000)
    }
  }

  const handleExportGallery = () => {
    const dataStr = JSON.stringify({ images, categories: categories.filter(c => c !== '全部') }, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `gallery-export-${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleImportGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string)
        const importedImages = importedData.images || []
        const importedCategories = importedData.categories || []
        
        if (Array.isArray(importedImages)) {
          if (confirm(`确定要导入 ${importedImages.length} 张图片吗？这将替换当前显示的图片，但需要手动同步到 GitHub。`)) {
            setImages(importedImages)
            setCategories(['全部', ...importedCategories])
            setUploadMessage('导入成功，请手动同步到 GitHub')
            setTimeout(() => setUploadMessage(''), 3000)
          }
        } else {
          alert('导入的文件格式不正确，请选择有效的图片导出文件。')
        }
      } catch (error) {
        alert('导入失败，请选择有效的 JSON 文件。')
      }
    }
    reader.readAsText(file)
  }

  const handleDragStart = (e: React.DragEvent | any, index: number) => {
    setImageDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent | any) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent | React.MouseEvent | any, targetIndex: number) => {
    e.preventDefault()
    if (imageDraggedIndex === null || imageDraggedIndex === targetIndex) {
      setImageDraggedIndex(null)
      return
    }

    const newImages = [...images]
    const draggedImage = newImages[imageDraggedIndex]
    newImages.splice(imageDraggedIndex, 1)
    newImages.splice(targetIndex, 0, draggedImage)
    setImages(newImages)
    setImageDraggedIndex(null)
    
    alert('图片排序已更新，需要手动同步到 GitHub 才能保存')
  }

  const handleDragEnd = () => {
    setImageDraggedIndex(null)
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      if (!categories.includes(newCategoryName.trim())) {
        setCategories((prev) => [...prev, newCategoryName.trim()])
      }
      setNewCategoryName('')
      setShowAddCategoryModal(false)
      alert('分类已添加，需要手动同步到 GitHub 才能保存')
    }
  }

  const handleEditCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) return
    
    setCategories((prev) => prev.map(c => c === oldName ? newName.trim() : c))
    setImages((prev) => prev.map(img => img.category === oldName ? { ...img, category: newName.trim() } : img))
    setEditingCategory(null)
    setEditingCategoryName('')
    alert('分类已更新，需要手动同步到 GitHub 才能保存')
  }

  const handleDeleteCategory = (categoryName: string) => {
    if (categoryName === '全部') {
      alert('不能删除"全部"分类')
      return
    }
    
    if (confirm(`确定要删除分类"${categoryName}"吗？该分类下的图片将移动到"未分类"。`)) {
      setCategories((prev) => prev.filter(c => c !== categoryName))
      setImages((prev) => prev.map(img => img.category === categoryName ? { ...img, category: '未分类' } : img))
      alert('分类已删除，需要手动同步到 GitHub 才能保存')
    }
  }

  const handleUpdateImageCategory = (imageId: number, newCategory: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, category: newCategory } : img))
    )
    alert('图片分类已更新，需要手动同步到 GitHub 才能保存')
  }

  const handleAddUser = () => {
    if (!newUserRealName.trim()) {
      setUserMessage('请填写真实姓名')
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
    } else {
      setUserMessage('用户名已存在')
    }
  }

  const handleDeleteUser = (userId: number) => {
    if (confirm('确定要删除这个用户吗？')) {
      const success = deleteUser(userId)
      if (!success) {
        alert('不能删除当前登录的用户')
      }
    }
  }

  const handleChangePassword = () => {
    if (!oldPassword.trim() || !newPasswordInput.trim() || !confirmPassword.trim()) {
      setChangePasswordMessage('请填写所有字段')
      return
    }

    if (newPasswordInput !== confirmPassword) {
      setChangePasswordMessage('两次输入的密码不一致')
      return
    }

    if (currentUser && oldPassword !== currentUser.password) {
      setChangePasswordMessage('原密码不正确')
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
      setChangePasswordMessage('请输入新密码')
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
    
    if (result.success) {
      setInviteCodeMessage({ type: 'success', text: result.message })
      setTimeout(() => setInviteCodeMessage(null), 3000)
    } else {
      setInviteCodeMessage({ type: 'error', text: result.message })
      setTimeout(() => setInviteCodeMessage(null), 3000)
    }
    
    setShowInviteCodeDeleteConfirm(false)
    setInviteCodeToDelete(null)
  }

  const cancelDeleteInviteCode = () => {
    setShowInviteCodeDeleteConfirm(false)
    setInviteCodeToDelete(null)
  }

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
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const filteredImages = selectedCategory === '全部'
    ? images
    : images.filter((img) => img.category === selectedCategory)

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

      {errorMessage && (
        <div className="error-banner">
          <p>⚠️ {errorMessage}</p>
          <button onClick={() => loadImagesFromGitHub(true)}>重试</button>
        </div>
      )}

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
                {images.filter((img) => img.category === category).length}
              </span>
            )}
          </button>
        ))}
      </div>

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

      {!uploading && uploadMessage && (
        <motion.div
          className="upload-status"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>{uploadMessage}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="loading-state">
          <p>正在从 GitHub 加载图片...</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredImages.map((image, index) => (
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
              onClick={() => setSelectedImage(image)}
            >
              <GalleryImage src={image.url} rawSrc={image.rawUrl} alt={image.name} loading="lazy" />
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
                {categories.filter((c) => c !== '全部').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredImages.length === 0 && (
        <div className="empty-state">
          <p>该分类下暂无图片，点击上方按钮上传图片吧！</p>
        </div>
      )}

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
              >
                <GalleryImage 
                  src={selectedImage.url} 
                  rawSrc={selectedImage.rawUrl} 
                  alt="放大" 
                  style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} 
                />
              </motion.div>
            <button
              className="close-btn"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                {categories.filter((c) => c !== '全部').map((category) => (
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
                            {images.filter((img) => img.category === category).length} 张图片
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

        {showUserModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header">
                <h2>👤 用户管理</h2>
                <button className="close-btn" onClick={() => setShowUserModal(false)}>✕</button>
              </div>
              <div className="user-list">
                {users.map((user) => (
                  <div key={user.id} className="user-item">
                    <div className="user-info-grid">
                      <div className="user-row">
                        <span className="label">姓名</span>
                        <span className="user-name">{user.name}</span>
                      </div>
                      <div className="user-row">
                        <span className="label">账号</span>
                        <span className="user-username">{padString(user.username, 12)}</span>
                      </div>
                      <div className="user-row">
                        <span className="label">密码</span>
                        <span className="user-password">
                          {padString(showPasswords[user.id] ? user.password : '*'.repeat(user.password.length), 12)}
                        </span>
                        <button
                          className="toggle-password-btn"
                          onClick={() => toggleShowPassword(user.id)}
                          title={showPasswords[user.id] ? '隐藏密码' : '显示密码'}
                        >
                          {showPasswords[user.id] ? '🙈' : '🐵'}
                        </button>
                      </div>
                      <div className="user-row">
                        <span className="label">角色</span>
                        <span className={`user-role ${user.role}`}>{user.role === 'admin' ? '管理员' : user.role === 'user' ? '普通用户' : '访客'}</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            className="change-password-btn"
                            onClick={() => openAdminChangePassword(user)}
                          >
                            修改密码
                          </button>
                          <button
                            className="delete-user-btn"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            删除
                          </button>
                        </>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="current-user-badge">当前用户</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="add-category-btn"
                onClick={() => setShowAddUserModal(true)}
              >
                + 添加新用户
              </button>
              <button className="close-modal-btn" onClick={() => setShowUserModal(false)}>
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}

        {showAddUserModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddUserModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>添加新用户</h2>
                <button className="close-btn" onClick={() => { setShowAddUserModal(false); setUserMessage(''); }}>✕</button>
              </div>
              {userMessage && (
                <div className={`message ${userMessage.includes('成功') ? 'success' : 'error'}`}>
                  {userMessage}
                </div>
              )}
              <input
                type="text"
                className="category-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="用户名"
                autoFocus
              />
              <p className="hint">支持字母、数字、@，长度 3-16 字符</p>
              <input
                type="password"
                className="category-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="密码"
              />
              <p className="hint">建议包含大小写字母、数字、特殊字符，长度 8-32 字符</p>
              <input
                type="text"
                className="category-input"
                value={newUserRealName}
                onChange={(e) => setNewUserRealName(e.target.value)}
                placeholder="真实姓名"
              />
              <select
                className="category-select-modal"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="guest">访客</option>
              </select>
              <div className="modal-buttons">
                <button className="confirm-btn" onClick={handleAddUser}>
                  添加
                </button>
                <button className="cancel-btn" onClick={() => {
                  setShowAddUserModal(false)
                  setUserMessage('')
                }}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showChangePasswordModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowChangePasswordModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>🔐 修改密码</h2>
                <button className="close-btn" onClick={() => setShowChangePasswordModal(false)}>✕</button>
              </div>
              {changePasswordMessage && (
                <div className={`message ${changePasswordMessage.includes('成功') ? 'success' : 'error'}`}>
                  {changePasswordMessage}
                </div>
              )}
              <input
                type="password"
                className="category-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="原密码"
                autoFocus
              />
              <input
                type="password"
                className="category-input"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="新密码"
              />
              <input
                type="password"
                className="category-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认新密码"
              />
              <div className="modal-buttons">
                <button className="confirm-btn" onClick={handleChangePassword}>
                  确认修改
                </button>
                <button className="cancel-btn" onClick={() => {
                  setShowChangePasswordModal(false)
                  setChangePasswordMessage('')
                }}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAdminChangePasswordModal && userToChangePassword && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdminChangePasswordModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>🔐 修改 {userToChangePassword.name} 的密码</h2>
                <button className="close-btn" onClick={() => setShowAdminChangePasswordModal(false)}>✕</button>
              </div>
              {changePasswordMessage && (
                <div className={`message ${changePasswordMessage.includes('成功') ? 'success' : 'error'}`}>
                  {changePasswordMessage}
                </div>
              )}
              <input
                type="password"
                className="category-input"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                placeholder="新密码"
                autoFocus
              />
              <div className="modal-buttons">
                <button className="confirm-btn" onClick={handleAdminChangePassword}>
                  确认修改
                </button>
                <button className="cancel-btn" onClick={() => {
                  setShowAdminChangePasswordModal(false)
                  setChangePasswordMessage('')
                }}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showInviteCodeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteCodeModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '800px', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div className="modal-header">
                <h2>🎫 授权码管理</h2>
                <button className="close-btn" onClick={() => setShowInviteCodeModal(false)}>✕</button>
              </div>
              <button className="generate-code-btn" onClick={() => setShowGenerateCodeModal(true)}>
                + 生成新授权码
              </button>
              {inviteCodeMessage && (
                <div className={`message ${inviteCodeMessage.type}`}>
                  {inviteCodeMessage.text}
                </div>
              )}
              <div className="invite-code-list">
                {inviteCodes.length === 0 ? (
                  <p className="empty-message">暂无授权码，点击上方按钮生成</p>
                ) : (
                  inviteCodes.map((code) => {
                    const status = getInviteCodeStatus(code)
                    return (
                      <div key={code.id} className="invite-code-item">
                        <div className="code-display">
                          <code>{code.code}</code>
                          <button 
                            className="copy-btn" 
                            onClick={() => handleCopyInviteCode(code.code)}
                          >
                            {copiedCode === code.code ? '✓ 已复制' : '复制'}
                          </button>
                        </div>
                        <div className="code-info">
                          <span className="info-item">有效期至: {formatDate(code.expiresAt)}</span>
                          <span className="info-item">使用次数: {code.usedCount}/{code.maxUses}</span>
                          <span className="info-item">创建者: {code.createdBy}</span>
                          <span className={`status-badge ${status.className}`}>{status.text}</span>
                        </div>
                        <div className="code-actions">
                          {code.active && (
                            <button
                              className="deactivate-btn"
                              onClick={() => handleDeactivateInviteCode(code.id)}
                            >
                              作废
                            </button>
                          )}
                          <button
                            className="delete-code-btn"
                            onClick={() => handleDeleteInviteCode(code.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showGenerateCodeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGenerateCodeModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>生成新授权码</h2>
                <button className="close-btn" onClick={() => setShowGenerateCodeModal(false)}>✕</button>
              </div>
              <div className="form-group">
                <label>有效期（天）</label>
                <input
                  type="number"
                  className="category-input"
                  value={inviteCodeExpires}
                  onChange={(e) => setInviteCodeExpires(Math.max(1, parseInt(e.target.value) || 7))}
                  min="1"
                  max="365"
                />
              </div>
              <div className="form-group">
                <label>最大使用次数</label>
                <input
                  type="number"
                  className="category-input"
                  value={inviteCodeMaxUses}
                  onChange={(e) => setInviteCodeMaxUses(Math.max(1, parseInt(e.target.value) || 5))}
                  min="1"
                  max="100"
                />
              </div>
              <div className="modal-buttons">
                <button className="confirm-btn" onClick={handleGenerateInviteCode}>
                  生成
                </button>
                <button className="cancel-btn" onClick={() => setShowGenerateCodeModal(false)}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showInviteCodeDeleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDeleteInviteCode}
          >
            <motion.div
              className="modal-content delete-confirm-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>⚠️ 确认删除</h2>
                <button className="close-btn" onClick={cancelDeleteInviteCode}>✕</button>
              </div>
              <div className="delete-confirm-content">
                <p className="delete-warning">确定要删除这条授权码记录吗？</p>
                <p className="delete-notice">此操作不可恢复</p>
              </div>
              <div className="modal-buttons">
                <button className="confirm-btn danger" onClick={confirmDeleteInviteCode}>
                  确认删除
                </button>
                <button className="cancel-btn" onClick={cancelDeleteInviteCode}>
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}