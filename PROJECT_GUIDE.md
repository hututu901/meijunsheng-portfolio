# 梅俊生个人网站使用与修改说明

## 1. 项目用途

这是一个 React + Vite 个人作品网站，包含首页门禁、个人介绍、工作经历、技能、视频作品、AI 作品集、微信式尾页和缓解眼疲劳小游戏。

线上地址：<https://meijunsheng.cn>

GitHub 仓库：<https://github.com/hututu901/meijunsheng-portfolio>

## 2. 在另一台电脑运行

先安装：

- Node.js 22 LTS：<https://nodejs.org/>
- Git：<https://git-scm.com/downloads>

解压项目后，在项目文件夹空白处右键打开 PowerShell，执行：

```powershell
npm install
npm run dev
```

浏览器打开终端显示的地址，通常是 `http://localhost:5173/`。

## 3. 修改网站内容

常用内容主要在以下文件：

- `src/data.ts`：姓名、个人信息、工作经历、技能、作品数据、AI 作品集数据。
- `src/App.tsx`：页面结构、交互逻辑、按钮动作和小游戏逻辑。
- `src/styles.css`：颜色、字号、间距、布局和动效。
- `public/`：图片、视频、简历和 AI 作品素材。

替换素材时，尽量保持原文件名；如果修改文件名，需要同步修改 `src/data.ts` 或 `src/App.tsx` 中的引用路径。

视频作品：

- `public/videos/`：完整观看视频。
- `public/videos/preview/`：左侧预览视频，体积较小，用于快速加载。

## 4. 修改后检查

每次修改后执行：

```powershell
npm run build
```

如果看到 `built in ...` 和没有 TypeScript 错误，说明生产构建通过。

本地查看生产版本：

```powershell
npm run preview
```

## 5. 推送到 GitHub 更新线上网站

```powershell
git status
git add .
git commit -m "describe your change"
git push origin main
```

推送后打开仓库的 **Actions**，等待 `Deploy to GitHub Pages` 变成绿色成功状态。线上地址通常需要等待 1 到 5 分钟，再用 `Ctrl + F5` 刷新。

## 6. GitHub Pages 设置

仓库的 Pages 发布方式使用 **GitHub Actions**。自定义域名为 `meijunsheng.cn`，配置文件是 `public/CNAME`，不要删除。

如果重新创建仓库，需要在：

`Settings → Pages → Build and deployment → Source`

选择 `GitHub Actions`。

## 7. 注意事项

- 不要把 `node_modules`、`dist`、`deploy-dist` 上传到仓库，它们会自动生成。
- 不要删除 `.github/workflows/deploy.yml`，否则 GitHub 不会自动部署。
- 尾页开发者入口密码当前为 `@m7498`。
- 网站管理后台目前使用浏览器 `localStorage`，只会影响当前浏览器，不会同步给其他访客。
- 网站验证码当前为 `4784`。
- GitHub 单个文件不能超过 100 MB；大视频应使用压缩预览或外部对象存储。

## 8. GitHub 仓库更新失败时

网络不稳定时可以先执行：

```powershell
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
```

然后重新执行 `git push origin main`。
