# CDP 回归测试

测试使用已经登录的 Windows Chrome，并且只复用 `/json/list` 中第一个知乎页面标签，不创建新标签页。

先按照项目的开发说明启动带 CDP 的独立 Chrome，然后在 WSL 中运行：

```bash
uv run --with websocket-client python tests/cdp_regression.py
```

也可以只运行一个或多个用例：

```bash
uv run --with websocket-client python tests/cdp_regression.py --case comments
uv run --with websocket-client python tests/cdp_regression.py --case hot --case question
```

页面矩阵和固定样本 URL 位于 `tests/cases.json`。测试会保持 Windows 桌面 UA，先以桌面宽度加载 DOM，再切换到 `403 × 730` 的窄视口并注入两个脚本。

当前检查包括：

- 页面语义根节点仍然存在
- 夜间主题已经启用
- 主要内容区域不存在白色背景残留
- 问题页普通评论能够打开
- “查看全部回复”弹层能够打开
- 深层回复的加载骨架和计数标题使用夜间配色
- 普通评论和深层回复没有浅色背景或不可读的深色文字
- 深层回复编辑器仍然存在
- 每个普通页面的顶部和真实底部截图
- 评论列表与深层回复弹层截图

报告和截图写入 `.local/test-results/`，不会进入 Git。测试不会保存 Cookie、Token 或页面全文。
