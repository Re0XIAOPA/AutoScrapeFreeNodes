@echo off
echo ====================================
echo   免费节点抓取工具 - 静态部署测试
echo ====================================
echo.

echo 步骤1: 安装依赖...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo 错误: 安装依赖失败
  pause
  exit /b 1
)
echo 依赖安装完成
echo.

echo 步骤2: 生成静态网站...
call node generate-static.js
if %ERRORLEVEL% NEQ 0 (
  echo 错误: 生成静态网站失败
  pause
  exit /b 1
)
echo 静态网站生成完成
echo.

echo 步骤3: 启动测试服务器...
echo 请使用浏览器访问 http://localhost:8080
echo 按 Ctrl+C 停止服务器
echo.
call node test-static.js

exit /b 0 