# 藏见 CANGJIAN

从收藏里，看见自己。一个以“泡泡灵感地图”为核心的 AI 收藏理解产品。

![Node.js](https://img.shields.io/badge/Node.js-22%2B-3c873a?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)

**[查看线上演示 →](https://cangjian-ai-design.onrender.com)**

## 功能

- 从 3–20 条收藏中提炼有证据支撑的偏好线索
- 以可探索的泡泡地图呈现收藏间的联系
- 通过“不太像我”的反馈调整线索表达
- 保存、回望和删除每次分析结果；数据保存在当前浏览器
- 支持 Agnes API；未配置时使用本地演示规则

## 本地运行

要求：Node.js 22 或更高版本。

```bash
npm install
cp .env.example .env
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)。

## 环境变量

在 `.env` 中填写以下服务端变量。不要将 API Key 提交到 GitHub，也不要使用 `VITE_` 前缀。

```bash
AGNES_API_KEY=
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_TEXT_MODEL=agnes-2.0-flash
PORT=3001
```

未填写 `AGNES_API_KEY` 时，应用仍可运行，但会使用本地演示分析；填写后才会请求 Agnes。

## 测试与生产构建

```bash
npm test
npm run build
npm start
```

`npm start` 同时提供构建后的网页与 `/api` 服务。生产环境中由平台提供 `PORT`；无需手动指定。

## 部署

本项目包含 Express API，不能只部署到 GitHub Pages。推荐使用 Render 或 Railway：

| 设置 | 值 |
| --- | --- |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Node 版本 | 22+ |
| 环境变量 | `AGNES_API_KEY`、`AGNES_BASE_URL`、`AGNES_TEXT_MODEL` |

部署后由 Express 同源提供前端与 API，因此不需要另行配置跨域，也不会把 API Key 暴露给浏览器。

## 项目结构

- `src/`：React 界面、泡泡地图和本地回望记录
- `server/`：Express API 与 Agnes 服务端适配器
- `shared/schema.ts`：输入、输出与证据校验
- `tests/`：分析、布局与历史记录测试

## 图片来源

示例图片仅作界面氛围参考，不代表用户真实收藏，也不参与模型图像分析。部分图片来自 Unsplash；为保证标题、正文与场景的匹配，部分示例室内图由 OpenAI 图像生成能力创作。每条示例收藏对应一张不同的图片。

## 作者

Ruiying Liu
