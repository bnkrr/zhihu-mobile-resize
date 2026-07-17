# 知乎实用脚本

这里收集了一系列改善知乎网页使用体验的用户脚本。目前包括手机屏幕适配和夜间模式，之后也可以继续加入其他彼此独立的知乎脚本。

每个脚本都可以单独安装，也可以一起使用。支持 Userscripts、Tampermonkey、Violentmonkey 等兼容的用户脚本扩展。

## 脚本列表

### 知乎手机屏幕适配

[安装知乎手机屏幕适配](https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-mobile-resize.user.js)

让知乎桌面版网页在手机等窄屏设备上正常显示和操作，修复内容超出屏幕、按钮被遮挡、评论区域放不下等问题，同时尽量保留桌面版的内容与功能。

目前主要适配：

- 首页和关注动态
- 问题与回答
- 作者主页
- 热榜
- 搜索结果
- 话题
- 评论和回复
- 知乎专栏文章

在手机上使用时，请让浏览器打开知乎的桌面版网站。例如在 Safari 中选择“请求桌面网站”，然后刷新页面。

### 知乎夜间模式

[安装知乎夜间模式](https://raw.githubusercontent.com/bnkrr/zhihu-mobile-resize/main/zhihu-night-mode.user.js)

启用知乎网页内置的深色主题，并补充修复部分仍然使用浅色背景或深色文字的区域，包括评论和回复编辑器。

夜间模式不依赖手机屏幕适配脚本，可以在手机或电脑上单独使用。需要恢复浅色主题时，在用户脚本扩展中关闭夜间模式并刷新页面即可。

## 在 iPhone 或 iPad 上安装

1. 从 App Store 安装 [Userscripts for Safari](https://github.com/quoid/userscripts)。
2. 在“设置 → App → Safari → 扩展”中启用 Userscripts，并允许它访问知乎网站。
3. 用 Safari 打开上方所需脚本的安装链接。
4. 打开 Safari 的 Userscripts 扩展菜单，按照提示安装脚本。
5. 返回知乎并刷新页面。

如果安装了手机屏幕适配脚本，还需要在 Safari 中为知乎选择“请求桌面网站”。

## 在电脑上安装

安装 Tampermonkey、Violentmonkey 或其他兼容的用户脚本扩展，然后打开上方所需脚本的安装链接。

## 更新脚本

在用户脚本扩展中打开相应脚本并检查更新。扩展会根据脚本的远程版本信息下载最新版。

## 反馈问题

如果知乎页面更新后出现显示或操作问题，请在 [Issues](https://github.com/bnkrr/zhihu-mobile-resize/issues) 中注明：

- 出现问题的脚本和页面地址
- 设备、操作系统与浏览器版本
- 问题现象和复现步骤
- 不包含个人信息的截图（如方便）
