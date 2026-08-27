import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1a1a1a',
          colorInfo: '#1a1a1a',
          colorLink: '#1a1a1a',
          colorText: '#1a1a1a',
          colorTextSecondary: '#6f706d',
          colorBgLayout: '#f4f3ef',
          colorBgContainer: '#ffffff',
          colorBorder: '#deded8',
          borderRadius: 6,
          borderRadiusLG: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          controlHeight: 38,
        },
        components: {
          Button: {
            primaryColor: '#ffffff',
            defaultBorderColor: '#d5d5cf',
          },
          Card: {
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#1a1a1a',
            darkSubMenuItemBg: '#11120f',
            darkItemColor: '#a8a8a3',
            darkItemHoverBg: '#292a27',
            darkItemSelectedBg: '#f0efea',
            darkItemSelectedColor: '#1a1a1a',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
