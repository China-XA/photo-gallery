import { createContext, useContext, useState, ReactNode } from 'react'
import initialUsersData from '../data/users.json'

interface User {
  id: number
  username: string
  password: string
  key: string
  role: string
  name: string
}

interface InviteCode {
  id: string
  code: string
  createdAt: number
  expiresAt: number
  maxUses: number
  usedCount: number
  active: boolean
  createdBy: string
}

interface OperationLog {
  id: string
  action: string
  targetId: string
  targetType: 'inviteCode' | 'user' | 'image'
  operator: string
  timestamp: number
  details: string
}

interface AuthContextType {
  isAuthenticated: boolean
  currentUser: User | null
  users: User[]
  inviteCodes: InviteCode[]
  operationLogs: OperationLog[]
  login: (username: string, password: string) => { success: boolean; message: string }
  logout: () => void
  addUser: (username: string, password: string, name: string, role?: string) => { success: boolean; message: string }
  deleteUser: (userId: number) => boolean
  updateUser: (userId: number, updates: Partial<User>) => boolean
  generateInviteCode: (expiresDays?: number, maxUses?: number) => InviteCode
  validateInviteCode: (code: string) => { valid: boolean; message: string }
  useInviteCode: (code: string) => boolean
  deactivateInviteCode: (codeId: string) => void
  deleteInviteCode: (codeId: string) => { success: boolean; message: string }
  registerUser: (username: string, password: string, name: string, inviteCode: string) => { success: boolean; message: string }
  getOperationLogs: (limit?: number) => OperationLog[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const userData = localStorage.getItem('currentUser')
    return userData ? JSON.parse(userData) : null
  })

  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('users')
    if (savedUsers) {
      return JSON.parse(savedUsers)
    }
    return initialUsersData.users
  })

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>(() => {
    const savedCodes = localStorage.getItem('inviteCodes')
    if (savedCodes) {
      return JSON.parse(savedCodes)
    }
    return []
  })

  const [operationLogs, setOperationLogs] = useState<OperationLog[]>(() => {
    const savedLogs = localStorage.getItem('operationLogs')
    if (savedLogs) {
      return JSON.parse(savedLogs)
    }
    return []
  })

  const saveOperationLogs = (logs: OperationLog[]) => {
    setOperationLogs(logs)
    localStorage.setItem('operationLogs', JSON.stringify(logs))
  }

  const addOperationLog = (
    action: string,
    targetId: string,
    targetType: 'inviteCode' | 'user' | 'image',
    details: string
  ): void => {
    const newLog: OperationLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      action,
      targetId,
      targetType,
      operator: currentUser?.username || 'unknown',
      timestamp: Date.now(),
      details
    }
    const updatedLogs = [newLog, ...operationLogs].slice(0, 100)
    saveOperationLogs(updatedLogs)
  }

  const getOperationLogs = (limit?: number): OperationLog[] => {
    if (limit) {
      return operationLogs.slice(0, limit)
    }
    return operationLogs
  }

  const saveInviteCodes = (codes: InviteCode[]) => {
    setInviteCodes(codes)
    localStorage.setItem('inviteCodes', JSON.stringify(codes))
  }

  const generateInviteCode = (expiresDays: number = 7, maxUses: number = 5): InviteCode => {
    const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length))
    }

    const newCode: InviteCode = {
      id: Date.now().toString(),
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresDays * 24 * 60 * 60 * 1000,
      maxUses,
      usedCount: 0,
      active: true,
      createdBy: currentUser?.username || 'admin'
    }

    saveInviteCodes([...inviteCodes, newCode])
    return newCode
  }

  const validateInviteCode = (code: string): { valid: boolean; message: string } => {
    const inviteCode = inviteCodes.find(c => c.code.toLowerCase() === code.toLowerCase() && c.active)
    
    if (!inviteCode) {
      return { valid: false, message: '授权码不存在或已作废' }
    }

    if (Date.now() > inviteCode.expiresAt) {
      return { valid: false, message: '授权码已过期' }
    }

    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return { valid: false, message: '授权码使用次数已用尽' }
    }

    return { valid: true, message: '授权码有效' }
  }

  const useInviteCode = (code: string): boolean => {
    const result = validateInviteCode(code)
    if (!result.valid) {
      return false
    }

    const updatedCodes = inviteCodes.map(c => 
      c.code.toLowerCase() === code.toLowerCase() 
        ? { ...c, usedCount: c.usedCount + 1 }
        : c
    )
    saveInviteCodes(updatedCodes)
    return true
  }

  const deactivateInviteCode = (codeId: string): void => {
    const codeToDeactivate = inviteCodes.find(c => c.id === codeId)
    const updatedCodes = inviteCodes.map(c => 
      c.id === codeId ? { ...c, active: false } : c
    )
    saveInviteCodes(updatedCodes)
    if (codeToDeactivate) {
      addOperationLog(
        'deactivate',
        codeId,
        'inviteCode',
        `作废了授权码: ${codeToDeactivate.code}`
      )
    }
  }

  const deleteInviteCode = (codeId: string): { success: boolean; message: string } => {
    try {
      const codeToDelete = inviteCodes.find(c => c.id === codeId)
      
      if (!codeToDelete) {
        return { success: false, message: '授权码不存在' }
      }
      
      if (currentUser?.role !== 'admin') {
        return { success: false, message: '权限不足，仅管理员可执行此操作' }
      }
      
      const updatedCodes = inviteCodes.filter(c => c.id !== codeId)
      saveInviteCodes(updatedCodes)
      
      addOperationLog(
        'delete',
        codeId,
        'inviteCode',
        `删除了授权码: ${codeToDelete.code}`
      )
      
      return { success: true, message: '授权码已成功删除' }
    } catch (error) {
      console.error('删除授权码失败:', error)
      return { success: false, message: '删除授权码失败，请稍后重试' }
    }
  }

  const registerUser = (username: string, password: string, name: string, inviteCode: string): { success: boolean; message: string } => {
    const validResult = validateInviteCode(inviteCode)
    if (!validResult.valid) {
      return { success: false, message: validResult.message }
    }

    const addResult = addUser(username, password, name, 'user')
    if (addResult.success) {
      useInviteCode(inviteCode)
    }
    return addResult
  }

  const login = (username: string, password: string) => {
    const loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0')
    const lockTime = localStorage.getItem('lockTime')
    const LOCK_DURATION = 5 * 60 * 1000
    const MAX_ATTEMPTS = 5

    if (lockTime && Date.now() < parseInt(lockTime)) {
      const remainingTime = Math.ceil((parseInt(lockTime) - Date.now()) / 1000 / 60)
      return { success: false, message: `账户已锁定，请 ${remainingTime} 分钟后再试` }
    }

    const user = users.find(
      (u: User) => u.username === username && u.password === password
    )

    if (user) {
      localStorage.removeItem('loginAttempts')
      localStorage.removeItem('lockTime')
      setIsAuthenticated(true)
      setCurrentUser(user)
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('currentUser', JSON.stringify(user))
      return { success: true, message: '登录成功' }
    }

    const newAttempts = loginAttempts + 1
    localStorage.setItem('loginAttempts', newAttempts.toString())

    if (newAttempts >= MAX_ATTEMPTS) {
      localStorage.setItem('lockTime', (Date.now() + LOCK_DURATION).toString())
      return { success: false, message: `登录失败 ${MAX_ATTEMPTS} 次，账户已锁定，请 5 分钟后再试` }
    }

    const remainingAttempts = MAX_ATTEMPTS - newAttempts
    return { success: false, message: `用户名或密码错误，还有 ${remainingAttempts} 次机会` }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
  }

  const addUser = (username: string, password: string, name: string, role: string = 'user') => {
    if (!username.trim()) {
      return { success: false, message: '请输入用户名' }
    }

    if (username.length < 3 || username.length > 16) {
      return { success: false, message: '用户名长度必须在 3-16 个字符之间' }
    }

    const usernameRegex = /^[a-zA-Z0-9@]+$/
    if (!usernameRegex.test(username)) {
      return { success: false, message: '用户名只支持字母、数字和 @ 符号' }
    }

    if (users.find(u => u.username === username)) {
      return { success: false, message: '用户名已存在' }
    }

    if (!password.trim()) {
      return { success: false, message: '请输入密码' }
    }

    if (password.length < 8 || password.length > 32) {
      return { success: false, message: '密码长度必须在 8-32 个字符之间' }
    }

    const newUser: User = {
      id: Date.now(),
      username: username,
      password: password,
      key: `${username.toUpperCase()}_SECRET_KEY_${Date.now()}`,
      role: role,
      name: name
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    return { success: true, message: '用户添加成功' }
  }

  const deleteUser = (userId: number) => {
    if (userId === currentUser?.id) {
      return false
    }

    const updatedUsers = users.filter(u => u.id !== userId)
    setUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    return true
  }

  const updateUser = (userId: number, updates: Partial<User>) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, ...updates } : u
    )
    setUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    
    if (currentUser?.id === userId) {
      const updatedUser = updatedUsers.find(u => u.id === userId)
      if (updatedUser) {
        setCurrentUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      }
    }
    return true
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      currentUser, 
      users,
      inviteCodes,
      operationLogs,
      login, 
      logout,
      addUser,
      deleteUser,
      updateUser,
      generateInviteCode,
      validateInviteCode,
      useInviteCode,
      deactivateInviteCode,
      deleteInviteCode,
      registerUser,
      getOperationLogs
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
