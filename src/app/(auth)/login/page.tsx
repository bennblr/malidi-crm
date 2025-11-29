'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, message } from 'antd'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import styles from './login.module.css'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session, status, update } = useSession()

  // Редирект если уже авторизован
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/board')
    }
  }, [status, session, router])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: '/board',
      })

      if (result?.error) {
        console.error('Login error:', result.error)
        message.error('Неверный email или пароль')
        setLoading(false)
      } else if (result?.ok) {
        // После успешного signIn NextAuth устанавливает cookie
        // Обновляем сессию и делаем SPA переход
        await update() // Обновляем сессию на клиенте
        router.push('/board') // SPA переход без перезагрузки
      } else {
        message.error('Ошибка при входе')
        setLoading(false)
      }
    } catch (error) {
      console.error('Login exception:', error)
      message.error('Ошибка при входе')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Вход в систему</h1>
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' },
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password 
              size="large"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Войти
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

