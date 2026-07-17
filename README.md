# 知乎手机屏幕适配

让知乎网页在手机浏览器里正常显示和操作。

知乎的一些桌面网页在手机上会出现内容超出屏幕、按钮被遮挡、评论弹窗放不下等问题。这个脚本会把页面调整成适合手机屏幕的布局，同时保留桌面版的内容和功能。

## 支持的页面

- 首页和关注动态
- 问题与回答
- 作者主页
- 热榜
- 搜索结果
- 话题
- 评论和回复
- 知乎专栏文章

## 在 iPhone 或 iPad 上安装

1. 从 App Store 安装 [Userscripts for Safari](https://github.com/quoid/userscripts)。
2. 在“设置 → App → Safari → 扩展”中启用 Userscripts，并允许它访问知乎网站。
3. 用 Safari 打开 [手机屏幕适配脚本](https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.user.js)。
4. 打开 Safari 的 Userscripts 扩展菜单，按照提示安装脚本。
5. 打开知乎，选择“请求桌面网站”，然后刷新页面。

## 夜间模式（可选）

另外安装 [知乎夜间模式](https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.user.js)，即可启用知乎内置的深色主题。

夜间模式和手机屏幕适配是两个独立脚本，可以分别安装和启用。需要恢复浅色主题时，在 Userscripts 中关闭夜间模式并刷新页面即可。

## 在电脑上安装

也可以使用 Tampermonkey、Violentmonkey 或其他兼容的用户脚本扩展安装 [`zhihu-mobile-resize.user.js`](./zhihu-mobile-resize.user.js)。

## 更新

在 Userscripts 中打开需要更新的脚本并点击更新按钮。扩展会检查远程版本并下载最新版。

## 反馈问题

如果知乎页面更新后再次出现超出屏幕、内容遮挡或无法操作等问题，请在 [Issues](https://github.com/bnkrr/zhihu-mobile-resize/issues) 中说明页面地址、设备型号和 iOS 版本；如方便，也可以附上不含个人信息的截图。
