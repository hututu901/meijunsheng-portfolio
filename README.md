# 梅俊生个人网站

React + Vite 单页个人作品网站。页面需要输入验证码 `4784` 后解锁。

## 本地运行

```powershell
pnpm install
pnpm dev
```

生产构建：

```powershell
pnpm build
```

构建结果默认输出到 `dist/`。

## GitHub 托管

1. 在 GitHub 新建一个空仓库，例如 `meijunsheng-portfolio`，不要勾选 README、License 或 .gitignore。
2. 在本目录执行：

```powershell
git init
git add .
git commit -m "initial portfolio site"
git branch -M main
git remote add origin https://github.com/你的用户名/meijunsheng-portfolio.git
git push -u origin main
```

3. 推荐使用 Vercel 部署：打开 https://vercel.com，使用 GitHub 登录，选择该仓库，Framework 选择 `Vite`，Build Command 填 `pnpm build`，Output Directory 填 `dist`，点击 Deploy。
4. 以后更新网站只需执行：

```powershell
git add .
git commit -m "update portfolio"
git push
```

Vercel 会自动重新部署。

## GitHub Pages

GitHub Pages 部署到仓库子路径时，需要把代码里的绝对资源路径改为相对路径，或为 Vite 设置正确的 `base`。当前网站更推荐使用 Vercel、Netlify 或 Cloudflare Pages，因为它们可以直接使用 `pnpm build` 和 `dist`。

## 资源说明

视频、简历和 AI 作品集素材均位于 `public/`，会随构建结果一并发布。视频文件较大，GitHub 对单文件 100 MB 有限制；本项目有多个视频超过 100 MB，推荐用 Git LFS，或将视频放到对象存储 / 百度网盘并在页面中使用外链。