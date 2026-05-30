import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#3d7a4f',
          colorSuccess: '#5b9a6b',
          colorWarning: '#c8923e',
          colorError: '#b54b4b',
          borderRadius: 8,
          colorBgContainer: '#fefdf8',
          colorBgLayout: '#f5f1e8',
          colorText: '#2c2416',
          colorTextSecondary: '#6b5e4a',
          colorBorder: '#e0d8c8',
          colorBorderSecondary: '#ebe3d4',
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif`,
          fontSize: 14,
          lineHeight: 1.7,
          controlHeight: 38,
          boxShadow: '0 2px 8px rgba(44,36,22,0.06)',
          paddingLG: 28,
          marginLG: 28,
        },
        components: {
          Card: {
            colorBgContainer: '#fefdf8',
            borderRadius: 10,
            paddingLG: 24,
            boxShadow: '0 1px 4px rgba(44,36,22,0.05)',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 38,
            paddingInline: 20,
            primaryShadow: '0 2px 4px rgba(61,122,79,0.2)',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#e8e0d0',
            itemSelectedColor: '#2c2416',
            itemHoverBg: '#f0ebe0',
            itemActiveBg: '#e8e0d0',
            itemColor: '#5c4f3a',
            borderRadius: 8,
            itemMarginInline: 6,
            itemHeight: 40,
          },
          Layout: {
            siderBg: '#f7f3e8',
            headerBg: 'transparent',
            bodyBg: '#f5f1e8',
          },
          Table: {
            headerBg: '#f7f3e8',
            rowHoverBg: '#faf6ee',
            borderColor: '#e0d8c8',
            borderRadius: 10,
          },
          Input: {
            activeBorderColor: '#3d7a4f',
            hoverBorderColor: '#5b9a6b',
            borderRadius: 8,
          },
          Select: {
            optionSelectedBg: '#e8e0d0',
            borderRadius: 8,
          },
          Steps: {
            colorTextDescription: '#8b7a60',
            iconSize: 28,
          },
          Tag: {
            borderRadius: 6,
          },
          Divider: {
            colorSplit: '#e0d8c8',
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
