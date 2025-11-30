# DeepFlow

DeepFlow 是一个旨在帮助用户进入心流状态的深度思考与写作 AI 工具。

## 项目结构

本项目采用 Vue 3 + .NET 9 架构。

- **`frontend-vue/`**: 基于 Vue 3 的前端应用。
- **`backend-dotnet/`**: 基于 .NET 9 Web API 的后端服务。
- **`archive/`**: 包含已归档的 React 原型和旧文档。
- **`Data/`**: 包含 SQLite 数据库文件 (开发环境)。

## 快速开始

### 前置要求
- Node.js (v20+)
- .NET 9 SDK

### 启动项目 (推荐)

在项目根目录下，你可以使用以下脚本一键启动前后端服务：

**Windows (PowerShell):**
```powershell
.\launcher.ps1
```

**Windows (CMD):**
```bat
start-dev.bat
```

### 手动启动

#### 启动前端
```bash
cd frontend-vue
npm install
npm run dev
```
前端地址: http://localhost:5173

#### 启动后端
```bash
cd backend-dotnet
dotnet run --project DeepFlow.Api
```
后端地址: http://localhost:5031

## 文档
- [产品设计文档](PRODUCT_DESIGN.md)
