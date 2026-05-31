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
          // --- Primary palette: warm academic green ---
          colorPrimary: '#3d7a4f',
          colorPrimaryBg: '#eef5ef',
          colorPrimaryBgHover: '#dce9df',
          colorPrimaryBorder: '#8db893',
          colorPrimaryBorderHover: '#5b9a6b',
          colorPrimaryHover: '#4d8f5e',
          colorPrimaryActive: '#2f6440',
          colorPrimaryTextHover: '#4d8f5e',
          colorPrimaryText: '#3d7a4f',
          colorPrimaryTextActive: '#2f6440',

          // --- Success / Warning / Error ---
          colorSuccess: '#5b9a6b',
          colorSuccessBg: '#eef7f0',
          colorSuccessBorder: '#a8d4b0',
          colorWarning: '#c8923e',
          colorWarningBg: '#fdf6ec',
          colorWarningBorder: '#e8c98a',
          colorError: '#b54b4b',
          colorErrorBg: '#fdf2f2',
          colorErrorBorder: '#e0a0a0',

          // --- Neutral / paper tones ---
          colorText: '#2c2416',
          colorTextSecondary: '#6b5e4a',
          colorTextTertiary: '#9b8e78',
          colorTextQuaternary: '#bfb5a4',
          colorBgContainer: '#fefdf8',
          colorBgElevated: '#fefdf8',
          colorBgLayout: '#f5f1e8',
          colorBgSpotlight: 'rgba(44, 36, 22, 0.85)',
          colorBorder: '#ddd4c2',
          colorBorderSecondary: '#e8e0d0',
          colorFill: 'rgba(61, 122, 79, 0.06)',
          colorFillAlter: 'rgba(61, 122, 79, 0.03)',
          colorFillContent: 'rgba(61, 122, 79, 0.08)',
          colorFillContentHover: 'rgba(61, 122, 79, 0.12)',

          // --- Typography ---
          fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`,
          fontSize: 14,
          fontSizeHeading1: 32,
          fontSizeHeading2: 24,
          fontSizeHeading3: 20,
          fontSizeHeading4: 17,
          fontSizeHeading5: 15,
          lineHeight: 1.7,
          lineHeightHeading1: 1.3,
          lineHeightHeading2: 1.35,
          lineHeightHeading3: 1.4,
          lineHeightHeading4: 1.45,
          lineHeightHeading5: 1.5,

          // --- Spacing & sizing ---
          borderRadius: 10,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          borderRadiusXS: 4,
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          paddingLG: 28,
          paddingMD: 20,
          paddingSM: 12,
          paddingXS: 8,
          marginLG: 28,
          marginMD: 20,
          marginSM: 12,
          marginXS: 8,

          // --- Shadows (layered paper aesthetic) ---
          boxShadow:
            '0 1px 3px rgba(44, 36, 22, 0.04), 0 1px 2px rgba(44, 36, 22, 0.03)',
          boxShadowSecondary:
            '0 2px 8px rgba(44, 36, 22, 0.06), 0 1px 3px rgba(44, 36, 22, 0.04)',
          boxShadowTertiary:
            '0 4px 16px rgba(44, 36, 22, 0.08), 0 2px 6px rgba(44, 36, 22, 0.04)',

          // --- Motion ---
          motionDurationSlow: '0.3s',
          motionDurationMid: '0.2s',
          motionDurationFast: '0.1s',
          motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
          motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',

          // --- Misc ---
          wireframe: false,
          lineWidth: 1,
          lineType: 'solid',
        },
        components: {
          // --- Card ---
          Card: {
            colorBgContainer: '#fefdf8',
            borderRadiusLG: 12,
            paddingLG: 24,
            paddingMD: 20,
            boxShadowTertiary: '0 1px 4px rgba(44,36,22,0.04), 0 1px 2px rgba(44,36,22,0.02)',
          },

          // --- Button ---
          Button: {
            borderRadius: 8,
            borderRadiusLG: 10,
            borderRadiusSM: 6,
            controlHeight: 38,
            controlHeightLG: 44,
            controlHeightSM: 30,
            paddingInline: 20,
            paddingInlineLG: 24,
            paddingInlineSM: 12,
            primaryShadow: '0 2px 6px rgba(61,122,79,0.25)',
            fontWeight: 500,
          },

          // --- Menu ---
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#e8e0d0',
            itemSelectedColor: '#2c2416',
            itemHoverBg: '#f0ebe0',
            itemActiveBg: '#e8e0d0',
            itemColor: '#5c4f3a',
            borderRadius: 8,
            itemMarginInline: 6,
            itemHeight: 42,
            iconSize: 18,
            collapsedIconSize: 20,
            subMenuItemBg: 'transparent',
            groupTitleColor: '#9b8e78',
            groupTitleFontSize: 11,
          },

          // --- Layout ---
          Layout: {
            siderBg: '#f7f3e8',
            headerBg: 'transparent',
            bodyBg: '#f5f1e8',
            triggerBg: '#ede6d6',
            triggerColor: '#5c4f3a',
            triggerHeight: 44,
          },

          // --- Table ---
          Table: {
            headerBg: '#f7f3e8',
            headerColor: '#5c4f3a',
            rowHoverBg: '#faf6ee',
            rowSelectedBg: '#f2eee0',
            borderColor: '#e0d8c8',
            borderRadiusLG: 10,
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
          },

          // --- Input ---
          Input: {
            activeBorderColor: '#3d7a4f',
            hoverBorderColor: '#5b9a6b',
            activeShadow: '0 0 0 2px rgba(61,122,79,0.1)',
            borderRadius: 8,
            borderRadiusLG: 10,
            paddingBlock: 8,
            paddingInline: 12,
          },

          // --- Select ---
          Select: {
            optionSelectedBg: '#e8e0d0',
            optionSelectedColor: '#2c2416',
            optionActiveBg: '#f0ebe0',
            borderRadius: 8,
          },

          // --- Steps ---
          Steps: {
            colorTextDescription: '#8b7a60',
            iconSize: 32,
            titleLineHeight: 1.4,
            descriptionMaxWidth: 160,
            navArrowColor: '#bfb5a4',
          },

          // --- Tag ---
          Tag: {
            borderRadiusSM: 6,
            defaultBg: '#f5f1e8',
            defaultColor: '#6b5e4a',
          },

          // --- Divider ---
          Divider: {
            colorSplit: '#e0d8c8',
            marginLG: 28,
            margin: 20,
          },

          // --- Alert ---
          Alert: {
            colorInfoBg: '#f0f4f8',
            colorInfoBorder: '#c4d4e0',
            borderRadiusLG: 10,
            defaultPadding: '12px 16px',
            withDescriptionPadding: '16px 20px',
          },

          // --- Modal ---
          Modal: {
            borderRadiusLG: 16,
            paddingContentHorizontalLG: 28,
            paddingMD: 24,
            titleFontSize: 17,
          },

          // --- Collapse ---
          Collapse: {
            headerBg: '#faf8f0',
            contentBg: '#fefdf8',
            borderRadiusLG: 10,
            colorBorder: '#e8e0d0',
          },

          // --- Tabs ---
          Tabs: {
            inkBarColor: '#3d7a4f',
            itemActiveColor: '#3d7a4f',
            itemHoverColor: '#4d8f5e',
            itemSelectedColor: '#2c2416',
            titleFontSize: 14,
          },

          // --- Spin ---
          Spin: {
            colorPrimary: '#3d7a4f',
            dotSizeLG: 40,
            dotSize: 28,
            dotSizeSM: 20,
          },

          // --- Skeleton ---
          Skeleton: {
            gradientFromColor: '#f0ebe0',
            gradientToColor: '#e8e0d0',
          },

          // --- Result ---
          Result: {
            titleFontSize: 22,
            subtitleFontSize: 14,
            iconFontSize: 64,
            extraMargin: '24px 0 0 0',
          },

          // --- Descriptions ---
          Descriptions: {
            labelBg: '#faf8f0',
            contentColor: '#2c2416',
            borderRadiusLG: 10,
          },

          // --- Popconfirm ---
          Popconfirm: {
            colorBgElevated: '#fefdf8',
          },

          // --- Tooltip ---
          Tooltip: {
            colorBgSpotlight: 'rgba(44, 36, 22, 0.92)',
            borderRadius: 8,
          },

          // --- Dropdown ---
          Dropdown: {
            colorBgElevated: '#fefdf8',
            borderRadiusLG: 10,
            boxShadowSecondary:
              '0 6px 20px rgba(44, 36, 22, 0.12), 0 2px 8px rgba(44, 36, 22, 0.06)',
          },

          // --- Breadcrumb ---
          Breadcrumb: {
            itemColor: '#8b7a60',
            lastItemColor: '#2c2416',
            linkColor: '#5c4f3a',
            linkHoverColor: '#3d7a4f',
            separatorColor: '#bfb5a4',
          },

          // --- Radio ---
          Radio: {
            radioSize: 16,
            dotSize: 8,
          },

          // --- Form ---
          Form: {
            labelColor: '#5c4f3a',
            labelFontSize: 13,
            itemMarginBottom: 20,
          },

          // --- Empty ---
          Empty: {
            colorTextDescription: '#9b8e78',
          },

          // --- Switch ---
          Switch: {
            handleSize: 18,
            trackHeight: 24,
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
