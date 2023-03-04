# foggie-register

This is a tool for auto register foggie account.

#### Features

* Support auto register foggie account by email file
* Support auto register foggie account by input email and password
* Support auto generate DMC wallet and bind to foggie account


以下是方便 DMC 中文社区小伙伴使用的小工具：

此工具提供以下功能：

* 支持手动输入邮箱和密码单个账号注册
* 支持批量读取邮箱列表文件，进行注册（文件格式为 txt，每一行是 邮箱 密码，用英文空格分开，文件需要是 **UTF-8** 编码）
* 支持在注册成功后，自动修改登录密码
* 支持在注册成功后，自动生成 DMC 钱包，并自动绑定
* 批量注册的账号会保存到本地的 txt 文件中
* 支持手动输入邮箱密码获取 Foggie NFT CODE
* 支持批量读取邮箱列表文件，查询 Foggie NFT CODE

另外，如果提示邮箱读取失败，可以在 exe 所在目录添加 imap.json 文件，自定义IMAP配置 
```json
{ 
    "host": "imap.youmail.com", 
    "port": 996, 
    "tls": true
}
```

请注意，不要对 Foggie 网站进行破坏，此工具出于爱好，无其他破坏性目的。

此工具的代码已开源，如有需要，请自行下载代码运行。

如果您是 Windows 用户，请下载 exe 文件并打开 CMD，将工具拖入其中运行。如果您是 Mac 或 Linux 用户，请在 Terminal 中运行工具。

* 本工具仅供学习交流使用，不要用于其它用途
* 如果您是 DMC 中文社区的小伙伴，遇到问题可以在社区提问

---

* 大佬们的支持是我继续开发的动力，如果您觉得此工具对您有帮助，我的DMC钱包账号是, 欢迎打赏：

```
taggexyz1234
```