@echo off

cls

rem パスの設定
@set PATH=%~dp0lib;%PATH%

rem このバッチが存在しているフォルダをカレントにする
pushd %~dp0

rem MongoDBの起動
tasklist | findstr "mongod"
if not errorlevel 1 (
    echo MongoDBはすでに起動しています
) else (
    start /b mongod --dbpath data\db --logpath data\log
    echo MongoDBを起動しました
)

rem nodeサーバの起動
start /b supervisor -i public app
echo Nodeサーバを起動しました

exit
