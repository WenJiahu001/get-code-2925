# 邮箱验证码读取 CLI

通过 IMAP 只读读取收件箱最新一封邮件，并从邮件正文中提取 4-8 位数字验证码。

## 安装依赖

```bash
pnpm install
```

## 配置

复制 `.env.example` 为 `.env`，填写自己的邮箱 IMAP 信息：

```dotenv
MAIL_IMAP_HOST=imap.example.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_USER=your-mail@example.com
MAIL_PASS=your-imap-authorization-code
MAIL_LOGIN_METHOD=LOGIN
MAILBOX=INBOX
CODE_REGEX=\b\d{4,8}\b
POLL_INTERVAL_SECONDS=5
```

建议使用邮箱服务商提供的 IMAP 授权码或应用专用密码，不要把登录密码、cookie 或 token 写入代码。

如果 `MAIL_PASS` 中包含 `#`、空格或引号，务必加引号，例如：

```dotenv
MAIL_PASS="Wjh0808123!@#"
```

## 使用

```bash
pnpm fetch-code
```

成功时，终端会输出验证码、发件人和邮件时间。失败时，会输出明确错误并以非 0 状态退出。

持续检测最新验证码：

```bash
pnpm watch-code
```

程序会每隔 `POLL_INTERVAL_SECONDS` 秒读取一次最新邮件；只有检测到验证码、发件人或邮件时间发生变化时，才会重新打印结果。按 `Ctrl+C` 停止检测。

## 测试

```bash
pnpm test
```
