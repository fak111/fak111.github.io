# fak111.github.io

一个纯前端的个人博客仓库。目标很直接：把本地 Markdown 变成可上线的站点内容，让发布动作尽量收敛成一条命令。

## 宣传视频

assets/fak111-promo.mp4

## 发布

第一次在新机器上使用，先安装全局命令：

```bash
./scripts/install-post-command.sh
```

之后就可以在任意目录执行：

```bash
post '/path/to/article.md'
```

命令会自动完成文章页生成、首页和 `/post/` 列表更新、搜索索引重建、`git add` / `commit` / `push`，并等待 GitHub Pages 线上可见。

## 感谢

- 感谢 [Node.js](https://nodejs.org/) 提供这条轻量发布链路所依赖的运行时。
- 感谢 [Git](https://git-scm.com/) 让内容版本管理和自动发布闭环足够直接。
- 感谢 [steipete.me](https://steipete.me/) 提供这次博客信息架构与视觉收敛的参考。
