# 实验报告助手

**在模板结构上分部分生成实验报告的桌面工具**——解析实验模板、检索讲义要点、AI 逐部分撰写、一键编译导出 PDF。本地优先，数据存在你自己的电脑上。

> 🧪 **Beta 测试中**：功能与体验持续迭代中，欢迎反馈问题与建议（联系方式见下）。

## 下载

| 系统 | 下载 | 说明 |
|---|---|---|
| Windows | [最新版 zip](https://github.com/acemysickj/lab-report-assistant/releases/latest) | 解压后运行 `实验报告助手.exe` |

到 [Releases 页面](https://github.com/acemysickj/lab-report-assistant/releases) 查看全部历史版本。

### 首次运行提示（Windows 蓝色警告）

本软件处于 Beta 阶段，暂未购买代码签名证书。首次运行可能遇到 Windows SmartScreen 蓝色提示「更多信息 → 仍要运行」，属正常现象，不影响使用。介意者请等待正式签名版本。

## 快速上手

1. **建课程**：首页输入课程名创建，添加讲义（md/pdf）与实验模板（PDF/Word/LaTeX）
2. **解析结构**：点「AI 解析模板结构」，自动提取报告章节
3. **创建报告**：选模板 → 生成各部分（AI 撰写、可带数据图表）
4. **导出 PDF**：点「导出」，内置 LaTeX 编译环境自动部署，无需手动安装

## AI 说明（两种模式）

| 模式 | 说明 | 适合 |
|---|---|---|
| **平台 AI** | 使用平台账号额度，按次计费，无需任何配置 | 大多数用户 |
| **自有 Key（BYOK） | 填入你自己的 DeepSeek API Key，直连不计费 | 有 key 的开发者 |

- 额度套餐：¥9.9 / 100 额度 · ¥29.9 / 350 额度 · ¥49.9 / 700 额度
- 计费操作：生成部分（5 额度/次）、生成图表（3 额度/次）；模板解析、讲义检索免费
- 生成失败自动退还额度

## 隐私

- 讲义、报告、图片**不在服务器持久化存储**；AI 功能仅发送完成任务所需的必要文本
- 本地数据（课程/报告/配置）仅存于你的电脑，支持备份导出
- 详见[《隐私政策》](https://github.com/acemysickj/lab-report-server/blob/main/docs/legal/privacy-policy.md)与[《服务协议》](https://github.com/acemysickj/lab-report-server/blob/main/docs/legal/terms-of-service.md)

## 常见问题

见 [FAQ](./docs/FAQ.md)。

## 反馈与联系

- 问题反馈 / 建议：[Issues](https://github.com/acemysickj/lab-report-assistant/issues)
- 商务与账号问题：toby1354213976@163.com

---

<details>
<summary>开发者信息</summary>

- Electron 33 桌面应用（CommonJS，本地优先架构）；配套商业化服务端 [lab-report-server](https://github.com/acemysickj/lab-report-server)（Node 24 + Fastify 5 + SQLite）
- 客户端测试基线 480 项；版式契约 `app/REPORT-DESIGN.md`（R0-R11）+ verify-compile 44 断言
- 客户端不设独立 git 历史，批次记录见项目 `ISSUES.md`

</details>
