# 门店工资助手

[![CI](https://github.com/MapleAllen/snack-store-staff-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/MapleAllen/snack-store-staff-management-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

面向小型多门店经营者的本地工资核算桌面应用。项目采用 React、Vite 与 Electron，连接员工档案、考勤录入、工资确认、门店月结和历史报表。

仓库中的门店、员工和金额均为虚构演示数据。本项目不隶属于任何零售品牌，也不应直接用于真实发薪决策。

![工资管理工作台](docs/assets/payroll-workspace.png)

## 核心能力

- 六个联动视图：经营总览、员工管理、考勤管理、工资管理、报表、门店工资设置。
- 多门店新增、改名、停用和恢复；员工按月份跨店调动并保留历史归属。
- 逐员工确认工资录入；待设置、输入错误和未确认项目会阻止月结。
- 按门店和月份冻结月结快照；解锁必须记录原因。
- 区分预计、已确认和已月结金额；未月结导出明确标记为草稿。
- 桌面版支持 4-6 位数字 PIN 应用锁，以及口令加密的手动备份。
- 手动 JSON 备份，以及 Electron 环境下的本机自动恢复点。

## 支持平台

**Windows 桌面版**是当前正式产品目标。桌面版提供完整的工作区文件存储、应用锁、自动恢复点和受口令保护的备份。

**Web 开发预览**（`npm run dev`）仅用于本地开发与界面调试，不作为正式产品交付形态。

macOS 桌面体验不作为当前阶段的商用目标，仅用于开发与代码审查协调。

## 当前发布边界

GitHub Release 目前发布源码。公开安装包需要代码签名和真实 Windows x64 安装、升级、备份恢复及卸载回归；不要从第三方渠道下载声称属于本项目的可执行文件。

应用不包含账号、云数据库、多人协作、多设备同步或自动更新。桌面工作区文件保存在本机应用数据目录，未加密存储。请使用独立 Windows 账户、BitLocker 和受控的异地备份保护工资信息。

旧版备份仍可导入；从旧桌面安装迁移时，新版本会自动检测并迁移旧 `localStorage` 数据。

## 本地开发

需要 Node.js 22.12 或更高版本。

```bash
npm ci
npm run dev
```

桌面开发模式：

```bash
npm run electron:dev
```

## 验证与内部构建

```bash
npm run check
npm audit --audit-level=high
npm run package:win
```

`package:win` 仅用于内部验证，不代表产生了可公开分发的可信安装包。构建产物位于 `dist/` 和 `release/`，不得提交 Git。

## 项目结构

```text
.
├── .github/             # CI、依赖更新和贡献模板
├── docs/                # 架构、数据安全与公开截图
├── electron/            # Electron 主进程、预加载、工作区存储与自动恢复点
├── shared/              # Web 与桌面共用的备份格式、校验与常量
├── src/                 # React 界面、工资逻辑、工作区操作与存储适配
└── public/              # 项目自有静态资产
```

进一步说明见 [架构说明](docs/architecture.md)、[数据安全说明](docs/data-safety.md)、[贡献指南](CONTRIBUTING.md) 和 [安全政策](SECURITY.md)。版本变化见 [CHANGELOG](CHANGELOG.md)。

## License

本项目采用 [MIT License](LICENSE)。第三方组件说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
