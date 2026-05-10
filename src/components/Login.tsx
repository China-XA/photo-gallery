import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { login, registerUser } = useAuth()
  const navigate = useNavigate()

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++
    return strength
  }

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd)
    setPasswordStrength(calculatePasswordStrength(pwd))
  }

  const validateUsername = (uname: string) => {
    if (!uname.trim()) return '请输入用户名'
    if (uname.length < 3) return '用户名长度至少为 3 个字符'
    if (uname.length > 16) return '用户名长度不能超过 16 个字符'
    if (!/^[a-zA-Z0-9@]+$/.test(uname)) return '用户名只支持字母、数字和 @ 符号'
    return ''
  }

  const validatePassword = (pwd: string) => {
    if (!pwd.trim()) return '请输入密码'
    if (pwd.length < 8) return '密码长度至少为 8 个字符'
    if (pwd.length > 32) return '密码长度不能超过 32 个字符'
    return ''
  }

  const validateName = (n: string) => {
    if (!n.trim()) return '请输入姓名'
    if (n.length < 2) return '姓名长度至少为 2 个字符'
    if (n.length > 20) return '姓名长度不能超过 20 个字符'
    return ''
  }

  const validateInviteCode = (code: string) => {
    if (!code.trim()) return '请输入授权码'
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (isRegister) {
      const usernameErr = validateUsername(username)
      const pwdErr = validatePassword(password)
      const nameErr = validateName(name)
      const codeErr = validateInviteCode(inviteCode)

      if (usernameErr) {
        setError(usernameErr)
        return
      }

      if (pwdErr) {
        setError(pwdErr)
        return
      }

      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }

      if (nameErr) {
        setError(nameErr)
        return
      }

      if (codeErr) {
        setError(codeErr)
        return
      }

      const result = registerUser(username, password, name, inviteCode)
      if (result.success) {
        setMessage('账户创建成功！请返回登录界面使用新账户登录')
        setTimeout(() => {
          toggleMode()
        }, 2000)
      } else {
        setError(result.message)
      }
    } else {
      if (!username.trim()) {
        setError('请输入用户名')
        return
      }

      if (!password.trim()) {
        setError('请输入密码')
        return
      }

      const result = login(username, password)
      if (result.success) {
        navigate('/')
      } else {
        setError(result.message)
      }
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError('')
    setMessage('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setInviteCode('')
    setPasswordStrength(0)
  }

  const getStrengthText = () => {
    if (passwordStrength <= 2) return { text: '弱', color: '#ef4444' }
    if (passwordStrength <= 4) return { text: '中', color: '#f59e0b' }
    return { text: '强', color: '#10b981' }
  }

  const strengthInfo = getStrengthText()

  return (
    <div className="login-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRegister ? 'register' : 'login'}
          className="login-box"
          initial={{ opacity: 0, y: -30, rotateY: 10 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          exit={{ opacity: 0, y: 30, rotateY: -10 }}
          transition={{ duration: 0.5 }}
        >
          <h1>{isRegister ? '创建账户' : '欢迎访问图片长廊'}</h1>
          <p className="subtitle">{isRegister ? '填写以下信息注册新账户' : '请登录以继续'}</p>
          
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="name">姓名</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入姓名"
                    required
                  />
                  <p className="hint">2-20 个字符</p>
                </div>

                <div className="form-group">
                  <label htmlFor="username-reg">用户名</label>
                  <input
                    type="text"
                    id="username-reg"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    required
                  />
                  <p className="hint">支持字母、数字、@，3-16 个字符</p>
                </div>

                <div className="form-group">
                  <label htmlFor="password-reg">密码</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password-reg"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="请输入密码"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  {password && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div
                          className="strength-fill"
                          style={{
                            width: `${(passwordStrength / 6) * 100}%`,
                            backgroundColor: strengthInfo.color
                          }}
                        />
                      </div>
                      <span className="strength-text" style={{ color: strengthInfo.color }}>
                        密码强度: {strengthInfo.text}
                      </span>
                    </div>
                  )}
                  <p className="hint">建议包含大小写字母、数字、特殊字符，8-32 个字符</p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">确认密码</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {showConfirmPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="invite-code">授权码</label>
                  <input
                    type="text"
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入授权码"
                    required
                  />
                  <p className="hint">请向管理员获取授权码</p>
                </div>
              </>
            )}

            {!isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="username">用户名</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    required
                  />
                  <p className="hint">支持字母、数字、@，3-16 个字符</p>
                </div>
                <div className="form-group">
                  <label htmlFor="password">密码</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <p className="hint">建议包含大小写字母、数字、特殊字符，8-32 个字符</p>
                </div>
              </>
            )}

            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="submit-btn"
            >
              {isRegister ? '创建账户' : '登录'}
            </motion.button>
          </form>

          <div className="mode-switch">
            <button
              type="button"
              onClick={toggleMode}
              className="switch-btn"
            >
              {isRegister ? '已有账户？立即登录' : '创建新账户'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
